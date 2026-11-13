-- Anonymous questions: limits, ban, and the host never sees who asked.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.dev', '{"full_name":"Host"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev', '{"full_name":"Bo"}', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
update public.profiles set phone = '+2348012345678' where id <> '00000000-0000-0000-0000-0000000000ad';
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true);
insert into public.check_ins (event_id, user_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', 'hi') $$, '42501', null, 'must be checked in to ask');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', '  What made you two click?  ') $$, 'checked-in guest can ask');
select results_eq($$ select body, status::text, flagged from public.questions $$, $$ values ('What made you two click?', 'pending', false) $$, 'trimmed, pending, readable by the asker');
select throws_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', 'again') $$, 'P0001', 'Give it 30 seconds before sending another question', '1 per 30 seconds');
select throws_ok($$ insert into public.questions (event_id, user_id, body) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2', 'x') $$, '42501', null, 'cannot send as someone else');
select throws_ok($$ update public.questions set status = 'approved' $$, '42501', null, 'asker cannot moderate');
reset role;

update public.questions set created_at = now() - interval '10 minutes';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', repeat('x', 281)) $$, '23514', null, 'max 280 characters');
select lives_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', 'This is shit honestly') $$, 'rude question is accepted');
select ok((select flagged and status = 'pending' from public.questions where body like 'This is%'), 'rude question is flagged, not dropped');
reset role;

alter table public.questions disable trigger questions_prepare;
insert into public.questions (event_id, user_id, body, created_at)
select '00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', 'q' || g, now() - interval '2 minutes' from generate_series(3, 5) g;
alter table public.questions enable trigger questions_prepare;
update public.questions set created_at = now() - interval '5 minutes' where body like 'This is%';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', 'sixth') $$, 'P0001', null, 'at most 5 per event');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select * from public.questions $$, '42501', null, 'guests cannot read questions');
select throws_ok($$ select * from public.host_questions('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'guests cannot call host_questions');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is_empty($$ select * from public.questions $$, 'other guests see none');
select throws_ok($$ select * from public.host_questions('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'non-admins cannot call host_questions');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select is_empty($$ select * from public.questions $$, 'admins cannot select the questions table either');
select is((select count(*)::int from public.host_questions('00000000-0000-0000-0000-00000000e001')), 5, 'host_questions returns every question');
select is(
  (select count(*)::int from jsonb_object_keys(to_jsonb((select h from public.host_questions('00000000-0000-0000-0000-00000000e001') h limit 1))) k where k ilike '%user%'),
  0, 'host_questions returns no user_id'
);
select lives_ok(
  $$ select public.show_question_on_screen('00000000-0000-0000-0000-00000000e001', (select id from public.host_questions('00000000-0000-0000-0000-00000000e001') where body = 'q3')) $$,
  'show a question on screen'
);
select is((select status::text from public.host_questions('00000000-0000-0000-0000-00000000e001') where body = 'q3'), 'approved', 'showing a pending question approves it');
select is(public.ban_question_author((select id from public.host_questions('00000000-0000-0000-0000-00000000e001') where body = 'q4')), 5, 'ban returns a count, not an identity');
select ok((select bool_and(status = 'hidden') from public.host_questions('00000000-0000-0000-0000-00000000e001')), 'ban hides all of the author''s questions');
reset role;
select ok((select screen_question_id is null and questions_rev > 0 from public.events where id = '00000000-0000-0000-0000-00000000e001'), 'ban clears the screen; host was pinged');

delete from public.questions;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ insert into public.questions (event_id, body) values ('00000000-0000-0000-0000-00000000e001', 'after ban') $$, 'P0001', null, 'banned guests cannot ask');
select throws_ok($$ update public.profiles set questions_banned = false $$, '42501', null, 'cannot unban yourself');
reset role;

select * from finish();
rollback;
