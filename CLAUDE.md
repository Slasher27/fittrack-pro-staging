# CLAUDE.md — FitTrack Pro

Coaching platform for personal trainers and their clients, which also works as a
standalone tracker. SvelteKit + Tailwind v4 + Supabase. Offline-first member app,
online trainer workspace.

## Start of every session

1. Read `docs/PROGRESS.md` (current status + last session) and the current phase in `docs/ROADMAP.md`.
2. **Pre-flight declaration.** Before editing anything, state in 3–6 lines: the phase and checklist item you're working on, the files you expect to touch, the tests you'll add or run, and anything in the docs that is ambiguous. If the work isn't on the current phase's checklist, stop and ask.
3. If a request conflicts with `docs/BUSINESS-RULES.md`, `docs/DECISIONS.md` or `docs/DESIGN-SYSTEM.md`, say so and ask. Don't silently pick one.

## End of every session

Update `docs/PROGRESS.md`: the status block, ticked checklist items, exit-criteria evidence and a session-log entry. New decisions get a `D-0xx` entry in `docs/DECISIONS.md`.

## Commands

```
pnpm dev                 # app on http://localhost:5173
pnpm check               # svelte-check + tsc
pnpm lint
pnpm test                # vitest (lib/domain, lib/data; + integration tests when .env points at local Supabase)
pnpm test:e2e            # playwright + axe at 390 and 1280 px (needs `pnpm supabase start` and .env, see .env.example)
pnpm supabase start      # local stack (Docker; the CLI is a devDependency)
pnpm supabase db reset   # re-run migrations + seed
pnpm supabase test db    # pgTAP RLS tests
pnpm db:types            # regenerate src/lib/supabase/types.ts
```

## Non-negotiables

- **Data ownership and access:** clients own their data. Trainer access goes through RLS (`coaches()` helper) only. **Never** use the service role in client code. Every new table ships with RLS **and** pgTAP allow/deny tests in the same PR.
- **Offline-first logging:** food, water, weight and workout logging must work with no network. Write through repositories (`lib/data`), never straight to Supabase from a member-app component.
- **Sync correctness (ARCHITECTURE §5, D-015):** never hard-`delete` a synced row (set `deleted = true`). Never change `programs.client_id` (assigning copies, unassigning archives). No unique constraints on synced tables besides the primary key.
- **Accessibility:** DESIGN-SYSTEM §5 is a merge gate. Use real elements (`button`, `a`, `label`, `fieldset`, `table`). Icon buttons need a label. Never use colour alone. 44 px targets.
- **Design tokens only:** no raw hex values in components. Use `var(--…)` tokens or the Tailwind theme mapped to them. Branding may override only the `--brand*` tokens.
- **Money:** integer cents (`amount_cents`), `currency` alongside, the ledger is insert-only, and webhooks are idempotent on provider event id. Clients never write billing tables.
- **AI:** only through the `coach` Edge Function. Outputs touching programs go through `validatePlan()`. AI never edits trainer-authored programs for coached clients.
- **Pure domain:** `src/lib/domain/**` has no I/O and full unit tests. Port v3 logic here (see below) with its behaviour preserved, adding tests first.

## Conventions

- DRY, minimal, no over-engineering: no state libraries, no ORMs, no UI kits. Svelte 5 runes for state, with small stores only where they're shared.
- Keep files small: one component per file, 300 lines is a smell.
- Naming: tables `snake_case` plural, TS `camelCase`, components `PascalCase.svelte`. Routes follow ARCHITECTURE §2.
- Migrations: `supabase/migrations/NNNN_short_name.sql`, one concern each, forward-only. Never edit a migration that has reached staging.
- Units: store metric (kg, cm, ml, grams). Convert only at display.
- Dates: store `timestamptz`. A "day" is in the user's local timezone (default Africa/Johannesburg). Use the helpers in `lib/domain/dates.ts`.
- Commits: conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). One checklist item per PR where practical.
- Every screen ships its loading, empty, error, offline and no-permission states.

## Porting from v3 (`C:\Websites\FitTrack-app`, read-only)

| v3 source                                                               | Pro destination                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `app/seed.js`, `app/exercises.js` (318 exercises)                       | `supabase/seed/exercises.sql` — equipment → `requires` capability tokens           |
| `app/library.js` `hasEquip`, `exAlternatives`, `planAffected`           | `lib/domain/equipment.ts` (explicit catalogue capabilities, no regex on free text) |
| `app/onboard.js` steps, `nutritionTargets()`, `validateGeneratedPlan()` | `routes/(app)/onboarding`, `lib/domain/targets.ts`, `lib/domain/validate.ts`       |
| `app/coachai.js` tool loop, `supabase/functions/coach`                  | `lib/ai/*`, `supabase/functions/coach`                                             |
| `app/foodai.js` describe-to-log, recipes, `foodPer100()`                | `lib/ai/food.ts`, `lib/domain/food.ts`                                             |
| `app/session.js`, `app/analytics.js` (logger modes, e1RM, PRs)          | `routes/(app)/train/session/[id]`, `lib/domain/analytics.ts`                       |
| `app/sync.js` LWW + tombstones                                          | `lib/data/sync.ts` (per table, server-stamped cursor; ARCHITECTURE §5)             |
| `tests/*.js` Playwright suites                                          | Use them as behaviour oracles when porting                                         |

## Design references

Before building a screen, open its file in `docs/design/` (listed in DESIGN-SYSTEM §7) and match the layout, hierarchy and copy. The look is **A · Quiet** (D-030): colours, borders and type come from DESIGN-SYSTEM §2, not from the design files. Use tokens and components, never the inline styles from those files. Screens without a design file follow the same patterns. Propose a layout in the pre-flight before building.

## Docs map

`docs/PRD.md` what and why · `docs/BUSINESS-RULES.md` roles, money, scenarios ·
`docs/ARCHITECTURE.md` stack, schema, RLS, sync · `docs/DESIGN-SYSTEM.md` tokens, components, a11y ·
`docs/ROADMAP.md` phases · `docs/MIGRATION-V3.md` the Phase 3 data migration · `docs/COMPETITOR-INSIGHTS.md` competitor pain points · `docs/DECISIONS.md` ADRs ·
`docs/PROGRESS.md` status · `docs/design/` visual references.
