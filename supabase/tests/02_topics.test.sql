-- Live topics. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.dev', '{"full_name":"Host"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada"}', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
insert into public.topics (event_id, prompt, duration_seconds) values
  ('00000000-0000-0000-0000-00000000e001', 'First', 300),
  ('00000000-0000-0000-0000-00000000e001', 'Second', null),
  ('00000000-0000-0000-0000-00000000e001', 'Third', 600);
select is((select string_agg(prompt, ',' order by position) from public.topics), 'First,Second,Third', 'paste import keeps order');
select lives_ok($$ select public.reorder_topics('00000000-0000-0000-0000-00000000e001',
  array(select id from public.topics order by case prompt when 'Third' then 1 when 'First' then 2 else 3 end)) $$, 'reorder');
select is((select string_agg(prompt, ',' order by position) from public.topics), 'Third,First,Second', 'new order saved');
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'start first topic');
select is((select prompt from public.topics where status = 'live'), 'Third', 'first in order is live');
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'next topic');
select is((select count(*)::int from public.topics where status = 'live'), 1, 'only one live topic');
select is((select prompt from public.topics where status = 'done'), 'Third', 'previous topic is done');
select lives_ok($$ select public.extend_topic((select id from public.topics where status = 'live')) $$, '+2 min');
select is((select duration_seconds from public.topics where status = 'live'), 420, 'timer extended by 2 minutes');
select throws_ok($$ update public.topics set status = 'live' where prompt = 'Second' $$, '42501', null, 'status only changes through the RPCs');
reset role;

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is((select count(*)::int from public.topics), 2, 'guests see only live and finished topics');
select is_empty($$ select * from public.topics where status = 'queued' $$, 'guests never see the host''s upcoming list');
select ok(public.server_now() is not null, 'guests can read the server clock');
select throws_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'guests cannot run topics');
select throws_ok($$ insert into public.topics (event_id, prompt) values ('00000000-0000-0000-0000-00000000e001', 'x') $$, '42501', null, 'guests cannot add topics');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, '42501', null, 'non-admins cannot run topics');
select throws_ok($$ insert into public.topics (event_id, prompt) values ('00000000-0000-0000-0000-00000000e001', 'x') $$, '42501', null, 'non-admins cannot add topics');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';
select lives_ok($$ select public.end_round('00000000-0000-0000-0000-00000000e001') $$, 'end round');
select is_empty($$ select * from public.topics where status = 'live' $$, 'no live topic after ending the round');
select lives_ok($$ select public.advance_topic('00000000-0000-0000-0000-00000000e001') $$, 'start the last topic');
select is(public.advance_topic('00000000-0000-0000-0000-00000000e001'), null, 'returns null when nothing is left');
reset role;
update public.events set is_active = false;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select is_empty($$ select * from public.topics $$, 'topics of an inactive event are hidden from guests');
reset role;

select * from finish();
rollback;
