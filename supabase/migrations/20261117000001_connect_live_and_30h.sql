create or replace function public.connect_window_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.events
     where id = p_event_id
       and type = 'mix_mingle'
       and (
         (is_active and ended_at is null)
         or (ended_at is not null and now() < ended_at + interval '30 hours')
       )
  );
$$;

create or replace function public.my_connect_events()
returns table (event_id uuid, name text, ended_at timestamptz, closes_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.name, e.ended_at, e.ended_at + interval '30 hours'
    from public.check_ins c
    join public.events e on e.id = c.event_id
   where c.user_id = auth.uid()
     and e.type = 'mix_mingle'
     and (
       (e.is_active and e.ended_at is null)
       or (e.ended_at is not null and now() < e.ended_at + interval '30 hours')
     )
   order by coalesce(e.ended_at, now()) desc;
$$;
