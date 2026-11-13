-- Mix & Mingle live topic cards.

create type public.topic_status as enum ('queued', 'live', 'done');

create table public.topics (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  -- Assigned by trigger on insert; changed only by reorder_topics().
  position         integer not null default 0,
  prompt           text not null check (char_length(btrim(prompt)) between 1 and 300),
  -- null = no timer.
  duration_seconds integer check (duration_seconds between 30 and 7200),
  status           public.topic_status not null default 'queued',
  started_at       timestamptz,
  ended_at         timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index topics_event_order_idx on public.topics (event_id, position, created_at);

-- At most one live topic per event.
create unique index topics_one_live_per_event on public.topics (event_id) where status = 'live';

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

-- New topics go to the end of the list. Multi-row inserts (paste import) see
-- the rows inserted before them, so they keep their order.
create function public.prepare_topic()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.prompt := btrim(new.prompt);
  new.status := 'queued';
  new.started_at := null;
  new.ended_at := null;
  new.position := coalesce((select max(t.position) from public.topics t where t.event_id = new.event_id), 0) + 1;
  return new;
end;
$$;

create trigger topics_prepare
  before insert on public.topics
  for each row execute function public.prepare_topic();

-- RLS
alter table public.topics enable row level security;

revoke all on public.topics from anon, authenticated;
grant select on public.topics to anon, authenticated;
-- status/timestamps/position only change through the RPCs below.
grant insert (event_id, prompt, duration_seconds) on public.topics to authenticated;
grant update (prompt, duration_seconds) on public.topics to authenticated;
grant delete on public.topics to authenticated;

-- Topics hold no personal data. Guests see the live topic and past ones for
-- the live event, never the host's upcoming list.
create policy "Anyone can read started topics of the live event"
  on public.topics for select
  to anon, authenticated
  using (
    status in ('live', 'done')
    and exists (select 1 from public.events e where e.id = event_id and e.is_active)
  );

create policy "Admins can read all topics"
  on public.topics for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can add topics"
  on public.topics for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can edit topics"
  on public.topics for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete queued topics"
  on public.topics for delete
  to authenticated
  using ((select public.is_admin()) and status = 'queued');

-- Server clock, so phones with a wrong clock still count down correctly.
create function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

grant execute on function public.server_now() to anon, authenticated;

-- "Next topic": current live -> done, next queued -> live, atomically.
-- Returns the new live topic id, or null when nothing is left.
create function public.advance_topic(p_event_id uuid)
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

-- "End round": finish the live topic without starting another.
create function public.end_round(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can run topics' using errcode = '42501';
  end if;

  update public.topics
     set status = 'done', ended_at = now()
   where event_id = p_event_id and status = 'live';
end;
$$;

-- "+2 min": extends the live topic. With no timer (or after time's up),
-- the countdown restarts from now.
create function public.extend_topic(p_topic_id uuid, p_seconds integer default 120)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can run topics' using errcode = '42501';
  end if;
  if p_seconds not between 30 and 1800 then
    raise exception 'Extend by between 30 seconds and 30 minutes';
  end if;

  update public.topics
     set duration_seconds = least(
       7200,
       greatest(coalesce(duration_seconds, 0), ceil(extract(epoch from now() - started_at))::integer) + p_seconds
     )
   where id = p_topic_id and status = 'live';

  if not found then
    raise exception 'That topic is not live any more';
  end if;
end;
$$;

-- Saves a new order for the queued topics (ids in the order they should run).
create function public.reorder_topics(p_event_id uuid, p_topic_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can run topics' using errcode = '42501';
  end if;

  perform 1 from public.events where id = p_event_id for update;

  -- Queued topics go after everything that has already started.
  update public.topics t
     set position = base.max_started + o.ord
    from unnest(p_topic_ids) with ordinality as o (id, ord),
         (select coalesce(max(position), 0) as max_started
            from public.topics
           where event_id = p_event_id and status <> 'queued') as base
   where t.id = o.id
     and t.event_id = p_event_id
     and t.status = 'queued';
end;
$$;

revoke execute on function public.advance_topic(uuid) from public, anon;
revoke execute on function public.end_round(uuid) from public, anon;
revoke execute on function public.extend_topic(uuid, integer) from public, anon;
revoke execute on function public.reorder_topics(uuid, uuid[]) from public, anon;
grant execute on function public.advance_topic(uuid) to authenticated;
grant execute on function public.end_round(uuid) to authenticated;
grant execute on function public.extend_topic(uuid, integer) to authenticated;
grant execute on function public.reorder_topics(uuid, uuid[]) to authenticated;

alter publication supabase_realtime add table public.topics;
