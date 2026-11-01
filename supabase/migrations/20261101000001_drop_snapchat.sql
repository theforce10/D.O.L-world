-- Snapchat is no longer collected. The return type changes, so admin_contacts() must be dropped and recreated.
drop function public.admin_contacts();

alter table public.profiles drop column snapchat;

-- One row per attendee for the Contacts page / CSV export.
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
