-- Topic votes: host puts queued topics to a vote, guests vote, host starts the winner.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.dev', '{"full_name":"Host"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada"}', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
update public.profiles set phone = '+2348012345678' where id <> '00000000-0000-0000-0000-0000000000ad';
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true);
insert into public.check_ins (event_id, user_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000a1', true);
insert into public.topics (id, event_id, prompt) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000e001', 'First'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000e001', 'Second'),
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-00000000e001', 'Third'),
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-00000000e001', 'Fourth');

-- Guests can't start or finish votes.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[]) $$,
  '42501', null, 'guests cannot start a topic vote'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'start First directly');
select throws_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f2']::uuid[]) $$,
  'P0001', 'Pick between 2 and 6 topics', 'needs at least 2 topics'
);
select throws_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[]) $$,
  'P0001', null, 'the live topic cannot go to a vote'
);
select lives_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f3']::uuid[]) $$,
  'vote on Third and Fourth'
);
select is((select string_agg(o.label, ',' order by o.position) from public.poll_options o join public.polls p on p.id = o.poll_id where p.kind = 'topic'), 'Third,Fourth', 'options follow queue order');
select throws_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3']::uuid[]) $$,
  'P0001', 'A topic vote is already running', 'one topic vote at a time'
);
select throws_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'P0001', null, 'Next topic waits for the vote');
select lives_ok($$ select public.create_poll('00000000-0000-0000-0000-00000000e001', 'Normal', array['Yes', 'No']) $$, 'create a normal poll');
select lives_ok($$ select public.open_poll((select id from public.polls where question = 'Normal')) $$, 'open the normal poll');
select is((select status::text from public.polls where kind = 'topic'), 'open', 'opening a normal poll leaves the topic vote open');
select throws_ok($$ select public.open_poll((select id from public.polls where kind = 'topic')) $$, 'P0002', null, 'open_poll is for normal polls only');
update public.topics set prompt = 'Third, edited' where id = '00000000-0000-0000-0000-0000000000f3';
select is((select label from public.poll_options where topic_id = '00000000-0000-0000-0000-0000000000f3'), 'Third, edited', 'editing a topic updates its vote label');
reset role;

-- Guests can see the vote and its options, and vote once they're checked in.
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.poll_options o join public.polls p on p.id = o.poll_id where p.kind = 'topic'), 2, 'guests can read vote options');
select is_empty($$ select * from public.topics where status = 'queued' $$, 'guests still cannot read queued topics');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.cast_vote((select id from public.polls where kind = 'topic'), (select id from public.poll_options where topic_id = '00000000-0000-0000-0000-0000000000f4')) $$,
  'vote for Fourth'
);
select throws_ok(
  $$ select public.finish_topic_vote((select id from public.polls where kind = 'topic'), '00000000-0000-0000-0000-0000000000f4') $$,
  '42501', null, 'guests cannot finish a vote'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select throws_ok(
  $$ select public.finish_topic_vote((select id from public.polls where kind = 'topic'), '00000000-0000-0000-0000-0000000000f2') $$,
  'P0001', null, 'winner must be one of the vote''s topics'
);
select lives_ok(
  $$ select public.finish_topic_vote((select id from public.polls where kind = 'topic'), '00000000-0000-0000-0000-0000000000f4') $$,
  'start the winner'
);
select is((select status::text from public.topics where id = '00000000-0000-0000-0000-0000000000f1'), 'done', 'previous topic is done');
select is((select status::text from public.topics where id = '00000000-0000-0000-0000-0000000000f4'), 'live', 'winner is live');
select is((select status::text from public.topics where id = '00000000-0000-0000-0000-0000000000f3'), 'queued', 'loser goes back to the queue');
select results_eq(
  $$ select prompt from public.topics where event_id = '00000000-0000-0000-0000-00000000e001' order by position, created_at $$,
  $$ values ('First'), ('Fourth'), ('Second'), ('Third, edited') $$,
  'winner moves to the front of the queue, others keep their order'
);
select is((select status::text from public.polls where kind = 'topic'), 'closed', 'vote is closed');
select is((select topic_id from public.polls where kind = 'topic'), '00000000-0000-0000-0000-0000000000f4'::uuid, 'vote remembers the winner');
select throws_ok(
  $$ select public.finish_topic_vote((select id from public.polls where kind = 'topic'), '00000000-0000-0000-0000-0000000000f3') $$,
  'P0001', 'This topic vote has already finished', 'cannot finish twice'
);
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'Next topic works again after the vote');
select is((select prompt from public.topics where status = 'live'), 'Second', 'next queued topic is live');
select is((select polls from public.event_stats('00000000-0000-0000-0000-00000000e001')), 1, 'stats count normal polls only');

-- Cancelling: votes deleted, poll closed without a winner, topics stay queued.
select throws_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f1']::uuid[]) $$,
  'P0001', null, 'done topics cannot go to a vote'
);
reset role;
insert into public.topics (id, event_id, prompt) values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-00000000e001', 'Fifth');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok(
  $$ select public.start_topic_vote('00000000-0000-0000-0000-00000000e001', array['00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f5']::uuid[]) $$,
  'start a vote to cancel'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$ select public.cast_vote((select id from public.polls where kind = 'topic' and status = 'open'), (select o.id from public.poll_options o join public.polls p on p.id = o.poll_id where p.status = 'open' and p.kind = 'topic' limit 1)) $$,
  'vote in the vote to cancel'
);
select throws_ok($$ select public.cancel_topic_vote((select id from public.polls where kind = 'topic' and status = 'open')) $$, '42501', null, 'guests cannot cancel');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.cancel_topic_vote((select id from public.polls where kind = 'topic' and status = 'open')) $$, 'host cancels');
select is((select count(*)::int from public.polls where kind = 'topic' and status = 'open'), 0, 'no open topic vote after cancel');
select is((select status::text from public.topics where id = '00000000-0000-0000-0000-0000000000f5'), 'queued', 'topics stay queued');
select throws_ok($$ select public.cancel_topic_vote((select id from public.polls where kind = 'topic' and topic_id is null order by created_at desc limit 1)) $$, 'P0001', 'This topic vote has already finished', 'cannot cancel twice');
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'Next topic works after cancel');
reset role;

-- As superuser: the admin can't read other people's votes.
select is((select count(*)::int from public.poll_votes v join public.polls p on p.id = v.poll_id where p.kind = 'topic' and p.topic_id is null), 0, 'cancelled vote has no votes left');
select is((select count(*)::int from public.poll_votes v join public.polls p on p.id = v.poll_id where p.kind = 'topic' and p.topic_id = '00000000-0000-0000-0000-0000000000f4'), 1, 'cancel twice leaves other votes alone');

select * from finish();
rollback;
