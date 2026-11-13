-- Security checklist: guests can never read rows containing user_id, and
-- Mix & Mingle RPCs never return phone numbers or emails.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.check_ins $$, '42501', null, 'anon cannot read check_ins');
select throws_ok($$ select * from public.poll_votes $$, '42501', null, 'anon cannot read poll_votes');
select throws_ok($$ select * from public.questions $$, '42501', null, 'anon cannot read questions');
select throws_ok($$ select * from public.connect_requests $$, '42501', null, 'anon cannot read connect_requests');
select throws_ok($$ select * from public.blocks $$, '42501', null, 'anon cannot read blocks');
select throws_ok($$ select * from public.reports $$, '42501', null, 'anon cannot read reports');
select throws_ok($$ select * from public.song_requests $$, '42501', null, 'anon cannot read song_requests');
select throws_ok($$ select * from public.admins $$, '42501', null, 'anon cannot read admins');
reset role;

-- Every table in public has RLS on.
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity $$,
  'RLS is enabled on every table'
);

-- Guest-facing Mix & Mingle RPCs: no phone, email or full name columns.
select is_empty(
  $$ select p.proname, a.name
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace,
            unnest(coalesce(p.proargnames, '{}')) as a (name)
      where n.nspname = 'public'
        and p.proname in ('poll_results', 'event_recap', 'connect_candidates', 'my_matches', 'host_questions', 'my_connect_events', 'event_stats')
        and (a.name ilike '%phone%' or a.name ilike '%email%' or a.name = 'full_name') $$,
  'no phone, email or full name in Mix & Mingle RPC results'
);
select is_empty(
  $$ select a.name from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(coalesce(p.proargnames, '{}')) as a (name)
      where n.nspname = 'public' and p.proname = 'host_questions' and a.name = 'user_id' $$,
  'host_questions has no user_id column'
);

-- Anon can only call the public read RPCs.
select ok(has_function_privilege('anon', 'public.poll_results(uuid)', 'execute'), 'anon can read poll results');
select ok(has_function_privilege('anon', 'public.event_recap(uuid)', 'execute'), 'anon can read the recap');
select ok(not has_function_privilege('anon', 'public.cast_vote(uuid, uuid)', 'execute'), 'anon cannot vote');
select ok(not has_function_privilege('anon', 'public.host_questions(uuid)', 'execute'), 'anon cannot read host questions');
select ok(not has_function_privilege('anon', 'public.connect_candidates(uuid)', 'execute'), 'anon cannot list Connect candidates');
select ok(not has_function_privilege('anon', 'public.my_matches(uuid)', 'execute'), 'anon cannot read matches');
select ok(not has_function_privilege('anon', 'public.admin_contacts()', 'execute'), 'anon cannot read contacts');
select ok(not has_function_privilege('anon', 'public.admin_reports()', 'execute'), 'anon cannot read reports');

select * from finish();
rollback;
