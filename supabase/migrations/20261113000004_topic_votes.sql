-- Topic votes: the host puts 2–6 queued topics to a vote, guests pick one,
-- and the host starts the winner (or picks between tied topics). A topic vote
-- is a poll with kind = 'topic' whose options point at topics, so votes,
-- counts, realtime pings and poll_results() all work as for normal polls.
-- Losing topics stay queued for a later vote.

create type public.poll_kind as enum ('poll', 'topic');

alter table public.polls add column kind public.poll_kind not null default 'poll';

-- Options copy the topic prompt (guests can't read queued topics), so labels
-- can be as long as a prompt. clean_poll_options() still caps normal polls at 80.
alter table public.poll_options
  add column topic_id uuid references public.topics (id) on delete cascade,
  drop constraint poll_options_label_check,
  add constraint poll_options_label_check check (char_length(btrim(label)) between 1 and 300);

create index poll_options_topic_idx on public.poll_options (topic_id);

-- A normal poll and a topic vote can be open at the same time.
drop index public.polls_one_open_per_event;
create unique index polls_one_open_per_event_kind on public.polls (event_id, kind) where status = 'open';

-- Keep vote labels in step if the host edits a topic's prompt.
create function public.sync_topic_vote_labels()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.poll_options set label = new.prompt where topic_id = new.id;
  return null;
end;
$$;

create trigger topics_sync_vote_labels
  after update of prompt on public.topics
  for each row
  when (old.prompt is distinct from new.prompt)
  execute function public.sync_topic_vote_labels();

-- Opens a vote on the given queued topics right away. Returns the poll id.
create function public.start_topic_vote(p_event_id uuid, p_topic_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_count integer;
begin
  perform public.assert_admin();

  perform 1 from public.events
   where id = p_event_id and type = 'mix_mingle' and ended_at is null
     for update;
  if not found then
    raise exception 'This Mix & Mingle event has ended or doesn''t exist' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.polls where event_id = p_event_id and kind = 'topic' and status = 'open') then
    raise exception 'A topic vote is already running';
  end if;

  select count(distinct t) into v_count from unnest(p_topic_ids) t where t is not null;
  if v_count not between 2 and 6 then
    raise exception 'Pick between 2 and 6 topics';
  end if;

  if (select count(*) from public.topics
       where id = any (p_topic_ids) and event_id = p_event_id and status = 'queued') <> v_count then
    raise exception 'Only topics that haven''t run yet can go to a vote';
  end if;

  insert into public.polls (event_id, kind, question, status, opened_at)
  values (p_event_id, 'topic', 'What should we talk about next?', 'open', now())
  returning id into v_id;

  insert into public.poll_options (poll_id, topic_id, label, position)
  select v_id, t.id, t.prompt, (row_number() over (order by t.position, t.created_at))::integer
    from public.topics t
   where t.id = any (p_topic_ids) and t.event_id = p_event_id;

  return v_id;
end;
$$;

-- Closes the vote and makes p_topic_id live (ending the current topic). The
-- host console offers the leader, or the tied leaders to choose from. The
-- winner moves to the front of the queue so topics stay in the order they ran.
create function public.finish_topic_vote(p_poll_id uuid, p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
  v_pos   integer;
  v_front integer;
begin
  perform public.assert_admin();

  select event_id into v_event from public.polls where id = p_poll_id and kind = 'topic';
  if v_event is null then
    raise exception 'Topic vote not found' using errcode = 'P0002';
  end if;

  -- Serialise double-taps / two hosts, then re-check the vote is still open.
  perform 1 from public.events where id = v_event for update;
  if not exists (select 1 from public.polls where id = p_poll_id and status = 'open') then
    raise exception 'This topic vote has already finished';
  end if;

  if not exists (select 1 from public.poll_options where poll_id = p_poll_id and topic_id = p_topic_id) then
    raise exception 'That topic isn''t part of this vote';
  end if;

  select position into v_pos from public.topics where id = p_topic_id and status = 'queued';
  if v_pos is null then
    raise exception 'That topic has already run';
  end if;

  update public.polls
     set status = 'closed', closed_at = now(), topic_id = p_topic_id
   where id = p_poll_id;

  update public.topics
     set status = 'done', ended_at = now()
   where event_id = v_event and status = 'live';

  select min(position) into v_front from public.topics where event_id = v_event and status = 'queued';
  update public.topics
     set position = position + 1
   where event_id = v_event and status = 'queued' and position >= v_front and position < v_pos;

  update public.topics
     set status = 'live', started_at = now(), ended_at = null, position = v_front
   where id = p_topic_id;
end;
$$;

-- Cancels a running vote: its votes are deleted and the topics stay queued.
-- Closes rather than deletes the poll, because realtime DELETE events can't be
-- filtered by event, so guests wouldn't hear about a deleted poll.
create function public.cancel_topic_vote(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  delete from public.poll_votes where poll_id = p_poll_id;
  update public.polls
     set status = 'closed', closed_at = now(), topic_id = null
   where id = p_poll_id and kind = 'topic' and status = 'open';
  if not found then
    raise exception 'This topic vote has already finished';
  end if;
end;
$$;

revoke execute on function public.cancel_topic_vote(uuid) from public, anon;
grant execute on function public.cancel_topic_vote(uuid) to authenticated;

revoke execute on function public.sync_topic_vote_labels() from public, anon, authenticated;
revoke execute on function public.start_topic_vote(uuid, uuid[]) from public, anon;
revoke execute on function public.finish_topic_vote(uuid, uuid) from public, anon;
grant execute on function public.start_topic_vote(uuid, uuid[]) to authenticated;
grant execute on function public.finish_topic_vote(uuid, uuid) to authenticated;

-- "Next topic" would skip the guests' vote, so it waits until the vote is
-- finished or cancelled.
create or replace function public.advance_topic(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can run topics' using errcode = '42501';
  end if;

  -- Serialise double-taps / two hosts.
  perform 1 from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.polls where event_id = p_event_id and kind = 'topic' and status = 'open') then
    raise exception 'Guests are voting on the next topic. Start the winner or cancel the vote first';
  end if;

  update public.topics
     set status = 'done', ended_at = now()
   where event_id = p_event_id and status = 'live';

  select id into v_next
    from public.topics
   where event_id = p_event_id and status = 'queued'
   order by position, created_at
   limit 1;

  if v_next is null then
    return null;
  end if;

  update public.topics
     set status = 'live', started_at = now(), ended_at = null
   where id = v_next;

  return v_next;
end;
$$;

-- Normal polls only: topic votes are started and finished by the RPCs above.
create or replace function public.open_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event uuid;
begin
  perform public.assert_admin();
  select event_id into v_event from public.polls where id = p_poll_id and kind = 'poll';
  if v_event is null then
    raise exception 'Poll not found' using errcode = 'P0002';
  end if;

  perform 1 from public.events where id = v_event for update;

  update public.polls
     set status = 'closed', closed_at = now()
   where event_id = v_event and kind = 'poll' and status = 'open' and id <> p_poll_id;

  update public.polls
     set status = 'open', opened_at = coalesce(opened_at, now()), closed_at = null
   where id = p_poll_id;
end;
$$;

create or replace function public.update_poll(p_poll_id uuid, p_question text, p_options text[], p_topic_id uuid default null)
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

  select event_id into v_event from public.polls where id = p_poll_id and status = 'draft' and kind = 'poll' for update;
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

-- The "polls" stat counts normal polls; topic votes still count towards voters.
create or replace function public.event_stats(p_event_id uuid)
returns table (check_ins integer, voters integer, participation integer, questions integer, polls integer, matches integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_check_ins integer;
  v_voters    integer;
begin
  perform public.assert_admin();

  select count(*)::integer into v_check_ins from public.check_ins c where c.event_id = p_event_id;
  select count(distinct v.user_id)::integer into v_voters
    from public.poll_votes v join public.polls p on p.id = v.poll_id
   where p.event_id = p_event_id;

  return query select
    v_check_ins,
    v_voters,
    case when v_check_ins = 0 then 0 else round(100.0 * v_voters / v_check_ins)::integer end,
    (select count(*)::integer from public.questions q where q.event_id = p_event_id),
    (select count(*)::integer from public.polls p where p.event_id = p_event_id and p.kind = 'poll' and p.status <> 'draft'),
    (select count(*)::integer from public.connect_requests a
       join public.connect_requests b on b.event_id = a.event_id and b.from_user = a.to_user and b.to_user = a.from_user
      where a.event_id = p_event_id and a.from_user < a.to_user);
end;
$$;
