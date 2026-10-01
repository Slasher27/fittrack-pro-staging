-- profiles: one row per auth user (ARCHITECTURE §3), created by a trigger on sign-up.
-- Sync columns have defaults so the sign-up insert works before Phase 1 adds the sync trigger.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  birth_year int check (birth_year between 1900 and 2100),
  sex text check (sex in ('male', 'female')),
  height_cm numeric(5,1),
  start_weight_kg numeric(6,2),
  goal_weight_kg numeric(6,2),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  timezone text not null default 'Africa/Johannesburg',
  questionnaire jsonb,
  created_at timestamptz not null default now(),
  up bigint not null default (extract(epoch from now()) * 1000)::bigint,
  synced_at timestamptz not null default now(),
  deleted boolean not null default false
);

alter table public.profiles enable row level security;

-- Owner only. No delete policy: synced rows are soft-deleted (D-015); account deletion uses the service role.
-- The trainer policy (coaches(id, 'profile')) arrives with coaching in Phase 4.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke delete, truncate on public.profiles from authenticated;

-- Sign-up: the age gate (18+, D-012) and the POPIA processing consent (BUSINESS-RULES §6) are
-- required in the sign-up metadata (D-033); the consent evidence stays in auth.users.raw_user_meta_data.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  birth_year int := nullif(meta->>'birth_year', '')::int;
begin
  if coalesce((meta->>'adult')::boolean, false) is not true
     or birth_year is null
     or birth_year > extract(year from now())::int - 18 then
    raise exception 'sign-up requires age 18 or over' using errcode = 'check_violation';
  end if;
  if coalesce(meta->>'consent_version', '') = '' then
    raise exception 'sign-up requires processing consent' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, display_name, birth_year)
  values (new.id, nullif(trim(meta->>'display_name'), ''), birth_year);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
