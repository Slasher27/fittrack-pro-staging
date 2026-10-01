-- has_pro(uid): true for every signed-in user until entitlements land in Phase 6 (ARCHITECTURE §3, D-018).
-- Phase 6 replaces the body with the real check over `entitlements`.
create function public.has_pro(uid uuid) returns boolean
language sql stable set search_path = '' as $$
  select uid is not null;
$$;

revoke execute on function public.has_pro(uuid) from public, anon;
grant execute on function public.has_pro(uuid) to authenticated;
