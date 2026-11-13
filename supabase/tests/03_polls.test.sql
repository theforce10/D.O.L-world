-- Live polls: one vote per checked-in guest, open polls only, counts only.
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
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'P1', array['Yes', ' No ', '']) $$, 'create poll');
select lives_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'P2', array['A', 'B', 'C']) $$, 'create second poll');
select is((select string_agg(o.label, ',' order by o.position) from public.poll_options o join public.polls p on p.id = o.poll_id where p.question = 'P1'), 'Yes,No', 'options trimmed, blanks dropped');
select throws_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'x', array['one']) $$, 'P0001', null, 'needs at least 2 options');
select throws_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'x', array['a','b','c','d','e','f','g']) $$, 'P0001', null, 'at most 6 options');
select throws_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'x', array['Same','same']) $$, 'P0001', null, 'options must differ');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is_empty($$ select * from public.polls $$, 'guests cannot see drafts');
select is_empty($$ select * from public.poll_results((select id from public.polls where question = 'P1')) $$, 'guests cannot read draft results');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.cast_vote((select id from public.polls where question = 'P1'), (select id from public.poll_options where label = 'Yes')) $$,
  'P0001', 'This poll is closed', 'cannot vote on a draft'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.open_poll((select id from public.polls where question = 'P1')) $$, 'open P1');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ select public.cast_vote((select id from public.polls where question = 'P1'), (select id from public.poll_options where label = 'Yes')) $$, 'vote Yes');
select lives_ok($$ select public.cast_vote((select id from public.polls where question = 'P1'), (select id from public.poll_options where label = 'No')) $$, 'change to No');
select is((select count(*)::int from public.poll_votes), 1, 'cannot vote twice: changing keeps one vote');
select is((select o.label from public.poll_votes v join public.poll_options o on o.id = v.option_id), 'No', 'vote changed');
select throws_ok(
  $$ insert into public.poll_votes (poll_id, option_id, user_id) select p.id, o.id, '00000000-0000-0000-0000-0000000000a1' from public.polls p join public.poll_options o on o.poll_id = p.id where p.question = 'P1' limit 1 $$,
  '42501', null, 'cannot insert votes directly'
);
select throws_ok(
  $$ select public.cast_vote((select id from public.polls where question = 'P1'), (select o.id from public.poll_options o join public.polls p on p.id = o.poll_id where p.question = 'P2' limit 1)) $$,
  'P0001', null, 'cannot vote with another poll''s option'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$ select public.cast_vote((select id from public.polls where question = 'P1'), (select id from public.poll_options where label = 'Yes')) $$,
  '42501', 'Join tonight to vote', 'cannot vote without a check-in'
);
select is_empty($$ select * from public.poll_votes $$, 'cannot see other people''s votes');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select public.cast_vote((select id from public.polls limit 1), (select id from public.poll_options limit 1)) $$, '42501', null, 'guests cannot vote');
select throws_ok($$ select * from public.poll_votes $$, '42501', null, 'guests cannot read votes');
select results_eq(
  $$ select label, votes, percent from public.poll_results((select id from public.polls where question = 'P1')) $$,
  $$ values ('Yes', 0, 0), ('No', 1, 100) $$,
  'anyone can read counts and percentages'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.open_poll((select id from public.polls where question = 'P2')) $$, 'open P2');
select is((select status::text from public.polls where question = 'P1'), 'closed', 'opening a poll closes the other one');
select throws_ok($$ select public.update_poll((select id from public.polls where question = 'P1'), 'x', array['a','b']) $$, 'P0001', null, 'only drafts can be edited');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.cast_vote((select id from public.polls where question = 'P1'), (select id from public.poll_options where label = 'Yes')) $$,
  'P0001', 'This poll is closed', 'cannot vote on a closed poll'
);
select throws_ok($$ select public.open_poll((select id from public.polls where question = 'P1')) $$, '42501', null, 'guests cannot open polls');
reset role;

select * from finish();
rollback;
