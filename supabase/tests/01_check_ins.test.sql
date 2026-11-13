-- Check-ins and guest access to events. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Ada Guest"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev', '{"full_name":"Bo Guest"}', 'authenticated', 'authenticated');
update public.profiles set phone = '+2348012345678' where id = '00000000-0000-0000-0000-0000000000a1';
update public.events set is_active = false;
insert into public.events (id, name, type, is_active) values
  ('00000000-0000-0000-0000-00000000e001', 'Mingle', 'mix_mingle', true),
  ('00000000-0000-0000-0000-00000000e002', 'Karaoke', 'karaoke', false);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select ok((select count(*) from public.events) >= 2, 'guests can read events');
select throws_ok($$ select * from public.check_ins $$, '42501', null, 'guests cannot read check-ins');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ insert into public.check_ins (event_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', true) $$, 'complete profile can check in');
select results_eq($$ select user_id, discoverable from public.check_ins $$, $$ values ('00000000-0000-0000-0000-0000000000a1'::uuid, false) $$, 'user_id comes from the session; hidden by default');
select throws_ok($$ insert into public.check_ins (event_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', true) $$, '23505', null, 'cannot check in twice');
select throws_ok($$ insert into public.check_ins (event_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e002', true) $$, 'P0001', 'Check-in is closed for this event', 'no check-in at karaoke or inactive events');
select throws_ok(
  $$ insert into public.check_ins (event_id, user_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-0000000000b2', true) $$,
  '42501', null, 'cannot check someone else in'
);
select lives_ok($$ update public.check_ins set discoverable = true $$, 'can change own Connect visibility');
select throws_ok($$ update public.check_ins set age_confirmed = false $$, '42501', null, 'cannot change anything else');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ insert into public.check_ins (event_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', true) $$, 'P0001', 'Please finish your profile before checking in', 'incomplete profile cannot check in');
select is_empty($$ select * from public.check_ins $$, 'cannot see other people''s check-ins');
reset role;
update public.profiles set phone = '+2348012345679' where id = '00000000-0000-0000-0000-0000000000b2';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$ insert into public.check_ins (event_id, age_confirmed) values ('00000000-0000-0000-0000-00000000e001', false) $$, '23514', null, 'must confirm 18+');
reset role;

select * from finish();
rollback;
