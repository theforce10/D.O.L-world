-- "What you missed": one public call for latecomers. Finished topics in order,
-- with the results of polls linked to each (counts only) and up to 3 approved
-- questions from that round. No user data.

create function public.event_recap(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(t.item order by t.position, t.created_at), '[]'::jsonb)
    from (
      select tp.position, tp.created_at,
             jsonb_build_object(
               'id', tp.id,
               'prompt', tp.prompt,
               'started_at', tp.started_at,
               'ended_at', tp.ended_at,
               'polls', coalesce((
                 select jsonb_agg(
                          jsonb_build_object(
                            'id', p.id,
                            'question', p.question,
                            'results', (
                              select coalesce(jsonb_agg(
                                       jsonb_build_object('option_id', r.option_id, 'label', r.label, 'votes', r.votes, 'percent', r.percent)
                                       order by r.option_position), '[]'::jsonb)
                                from public.poll_results(p.id) r
                            )
                          ) order by p.created_at)
                   from public.polls p
                  where p.topic_id = tp.id and p.status in ('open', 'closed')
               ), '[]'::jsonb),
               'questions', coalesce((
                 select jsonb_agg(q.body order by q.created_at)
                   from (
                     select body, created_at
                       from public.questions
                      where topic_id = tp.id and status in ('approved', 'answered')
                      order by created_at
                      limit 3
                   ) q
               ), '[]'::jsonb)
             ) as item
        from public.topics tp
        join public.events e on e.id = tp.event_id
       where tp.event_id = p_event_id
         and tp.status = 'done'
         and (e.is_active or public.is_admin())
    ) t;
$$;

grant execute on function public.event_recap(uuid) to anon, authenticated;
