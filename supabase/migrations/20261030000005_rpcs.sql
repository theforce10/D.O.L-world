-- RPCs the frontend calls.

-- Public-safe queue status for attendees: numbers and counts only, never
-- names, phones or anyone else's song.
create function public.get_queue_status(p_event_id uuid)
returns table (
  event_id        uuid,
  current_number  integer,
  up_next_number  integer,
  total_waiting   integer,
  my_request_id   uuid,
  my_number       integer,
  my_status       public.request_status,
  ahead_of_me     integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with ev as (
    select e.id, e.current_number
      from public.events e
     where e.id = p_event_id
  ),
  mine as (
    -- The caller's most relevant request: an active one first, else the latest.
    select r.id, r.queue_number, r.status
      from public.song_requests r
     where r.event_id = p_event_id
       and r.user_id = (select auth.uid())
     order by (r.status in ('waiting', 'up_next', 'singing')) desc, r.queue_number desc
     limit 1
  )
  select
    ev.id,
    ev.current_number,
    (select min(r.queue_number)::integer
       from public.song_requests r
      where r.event_id = ev.id and r.status = 'up_next'),
    (select count(*)::integer
       from public.song_requests r
      where r.event_id = ev.id and r.status in ('waiting', 'up_next')),
    mine.id,
    mine.queue_number,
    mine.status,
    case
      when mine.status = 'up_next' then 0
      when mine.status = 'waiting' then (
        select count(*)::integer
          from public.song_requests r
         where r.event_id = ev.id
           and (r.status = 'up_next'
                or (r.status = 'waiting' and r.queue_number < mine.queue_number))
      )
    end
  from ev
  left join mine on true;
$$;

revoke execute on function public.get_queue_status(uuid) from public, anon;
grant execute on function public.get_queue_status(uuid) to authenticated;

-- "Call next" in one tap, atomically:
--   singing -> sung, up_next (or lowest waiting) -> singing, next waiting -> up_next.
-- Returns the new "now singing" number, or null if the queue is empty.
create function public.call_next(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_id     uuid;
  v_next_number integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can call the next singer' using errcode = '42501';
  end if;

  -- Serialise double-taps / two admins pressing at once.
  perform 1 from public.events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  update public.song_requests
     set status = 'sung'
   where event_id = p_event_id and status = 'singing';

  select id, queue_number
    into v_next_id, v_next_number
    from public.song_requests
   where event_id = p_event_id and status in ('up_next', 'waiting')
   order by (status = 'up_next') desc, queue_number
   limit 1;

  if v_next_id is null then
    return null;
  end if;

  update public.song_requests set status = 'singing' where id = v_next_id;

  update public.song_requests
     set status = 'up_next'
   where id = (
     select id from public.song_requests
      where event_id = p_event_id and status = 'waiting'
      order by queue_number
      limit 1
   );

  return v_next_number;
end;
$$;

revoke execute on function public.call_next(uuid) from public, anon;
grant execute on function public.call_next(uuid) to authenticated;

-- One row per attendee for the Contacts page / CSV export.
create function public.admin_contacts()
returns table (
  user_id           uuid,
  full_name         text,
  email             text,
  phone             text,
  snapchat          text,
  avatar_url        text,
  marketing_consent boolean,
  consent_at        timestamptz,
  events_attended   integer,
  total_songs       integer,
  last_song_at      timestamptz,
  joined_at         timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can view contacts' using errcode = '42501';
  end if;

  return query
    select
      p.id,
      p.full_name,
      p.email,
      p.phone,
      p.snapchat,
      p.avatar_url,
      p.marketing_consent,
      p.consent_at,
      count(distinct r.event_id)::integer,
      count(r.id)::integer,
      max(r.created_at),
      p.created_at
    from public.profiles p
    left join public.song_requests r on r.user_id = p.id
    group by p.id
    order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_contacts() from public, anon;
grant execute on function public.admin_contacts() to authenticated;
