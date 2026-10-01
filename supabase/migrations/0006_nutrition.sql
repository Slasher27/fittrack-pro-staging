-- Nutrition: foods (global + own), food logs and water logs (ARCHITECTURE §3).

create table public.foods (
  id uuid primary key,
  owner_id uuid references public.profiles on delete cascade deferrable initially deferred,  -- null = global
  name text not null check (length(trim(name)) between 1 and 120),
  brand text,
  barcode text,
  group_name text,
  kind text not null default 'food' check (kind in ('food', 'recipe')),
  source text not null default 'user' check (source in ('seed', 'user', 'off', 'ai')),
  per100 jsonb,                              -- {kcal, protein_g, carbs_g, fat_g} per 100 g or 100 ml
  servings jsonb not null default '[]',      -- [{label, grams null, kcal?, protein_g?, carbs_g?, fat_g?}]
  ingredients jsonb,                         -- recipes: [{food_id, grams}]
  cooked_g numeric(8,1) check (cooked_g > 0),
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false,
  check (jsonb_typeof(servings) = 'array'),
  check (per100 is not null or jsonb_array_length(servings) > 0)
);
create index on public.foods (owner_id, synced_at);
create index on public.foods (barcode) where barcode is not null;

-- Own foods: owner only. Global foods (owner_id null): everyone signed in can read, nobody can write.
alter table public.foods enable row level security;
create policy foods_select on public.foods for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
create policy foods_insert on public.foods for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy foods_update on public.foods for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke all on public.foods from anon;

create table public.food_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  eaten_at timestamptz not null,
  meal_slot text check (meal_slot in ('breakfast', 'lunch', 'snack', 'dinner')),
  food_id uuid references public.foods on delete set null deferrable initially deferred,
  name text not null,
  grams numeric(8,1) check (grams >= 0),
  servings numeric(7,2) check (servings >= 0),
  serving_label text,
  -- Snapshot at log time: editing a food never rewrites history.
  kcal numeric(7,1) not null default 0,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  estimated boolean not null default false,
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false,
  check (grams is not null or servings is not null)
);
create index on public.food_logs (user_id, synced_at);
create index on public.food_logs (user_id, eaten_at);

create table public.water_logs (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  at timestamptz not null,
  ml int not null check (ml > 0 and ml <= 5000),
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index on public.water_logs (user_id, synced_at);

select private.owner_only('public.food_logs');
select private.owner_only('public.water_logs');
select private.enable_sync('public.foods');
select private.enable_sync('public.food_logs');
select private.enable_sync('public.water_logs');
