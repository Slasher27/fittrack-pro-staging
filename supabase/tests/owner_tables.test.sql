-- Owner-only synced tables (Phase 1): for each, the owner can insert/read/update/soft-delete;
-- another member can't see, change or insert as the owner; anon gets nothing; hard delete is denied.
begin;
create extension if not exists pgtap with schema extensions;
select plan(64);

create function pg_temp.sign_up(uid uuid) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', uid || '@test.local',
          '{"birth_year":1990,"adult":true,"consent_version":"2026-10-01"}', now(), now());
$$;

-- Run `sql` as a role/user and return the SQLSTATE ('00000' = ok) and the row count.
create function pg_temp.try_as(uid uuid, sql text, out state text, out n int) language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', case when uid is null then 'anon' else 'authenticated' end, true);
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

create function pg_temp.insert_sql(tbl text, r jsonb) returns text language sql as $$
  select format('insert into public.%1$I (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, %3$L)',
                tbl, (select string_agg(format('%I', k), ', ') from jsonb_object_keys(r) k), r);
$$;

-- 8 assertions per table.
create function pg_temp.check_owner_table(tbl text, r jsonb) returns setof text language plpgsql as $$
declare
  ana uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  ben uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  id text := r->>'id';
  res record;
begin
  select * into res from pg_temp.try_as(ben, pg_temp.insert_sql(tbl, r));
  return next is(res.state, '42501', format('%s: deny insert as another member', tbl));

  select * into res from pg_temp.try_as(ana, pg_temp.insert_sql(tbl, r));
  return next is(res.state || ':' || res.n, '00000:1', format('%s: allow owner insert', tbl));

  select * into res from pg_temp.try_as(ana, format('select 1 from public.%I where id = %L', tbl, id));
  return next is(res.n, 1, format('%s: owner reads own row', tbl));

  select * into res from pg_temp.try_as(ben, format('select 1 from public.%I', tbl));
  return next is(res.n, 0, format('%s: another member sees nothing', tbl));

  select * into res from pg_temp.try_as(ben, format('update public.%I set deleted = true where id = %L', tbl, id));
  return next is(res.n, 0, format('%s: another member cannot update', tbl));

  select * into res from pg_temp.try_as(null, format('select 1 from public.%I', tbl));
  return next is(res.state, '42501', format('%s: deny anon', tbl));

  select * into res from pg_temp.try_as(ana, format('delete from public.%I where id = %L', tbl, id));
  return next is(res.state, '42501', format('%s: deny hard delete', tbl));

  select * into res from pg_temp.try_as(ana, format('update public.%I set deleted = true where id = %L', tbl, id));
  return next is(res.state || ':' || res.n, '00000:1', format('%s: allow owner soft delete', tbl));
end;
$$;

select pg_temp.sign_up('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.sign_up('bbbbbbbb-0000-0000-0000-000000000002');

-- Parent rows for child tables (inserted as postgres).
insert into public.gym_profiles (id, user_id, name)
values ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Home');

select * from pg_temp.check_owner_table('gym_profiles',
  '{"id":"00000000-0000-0000-0000-000000000001","user_id":"aaaaaaaa-0000-0000-0000-000000000001","name":"Park","kind":"park","up":1}');
select * from pg_temp.check_owner_table('gym_equipment',
  '{"id":"00000000-0000-0000-0000-000000000002","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "gym_profile_id":"00000000-0000-0000-0000-0000000000a1","catalog_id":"kettlebells",
    "capabilities":["kettlebell"],"weights":[12,16,24],"up":1}');
select * from pg_temp.check_owner_table('food_logs',
  '{"id":"00000000-0000-0000-0000-000000000003","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "eaten_at":"2026-10-01T08:00:00+02","meal_slot":"breakfast","name":"Oats","grams":80,"kcal":300,"up":1}');
select * from pg_temp.check_owner_table('water_logs',
  '{"id":"00000000-0000-0000-0000-000000000004","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "at":"2026-10-01T09:00:00+02","ml":250,"up":1}');
select * from pg_temp.check_owner_table('body_metrics',
  '{"id":"00000000-0000-0000-0000-000000000005","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "date":"2026-10-01","weight_kg":81.4,"waist_cm":86,"up":1}');
select * from pg_temp.check_owner_table('photos',
  '{"id":"00000000-0000-0000-0000-000000000006","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "taken_on":"2026-10-01","storage_path":"aaaaaaaa-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000006.jpg","up":1}');
select * from pg_temp.check_owner_table('targets',
  '{"id":"00000000-0000-0000-0000-000000000007","user_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "effective_from":"2026-10-01","kcal":2100,"protein_g":176,"carbs_g":210,"fat_g":72,"up":1}');
select * from pg_temp.check_owner_table('foods',
  '{"id":"00000000-0000-0000-0000-000000000008","owner_id":"aaaaaaaa-0000-0000-0000-000000000001",
    "name":"Ana''s granola","per100":{"kcal":450,"protein_g":10,"carbs_g":60,"fat_g":18},"up":1}');

select * from finish();
rollback;
