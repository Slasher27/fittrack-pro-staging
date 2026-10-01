-- profiles: sign-up trigger (age gate, consent) and owner-only RLS.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Fixtures ----------------------------------------------------------------
create function pg_temp.sign_up(uid uuid, meta jsonb) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          uid || '@test.local', meta, now(), now());
$$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.sign_up('11111111-1111-1111-1111-111111111111',
  '{"display_name":"Ana","birth_year":1990,"adult":true,"consent_version":"2026-10-01"}');
select pg_temp.sign_up('22222222-2222-2222-2222-222222222222',
  '{"display_name":"Ben","birth_year":1985,"adult":true,"consent_version":"2026-10-01"}');

-- Schema and sign-up trigger -------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS is on');

select results_eq(
  $$ select display_name, birth_year, units, timezone, deleted from public.profiles
     where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Ana'::text, 1990, 'metric'::text, 'Africa/Johannesburg'::text, false) $$,
  'sign-up creates the profile row with defaults');

select ok((select up > 0 and synced_at is not null from public.profiles
           where id = '11111111-1111-1111-1111-111111111111'), 'sync columns have defaults');

select throws_ok(
  $$ select pg_temp.sign_up('33333333-3333-3333-3333-333333333333',
       format('{"birth_year":%s,"adult":true,"consent_version":"2026-10-01"}',
              extract(year from now())::int - 10)::jsonb) $$,
  '23514', 'sign-up requires age 18 or over', 'deny: under-18 birth year');

select throws_ok(
  $$ select pg_temp.sign_up('33333333-3333-3333-3333-333333333333',
       '{"birth_year":1990,"consent_version":"2026-10-01"}') $$,
  '23514', 'sign-up requires age 18 or over', 'deny: adult not confirmed');

select throws_ok(
  $$ select pg_temp.sign_up('33333333-3333-3333-3333-333333333333',
       '{"birth_year":1990,"adult":true}') $$,
  '23514', 'sign-up requires processing consent', 'deny: no processing consent');

select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'deny: authenticated cannot call handle_new_user directly');

-- Owner (Ana) ---------------------------------------------------------------
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

select results_eq($$ select count(*)::int from public.profiles $$, $$ values (1) $$,
  'allow: owner sees only their own row');

select results_eq(
  $$ with u as (update public.profiles set display_name = 'Ana B'
       where id = '11111111-1111-1111-1111-111111111111' returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'allow: owner updates own row');

select results_eq(
  $$ with u as (update public.profiles set display_name = 'hacked'
       where id = '22222222-2222-2222-2222-222222222222' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'deny: update another user''s row');

select throws_ok(
  $$ update public.profiles set id = '22222222-2222-2222-2222-222222222222'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'deny: re-pointing own row at another user');

select throws_ok(
  $$ insert into public.profiles (id) values ('22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'deny: insert a row for another user');

select throws_ok(
  $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'deny: hard delete of own row (soft deletes only, D-015)');

select results_eq(
  $$ with u as (update public.profiles set deleted = true
       where id = '11111111-1111-1111-1111-111111111111' returning 1) select count(*)::int from u $$,
  $$ values (1) $$, 'allow: soft delete of own row');

-- Other user (Ben) ----------------------------------------------------------
reset role;
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'deny: Ben cannot see Ana');

-- Anonymous ---------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'deny: anon select');
select throws_ok($$ insert into public.profiles (id) values (gen_random_uuid()) $$, '42501', null,
  'deny: anon insert');

select * from finish();
rollback;
