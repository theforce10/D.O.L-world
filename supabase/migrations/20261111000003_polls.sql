-- Mix & Mingle live polls and the big-screen view.

create type public.poll_status as enum ('draft', 'open', 'closed');

create table public.polls (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  topic_id   uuid references public.topics (id) on delete set null,
  question   text not null check (char_length(btrim(question)) between 1 and 200),
  status     public.poll_status not null default 'draft',
  opened_at  timestamptz,
  closed_at  timestamptz,
  -- Kept by trigger. Every vote touches this row, which is how everyone gets
  -- a realtime ping to refetch poll_results() (they can't see poll_votes).
  vote_count integer not null default 0 check (vote_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index polls_event_idx on public.polls (event_id, created_at);
create index polls_topic_idx on public.polls (topic_id);
-- One open poll per event at a time; open_poll() closes the previous one.
create unique index polls_one_open_per_event on public.polls (event_id) where status = 'open';

create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

create table public.poll_options (
  id       uuid primary key default gen_random_uuid(),
  poll_id  uuid not null references public.polls (id) on delete cascade,
  label    text not null check (char_length(btrim(label)) between 1 and 80),
  position integer not null
);

create index poll_options_poll_idx on public.poll_options (poll_id, position);

create table public.poll_votes (
  poll_id    uuid not null references public.polls (id) on delete cascade,
  option_id  uuid not null references public.poll_options (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index poll_votes_option_idx on public.poll_votes (option_id);
create index poll_votes_user_idx on public.poll_votes (user_id);

-- The poll shown on /screen. Questions get their own slot in a later migration.
alter table public.events
  add column screen_poll_id uuid references public.polls (id) on delete set null;

-- Vote counter + realtime ping.
create function public.handle_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.polls set vote_count = vote_count + 1 where id = new.poll_id;
  elsif tg_op = 'DELETE' then
    update public.polls set vote_count = greatest(vote_count - 1, 0) where id = old.poll_id;
  else
    update public.polls set updated_at = now() where id = new.poll_id;
  end if;
  return null;
end;
$$;

create trigger poll_votes_after_change
  after insert or update or delete on public.poll_votes
  for each row execute function public.handle_poll_vote();

-- RLS: polls and options hold no personal data. Guests see open/closed polls
-- of the live event. Votes are only ever readable by the voter.
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

revoke all on public.polls from anon, authenticated;
revoke all on public.poll_options from anon, authenticated;
revoke all on public.poll_votes from anon, authenticated;

grant select on public.polls to anon, authenticated;
grant select on public.poll_options to anon, authenticated;
grant select on public.poll_votes to authenticated;
-- Creating/editing goes through RPCs so a poll and its options are saved together.
grant delete on public.polls to authenticated;

create policy "Anyone can read open and closed polls of the live event"
  on public.polls for select
  to anon, authenticated
  using (
    status in ('open', 'closed')
    and exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

create policy "Admins can read all polls"
  on public.polls for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can delete polls"
  on public.polls for delete
  to authenticated
  using ((select public.is_admin()));

-- Follows the polls policies above (the subquery runs with the caller's RLS).
create policy "Anyone can read options of polls they can see"
  on public.poll_options for select
  to anon, authenticated
  using (exists (select 1 from public.polls p where p.id = poll_id));

create policy "Users can read their own votes"
  on public.poll_votes for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Shared checks for the admin RPCs.
create function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can do that' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.assert_admin() from public, anon;
grant execute on function public.assert_admin() to authenticated;

create function public.clean_poll_options(p_options text[])
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clean text[];
begin
  select coalesce(array_agg(btrim(o) order by ord), '{}')
    into v_clean
    from unnest(p_options) with ordinality as t (o, ord)
   where btrim(o) <> '';

  if cardinality(v_clean) not between 2 and 6 then
    raise exception 'A poll needs between 2 and 6 options';
  end if;
  if exists (select 1 from unnest(v_clean) o where char_length(o) > 80) then
    raise exception 'Keep each option under 80 characters';
  end if;
  if (select count(distinct lower(o)) from unnest(v_clean) o) <> cardinality(v_clean) then
    raise exception 'Each option must be different';
  end if;
  return v_clean;
end;
$$;

create function public.create_poll(p_event_id uuid, p_question text, p_options text[], p_topic_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_options text[];
begin
  perform public.assert_admin();
  v_options := public.clean_poll_options(p_options);

  if p_topic_id is not null and not exists (
    select 1 from public.topics where id = p_topic_id and event_id = p_event_id
  ) then
    raise exception 'That topic belongs to another event';
  end if;

  insert into public.polls (event_id, topic_id, question)
  values (p_event_id, p_topic_id, btrim(p_question))
  returning id into v_id;

  insert into public.poll_options (poll_id, label, position)
  select v_id, o, ord::integer
    from unnest(v_options) with ordinality as t (o, ord);

  return v_id;
end;
$$;

-- Drafts only: once people can vote, options are fixed.
create function public.update_poll(p_poll_id uuid, p_question text, p_options text[], p_topic_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event   uuid;
  v_options text[];
begin
  perform public.assert_admin();
  v_options := public.clean_poll_options(p_options);

  select event_id into v_event from public.polls where id = p_poll_id and status = 'draft' for update;
  if v_event is null then
    raise exception 'Only draft polls can be edited';
  end if;
  if p_topic_id is not null and not exists (
    select 1 from public.topics where id = p_topic_id and event_id = v_event
  ) then
    raise exception 'That topic belongs to another event';
  end if;

  update public.polls set question = btrim(p_question), topic_id = p_topic_id where id = p_poll_id;
  delete from public.poll_options where poll_id = p_poll_id;
  insert into public.poll_options (poll_id, label, position)
  select p_poll_id, o, ord::integer
    from unnest(v_options) with ordinality as t (o, ord);
end;
$$;

-- Opens a poll (closing any other open poll in the event). Re-opening a
-- closed poll keeps its votes.
create function public.open_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  perform public.assert_admin();
  select event_id into v_event from public.polls where id = p_poll_id;
  if v_event is null then
    raise exception 'Poll not found' using errcode = 'P0002';
  end if;

  perform 1 from public.events where id = v_event for update;

  update public.polls
     set status = 'closed', closed_at = now()
   where event_id = v_event and status = 'open' and id <> p_poll_id;

  update public.polls
     set status = 'open', opened_at = coalesce(opened_at, now()), closed_at = null
   where id = p_poll_id;
end;
$$;

create function public.close_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.polls set status = 'closed', closed_at = now() where id = p_poll_id and status = 'open';
end;
$$;

-- Pass null to clear the screen.
create function public.show_poll_on_screen(p_event_id uuid, p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_poll_id is not null and not exists (
    select 1 from public.polls where id = p_poll_id and event_id = p_event_id
  ) then
    raise exception 'That poll belongs to another event';
  end if;
  update public.events set screen_poll_id = p_poll_id where id = p_event_id;
end;
$$;

-- One vote per checked-in guest per poll; calling again changes the vote.
create function public.cast_vote(p_poll_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_event uuid;
begin
  if v_uid is null then
    raise exception 'Please sign in to vote' using errcode = '42501';
  end if;

  select p.event_id into v_event
    from public.polls p
    join public.events e on e.id = p.event_id
   where p.id = p_poll_id and p.status = 'open' and e.is_active;
  if v_event is null then
    raise exception 'This poll is closed';
  end if;

  if not exists (select 1 from public.poll_options where id = p_option_id and poll_id = p_poll_id) then
    raise exception 'That option is not part of this poll';
  end if;

  if not exists (select 1 from public.check_ins where event_id = v_event and user_id = v_uid) then
    raise exception 'Join tonight to vote' using errcode = '42501';
  end if;

  insert into public.poll_votes (poll_id, option_id, user_id)
  values (p_poll_id, p_option_id, v_uid)
  on conflict (poll_id, user_id) do update
    set option_id = excluded.option_id, updated_at = now()
    where public.poll_votes.option_id is distinct from excluded.option_id;
end;
$$;

-- Counts and percentages only, never who voted. Anyone can read results of
-- open/closed polls in the live event; admins can read any poll's.
create function public.poll_results(p_poll_id uuid)
returns table (option_id uuid, label text, option_position integer, votes integer, percent integer)
language sql
stable
security definer
set search_path = ''
as $$
  with poll as (
    select p.id
      from public.polls p
      join public.events e on e.id = p.event_id
     where p.id = p_poll_id
       and (public.is_admin() or (p.status in ('open', 'closed') and e.is_active))
  ),
  counts as (
    select o.id, o.label, o.position, count(v.user_id)::integer as votes
      from public.poll_options o
      join poll on poll.id = o.poll_id
      left join public.poll_votes v on v.option_id = o.id
     group by o.id
  )
  select c.id, c.label, c.position, c.votes,
         case when sum(c.votes) over () = 0 then 0
              else round(100.0 * c.votes / sum(c.votes) over ())::integer end
    from counts c
   order by c.position;
$$;

revoke execute on function public.clean_poll_options(text[]) from public, anon, authenticated;
revoke execute on function public.create_poll(uuid, text, text[], uuid) from public, anon;
revoke execute on function public.update_poll(uuid, text, text[], uuid) from public, anon;
revoke execute on function public.open_poll(uuid) from public, anon;
revoke execute on function public.close_poll(uuid) from public, anon;
revoke execute on function public.show_poll_on_screen(uuid, uuid) from public, anon;
revoke execute on function public.cast_vote(uuid, uuid) from public, anon;
grant execute on function public.create_poll(uuid, text, text[], uuid) to authenticated;
grant execute on function public.update_poll(uuid, text, text[], uuid) to authenticated;
grant execute on function public.open_poll(uuid) to authenticated;
grant execute on function public.close_poll(uuid) to authenticated;
grant execute on function public.show_poll_on_screen(uuid, uuid) to authenticated;
grant execute on function public.cast_vote(uuid, uuid) to authenticated;
grant execute on function public.poll_results(uuid) to anon, authenticated;

alter publication supabase_realtime add table public.polls;
