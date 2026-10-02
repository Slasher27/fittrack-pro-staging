-- Gym equipment rules (0011): same-owner parent profile, server-authoritative catalogue
-- capabilities, weights shaped by the catalogue item's weight_kind; also through upsert_lww.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create function pg_temp.sign_up(uid uuid) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', uid || '@test.local',
          '{"birth_year":1990,"adult":true,"consent_version":"2026-10-01"}', now(), now());
$$;

-- Run `sql` as a member and return the SQLSTATE ('00000' = ok) and the row count.
create function pg_temp.try_as(uid uuid, sql text, out state text, out n int) language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    execute sql;
    get diagnostics n = row_count;
    state := '00000';
  exception when others then
    state := sqlstate; n := 0;
  end;
  perform set_config('role', 'postgres', true);
end;
$$;

-- Ana inserts one equipment row (id suffix, gym profile, catalogue id or null, capabilities, weights).
create function pg_temp.ana_adds(id text, gym text, catalog text, caps text[], weights jsonb) returns text
language sql as $$
  select r.state || ':' || r.n from pg_temp.try_as('aaaaaaaa-0000-0000-0000-000000000001', format(
    'insert into public.gym_equipment (id, user_id, gym_profile_id, catalog_id, custom_name, capabilities, weights)
     values (%L, %L, %L, %L, %L, %L, %L)',
    '00000000-0000-0000-0000-0000000e' || id, 'aaaaaaaa-0000-0000-0000-000000000001', gym, catalog,
    case when catalog is null then 'My kit' end, caps, weights)) r;
$$;

select pg_temp.sign_up('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.sign_up('bbbbbbbb-0000-0000-0000-000000000002');

-- Ana: Home (a1), Travel (a2), Old (a3, soft-deleted). Ben: Garage (b1).
insert into public.gym_profiles (id, user_id, name, deleted) values
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Home', false),
  ('00000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000001', 'Travel', false),
  ('00000000-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-000000000001', 'Old', true),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000002', 'Garage', false);

-- Same-owner parent ------------------------------------------------------------------
select is(pg_temp.ana_adds('0001', '00000000-0000-0000-0000-0000000000a1', 'bench-flat', '{bench}', null),
  '00000:1', 'allow: equipment under my own gym profile');

select is(pg_temp.ana_adds('0002', '00000000-0000-0000-0000-0000000000b1', 'bench-flat', '{bench}', null),
  '42501:0', 'deny: equipment with my user_id under another member''s gym profile');

select is((select state || ':' || n from pg_temp.try_as('aaaaaaaa-0000-0000-0000-000000000001',
  $$ update public.gym_equipment set gym_profile_id = '00000000-0000-0000-0000-0000000000b1'
      where id = '00000000-0000-0000-0000-0000000e0001' $$)),
  '42501:0', 'deny: moving my equipment to another member''s gym profile');

select is((select state || ':' || n from pg_temp.try_as('aaaaaaaa-0000-0000-0000-000000000001',
  $$ update public.gym_equipment set gym_profile_id = '00000000-0000-0000-0000-0000000000a2'
      where id = '00000000-0000-0000-0000-0000000e0001' $$)),
  '00000:1', 'allow: moving my equipment to another of my gym profiles');

select is(pg_temp.ana_adds('0003', '00000000-0000-0000-0000-0000000000a3', 'bench-flat', '{bench}', null),
  '00000:1', 'allow: equipment under my own soft-deleted gym profile (sync catch-up)');

-- Catalogue capabilities are server-authoritative ------------------------------------------
select is(pg_temp.ana_adds('0010', '00000000-0000-0000-0000-0000000000a1', 'kettlebells', '{barbell}', null),
  '00000:1', 'a catalogue item with wrong capabilities is accepted');
select is((select capabilities from public.gym_equipment where id = '00000000-0000-0000-0000-0000000e0010'),
  '{kettlebell}'::text[], '... and stored with the catalogue''s capabilities');

select is((select state || ':' || n from pg_temp.try_as('aaaaaaaa-0000-0000-0000-000000000001',
  $$ update public.gym_equipment set capabilities = '{rack,smith}'
      where id = '00000000-0000-0000-0000-0000000e0010' $$)),
  '00000:1', 'an update to a catalogue item''s capabilities is accepted');
select is((select capabilities from public.gym_equipment where id = '00000000-0000-0000-0000-0000000e0010'),
  '{kettlebell}'::text[], '... and the catalogue''s capabilities are kept');

select is(pg_temp.ana_adds('0011', '00000000-0000-0000-0000-0000000000a1', null, '{bench,box}', null),
  '00000:1', 'a custom item is accepted');
select is((select capabilities from public.gym_equipment where id = '00000000-0000-0000-0000-0000000e0011'),
  '{bench,box}'::text[], '... and keeps its own capabilities');

-- Weights per weight_kind ---------------------------------------------------------------
select is(pg_temp.ana_adds('0020', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-adjustable', '{dumbbell}',
  '{"min":2.5,"max":24,"step":2.5}'), '00000:1', 'allow: a valid range on a range item');
select is(pg_temp.ana_adds('0021', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-adjustable', '{dumbbell}',
  '{"min":30,"max":24,"step":2}'), '23514:0', 'deny: a range with min > max');
select is(pg_temp.ana_adds('0022', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-adjustable', '{dumbbell}',
  '{"min":2,"max":24}'), '23514:0', 'deny: a range without step');
select is(pg_temp.ana_adds('0023', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-adjustable', '{dumbbell}',
  '{"min":2,"max":24,"step":0}'), '23514:0', 'deny: a range with step 0');
select is(pg_temp.ana_adds('0024', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-adjustable', '{dumbbell}',
  '[2,4,6]'), '23514:0', 'deny: a list on a range item');

select is(pg_temp.ana_adds('0030', '00000000-0000-0000-0000-0000000000a1', 'plates', '{plate}',
  '[1.25,2.5,5,10,20]'), '00000:1', 'allow: a valid list on a list item');
select is(pg_temp.ana_adds('0031', '00000000-0000-0000-0000-0000000000a1', 'plates', '{plate}',
  '[]'), '23514:0', 'deny: an empty list');
select is(pg_temp.ana_adds('0032', '00000000-0000-0000-0000-0000000000a1', 'plates', '{plate}',
  '[5,-10]'), '23514:0', 'deny: a negative weight in a list');
select is(pg_temp.ana_adds('0033', '00000000-0000-0000-0000-0000000000a1', 'plates', '{plate}',
  '[5,"10"]'), '23514:0', 'deny: a non-number in a list');

select is(pg_temp.ana_adds('0040', '00000000-0000-0000-0000-0000000000a1', 'bench-flat', '{bench}',
  '[10]'), '23514:0', 'deny: weights on an item without weights');
select is(pg_temp.ana_adds('0041', '00000000-0000-0000-0000-0000000000a1', null, '{dumbbell}',
  '[10]'), '23514:0', 'deny: weights on a custom item');
select is(pg_temp.ana_adds('0042', '00000000-0000-0000-0000-0000000000a1', 'dumbbells-fixed', '{dumbbell}',
  null), '00000:1', 'allow: null weights on a list item');

-- Through upsert_lww: refused rows are rejected one by one, the batch still applies ---------------
select set_config('request.jwt.claims',
  json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  public.upsert_lww('gym_equipment', jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000e0050', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
                       'gym_profile_id', '00000000-0000-0000-0000-0000000000b1', 'catalog_id', 'bench-flat',
                       'capabilities', array['bench'], 'up', 1),
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000e0051', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
                       'gym_profile_id', '00000000-0000-0000-0000-0000000000a1', 'catalog_id', 'plates',
                       'capabilities', array['plate'], 'weights', '[0]'::jsonb, 'up', 1),
    jsonb_build_object('id', '00000000-0000-0000-0000-0000000e0052', 'user_id', 'aaaaaaaa-0000-0000-0000-000000000001',
                       'gym_profile_id', '00000000-0000-0000-0000-0000000000a1', 'catalog_id', 'kettlebells',
                       'capabilities', array['barbell'], 'weights', '[8,12,16]'::jsonb, 'up', 1))),
  '{"applied": ["00000000-0000-0000-0000-0000000e0052"], "stale": [],
    "rejected": [{"id": "00000000-0000-0000-0000-0000000e0050", "error": "42501"},
                 {"id": "00000000-0000-0000-0000-0000000e0051", "error": "23514"}]}'::jsonb,
  'upsert_lww rejects another member''s parent (42501) and bad weights (23514) without failing the batch');

select is((select capabilities from public.gym_equipment where id = '00000000-0000-0000-0000-0000000e0052'),
  '{kettlebell}'::text[], 'upsert_lww stores the catalogue''s capabilities too');

reset role;
select * from finish();
rollback;
