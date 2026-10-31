-- Song requests and race-safe queue numbering.

create type public.request_status as enum ('waiting', 'up_next', 'singing', 'sung', 'skipped');

create table public.song_requests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete restrict,
  -- References profiles (not auth.users) so PostgREST can embed the attendee's profile.
  user_id      uuid not null references public.profiles (id) on delete cascade,
  song_title   text not null check (char_length(btrim(song_title)) between 1 and 150),
  artist       text not null check (char_length(btrim(artist)) between 1 and 150),
  note         text check (char_length(note) <= 300),
  queue_number integer not null check (queue_number > 0),
  status       public.request_status not null default 'waiting',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint song_requests_event_number_key unique (event_id, queue_number)
);

create index song_requests_user_id_idx on public.song_requests (user_id);
create index song_requests_event_status_idx on public.song_requests (event_id, status, queue_number);

-- One song in the queue per person per event; they can submit again once it's sung or skipped.
create unique index song_requests_one_active_per_user
  on public.song_requests (event_id, user_id)
  where status in ('waiting', 'up_next', 'singing');

create trigger song_requests_set_updated_at
  before update on public.song_requests
  for each row execute function public.set_updated_at();

-- BEFORE INSERT: the database assigns the number.
-- The UPDATE ... RETURNING takes a row lock on the event, so concurrent inserts
-- for the same event queue up behind each other and each gets the next number.
-- If the insert fails afterwards, the increment rolls back with it (no gaps).
create function public.assign_queue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number integer;
begin
  -- Never trust client-supplied values for these.
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.status := 'waiting';
  new.created_at := now();
  new.song_title := btrim(new.song_title);
  new.artist := btrim(new.artist);
  new.note := nullif(btrim(new.note), '');

  if not exists (
    select 1 from public.profiles p
     where p.id = new.user_id
       and p.full_name is not null
       and p.phone is not null
  ) then
    raise exception 'Please finish your profile before picking a song';
  end if;

  if exists (
    select 1 from public.song_requests r
     where r.event_id = new.event_id
       and r.user_id = new.user_id
       and r.status in ('waiting', 'up_next', 'singing')
  ) then
    raise exception 'You already have a song in the queue for this event';
  end if;

  update public.events
     set last_queue_number = last_queue_number + 1
   where id = new.event_id
     and is_active
  returning last_queue_number into v_number;

  if v_number is null then
    raise exception 'This event is not taking songs right now';
  end if;

  new.queue_number := v_number;
  return new;
end;
$$;

create trigger song_requests_assign_queue_number
  before insert on public.song_requests
  for each row execute function public.assign_queue_number();

-- BEFORE UPDATE OF status: keep the queue consistent and notify listeners.
--   * Only one 'singing' row per event; it becomes events.current_number.
--   * Only one 'up_next' row per event.
--   * Any status change touches the event row, so attendees (who can't see
--     other people's rows) get a realtime ping and refetch get_queue_status().
create function public.handle_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'singing' then
    update public.song_requests
       set status = 'sung'
     where event_id = new.event_id and status = 'singing' and id <> new.id;
  elsif new.status = 'up_next' then
    update public.song_requests
       set status = 'waiting'
     where event_id = new.event_id and status = 'up_next' and id <> new.id;
  end if;

  update public.events
     set current_number = case when new.status = 'singing' then new.queue_number else current_number end
   where id = new.event_id;

  return new;
end;
$$;

create trigger song_requests_handle_status_change
  before update of status on public.song_requests
  for each row execute function public.handle_status_change();

-- RLS
alter table public.song_requests enable row level security;

revoke all on public.song_requests from anon, authenticated;
grant select on public.song_requests to authenticated;
-- Clients can't send user_id, queue_number or status at all.
grant insert (event_id, song_title, artist, note) on public.song_requests to authenticated;
-- Only status is editable, and the policy restricts that to admins.
grant update (status) on public.song_requests to authenticated;

create policy "Users can read their own requests"
  on public.song_requests for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins can read all requests"
  on public.song_requests for select
  to authenticated
  using ((select public.is_admin()));

create policy "Users can submit their own requests"
  on public.song_requests for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Admins can update requests"
  on public.song_requests for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
