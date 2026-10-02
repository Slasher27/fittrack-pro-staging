-- Gym equipment integrity (ARCHITECTURE §3, D-035):
-- * Same-owner parent: the foreign key to gym_profiles is checked without RLS, so the owner-only
--   policies from 0004 let a member attach their own equipment row to someone else's gym profile.
--   Insert/update now also require the parent profile to be the member's own (soft-deleted ones
--   included, so a device can still sync edits to kit under a profile it has just deleted).
--   A missing parent passes the policy and is left to the foreign key, so upsert_lww still rejects
--   an orphan with 23503 (D-038, pinned by sync.test.sql); that needs a security-definer
--   lookup, since RLS hides other members' profiles from the invoker.
-- * Catalogue capabilities are server-authoritative: a catalogue item always carries the catalogue's
--   capabilities, so a stale or wrong client copy can't make exercises (un)available. Custom items
--   keep their own capabilities (the column check already requires at least one valid token).
-- * Weights must match the catalogue item's weight_kind: 'range' {min, max, step}, 'list' [kg, …],
--   'none' and custom items have no weights. Null weights are always allowed.

-- True when the gym profile is the caller's own (deleted or not) or doesn't exist (the FK decides).
create function private.gym_profile_mine_or_missing(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.user_id = (select auth.uid()) from public.gym_profiles p where p.id = pid), true);
$$;
revoke execute on function private.gym_profile_mine_or_missing(uuid) from public;
grant execute on function private.gym_profile_mine_or_missing(uuid) to authenticated;

drop policy owner_insert on public.gym_equipment;
create policy owner_insert on public.gym_equipment for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.gym_profile_mine_or_missing(gym_profile_id));

drop policy owner_update on public.gym_equipment;
create policy owner_update on public.gym_equipment for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and private.gym_profile_mine_or_missing(gym_profile_id));

create function private.gym_equipment_rules() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  kind text;
  caps text[];
  w jsonb := new.weights;
begin
  if new.catalog_id is not null then
    select c.capabilities, c.weight_kind into caps, kind
      from public.equipment_catalog c where c.id = new.catalog_id;
    if not found then
      return new;  -- the foreign key rejects an unknown catalogue id
    end if;
    new.capabilities := caps;
  end if;

  if w is null then
    return new;
  end if;
  if new.catalog_id is null then
    raise exception 'custom equipment cannot have weights' using errcode = 'check_violation';
  end if;

  if kind = 'none' then
    raise exception 'equipment "%" has no weights', new.catalog_id using errcode = 'check_violation';
  elsif kind = 'range' then
    if jsonb_typeof(w) <> 'object' then
      raise exception 'weights for "%" must be {min, max, step}', new.catalog_id using errcode = 'check_violation';
    end if;
    if (select array_agg(k order by k) from jsonb_object_keys(w) k) is distinct from array['max', 'min', 'step']
       or exists (select 1 from jsonb_each(w) e where jsonb_typeof(e.value) <> 'number') then
      raise exception 'weights for "%" must be exactly {min, max, step} numbers', new.catalog_id
        using errcode = 'check_violation';
    end if;
    if not ((w->>'min')::numeric > 0 and (w->>'min')::numeric <= (w->>'max')::numeric
            and (w->>'max')::numeric <= 500
            and (w->>'step')::numeric > 0 and (w->>'step')::numeric <= (w->>'max')::numeric) then
      raise exception 'weights for "%" need 0 < min <= max <= 500 and 0 < step <= max', new.catalog_id
        using errcode = 'check_violation';
    end if;
  elsif kind = 'list' then
    if jsonb_typeof(w) <> 'array' then
      raise exception 'weights for "%" must be a list', new.catalog_id using errcode = 'check_violation';
    end if;
    if jsonb_array_length(w) not between 1 and 40 then
      raise exception 'weights for "%" must be a list of 1 to 40 weights', new.catalog_id
        using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_array_elements(w) e
                where case when jsonb_typeof(e) = 'number'
                           then (e::text)::numeric <= 0 or (e::text)::numeric > 500
                           else true end) then
      raise exception 'weights for "%" must be numbers above 0 and at most 500 kg', new.catalog_id
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.gym_equipment_rules() from public;

create trigger gym_equipment_rules before insert or update on public.gym_equipment
  for each row execute function private.gym_equipment_rules();
