-- Equipment: the global catalogue and members' gym profiles with their kit (ARCHITECTURE §3, PRD §4.1).

-- Capability tokens, ported unchanged from v3 (D-035). Keep in sync with lib/domain/capabilities.ts (tested).
create function private.valid_capabilities(caps text[]) returns boolean
language sql immutable set search_path = '' as $$
  select caps <@ array[
    'barbell','rack','bench','dumbbell','kettlebell','pull-up-bar','dip-station','pulley','band',
    'machine','box','rope','rower','bike','ab-wheel','ez-bar','trap-bar','landmine','smith','sled',
    'plate','med-ball','rings','trx','treadmill','foam-roller','stairs'
  ]::text[];
$$;
grant execute on function private.valid_capabilities(text[]) to authenticated;

-- Global, read-only reference data (rows in 0005_equipment_catalog_data.sql).
create table public.equipment_catalog (
  id text primary key,
  name text not null,
  category text not null check (category in
    ('free-weights', 'racks-benches', 'machines-cables', 'cardio', 'bodyweight', 'accessories')),
  capabilities text[] not null check (cardinality(capabilities) > 0 and private.valid_capabilities(capabilities)),
  weight_kind text not null check (weight_kind in ('range', 'list', 'none'))
);
alter table public.equipment_catalog enable row level security;
create policy catalog_read on public.equipment_catalog for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.equipment_catalog from anon, authenticated;

create table public.gym_profiles (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  name text not null check (length(trim(name)) between 1 and 60),
  kind text not null default 'home' check (kind in ('home', 'commercial', 'park', 'travel', 'other')),
  assume_full boolean not null default false,
  is_default boolean not null default false,
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index on public.gym_profiles (user_id, synced_at);

create table public.gym_equipment (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  gym_profile_id uuid not null references public.gym_profiles on delete cascade deferrable initially deferred,
  catalog_id text references public.equipment_catalog,
  custom_name text check (length(trim(custom_name)) between 1 and 60),
  -- Custom kit MUST map to at least one capability, or exercises can't use it.
  capabilities text[] not null check (cardinality(capabilities) > 0 and private.valid_capabilities(capabilities)),
  weights jsonb,  -- range {min, max, step} or list [kg, …], per the catalogue item's weight_kind
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false,
  check (catalog_id is not null or custom_name is not null),
  check (weights is null or jsonb_typeof(weights) in ('object', 'array'))
);
create index on public.gym_equipment (user_id, synced_at);
create index on public.gym_equipment (gym_profile_id);

select private.owner_only('public.gym_profiles');
select private.owner_only('public.gym_equipment');
select private.enable_sync('public.gym_profiles');
select private.enable_sync('public.gym_equipment');
