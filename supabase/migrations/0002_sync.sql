-- Offline sync plumbing (ARCHITECTURE §5, D-005, D-015):
-- * stamp trigger: synced_at = server clock on every write; `up` = server clock unless the
--   write came through upsert_lww (which keeps the device's `up` for last-write-wins);
-- * upsert_lww(table, rows): batch push from a device's outbox, row by row, RLS applies;
-- * private.enable_sync(table): attaches the trigger, allow-lists the table, forbids hard deletes.

create schema if not exists private;
revoke all on schema private from public;
-- Not exposed by the API (only `public` is); members need usage for the allow-list lookup.
grant usage on schema private to authenticated;

create table private.synced_tables (name text primary key);
grant select on private.synced_tables to authenticated;

create function private.stamp_sync() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.synced_at := clock_timestamp();
  if coalesce(current_setting('app.lww', true), '') <> '1' then
    new.up := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  end if;
  return new;
end;
$$;

create function private.enable_sync(t regclass) returns void
language plpgsql set search_path = '' as $$
begin
  execute format(
    'create trigger stamp_sync before insert or update on %s for each row execute function private.stamp_sync()', t);
  -- Synced rows are soft-deleted (deleted = true); hard deletes never reach other devices.
  execute format('revoke delete, truncate on %s from anon, authenticated', t);
  insert into private.synced_tables (name)
    values ((select c.relname from pg_class c where c.oid = t)) on conflict do nothing;
end;
$$;

-- Owner-only RLS for a member's own rows: select/insert/update where owner_col = me.
-- (Trainer policies are added on top in Phase 4; deletes are soft, so there is no delete policy.)
create function private.owner_only(t regclass, owner_col text default 'user_id') returns void
language plpgsql set search_path = '' as $$
begin
  execute format('alter table %s enable row level security', t);
  execute format('create policy owner_select on %s for select to authenticated using (%I = (select auth.uid()))', t, owner_col);
  execute format('create policy owner_insert on %s for insert to authenticated with check (%I = (select auth.uid()))', t, owner_col);
  execute format('create policy owner_update on %s for update to authenticated using (%I = (select auth.uid())) with check (%I = (select auth.uid()))', t, owner_col, owner_col);
  execute format('revoke all on %s from anon', t);
end;
$$;

revoke execute on all functions in schema private from public;
alter default privileges in schema private revoke execute on functions from public;

-- Push a batch of rows for one synced table. Each row may omit columns (defaults apply on insert).
-- Returns {"applied": [ids], "stale": [ids], "rejected": [{"id", "error"}]}:
--   stale    = the server already has a newer `up`; the device should pull that row;
--   rejected = RLS or a check refused the row; the device drops it from its outbox and re-pulls.
create function public.upsert_lww(tbl text, rows jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  table_cols text[];
  cols text[];
  r jsonb;
  existing jsonb;
  hit boolean;
  applied jsonb := '[]';
  stale jsonb := '[]';
  rejected jsonb := '[]';
begin
  if not exists (select 1 from private.synced_tables where name = tbl) then
    raise exception 'not a synced table: %', tbl using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 500 then
    raise exception 'rows must be an array of at most 500 rows' using errcode = 'invalid_parameter_value';
  end if;

  select array_agg(a.attname::text) into table_cols
    from pg_attribute a
   where a.attrelid = format('public.%I', tbl)::regclass and a.attnum > 0 and not a.attisdropped;

  perform set_config('app.lww', '1', true);
  for r in select * from jsonb_array_elements(rows) loop
    begin  -- each row in its own subtransaction (savepoint)
      -- Patch semantics: fields the device didn't send keep their server values. (Postgres checks the
      -- INSERT policy against the proposed row even when it ends up updating, so it must be complete.)
      execute format('select to_jsonb(t) from public.%I t where t.id = ($1->>''id'')::uuid', tbl)
        into existing using r;
      r := coalesce(existing, '{}'::jsonb) || r;
      select array_agg(k) into cols from jsonb_object_keys(r) k where k = any (table_cols);
      if not ('id' = any (cols) and 'up' = any (cols)) then
        raise exception 'row needs id and up' using errcode = 'not_null_violation';
      end if;
      hit := null;
      execute format(
        'insert into public.%1$I as t (%2$s) select %2$s from jsonb_populate_record(null::public.%1$I, $1)
           on conflict (id) do update set (%3$s) = row(%4$s) where t.up <= excluded.up returning true',
        tbl,
        (select string_agg(format('%I', c), ', ') from unnest(cols) c),
        (select string_agg(format('%I', c), ', ') from unnest(cols) c where c <> 'id'),
        (select string_agg(format('excluded.%I', c), ', ') from unnest(cols) c where c <> 'id'))
        into hit using r;
      if hit then applied := applied || to_jsonb(r->>'id');
      else stale := stale || to_jsonb(r->>'id');
      end if;
    exception when others then
      rejected := rejected || jsonb_build_object('id', r->>'id', 'error', sqlstate);
    end;
  end loop;
  perform set_config('app.lww', '', true);

  return jsonb_build_object('applied', applied, 'stale', stale, 'rejected', rejected);
end;
$$;

revoke execute on function public.upsert_lww(text, jsonb) from public, anon;
grant execute on function public.upsert_lww(text, jsonb) to authenticated;

select private.enable_sync('public.profiles');
