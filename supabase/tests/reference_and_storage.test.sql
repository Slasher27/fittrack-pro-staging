-- Read-only reference data (equipment_catalog, global foods), the photos bucket and ai_usage.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.sign_up(uid uuid) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', uid || '@test.local',
          '{"birth_year":1990,"adult":true,"consent_version":"2026-10-01"}', now(), now());
$$;
create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.sign_up('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.sign_up('bbbbbbbb-0000-0000-0000-000000000002');

-- Fixtures as postgres: one global food, one ai_usage row each.
insert into public.foods (id, owner_id, name, source, per100)
values ('00000000-0000-0000-0000-00000000f001', null, 'Maize meal (pap), cooked', 'seed',
        '{"kcal":72,"protein_g":1.7,"carbs_g":15.6,"fat_g":0.3}');
insert into public.ai_usage (user_id, kind, model) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'parse_food', 'test-model'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'parse_food', 'test-model');

-- Catalogue -------------------------------------------------------------------------
select set_eq(
  $$ select distinct c from public.equipment_catalog, unnest(capabilities) c $$,
  array['ab-wheel','band','barbell','bench','bike','box','dip-station','dumbbell','ez-bar','foam-roller',
        'kettlebell','landmine','machine','med-ball','plate','pull-up-bar','pulley','rack','rings','rope',
        'rower','sled','smith','stairs','treadmill','trap-bar','trx'],
  'every capability token is provided by at least one catalogue item');

select throws_ok(
  $$ insert into public.gym_equipment (id, user_id, gym_profile_id, custom_name, capabilities)
     values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', gen_random_uuid(), 'Sandbag', '{sandbag}') $$,
  '23514', null, 'deny: custom kit with an unknown capability');

select throws_ok(
  $$ insert into public.gym_equipment (id, user_id, gym_profile_id, custom_name, capabilities)
     values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', gen_random_uuid(), 'Sandbag', '{}') $$,
  '23514', null, 'deny: custom kit that maps to no capability');

select ok(not (select public from storage.buckets where id = 'photos'), 'photos bucket is private');

select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');
select ok((select count(*) > 30 from public.equipment_catalog), 'allow: members read the catalogue');
select throws_ok($$ insert into public.equipment_catalog values ('x', 'X', 'cardio', '{bike}', 'none') $$,
  '42501', null, 'deny: members write the catalogue');
select throws_ok($$ update public.equipment_catalog set name = 'X' $$, '42501', null, 'deny: members update the catalogue');

-- Global foods -------------------------------------------------------------------------
select results_eq($$ select name from public.foods where owner_id is null $$, $$ values ('Maize meal (pap), cooked'::text) $$,
  'allow: members read global foods');
select results_eq(
  $$ with u as (update public.foods set name = 'hacked' where id = '00000000-0000-0000-0000-00000000f001' returning 1)
     select count(*)::int from u $$, $$ values (0) $$, 'deny: members update global foods');
select throws_ok(
  $$ insert into public.foods (id, owner_id, name, per100) values (gen_random_uuid(), null, 'Fake', '{"kcal":1}') $$,
  '42501', null, 'deny: members create global foods');
select throws_ok(
  $$ insert into public.foods (id, owner_id, name) values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', 'No nutrition') $$,
  '23514', null, 'deny: a food without per100 or servings');

-- Photos bucket -------------------------------------------------------------------------
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('photos', 'aaaaaaaa-0000-0000-0000-000000000001/p1.jpg', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'allow: upload into own folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('photos', 'bbbbbbbb-0000-0000-0000-000000000002/p2.jpg', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'deny: upload into another member''s folder');

-- ai_usage ---------------------------------------------------------------------------
select results_eq($$ select user_id from public.ai_usage $$, $$ values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid) $$,
  'allow: members read only their own AI usage');
select throws_ok(
  $$ insert into public.ai_usage (user_id, kind, model) values ('aaaaaaaa-0000-0000-0000-000000000001', 'x', 'y') $$,
  '42501', null, 'deny: members write AI usage (the coach function meters it)');

-- Ben ----------------------------------------------------------------------------------
reset role;
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is_empty($$ select 1 from storage.objects where bucket_id = 'photos' $$,
  'deny: another member cannot see Ana''s photos');
select results_eq(
  $$ with u as (update storage.objects set name = 'bbbbbbbb-0000-0000-0000-000000000002/stolen.jpg'
                 where bucket_id = 'photos' returning 1) select count(*)::int from u $$,
  $$ values (0) $$, 'deny: another member cannot move Ana''s photos');

-- Anonymous ---------------------------------------------------------------------------
reset role;
set local role anon;
select ok((select count(*) > 30 from public.equipment_catalog), 'allow: anon reads the catalogue (onboarding)');
select throws_ok($$ select 1 from public.foods $$, '42501', null, 'deny: anon reads foods');

select * from finish();
rollback;
