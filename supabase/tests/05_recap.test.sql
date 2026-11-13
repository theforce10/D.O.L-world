-- "What you missed" recap: finished topics, counts, approved questions, no user data.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada"}', 'authenticated', 'authenticated');
update public.profiles set phone = '+2348012345678' where id = '00000000-0000-0000-0000-0000000000a1';
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true);
insert into public.check_ins (event_id, user_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', true);
insert into public.topics (id, event_id, prompt) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 'T1'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000e001', 'T2');
update public.topics set status = 'done', started_at = now() where prompt = 'T1';
update public.topics set status = 'live', started_at = now() where prompt = 'T2';
insert into public.polls (id, event_id, topic_id, question, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000f1', 'Q?', 'closed');
insert into public.poll_options (poll_id, label, position) values
  ('00000000-0000-0000-0000-0000000000c1', 'Yes', 1), ('00000000-0000-0000-0000-0000000000c1', 'No', 2);
insert into public.poll_votes (poll_id, option_id, user_id)
select '00000000-0000-0000-0000-0000000000c1', id, '00000000-0000-0000-0000-0000000000a1' from public.poll_options where label = 'Yes';
alter table public.questions disable trigger questions_prepare;
insert into public.questions (event_id, user_id, topic_id, body, status)
select '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', b, s::public.question_status
  from (values ('approved one', 'approved'), ('hidden one', 'hidden'), ('pending one', 'pending'), ('answered one', 'answered'), ('a2', 'approved'), ('a3', 'approved')) v (b, s);
alter table public.questions enable trigger questions_prepare;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(jsonb_array_length(public.event_recap('00000000-0000-0000-0000-00000000e001')), 1, 'only finished topics');
select is(public.event_recap('00000000-0000-0000-0000-00000000e001') -> 0 ->> 'prompt', 'T1', 'topic prompt included');
select is(public.event_recap('00000000-0000-0000-0000-00000000e001') -> 0 -> 'polls' -> 0 -> 'results' -> 0 ->> 'percent', '100', 'linked poll results included');
select is(
  public.event_recap('00000000-0000-0000-0000-00000000e001') -> 0 -> 'questions',
  '["approved one", "answered one", "a2"]'::jsonb,
  'up to 3 approved/answered questions, never hidden or pending'
);
select ok(public.event_recap('00000000-0000-0000-0000-00000000e001')::text !~ '00000000-0000-0000-0000-0000000000a1', 'no user ids in the recap');
reset role;
update public.events set is_active = false;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is(public.event_recap('00000000-0000-0000-0000-00000000e001'), '[]'::jsonb, 'no recap for an inactive event');
reset role;

select * from finish();
rollback;
