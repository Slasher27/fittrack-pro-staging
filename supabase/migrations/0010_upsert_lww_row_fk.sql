-- upsert_lww: check deferred foreign keys inside each row's savepoint (ARCHITECTURE §5: one bad row
-- must never stall the outbox). Same function as 0002 plus `set constraints all immediate`: a row
-- whose parent is missing (rejected or purged) is now rejected with 23503 instead of failing the batch.

create or replace function public.upsert_lww(tbl text, rows jsonb) returns jsonb
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
  -- Check foreign keys row by row: deferred checks would only run at commit, outside the per-row
  -- savepoints, so one orphan row would fail the whole batch on every retry and stall the outbox.
  set constraints all immediate;
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
