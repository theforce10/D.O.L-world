-- Admin: attendance by event type on Contacts, and Mix & Mingle event stats.

drop function public.admin_contacts();

-- Karaoke attendance = events you submitted a song at; Mix & Mingle = events you checked in to.
create function public.admin_contacts()
returns table (
  user_id           uuid,
  full_name         text,
  email             text,
  phone             text,
  avatar_url        text,
  marketing_consent boolean,
  consent_at        timestamptz,
  events_attended   integer,
  karaoke_events    integer,
  mingle_events     integer,
  total_songs       integer,
  last_song_at      timestamptz,
  last_check_in_at  timestamptz,
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
      p.avatar_url,
      p.marketing_consent,
      p.consent_at,
      coalesce(s.karaoke_events, 0) + coalesce(c.mingle_events, 0),
      coalesce(s.karaoke_events, 0),
      coalesce(c.mingle_events, 0),
      coalesce(s.total_songs, 0),
      s.last_song_at,
      c.last_check_in_at,
      p.created_at
    from public.profiles p
    left join (
      select r.user_id, count(distinct r.event_id)::integer as karaoke_events, count(*)::integer as total_songs, max(r.created_at) as last_song_at
        from public.song_requests r
       group by r.user_id
    ) s on s.user_id = p.id
    left join (
      select ci.user_id, count(*)::integer as mingle_events, max(ci.checked_in_at) as last_check_in_at
        from public.check_ins ci
       group by ci.user_id
    ) c on c.user_id = p.id
    order by p.created_at desc;
end;
$$;

revoke execute on function public.admin_contacts() from public, anon;
grant execute on function public.admin_contacts() to authenticated;

-- Numbers for a Mix & Mingle event card. Participation = share of checked-in
-- guests who voted in at least one poll.
create function public.event_stats(p_event_id uuid)
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
    (select count(*)::integer from public.polls p where p.event_id = p_event_id and p.status <> 'draft'),
    (select count(*)::integer from public.connect_requests a
       join public.connect_requests b on b.event_id = a.event_id and b.from_user = a.to_user and b.to_user = a.from_user
      where a.event_id = p_event_id and a.from_user < a.to_user);
end;
$$;

revoke execute on function public.event_stats(uuid) from public, anon;
grant execute on function public.event_stats(uuid) to authenticated;
