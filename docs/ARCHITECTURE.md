# Architecture

Status: draft v2 (2026-10-01, revised after review). Read DECISIONS.md for the *why*.

## 1. Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| App framework | **SvelteKit (Svelte 5, runes)**, `adapter-static`, SPA fallback | One app, three route groups: member/client, trainer workspace, auth. No Node server: server logic lives in Supabase. |
| Language | **TypeScript** in `src/lib/**`, plain `<script lang="ts">` in components | Money, entitlements and permissions are too important for untyped code. No decorators, no class hierarchies. |
| Styling | **Tailwind CSS v4** with design tokens as CSS custom properties | Tokens in `src/lib/ui/tokens.css`. Trainer branding overrides only the brand tokens (§8). |
| Backend | **Supabase**: Postgres, Auth, RLS, Storage, Realtime, Edge Functions (Deno) | A **new project** `fittrack-pro` (staging + prod). v3's project stays untouched. |
| Local data | **IndexedDB** via a small wrapper ported from v3 `db.js` (or `idb`, 1 kB) | Offline-first logging and training. |
| Sync | Per-table last-write-wins with soft deletes and a server-stamped cursor | §5. |
| AI | `coach` Edge Function, ported from v3 (model pinned server-side, per-user metering) | §7. |
| Payments | **RevenueCat** (iOS/Android in-app purchase), **Paystack** (web subscriptions, trainer billing, split payments) | Phase 6. Webhooks → Edge Functions → `subscriptions`, `entitlements`, `ledger`. |
| Native shells | **Capacitor** (Phase 6) | Same build, wrapped. Until then: an installable PWA. |
| Hosting | Netlify (static) | Preview deploys per branch. |
| Tests | Vitest (domain, data), Playwright + axe-core (e2e + accessibility), pgTAP (RLS) | §10. |

## 2. Repo layout

```
fittrack-pro/
├── CLAUDE.md
├── docs/                      ← this spec pack (incl. design/)
├── scripts/                   migrate-v3.ts (Phase 3, run locally)
├── src/
│   ├── routes/
│   │   ├── (auth)/            sign-in, sign-up, invite/[code], reset
│   │   ├── (app)/             today, train, train/session/[id], nutrition, progress, coach, settings, onboarding
│   │   └── (trainer)/trainer/ clients, clients/[id], programs, programs/[id], library, checkins, messages, brand, billing
│   │                          (the member Coach tab owns /coach; the trainer workspace lives under /trainer)
│   ├── lib/
│   │   ├── domain/            pure TS, no I/O: dates, units, targets, equipment, generator, adapt, validate,
│   │   │                      analytics (e1RM, PRs, volume), food (per-100 g maths, recipes), entitlements
│   │   ├── data/              local db (IndexedDB), repositories, outbox, sync engine
│   │   ├── ai/                coach client: context snapshot, tool definitions, tool loop, describe-to-log
│   │   ├── supabase/          client, typed queries (generated types)
│   │   ├── ui/                tokens.css, components (Button, Chip, Card, Field, Sheet, Tabs, Stat, SetRow…)
│   │   └── theme/             brand → tokens, contrast fixer
│   └── app.html
├── supabase/
│   ├── migrations/            numbered SQL, one concern per file
│   ├── seed/                  equipment catalogue, exercises (ported 318), foods (SA staples + retailer products)
│   ├── functions/             coach, invite-accept, notify (Web Push), nightly, paystack-webhook, revenuecat-webhook
│   └── tests/                 pgTAP RLS tests
└── tests/                     unit/, e2e/
```

Rule: **`lib/domain` is pure.** It has no Supabase, no IndexedDB and no DOM, and every function has unit tests. Ported v3 logic lands here first.

## 3. Data model

Conventions:
- `uuid` primary keys, generated on the client for offline rows. Exception: catalogue tables keyed by a text slug (`equipment_catalog.id`, global `exercises.id`); user-created exercises use a uuid string in the same text column.
- `user_id` (or `owner_id`/`author_id`) on every owned row. Money as **integer cents** (`amount_cents int`, `currency text default 'ZAR'`). Mass in kg `numeric(6,2)`, lengths in cm, volumes in ml. Timestamps `timestamptz`.
- **Synced tables** carry `up bigint not null` (ms stamp, LWW), `synced_at timestamptz not null` (server, set by trigger) and `deleted boolean not null default false` (soft delete). `+sync` below means these three. §5 lists the synced tables.
- Synced tables have **no unique constraints other than the primary key** (an offline device can't check them, and one violation would block its whole outbox). Foreign keys between synced tables are `deferrable initially deferred`.
- Enumerations are `text` with a `check (… in (…))`.
- **Deletion:** owned rows reference `profiles` with `on delete cascade`. Rows shared between two people (`coaching_relationships`, `checkins`, `messages`, `notes`, `nutrition_guidance`) reference them with nullable columns and `on delete set null`, so the other party keeps the history ("Former client" / "Former coach"). `ledger.user_id`/`counterparty_id` are `on delete set null` (anonymised, kept for tax). Optional references between synced tables (`food_logs.food_id`, `workouts.program_id`/`program_day_id`, `workout_blocks.exercise_id`, `programs.origin_trainer_id`) are `on delete set null`.

```sql
-- People and roles
profiles (id uuid pk references auth.users on delete cascade, display_name text, birth_year int, sex text,
          height_cm numeric(5,1), start_weight_kg numeric(6,2), goal_weight_kg numeric(6,2),
          units text default 'metric', timezone text default 'Africa/Johannesburg',
          questionnaire jsonb,             -- onboarding answers, v3 profile keys (limitations = questionnaire.injuries)
          created_at, +sync)
admins (user_id uuid pk references profiles)                 -- set by the owner in SQL; no client policies
trainers (user_id uuid pk references profiles, business_name text, welcome_message text,
          status text check (status in ('trial','active','grace','lapsed')),   -- trial = no card on file (D-027)
          brand jsonb,                     -- {primary:'#hex', logo_square:path, logo_wide:path}
          created_at)
coaching_relationships (id uuid pk, trainer_id uuid null references profiles on delete set null,
          client_id uuid null references profiles on delete set null,
          status text check (status in ('active','paused','ended')),
          consent jsonb not null,          -- §4.1
          modules jsonb not null default '{}',  -- trainer hides client tabs (after pilot, D-029)
          invite_code text, accepted_at, paused_at, ended_at,
          ended_by text check (ended_by in ('trainer','client','system')), end_reason text,
          referral_until timestamptz,
          check (trainer_id <> client_id))                   -- no self-coaching (S12)
create unique index one_active_coach on coaching_relationships (client_id)
          where status in ('active','paused');               -- D-010 (not a synced table, so allowed)
invites (code text pk, trainer_id uuid references profiles, email text null, expires_at, revoked_at,
          used_by uuid null, used_at)

-- Equipment
equipment_catalog (id text pk, name, category, capabilities text[], weight_kind text)  -- range|list|none
gym_profiles (id uuid pk, user_id, name, kind text, assume_full boolean default false,
          is_default boolean, +sync)
gym_equipment (id uuid pk, user_id, gym_profile_id, catalog_id text null, custom_name text null,
          capabilities text[] not null check (cardinality(capabilities) > 0),  -- custom kit MUST map
          weights jsonb,                   -- range {min,max,step} or list [kg…] per weight_kind
          +sync)

-- Training
exercises (id text pk, owner_id uuid null,           -- null = global catalogue (seeded, read-only)
          name, aliases text[], pattern, primary_muscles text[], secondary_muscles text[],
          requires text[],                 -- capability tokens, ALL required
          metric text,                     -- reps|time
          load_type, per_side boolean, default_rest_s int, type text,   -- type = v3 EX_TYPES (progression advice)
          cues text, +sync)
programs (id uuid pk, author_id uuid, client_id uuid null,      -- client_id is immutable after insert (trigger)
          source_template_id uuid null,    -- the template this copy came from (D-025)
          title, description text,
          source text check (source in ('custom','generated','trainer','template','shared','coached')),
          origin_trainer_id uuid null references profiles on delete set null,   -- §4.2
          status text check (status in ('draft','active','archived')),
          starts_on date, weeks int null,  -- weeks null = one week that repeats
          schedule jsonb,                  -- {"1":0,"3":1,"5":2}: ISO weekday → day_index; absent = rest day
          meta jsonb,                      -- rationale, weekly_focus, shared_from (v3 fields)
          created_at, +sync)
program_days (id uuid pk, program_id, week int null, day_index int, title,
          gym_profile_id uuid null, +sync)
          -- the day for a date: week = floor((date - starts_on)/7) % weeks + 1 (or null when weeks is null),
          -- then the program_days row with that week and schedule[isodow(date)] as day_index.
program_items (id uuid pk, day_id, position int, exercise_id text null,
          mode text check (mode in ('reps','time','rounds')),
          target jsonb,                    -- v3 structured target: {sets, reps:{min,max}|'amrap'} · {sets, secs} · {rounds}
          items jsonb null,                -- circuits (mode 'rounds', exercise_id null): [{exercise_id, reps|secs, per_side}]
          load jsonb, rest_s int, per_side boolean, type text null, notes, +sync)
workouts (id uuid pk, user_id, date, title, started_at, finished_at,
          program_id uuid null, program_day_id uuid null, gym_profile_id uuid null, notes,
          led_by uuid null,                -- trainer id when run in session mode (D-021, after pilot)
          +sync)
workout_blocks (id uuid pk, user_id, workout_id, position int,  -- one per exercise (or circuit) in the session
          exercise_id text null, mode text, target jsonb, items jsonb null, rest_s int,
          per_side boolean, swapped_from text null, +sync)
workout_sets (id uuid pk, user_id, workout_id, block_id, set_index int,
          weight_kg numeric(6,2), band text null, reps int, secs int, rest_s int, rpe numeric(3,1), done boolean, +sync)  -- band: level when the load is a band (T40)
          -- reps mode: weight_kg × reps · time mode: work secs + rest_s · rounds mode: secs = round time (optional)

-- Nutrition and body
foods (id uuid pk, owner_id uuid null,               -- null = global (seeded SA staples, retailer products)
          name, brand, barcode, group_name,
          kind text check (kind in ('food','recipe')),
          source text check (source in ('seed','user','off','ai')),   -- off = Open Food Facts import
          per100 jsonb null,               -- {kcal, protein_g, carbs_g, fat_g} per 100 g or 100 ml
          servings jsonb not null default '[]',   -- [{label, grams null, kcal?, protein_g?, carbs_g?, fat_g?}]
          ingredients jsonb null, cooked_g numeric null,   -- recipes: [{food_id, grams}] + cooked weight
          +sync,
          check (per100 is not null or jsonb_array_length(servings) > 0))
food_logs (id uuid pk, user_id, eaten_at timestamptz,
          meal_slot text null check (meal_slot in ('breakfast','lunch','snack','dinner')),
          food_id uuid null, name, grams numeric null, servings numeric null, serving_label text null,
          kcal, protein_g, carbs_g, fat_g,  -- snapshot at log time; editing a food never rewrites history
          estimated boolean default false, +sync,
          check (grams is not null or servings is not null))
water_logs (id uuid pk, user_id, at timestamptz, ml int, +sync)
body_metrics (id uuid pk, user_id, date, weight_kg, waist_cm, chest_cm, arm_cm, thigh_cm, steps int, notes, +sync)  -- steps: manual daily entry (T33)
schedule_overrides (id uuid pk, user_id, program_id, date date,      -- D-023: per-date changes to the plan
          day_index int null,              -- null = rest day on that date; otherwise run that program day
          set_by uuid null, +sync)         -- set_by = trainer id when a coach moved it
habits (id uuid pk, user_id, title text, per_week int check (per_week between 1 and 7),  -- D-022, after pilot (D-029)
          assigned_by uuid null, active boolean default true, +sync)  -- assigned_by = trainer id when a coach set it
habit_logs (id uuid pk, user_id, habit_id, date, done boolean, +sync)  -- one per habit per day; the app allows backfill up to 7 days
photos (id uuid pk, user_id, taken_on date, storage_path, pose text, note, remote boolean default false,
          checkin_id uuid null, +sync)   -- plain uuid until Phase 4 adds the FK to checkins (on delete set null)
targets (id uuid pk, user_id, effective_from date, kcal int, kcal_train int null,  -- kcal_train: training days
          protein_g, carbs_g, fat_g, water_ml int default 3000,
          set_by text check (set_by in ('self','trainer','generated')), set_by_id uuid, +sync)
          -- append-only by convention: a change is a new row; the current row is the latest effective_from ≤ today,
          -- ties broken by the larger up

-- Coaching
checkins (id uuid pk, relationship_id, client_id uuid null, trainer_id uuid null, week_of date, answers jsonb,
          submitted_at, reviewed_at, reply text)
messages (id uuid pk, relationship_id, sender_id uuid null, body text, created_at, read_at)
notes (id uuid pk, relationship_id, author_id uuid null, client_id uuid null, target text, target_id uuid,
          body text, created_at, +sync)
          -- coach notes on a day/item/log; synced so they show offline in context
nutrition_guidance (id uuid pk, relationship_id, trainer_id uuid null, client_id uuid null, body text null,
          storage_path text null, created_at, +sync)   -- trainer's own meal guidance (text or PDF)
push_subscriptions (id uuid pk, user_id, endpoint text unique, keys jsonb, created_at)

-- Money and access
subscriptions (id uuid pk, user_id, provider text, provider_ref, product, status, current_period_end)
entitlements (id uuid pk, user_id,               -- one row per (source, ref) period
          source text check (source in ('store','web','coaching','trial','continuation','comp')),
          ref text, starts_at, ends_at)
ledger (id uuid pk, occurred_at, kind text, user_id, counterparty_id, amount_cents int, currency, ref, meta jsonb)
          -- kinds: trainer_charge (per-active-client fees), client_payment, platform_fee (D-031), processor_fee,
          --        store_fee, referral_credit, refund, comp. Insert-only (no update/delete grants).
ai_usage (id uuid pk, user_id, at, kind text, model text, input_tokens int, output_tokens int, cost_cents int)
audit_log (id uuid pk, at, actor_id, action text, subject text, meta jsonb)
feature_flags (key text pk, enabled boolean, rules jsonb)   -- read by everyone, written by admins (Phase 6)
```

`has_pro(uid)` is a SQL function over `entitlements` (BUSINESS-RULES §4). Until Phase 6
it returns `true` for every signed-in user (entitlements don't exist yet); Phase 6 replaces it.
`active_seats(trainer uuid, month date)` is a SECURITY DEFINER function (callable for
`auth.uid()` only, or by the service role), not a view, so it can't bypass RLS by accident.

**Which program a member follows today:** the newest (`starts_on`, then `up`) `active` program
with `client_id = me and author_id <> me` (assigned by a current trainer); if none, the newest `active`
program with `author_id = me and source <> 'template'` (this includes programs passed to them by
`end_relationship`). Activating an own program sets the member's other own `active` programs to
`archived`. Templates are always `status='draft'`.
This is a domain rule (`lib/domain`), not a constraint, because offline devices can't check constraints.
**Which day today (D-023):** dates are the member's local dates (their timezone, never the coach's).
A `schedule_overrides` row for the date wins over `schedule` (newest `up` if several). Moving a workout
writes two overrides (the old date becomes rest, the new date gets the day). "Insert a rest day" writes
overrides that push the next 7 days by one. A scheduled day with no finished workout shows as
**"Catch up"** for 7 days, then simply "Skipped". Never a red cross.

## 4. Row-level security

Every table has RLS on. Helpers (all `language sql stable security definer set search_path = public`):

```sql
-- the caller coaches this client right now (any consent)
create function is_coaching(client uuid) returns boolean as $$
  select exists (select 1 from coaching_relationships r
    where r.trainer_id = auth.uid() and r.client_id = client and r.status in ('active','paused'));
$$ ...;

-- …and the client consented to this category
create function coaches(client uuid, category text) returns boolean as $$
  select exists (select 1 from coaching_relationships r
    where r.trainer_id = auth.uid() and r.client_id = client and r.status in ('active','paused')
      and coalesce((r.consent->>category)::boolean, false));
$$ ...;

-- the caller is coached by this trainer right now
create function is_coached_by(trainer uuid) returns boolean as $$
  select exists (select 1 from coaching_relationships r
    where r.client_id = auth.uid() and r.trainer_id = trainer and r.status in ('active','paused'));
$$ ...;

-- the caller is coached, with this consent, by someone right now (targets rule)
create function coached_with(category text) returns boolean as $$
  select exists (select 1 from coaching_relationships r
    where r.client_id = auth.uid() and r.status in ('active','paused')
      and coalesce((r.consent->>category)::boolean, false));
$$ ...;

-- every trainer WRITE also needs this (S7: a lapsed trainer is read-only)
create function trainer_can_write() returns boolean as $$
  select exists (select 1 from trainers t
    where t.user_id = auth.uid() and t.status in ('trial','active','grace'));
$$ ...;

create function is_admin() returns boolean as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$ ...;
```

**Column-level rules** use Postgres column grants (`grant update (col, …) on t to authenticated`)
plus a row policy, or an RPC. RLS alone can't restrict columns.

| Table | Owner / client | Trainer | Notes |
|-------|----------------|---------|-------|
| profiles | all on own row | select if `coaches(id,'profile')` | Names of the other party in any of my relationships (any status) come from `party_names()` (SECURITY DEFINER), so client lists, "Coached by" and message senders work without the `profile` consent. |
| trainers | select own; client select if `is_coached_by(user_id)` (brand, names) | update own row, columns `business_name`, `welcome_message`, `brand` only (column grant) | Insert only through `become_trainer()` (creates `status='trial'`). `status` is written only by the service role. |
| coaching_relationships | client: select own; update column `consent` only (column grant, policy `client_id = auth.uid()`) | select own | Created only by `invite-accept`. Status changes only through RPCs: `pause_client`/`resume_client` (trainer, needs `trainer_can_write()`), `end_relationship` (§4.2). |
| invites | — | insert/select own (insert needs `trainer_can_write()`); update own column `revoked_at` only (column grant) | Anonymous landing calls `invite_valid(code)` (SECURITY DEFINER), which returns only `business_name`, `brand`, `welcome_message` for an unused, unexpired, unrevoked code. |
| gym_profiles, gym_equipment, workouts, workout_blocks, workout_sets | all | select if `coaches(user_id,'workouts')`. Workouts, blocks and sets: insert/update where the workout's `led_by = auth.uid()`, `coaches(user_id,'workouts')` and `trainer_can_write()` (session mode, after pilot, D-021) | Clients can edit or delete a trainer-led workout like any of their own. |
| food_logs, water_logs | all | select if `coaches(user_id,'nutrition')` | |
| targets | select; insert/update unless `coached_with('nutrition')` (then read-only, "ask your coach"). Phases 1–3 ship owner-only policies; Phase 4 replaces them with these | select if `coaches(user_id,'nutrition')`; insert with `set_by='trainer'` if also `trainer_can_write()` | |
| body_metrics | all | select if `coaches(user_id,'body')` | |
| schedule_overrides | all | select if `coaches(user_id,'workouts')`; insert/update where `set_by = auth.uid()`, `coaches(user_id,'workouts')` and `trainer_can_write()` | Client-owned, so nothing transfers on `ended`. |
| habits, habit_logs | all | select if `coaches(user_id,'habits')`. Habits: insert/update where `assigned_by = auth.uid()`, `coaches(user_id,'habits')` and `trainer_can_write()` | Rows are always client-owned, so ending a relationship transfers nothing. The client can archive a trainer-assigned habit. |
| photos | all | select if `coaches(user_id,'photos')` | Check-in photos are governed by the `photos` consent too: the check-in form only offers a photo step when it's on. |
| programs | select if `author_id = me` or `client_id = me`. Insert/update if `author_id = me` and (`client_id` is null or `= me`) | insert/update if `author_id = me`, `client_id` is another user, `is_coaching(client_id)` and `trainer_can_write()` | A lapsed trainer can still edit their own training program. A client never writes a program they didn't author. |
| program_days, program_items | follow their program (policy joins to `programs`) | same | |
| exercises (`owner_id` not null) | owner all (a lapsed trainer can still edit their own exercises, D-016); client select if `is_coached_by(owner_id)` (exercises the trainer used in their program) | select if `coaches(owner_id,'workouts')` | Global rows (`owner_id` null): select for everyone. |
| foods (`owner_id` not null) | owner all | select if `coaches(owner_id,'nutrition')` | Global rows: select for everyone. |
| checkins | select own; write only through `submit_checkin()` | select if `coaches(client_id,'checkins')`; reply only through `reply_checkin()` (needs `trainer_can_write()`) | |
| messages | participants select (any status); insert if sender = me and the relationship is active/paused; recipient updates column `read_at` only | same; insert also needs `trainer_can_write()` | Both sides keep the message history after `ended`, read-only. |
| notes, nutrition_guidance | client select where `client_id = me` (any status) | author insert/update if `is_coaching(client_id)` and `trainer_can_write()`; select own (any status) | The client keeps guidance and notes after `ended`. |
| subscriptions, entitlements, ledger | select own | select own | Writes: service role only (webhooks, nightly, `end_relationship`, admin tools). |
| ai_usage | select own | select own | Insert: the `coach` function (service role). |
| audit_log | — | — | Select if `is_admin()`. Insert from RPCs and functions only. |
| push_subscriptions | all on own rows | — | |
| equipment_catalog | select for everyone | select | Seeded, read-only. |

**Storage buckets:**
- `photos` (private): `{user_id}/{photo_id}.jpg`. Owner all; trainer select if `coaches((storage.foldername(name))[1]::uuid, 'photos')`.
- `guidance` (private): `{trainer_id}/{client_id}/{id}.pdf`. Trainer select own folder always; insert if `is_coaching(client)` and `trainer_can_write()`. Client select where the second folder is their id (also after `ended`).
- `brand` (**public read**, because the invite page is anonymous and emails embed the logo): `{trainer_id}/logo-square.png|svg`, `logo-wide.*`, ≤ 512 kB. Trainer writes own folder if `trainer_can_write()`.

**Every policy has a pgTAP test** proving both *allowed* and *denied* cases. Denied cases include:
an ended relationship, revoked consent, another trainer's client, a write by a `lapsed` trainer,
a client editing a trainer-authored program, and a trainer changing `status` on their own `trainers` row.

### 4.1 Consent

`coaching_relationships.consent` keys: `profile`, `workouts`, `nutrition`, `body`, `photos`, `checkins`, and `habits` (added with habits, after the pilot, D-029).
`profile` covers the questionnaire, goals and limitations. `workouts` covers workouts, gym profiles and
equipment (the program builder's conflict check needs it). All default to `true` except `photos`
(`false`). The client sets them on the invite consent screen and can change them at any time.

### 4.2 Ending a relationship

`end_relationship(relationship_id, reason)` is a SECURITY DEFINER RPC callable by either
participant, the nightly job (S6, S7) and account deletion (S8, S9). In one transaction it:

1. sets `status='ended'`, `ended_at`, `ended_by`, `end_reason`, and `referral_until` when BUSINESS-RULES §3.4 holds;
2. for every program with `author_id = trainer and client_id = client`: inserts a **copy** for the
   trainer (`client_id` null, `source='template'`, `status='draft'`, new ids for the program, days and
   items) so the trainer keeps their IP; then **transfers the original** to the client
   (`author_id = client`, `source='coached'`, `origin_trainer_id = trainer`);
3. copies every trainer-owned exercise referenced by the transferred programs or by the client's
   `workout_blocks` into a client-owned exercise (new id) and rewrites those references, including the
   `exercise_id`s inside the `items` jsonb of `program_items` and `workout_blocks` (circuits);
4. from Phase 6: closes the client's `coaching` entitlement and writes a 14-day `continuation` row (S3),
   unless S7 already gave 30 days.

Every row it updates gets a new `synced_at` from the trigger, so the client's devices pull the changes.
Transferring (not copying) to the client keeps their local rows, `workouts.program_day_id` references
and history valid with no local purge. Afterwards the trainer sees nothing of the client's data:
they are no longer the author, and `coaches()` is false. Messages, notes and guidance stay readable,
read-only, as in the table above. Account deletion on either side calls this **before** deleting
rows, so nothing is lost to a cascade.

## 5. Offline sync

- The member/client app is offline-first for logging, training, gym profiles and reading assigned programs. The trainer workspace is **online-only** and queries Postgres directly.
- **Synced tables:** profiles, gym_profiles, gym_equipment, exercises, programs, program_days, program_items, workouts, workout_blocks, workout_sets, foods, food_logs, water_logs, body_metrics, schedule_overrides, photos, targets, notes, nutrition_guidance (plus habits and habit_logs when habits are built, after the pilot). **Online only:** trainers, coaching_relationships, invites, checkins, messages, billing tables. Screens that use them show the offline state.
- Each synced table has a local IndexedDB store with the same shape. Writes go local first through a repository (`put`, `del`), which stamps `up = Date.now()` and enqueues an outbox entry.
- **Push:** outbox → `upsert_lww(table, rows)` RPC (batch ≤ 500 rows, parents before children), conflict on `id`, applied only if `excluded.up >= current.up`. The RPC is SECURITY INVOKER (RLS still applies), accepts only synced table names (the allow-list grows with each phase's tables) and builds SQL with `format('%I', …)`. Each row runs in its own savepoint: a row rejected by RLS or a check is returned in a `rejected` list instead of failing the batch. The client drops rejected rows from the outbox, re-pulls them and shows a toast, so one bad row can never stall the outbox.
- **Stamping:** a `before insert or update` trigger on every synced table sets `synced_at = clock_timestamp()`. If the write did not come through `upsert_lww` (which sets `set_config('app.lww','1',true)`), the trigger also sets `up = (extract(epoch from clock_timestamp())*1000)::bigint`, so trainer, RPC and Edge Function writes win over older device edits.
- **Pull:** per table, `select … where synced_at > cursor - interval '10 seconds'`, then apply each row with LWW. The new cursor is the largest `synced_at` received. Server stamps mean late offline pushes are still picked up. The overlap makes the pull idempotent and covers transactions that commit after their stamp; it holds because Supabase's `statement_timeout` for `authenticated` (8 s) keeps client-driven transactions shorter than the overlap. Service-role jobs that write synced tables commit in small batches (each well under 8 s).
- **Deletes are soft.** App code sets `deleted = true`, a tombstone that syncs like any other change. It never runs `delete` on a synced table, or other devices would never find out. Hard deletes happen only in account deletion (BUSINESS-RULES §6) and the nightly purge of tombstones older than 90 days. The purge skips tombstones that live rows still reference (e.g. a deleted food used by an old log), so history never breaks.
- **Visibility changes.** A cursor only sees rows that *changed*, so nothing may become visible or invisible without changing:
  - `programs.client_id` is immutable. Assigning a program (`assign_program(program_id, client_id)`) always **creates a copy** for the client (new rows, fresh stamps) and archives the client's previous assigned program. Unassigning sets `status='archived'`.
  - Relationship changes alter which trainer-owned rows a client can see (exercises, notes, guidance). The member app fetches its relationships and its trainer's branding on launch, on focus and when it comes online, caches them locally, and runs a **full pull** whenever the set of relationships or their statuses differs from the cache. Consent changes only refresh the cache (they change what the trainer sees, not what the client sees), but the UI re-reads it, e.g. to show targets read-only.
- **Full pull** (per table: fetch everything visible, replace the local rows that have no pending outbox entry, **delete local rows the server no longer returns** (unless they have a pending outbox entry), then push the outbox) on the first sign-in on a device, after a local DB schema upgrade, after a relationship change, and when the cursor is older than the 90-day purge horizon. In that last case, outbox entries for rows the server no longer has and whose `up` is older than the horizon are dropped, not pushed, so purged rows can't come back.
- **First run on a device:** pull before creating any defaults (default gym profile, first targets), as in v3, so two devices never create duplicates.
- Programs authored by the trainer are pulled by the client (`client_id = me`). The client never writes them; what actually happened goes into `workouts`/`workout_blocks`/`workout_sets` (`swapped_from`).
- Photo blobs: upload to Storage `photos/{uid}/{id}.jpg`, then re-put the record with `remote = true` (stamped, so it syncs). Other devices download images for records that are `remote` but have no local blob. Same approach as v3.
- **Device-local (never synced):** the in-progress workout draft, AI coach transcripts, past chats and weekly reviews (as in v3), cached branding and relationships, sync cursors, the outbox.

## 6. Training and nutrition engine (`lib/domain`)

- `capabilities(gymProfile)` → a Set of tokens. `assume_full` = everything. Replaces v3 `hasEquip()` regex matching with explicit catalogue tokens.
- `canDo(exercise, caps)` = `exercise.requires ⊆ caps`.
- `alternatives(exercise, caps, n)` — port of `exAlternatives()`: same pattern and a shared muscle, available first, then same load type.
- `buildProgram(questionnaire, gyms, catalogue)` — **deterministic** split selection (days/week × goal × experience), filling slots with `canDo` exercises, then volume and rep ranges by goal.
- `refineWithAI` (optional) — the coach Edge Function with a forced `create_plan` tool, given only catalogue exercises the gym can do. Output goes through `validatePlan()`. **Note:** v3's `validateGeneratedPlan()` only *warns* (unknown names are kept as custom exercises, missing kit is flagged, kcal more than 400 from the formula is flagged). Pro **hardens** it: resolve names to the catalogue, **reject** unknown exercises and exercises the gym can't do, clamp sets/reps/rest to sane ranges, and keep the kcal warning. Port v3's resolution logic and tests first, then add the rejections with their own tests.
- `adaptDay(day, gymProfile)` — at workout start: replaces items the location can't do with the best alternative and records `swapped_from` on the workout block. The trainer sees swaps in the client log.
- `nutritionTargets(profile)` — exact port of v3 `app/onboard.js` `nutritionTargets()`. Defaults: 80 kg, 175 cm, age 40, male, activity `moderate`, goal `recomp`. BMR = round(Mifflin-St Jeor: `10w + 6.25h − 5a + 5` male / `− 161` female). TDEE = round(BMR × activity: low 1.3, moderate 1.45, active 1.6, very 1.75; unknown → 1.45). Goal delta: fatloss −500, recomp −300, health 0, strength 0, muscle +200; unknown → −300. kcal = max(1400, round((TDEE + delta) / 10) × 10). Protein 2.2 g/kg, fat 0.9 g/kg, carbs = remainder ÷ 4 with a floor of 80 g. `kcal_train` = kcal + 150 for recomp and fatloss only (else null). Goal weight, when none is given and both current `bodyFat` and the goal body fat are known: lean mass (w × (1 − BF/100)) ÷ (1 − goal BF/100), rounded to 0.5 kg; else null. Oracle: v3 `tests/onboard-test.js` (its checks are ranges); the Pro tests must also pin exact outputs computed from the v3 function for a table of inputs.
- **Workout logger timers (T40):** rest, interval and circuit timers store an `ends_at` timestamp, never a ticking counter, so they stay right when the phone locks or the client switches to a music app. On return the logger catches up (and moves to the next interval if one ended). A sound/vibration plays at the end while visible. Background alerts need native local notifications (Capacitor, Phase 6). Until then the PWA shows the remaining time in a sticky notification where the platform allows it.
- `analytics` — port of v3 `app/analytics.js`: exercise history and bests, e1RM (Epley), PR detection against pre-session bests, session summary, weekly volume and hard sets by muscle.
- `food` — port of v3 `foodPer100()` and the recipe maths (per-100 g cooked = ingredient totals × 100 ÷ cooked weight).

## 7. AI coach

Port v3's `coach` Edge Function and client tool loop (`lib/ai`, preview → accept). In Pro:
- **Solo members:** the full coach (program edits, targets, logging, weekly review).
- **Coached clients:** the coach **cannot change** trainer-authored programs (`author_id ≠ me`), nor targets when `coached_with('nutrition')`. It can explain, log, and suggest a change, which becomes a message to the trainer.
- **Trainers:** "Generate draft", "Summarise this client's week", "Draft check-in reply". Metered against the trainer's account.
- Metering: `ai_usage` (with `model`) and daily and monthly caps per account type (free member, Pro member, trainer). The model and limits are config, not code.
- Transcripts stay on the device (§5), as in v3. Only the last N turns are sent.

## 8. Theming / trainer branding

- Base tokens are fixed (neutrals, data colours, status colours, dark mode). Trainers set **`brand.primary`** (hex) and a logo (SVG/PNG, square and optional wide, ≤ 512 kB, in the public `brand` bucket, §4).
- `deriveBrandTokens(hex)` in `lib/theme` converts to OKLCH and produces `--brand`, `--brand-hover`, `--brand-ink`, `--brand-tint`, `--on-brand` for light and dark (DESIGN-SYSTEM §2). It **adjusts lightness until `--on-brand` on `--brand` reaches 4.5:1**, `--brand-ink` on `--brand-tint` reaches 4.5:1, and `--brand` reaches 3:1 against `--surface`. The trainer sees a preview, and a note if the colour was adjusted.
- Applied while a client has an active or paused relationship. The member app fetches the trainer's branding with its relationships (§5) and caches it, so it works offline. Solo members and ended clients get the default theme.
- Logo placements: Today header ("Coached by …"), splash after sign-in, invite page. Never inside data visualisations. (Emails and PDF exports come with the email provider and exports in Phase 6.)

## 9. Edge Functions, payments and webhooks

- `coach`: verify the JWT, enforce caps, call the model, write `ai_usage`.
- `invite-accept`: verify the JWT and the code (unused, unexpired, unrevoked, and when the invite has an `email`, matching the signed-in user's email), refuse self-coaching (S12) and a second active coach (S5), record consent, create the relationship as `active`, mark the invite used, write an audit row. From Phase 6 it also writes the `coaching` entitlement and pauses the client's Paystack web subscription (S2).
- `notify`: Web Push (§12).
- `nightly`: end relationships paused for more than 60 days (S6), purge tombstones older than 90 days (§5), send "check-in due" pushes (§12) — from Phase 4. From Phase 6 also: expire entitlements, count each trainer's active clients (`active_seats()`), apply the free 3, bill each other active client either the per-client fee or, if a `client_payment` exists for them that month, the capped platform fee (D-031), then the monthly cap (D-027) and build invoice lines, start and stop referral credits (BUSINESS-RULES §3.4), move trainers through grace to `lapsed` and end their relationships after the continuation period (S7).
- `paystack-webhook`: verify the signature, upsert `subscriptions`, write `entitlements` and `ledger` rows. Idempotent on the provider event id.
- `revenuecat-webhook`: the same for store purchases. The app user id is the Supabase uid.
- No client ever writes billing tables. All writes use the service role inside Edge Functions.

## 10. Quality gates

- **Unit:** `lib/domain` ≥ 90% line coverage. Port v3 Playwright expectations where they encode business logic (targets, plan validation, analytics).
- **Sync:** unit tests for LWW conflicts, soft deletes, late offline pushes, full pull after a relationship change, the purge horizon, and "assign a program → the client pulls its days and items".
- **RLS:** pgTAP suite runs in CI (`supabase test db`).
- **E2E:** Playwright flows for every PRD §6 story, at 390 px and 1280 px widths, with `@axe-core/playwright` (zero serious or critical violations).
- **Performance:** Today screen interactive in < 1.5 s on a mid-range Android over 4G with a warm cache. JS budget for the member app ≤ 200 kB gzipped.
- CI: GitHub Actions running lint, typecheck, unit, RLS and e2e on every PR. A Netlify preview per PR.

## 11. Environments and secrets

`local` (Supabase CLI + Docker; the only backend in Phases 0–2), `staging` (hosted, from Phase 3, D-032), `prod`. Region: the closest available to
South Africa, recorded in the privacy policy. Secrets live only in Supabase/Netlify env:
`ANTHROPIC_API_KEY`, `VAPID_PRIVATE_KEY` (Web Push), `PAYSTACK_SECRET` and `REVENUECAT_WEBHOOK_SECRET`
(Phase 6), `SERVICE_ROLE_KEY` (Edge Functions and the local migration script only).
`VAPID_PUBLIC_KEY` is public and lives in the app config.

## 12. Notifications and messages

- **Messages** are online-only rows. While the Coach tab or the trainer's Messages screen is open,
  new rows arrive through **Supabase Realtime** (a channel filtered by `relationship_id`; RLS applies).
- **Web Push** reaches people when the app is closed. The member app asks for permission at a
  meaningful moment (after joining a trainer, or when turning on reminders), never at first launch,
  and stores the subscription in `push_subscriptions`. iOS delivers Web Push only to an installed
  PWA (iOS 16.4+), so the invite flow tells iPhone clients to add the app to their home screen.
- The `notify` Edge Function is triggered by database webhooks on a new message, a check-in reply
  and a program assignment, and by the nightly job for "check-in due" reminders. It sends through
  VAPID, deletes subscriptions the push service reports as gone (404/410), and never puts health
  data in the payload (just "New message from Duwayne").
- **Notification preferences** (`profiles.notify_prefs jsonb`): per type (messages, check-in due, workout reminder, program assigned) on/off, and reminders daily or on training days only. `notify` checks them before sending (COMPETITOR-INSIGHTS T27).
- A coach note on a workout, exercise or log also posts a linked line in the message thread, so comments are never buried (T25).
- The Capacitor builds (Phase 6) switch to native push behind the same `notify` function.
- **Email** (invite emails, receipts) needs a transactional email provider, chosen in Phase 6. Until
  then an email invite is the device share sheet (or `mailto:`) with the link and code prefilled.
