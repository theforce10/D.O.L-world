-- Connect: window, discoverability, mutual-only handles, block, report, unmatch.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- Admin + 5 guests: A, B, C findable; D checked in but hidden; E never checked in.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.dev', '{"full_name":"Host Person"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada Lovelace"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev', '{"full_name":"Bo Jackson"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev', '{"full_name":"Cy Twombly"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.dev', '{"full_name":"Di Hidden"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e5', 'e@test.dev', '{"full_name":"Ed Outsider"}', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
update public.profiles set phone = '+2348012345678' where id <> '00000000-0000-0000-0000-0000000000ad';
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true);
insert into public.topics (event_id, prompt) values ('00000000-0000-0000-0000-00000000e001', 'Live one');
update public.topics set status = 'live', started_at = now() where prompt = 'Live one';
insert into public.check_ins (event_id, user_id, age_confirmed, discoverable) values
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', true, true),
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2', true, true),
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3', true, true),
  ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000d4', true, false);

-- Before the event ends, Connect is closed.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select * from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$, 'P0001', 'Connect is closed for this event', 'closed until the host ends the event');
select throws_ok($$ select public.end_event('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'guests cannot end the event');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.end_event('00000000-0000-0000-0000-00000000e001') $$, 'admin ends the event');
reset role;
select ok((select ended_at is not null and not is_active from public.events where id = '00000000-0000-0000-0000-00000000e001'), 'event is ended and inactive');
select is((select count(*)::int from public.topics where status = 'live'), 0, 'ending the event finishes the live topic');

-- Who you see: findable, checked in, not you. First name + avatar only.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select first_name from public.connect_candidates('00000000-0000-0000-0000-00000000e001') order by first_name $$,
  $$ values ('Bo'), ('Cy') $$,
  'candidates exclude yourself and non-discoverable guests'
);
select throws_ok(
  $$ select public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2') $$,
  'P0001', 'Add your Snapchat first so people you match with can find you', 'a Snapchat handle is needed to connect'
);
reset role;
update public.profiles set snapchat = 'ada.l' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set snapchat = 'bo_j' where id = '00000000-0000-0000-0000-0000000000b2';
update public.profiles set snapchat = 'cy-t' where id = '00000000-0000-0000-0000-0000000000c3';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2'), false, 'one-way request is not a match');
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'no handles before it is mutual');
select throws_ok(
  $$ select public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000d4') $$,
  'P0001', null, 'cannot request a non-discoverable guest'
);
select throws_ok($$ select * from public.connect_requests $$, '42501', null, 'requests table is not readable directly');
select throws_ok($$ select * from public.blocks $$, '42501', null, 'blocks table is not readable directly');
reset role;

-- B can't tell A asked.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select requested or matched from public.connect_candidates('00000000-0000-0000-0000-00000000e001') where first_name = 'Ada'),
  false, 'a one-way request is never revealed to the other person'
);
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'B sees no match yet');
select is(public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1'), true, 'mutual request is a match');
select results_eq(
  $$ select first_name, snapchat from public.my_matches('00000000-0000-0000-0000-00000000e001') $$,
  $$ values ('Ada', 'ada.l') $$,
  'B sees Ada''s handle once mutual'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select first_name, snapchat from public.my_matches('00000000-0000-0000-0000-00000000e001') $$,
  $$ values ('Bo', 'bo_j') $$,
  'A sees Bo''s handle once mutual'
);
select throws_ok(
  $$ select public.withdraw_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2') $$,
  'P0001', null, 'cannot withdraw a matched request (unmatch instead)'
);
select lives_ok($$ select public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3') $$, 'A asks C');
select lives_ok($$ select public.withdraw_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3') $$, 'A withdraws from C');
select is(
  (select requested from public.connect_candidates('00000000-0000-0000-0000-00000000e001') where first_name = 'Cy'),
  false, 'withdrawn request is gone'
);
reset role;

-- C (no match) sees nothing about A and B.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'third party sees no one else''s match');
select lives_ok($$ select public.block_user('00000000-0000-0000-0000-0000000000a1') $$, 'C blocks A');
select results_eq(
  $$ select first_name from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$,
  $$ values ('Bo') $$,
  'blocker no longer sees the blocked person'
);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq(
  $$ select first_name from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$,
  $$ values ('Bo') $$,
  'blocked person no longer sees the blocker'
);
select throws_ok(
  $$ select public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3') $$,
  'P0001', null, 'cannot request someone who blocked you'
);
select lives_ok(
  $$ select public.report_user('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3', 'harassment', 'test') $$,
  'guests can report'
);
select is_empty($$ select * from public.reports $$, 'reporters cannot read reports');
select throws_ok($$ select * from public.admin_reports() $$, '42501', null, 'guests cannot open the reports page');
reset role;

-- Block undoes a match.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok($$ select public.block_user('00000000-0000-0000-0000-0000000000a1') $$, 'B blocks A');
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'block undoes the match for the blocker');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'block undoes the match for the blocked person');
reset role;

-- Unmatch hides the handle on both sides.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok($$ select public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2') $$, 'C asks B');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(public.request_connect('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3'), true, 'B and C match');
select lives_ok($$ select public.unmatch('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000c3') $$, 'B unmatches C');
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'unmatched: B no longer sees C');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is_empty($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'unmatched: C no longer sees B');
reset role;

-- Outsiders, anon and admins.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e5","role":"authenticated"}';
select throws_ok($$ select * from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'guests who did not check in cannot use Connect');
select is_empty($$ select * from public.my_connect_events() $$, 'outsider has no Connect events');
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select * from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'anon cannot call connect_candidates');
select throws_ok($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'anon cannot call my_matches');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select is((select count(*)::int from public.admin_reports()), 1, 'admin sees the report');
select is((select reported_name from public.admin_reports()), 'Cy Twombly', 'admin report names the reported person');
reset role;

-- The window: 72 hours. Matches stay readable after it closes.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.my_connect_events()), 1, 'Connect event listed while open');
reset role;
update public.events set ended_at = now() - interval '73 hours' where id = '00000000-0000-0000-0000-00000000e001';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select * from public.connect_candidates('00000000-0000-0000-0000-00000000e001') $$, 'P0001', 'Connect is closed for this event', 'closed after 72 hours');
select lives_ok($$ select * from public.my_matches('00000000-0000-0000-0000-00000000e001') $$, 'matches stay readable after the window');
select is_empty($$ select * from public.my_connect_events() $$, 'Connect event no longer listed');
reset role;

-- Going live again re-opens the event.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.set_active_event('00000000-0000-0000-0000-00000000e001') $$, 'admin re-activates');
reset role;
select ok((select ended_at is null and is_active from public.events where id = '00000000-0000-0000-0000-00000000e001'), 're-activating clears ended_at');

select * from finish();
rollback;
