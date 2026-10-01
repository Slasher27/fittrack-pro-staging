-- AI metering (ARCHITECTURE §7, §9). Written only by the `coach` Edge Function (service role); members read their own.

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  model text not null,
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cost_cents int not null default 0 check (cost_cents >= 0)
);
create index on public.ai_usage (user_id, at);

alter table public.ai_usage enable row level security;
create policy ai_usage_select_own on public.ai_usage for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.ai_usage from anon;
revoke insert, update, delete, truncate on public.ai_usage from authenticated;
