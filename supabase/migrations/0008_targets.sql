-- Nutrition targets (ARCHITECTURE §3). Append-only by convention: a change is a new row; the current row is
-- the latest effective_from ≤ today, ties broken by the larger `up`.
-- Phases 1–3 ship owner-only policies; Phase 4 replaces them with the consent-aware ones (coached_with).

create table public.targets (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade deferrable initially deferred,
  effective_from date not null,
  kcal int not null check (kcal between 800 and 10000),
  kcal_train int check (kcal_train between 800 and 10000),   -- training days (v3 kcalTrain)
  protein_g int not null check (protein_g between 0 and 1000),
  carbs_g int not null check (carbs_g between 0 and 2000),
  fat_g int not null check (fat_g between 0 and 1000),
  water_ml int not null default 3000 check (water_ml between 0 and 10000),
  set_by text not null default 'self' check (set_by in ('self', 'trainer', 'generated')),
  set_by_id uuid,
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);
create index on public.targets (user_id, synced_at);

select private.owner_only('public.targets');
select private.enable_sync('public.targets');
