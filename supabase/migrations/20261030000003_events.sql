-- Events: each event has its own queue numbering starting at 1.

create table public.events (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  venue             text check (char_length(venue) <= 160),
  event_date        date,
  is_active         boolean not null default false,
  -- Last number handed out. Incremented under a row lock by the song_requests trigger.
  last_queue_number integer not null default 0 check (last_queue_number >= 0),
  -- Number currently on stage ("Now singing"). Maintained by song_requests triggers.
  current_number    integer not null default 0 check (current_number >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Only one event can be active at a time.
create unique index events_one_active on public.events (is_active) where is_active;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- RLS
alter table public.events enable row level security;

revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
-- Admins edit details directly; is_active goes through set_active_event(),
-- counters are only ever touched by triggers/RPCs.
grant insert (name, venue, event_date) on public.events to authenticated;
grant update (name, venue, event_date) on public.events to authenticated;
grant delete on public.events to authenticated;

create policy "Signed-in users can read events"
  on public.events for select
  to authenticated
  using (true);

create policy "Admins can create events"
  on public.events for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update events"
  on public.events for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Deleting an event that has songs is blocked by the song_requests FK.
create policy "Admins can delete events"
  on public.events for delete
  to authenticated
  using ((select public.is_admin()));

-- Activate one event (deactivating any other) in a single transaction.
-- Pass null to end the live event without starting another.
create function public.set_active_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change the active event' using errcode = '42501';
  end if;

  update public.events
     set is_active = false
   where is_active
     and id is distinct from p_event_id;

  if p_event_id is not null then
    update public.events set is_active = true where id = p_event_id;
    if not found then
      raise exception 'Event not found' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

revoke execute on function public.set_active_event(uuid) from public, anon;
grant execute on function public.set_active_event(uuid) to authenticated;
