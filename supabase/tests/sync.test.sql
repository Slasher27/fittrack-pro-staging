-- Sync plumbing: stamp trigger, upsert_lww (LWW, stale, rejected, allow-list), no hard deletes, has_pro stub.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

-- Allow-list and grants ---------------------------------------------------------
select set_eq(
  $$ select name from private.synced_tables $$,
  array['profiles', 'gym_profiles', 'gym_equipment', 'foods', 'food_logs', 'water_logs',
        'body_metrics', 'photos', 'targets'],
  'synced tables are allow-listed');

select is_empty(
  $$ select s.name from private.synced_tables s
      where has_table_privilege('authenticated', 'public.' || s.name, 'delete')
         or not exists (select 1 from pg_trigger t
                         where t.tgrelid = ('public.' || s.name)::regclass and t.tgname = 'stamp_sync') $$,
  'every synced table has the stamp trigger and no delete grant');

-- Direct writes are stamped by the server -----------------------------------------
select pg_temp.act_as('aaaaaaaa-0000-0000-0000-000000000001');

insert into public.water_logs (id, user_id, at, ml, up)
values ('00000000-0000-0000-0000-00000000a001', 'aaaaaaaa-0000-0000-0000-000000000001', now(), 250, 1);

select ok((select up > 1 and synced_at > now() - interval '1 minute' from public.water_logs
           where id = '00000000-0000-0000-0000-00000000a001'),
  'a direct write gets a server up and synced_at (trainer/RPC writes beat older device edits)');

-- upsert_lww ----------------------------------------------------------------------
select is(
  public.upsert_lww('water_logs', jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-0000-0000-00000000a002', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
    'at', now(), 'ml', 300, 'up', 1000))),
  '{"applied": ["00000000-0000-0000-0000-00000000a002"], "stale": [], "rejected": []}'::jsonb,
  'upsert_lww inserts a new row');

select results_eq(
  $$ select up, deleted from public.water_logs where id = '00000000-0000-0000-0000-00000000a002' $$,
  $$ values (1000::bigint, false) $$,
  'the device up is kept and omitted columns get their defaults');

select is(
  public.upsert_lww('water_logs', '[{"id":"00000000-0000-0000-0000-00000000a002","ml":500,"up":2000}]'),
  '{"applied": ["00000000-0000-0000-0000-00000000a002"], "stale": [], "rejected": []}'::jsonb,
  'a newer up wins');

select is(
  public.upsert_lww('water_logs', '[{"id":"00000000-0000-0000-0000-00000000a002","ml":100,"up":1500}]'),
  '{"applied": [], "stale": ["00000000-0000-0000-0000-00000000a002"], "rejected": []}'::jsonb,
  'an older up is stale and changes nothing');

select is((select ml from public.water_logs where id = '00000000-0000-0000-0000-00000000a002'), 500,
  'the newer value stays');

select is(
  public.upsert_lww('water_logs', '[{"id":"00000000-0000-0000-0000-00000000a002","deleted":true,"up":3000}]'),
  '{"applied": ["00000000-0000-0000-0000-00000000a002"], "stale": [], "rejected": []}'::jsonb,
  'a soft delete syncs like any other change');

select is(
  public.upsert_lww('water_logs', jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-0000-0000-00000000a003', 'user_id', 'bbbbbbbb-0000-0000-0000-000000000002',
                       'at', now(), 'ml', 250, 'up', 1),
    jsonb_build_object('id', '00000000-0000-0000-0000-00000000a004', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
                       'at', now(), 'ml', -5, 'up', 1),
    jsonb_build_object('id', '00000000-0000-0000-0000-00000000a005', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
                       'at', now(), 'ml', 200, 'up', 1))),
  '{"applied": ["00000000-0000-0000-0000-00000000a005"], "stale": [],
    "rejected": [{"id": "00000000-0000-0000-0000-00000000a003", "error": "42501"},
                 {"id": "00000000-0000-0000-0000-00000000a004", "error": "23514"}]}'::jsonb,
  'rows refused by RLS or a check are rejected without failing the batch');

select is(
  (public.upsert_lww('water_logs', '[{"id":"00000000-0000-0000-0000-00000000a006","ml":200}]')->'rejected'->0->>'error'),
  '23502', 'a row without up is rejected');

select throws_ok(
  $$ select public.upsert_lww('ai_usage', '[]') $$, '22023', 'not a synced table: ai_usage',
  'deny: tables outside the allow-list');

select throws_ok(
  $$ select public.upsert_lww('water_logs', (select jsonb_agg('{}'::jsonb) from generate_series(1, 501))) $$,
  '22023', null, 'deny: batches over 500 rows');

select throws_ok(
  $$ delete from public.water_logs where id = '00000000-0000-0000-0000-00000000a001' $$,
  '42501', null, 'deny: hard delete of a synced row');

select ok(public.has_pro('aaaaaaaa-0000-0000-0000-000000000001'), 'has_pro stub is true for a member');

-- Ben cannot overwrite Ana's row through the RPC ----------------------------------------
reset role;
select pg_temp.act_as('bbbbbbbb-0000-0000-0000-000000000002');
select is(
  (public.upsert_lww('water_logs', '[{"id":"00000000-0000-0000-0000-00000000a002","ml":1,"up":99999999999999}]')
     ->'rejected'->0->>'id'),
  '00000000-0000-0000-0000-00000000a002', 'deny: overwriting another member''s row via upsert_lww');

reset role;
select is((select ml from public.water_logs where id = '00000000-0000-0000-0000-00000000a002'), 500,
  'Ana''s row is unchanged');

set local role anon;
select throws_ok($$ select public.upsert_lww('water_logs', '[]') $$, '42501', null, 'deny: anon cannot call upsert_lww');

select * from finish();
rollback;
