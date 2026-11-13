-- Mix & Mingle Connect: after the host ends the event, checked-in guests who
-- chose to be findable can say "I'd like to connect". Only mutual requests
-- reveal Snapchat handles. Requests are never shown to the other person unless
-- they're mutual. Block and report everywhere.

-- Snapchat is back, optional. Same rules as before: 3–15 chars, starts with a
-- letter, ends with a letter/number; letters, numbers, '.', '_', '-' between.
alter table public.profiles
  add column snapchat text check (snapchat ~ '^[A-Za-z][A-Za-z0-9._-]{1,13}[A-Za-z0-9]$');
grant update (snapchat) on public.profiles to authenticated;

-- Ending: closes check-in, topics and polls, clears the screen, starts the
-- 72-hour Connect window.
create function public.end_event(p_event_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ended timestamptz;
begin
  perform public.assert_admin();

  update public.events
     set ended_at = coalesce(ended_at, now()), is_active = false, screen_poll_id = null, screen_question_id = null
   where id = p_event_id and type = 'mix_mingle'
  returning ended_at into v_ended;
  if v_ended is null then
    raise exception 'Mix & Mingle event not found' using errcode = 'P0002';
  end if;

  update public.topics set status = 'done', ended_at = now() where event_id = p_event_id and status = 'live';
  update public.polls set status = 'closed', closed_at = now() where event_id = p_event_id and status = 'open';
  return v_ended;
end;
$$;

-- Going live again re-opens an ended event (and closes its Connect window).
create or replace function public.set_active_event(p_event_id uuid)
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
    update public.events set is_active = true, ended_at = null where id = p_event_id;
    if not found then
      raise exception 'Event not found' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

create function public.connect_window_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events
     where id = p_event_id and type = 'mix_mingle' and ended_at is not null and now() < ended_at + interval '72 hours'
  );
$$;

create table public.connect_requests (
  event_id   uuid not null references public.events (id) on delete cascade,
  from_user  uuid not null references public.profiles (id) on delete cascade,
  to_user    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, from_user, to_user),
  check (from_user <> to_user)
);

create index connect_requests_to_idx on public.connect_requests (event_id, to_user);

create table public.blocks (
  blocker    uuid not null references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create index blocks_blocked_idx on public.blocks (blocked);

create type public.report_reason as enum ('inappropriate_behaviour', 'harassment', 'fake_profile', 'other');

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter    uuid references public.profiles (id) on delete set null,
  reported    uuid not null references public.profiles (id) on delete cascade,
  event_id    uuid references public.events (id) on delete set null,
  reason      public.report_reason not null,
  details     text check (char_length(details) <= 1000),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_reported_idx on public.reports (reported);
create index reports_created_idx on public.reports (created_at desc);

-- RLS: no client reads or writes on requests and blocks at all; everything
-- goes through the functions below. Reports are readable by admins only.
alter table public.connect_requests enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

revoke all on public.connect_requests from anon, authenticated;
revoke all on public.blocks from anon, authenticated;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

create policy "Admins can read reports"
  on public.reports for select
  to authenticated
  using ((select public.is_admin()));

create function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
     where (blocker = p_a and blocked = p_b) or (blocker = p_b and blocked = p_a)
  );
$$;

-- Common checks: signed in, checked in to this event, Connect window open.
create function public.assert_can_connect(p_event_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.check_ins where event_id = p_event_id and user_id = v_uid) then
    raise exception 'Connect is only for guests who checked in to this event' using errcode = '42501';
  end if;
  if not public.connect_window_open(p_event_id) then
    raise exception 'Connect is closed for this event';
  end if;
  return v_uid;
end;
$$;

-- People you can connect with: checked in to this event, findable, not you,
-- no block either way. First name + avatar only.
create function public.connect_candidates(p_event_id uuid)
returns table (user_id uuid, first_name text, avatar_url text, requested boolean, matched boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_connect(p_event_id);
begin
  return query
    select p.id,
           split_part(btrim(coalesce(p.full_name, 'Guest')), ' ', 1),
           p.avatar_url,
           exists (select 1 from public.connect_requests r where r.event_id = p_event_id and r.from_user = v_uid and r.to_user = p.id),
           exists (select 1 from public.connect_requests r where r.event_id = p_event_id and r.from_user = v_uid and r.to_user = p.id)
             and exists (select 1 from public.connect_requests r where r.event_id = p_event_id and r.from_user = p.id and r.to_user = v_uid)
      from public.check_ins c
      join public.profiles p on p.id = c.user_id
     where c.event_id = p_event_id
       and c.discoverable
       and c.user_id <> v_uid
       and not public.is_blocked_between(v_uid, c.user_id)
     order by p.full_name;
end;
$$;

-- "I'd like to connect". Returns true when it's a match.
create function public.request_connect(p_event_id uuid, p_to_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_connect(p_event_id);
begin
  if p_to_user = v_uid then
    raise exception 'That''s you';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid and snapchat is not null) then
    raise exception 'Add your Snapchat first so people you match with can find you';
  end if;
  if not exists (select 1 from public.check_ins where event_id = p_event_id and user_id = p_to_user and discoverable)
     or public.is_blocked_between(v_uid, p_to_user) then
    raise exception 'That person isn''t available in Connect';
  end if;

  insert into public.connect_requests (event_id, from_user, to_user)
  values (p_event_id, v_uid, p_to_user)
  on conflict do nothing;

  return exists (
    select 1 from public.connect_requests where event_id = p_event_id and from_user = p_to_user and to_user = v_uid
  );
end;
$$;

-- Take back a request that hasn't matched yet.
create function public.withdraw_connect(p_event_id uuid, p_to_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.assert_can_connect(p_event_id);
begin
  if exists (select 1 from public.connect_requests where event_id = p_event_id and from_user = p_to_user and to_user = v_uid) then
    raise exception 'You''re already matched. Use Unmatch instead.';
  end if;
  delete from public.connect_requests where event_id = p_event_id and from_user = v_uid and to_user = p_to_user;
end;
$$;

-- Unmatch hides the handle from both sides. Works after the window closes too.
create function public.unmatch(p_event_id uuid, p_other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  delete from public.connect_requests
   where event_id = p_event_id
     and ((from_user = v_uid and to_user = p_other) or (from_user = p_other and to_user = v_uid));
end;
$$;

-- Mutual matches only, with handles. Stays readable after the window closes.
create function public.my_matches(p_event_id uuid)
returns table (user_id uuid, first_name text, avatar_url text, snapchat text, matched_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if not exists (select 1 from public.check_ins c where c.event_id = p_event_id and c.user_id = v_uid) then
    raise exception 'Connect is only for guests who checked in to this event' using errcode = '42501';
  end if;

  return query
    select p.id,
           split_part(btrim(coalesce(p.full_name, 'Guest')), ' ', 1),
           p.avatar_url,
           p.snapchat,
           greatest(mine.created_at, theirs.created_at)
      from public.connect_requests mine
      join public.connect_requests theirs
        on theirs.event_id = mine.event_id and theirs.from_user = mine.to_user and theirs.to_user = mine.from_user
      join public.profiles p on p.id = mine.to_user
     where mine.event_id = p_event_id
       and mine.from_user = v_uid
       and not public.is_blocked_between(v_uid, mine.to_user)
     order by 5 desc;
end;
$$;

-- Removes both people from each other's lists everywhere and undoes any match.
create function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if p_user_id = v_uid then
    raise exception 'You can''t block yourself';
  end if;
  insert into public.blocks (blocker, blocked) values (v_uid, p_user_id) on conflict do nothing;
  delete from public.connect_requests
   where (from_user = v_uid and to_user = p_user_id) or (from_user = p_user_id and to_user = v_uid);
end;
$$;

create function public.report_user(p_event_id uuid, p_reported uuid, p_reason public.report_reason, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in' using errcode = '42501';
  end if;
  if p_reported = v_uid then
    raise exception 'You can''t report yourself';
  end if;
  if not exists (select 1 from public.check_ins where event_id = p_event_id and user_id = v_uid) then
    raise exception 'Only guests at this event can report someone from it' using errcode = '42501';
  end if;
  if (select count(*) from public.reports where reporter = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve sent a lot of reports today. Please contact us directly.';
  end if;
  insert into public.reports (reporter, reported, event_id, reason, details)
  values (v_uid, p_reported, p_event_id, p_reason, nullif(btrim(p_details), ''));
end;
$$;

-- Mix & Mingle events you checked in to whose Connect window is open.
create function public.my_connect_events()
returns table (event_id uuid, name text, ended_at timestamptz, closes_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.ended_at, e.ended_at + interval '72 hours'
    from public.check_ins c
    join public.events e on e.id = c.event_id
   where c.user_id = auth.uid()
     and e.type = 'mix_mingle'
     and e.ended_at is not null
     and now() < e.ended_at + interval '72 hours'
   order by e.ended_at desc;
$$;

-- Admin moderation view. Admins see who reported whom.
create function public.admin_reports()
returns table (
  id             uuid,
  created_at     timestamptz,
  reason         public.report_reason,
  details        text,
  resolved_at    timestamptz,
  event_name     text,
  reporter_name  text,
  reporter_email text,
  reported_id    uuid,
  reported_name  text,
  reported_email text,
  reported_total integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select r.id, r.created_at, r.reason, r.details, r.resolved_at, e.name,
           rp.full_name, rp.email, r.reported, dp.full_name, dp.email,
           (select count(*)::integer from public.reports x where x.reported = r.reported)
      from public.reports r
      left join public.events e on e.id = r.event_id
      left join public.profiles rp on rp.id = r.reporter
      join public.profiles dp on dp.id = r.reported
     order by r.resolved_at is not null, r.created_at desc;
end;
$$;

create function public.resolve_report(p_report_id uuid, p_resolved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.reports set resolved_at = case when p_resolved then now() end where id = p_report_id;
end;
$$;

revoke execute on function public.end_event(uuid) from public, anon;
revoke execute on function public.connect_window_open(uuid) from public, anon;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.assert_can_connect(uuid) from public, anon, authenticated;
revoke execute on function public.connect_candidates(uuid) from public, anon;
revoke execute on function public.request_connect(uuid, uuid) from public, anon;
revoke execute on function public.withdraw_connect(uuid, uuid) from public, anon;
revoke execute on function public.unmatch(uuid, uuid) from public, anon;
revoke execute on function public.my_matches(uuid) from public, anon;
revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.report_user(uuid, uuid, public.report_reason, text) from public, anon;
revoke execute on function public.my_connect_events() from public, anon;
revoke execute on function public.admin_reports() from public, anon;
revoke execute on function public.resolve_report(uuid, boolean) from public, anon;
grant execute on function public.end_event(uuid) to authenticated;
grant execute on function public.connect_window_open(uuid) to authenticated;
grant execute on function public.connect_candidates(uuid) to authenticated;
grant execute on function public.request_connect(uuid, uuid) to authenticated;
grant execute on function public.withdraw_connect(uuid, uuid) to authenticated;
grant execute on function public.unmatch(uuid, uuid) to authenticated;
grant execute on function public.my_matches(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.report_user(uuid, uuid, public.report_reason, text) to authenticated;
grant execute on function public.my_connect_events() to authenticated;
grant execute on function public.admin_reports() to authenticated;
grant execute on function public.resolve_report(uuid, boolean) to authenticated;
