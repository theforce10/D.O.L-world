-- Mix & Mingle groundwork: event types, guest read access to events, check-ins.

create type public.event_type as enum ('karaoke', 'mix_mingle');

-- Existing rows get 'karaoke' from the default.
alter table public.events
  add column type     public.event_type not null default 'karaoke',
  add column ended_at timestamptz;

grant insert (type) on public.events to authenticated;

-- Events hold no personal data. Guests (anon) can read them so the
-- Mix & Mingle home works before sign-in, and so they get realtime updates.
grant select on public.events to anon;

create policy "Guests can read events"
  on public.events for select
  to anon
  using (true);

-- Check-ins: a guest taps "Join tonight" at a Mix & Mingle event.
-- Needed to vote, ask questions and use Connect.
create table public.check_ins (
  event_id      uuid not null references public.events (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  -- "Let people I meet tonight find me in Connect". Off unless the guest opts in.
  discoverable  boolean not null default false,
  age_confirmed boolean not null check (age_confirmed),
  primary key (event_id, user_id)
);

create index check_ins_user_id_idx on public.check_ins (user_id);

create function public.prepare_check_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Never trust client-supplied values for these.
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.checked_in_at := now();

  if not exists (
    select 1 from public.profiles p
     where p.id = new.user_id
       and p.full_name is not null
       and p.phone is not null
  ) then
    raise exception 'Please finish your profile before checking in';
  end if;

  if not exists (
    select 1 from public.events e
     where e.id = new.event_id
       and e.is_active
       and e.type = 'mix_mingle'
       and e.ended_at is null
  ) then
    raise exception 'Check-in is closed for this event';
  end if;

  return new;
end;
$$;

create trigger check_ins_prepare
  before insert on public.check_ins
  for each row execute function public.prepare_check_in();

-- RLS
alter table public.check_ins enable row level security;

revoke all on public.check_ins from anon, authenticated;
grant select on public.check_ins to authenticated;
grant insert (event_id, discoverable, age_confirmed) on public.check_ins to authenticated;
grant update (discoverable) on public.check_ins to authenticated;

create policy "Users can read their own check-ins"
  on public.check_ins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins can read all check-ins"
  on public.check_ins for select
  to authenticated
  using ((select public.is_admin()));

create policy "Users can check themselves in"
  on public.check_ins for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can change their own Connect visibility"
  on public.check_ins for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Admins see the check-in count tick up live. RLS means guests only ever
-- receive their own row.
alter publication supabase_realtime add table public.check_ins;
