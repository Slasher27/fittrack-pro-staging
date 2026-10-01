# Roadmap — phase-gated

Rule: **a phase is done only when every exit criterion is met and recorded in PROGRESS.md.**
Don't start the next phase early. If a criterion turns out to be wrong, change it here first, with a note.

Estimates assume part-time work with Claude Code. They are for planning only.

Every PRD §4 item is scheduled below. An item may be split across phases (e.g. Today's blocks arrive
with the features they show); each part appears once. If you add scope, add it here first. Every table ships with its RLS policies and pgTAP
tests (ARCHITECTURE §4) in the phase that creates it, and every screen ships its loading,
empty, error, offline and no-permission states (CLAUDE.md).

---

## Phase 0 — Foundations (≈ 1 week)
- [x] New repo `fittrack-pro`: SvelteKit (Svelte 5) + TS + Tailwind v4 + `adapter-static` (SPA fallback), ESLint/Prettier, Vitest, Playwright + axe-core.
- [x] GitHub Actions CI (lint, typecheck, unit, e2e). Netlify site with PR previews.
- [x] Supabase **local only** (`supabase init` / `supabase start`, Docker). Migrations folder. Typed client generation. No hosted project until Phase 3 (D-032).
- [x] `tokens.css` + the components in DESIGN-SYSTEM §3, with a `/dev/components` gallery route (dev only), matching `docs/design/Foundations.html` where DESIGN-SYSTEM §7.1 doesn't override it.
- [x] Auth: sign up, sign in, reset, sign out. Age gate (18+) and processing consent at sign-up. The `profiles` table (all ARCHITECTURE §3 columns, including the sync columns, with defaults `up default (extract(epoch from now())*1000)::bigint` and `synced_at default now()` so the sign-up row inserts before the trigger exists) with a row created on sign-up. Phase 1 adds the sync trigger to it.
- [x] App shell: bottom tabs (member) and sidebar (trainer), with placeholder screens. Installable PWA (manifest + service worker caching the app shell).

**Exit:** sign up/in works against local Supabase and in CI · the Netlify preview builds and loads the app shell · the gallery passes axe with zero serious violations at 390 and 1280 px · CI green · PROGRESS.md updated.

## Phase 1 — Member core, offline (≈ 3 weeks)
- [x] Decide what happens to v3 `meals` (PROGRESS open question; one option adds saved meals to this phase) and record it in DECISIONS.md.
- [x] Migrations: the `synced_at`/`up` trigger and `upsert_lww` RPC (ARCHITECTURE §5), applied to `profiles` too; the `has_pro()` stub (returns true, ARCHITECTURE §3); gym_profiles, gym_equipment, equipment_catalog (seeded), foods, food_logs, water_logs, body_metrics, photos (+ `photos` bucket; `checkin_id` is a plain uuid until Phase 4), targets, ai_usage.
- [x] Local IndexedDB stores + repositories + outbox + sync engine (ARCHITECTURE §5) with the sync unit tests listed in ARCHITECTURE §10 (except the program and relationship ones, which come with Phases 2 and 4).
- [x] Port `nutritionTargets()` into `lib/domain/targets.ts` with tests (oracle: v3 `tests/onboard-test.js`; formula in ARCHITECTURE §6). Targets screen in Settings for setting them by hand until onboarding exists (Phase 2).
- [ ] Today: nutrition summary, water (target from `targets.water_ml`), weight trend, quick log (recents and one-tap re-log). PRD §4.1 Today.
- [ ] Nutrition: timeline log, search, custom food (weight-based and count-based servings), recents, multi-add, recipes (ingredients in grams + cooked weight, ported from v3), water. PRD §4.1 Nutrition.
- [ ] Body: weight and measurements entry (weight, waist, chest, arm, thigh, notes) and photos (add with camera/file, pose, note; grid; view; delete; blob sync). Private by default.
- [ ] Gym profiles: several named locations, equipment editor (catalogue + custom items mapped to capabilities, weight ranges per item). PRD §4.1 Gym profiles.
- [ ] Port the `coach` Edge Function (model pinned server-side, JWT check, `ai_usage` metering) and **describe-to-log** on Today: forced `parse_food` tool → editable preview → log with `estimated = true`. Voice dictation into the describe box (Web Speech API; the mic is hidden where unsupported). Offline falls back to search.
- [ ] Foods: seed SA staples; Open Food Facts search import (online only, imports become own foods with `source='off'`); a seed of common SA retailer products from Open Food Facts.

**Exit:** logging food, water, weight and photos works in airplane mode and syncs within 10 s of reconnecting · two devices converge after conflicting offline edits (test) · a deletion on one device disappears on the other (test) · median food log from Today ≤ 10 s (manual timing, 10 runs).

## Phase 2 — Training (≈ 2–3 weeks)
- [ ] Migrations: exercises (+ seed of v3's 318 exercises **keeping v3's ids**, with equipment converted to `requires` capability tokens), programs, program_days, program_items, workouts, workout_blocks, workout_sets.
- [ ] `lib/domain`: capabilities, canDo, alternatives, buildProgram (deterministic), validatePlan (hardened, ARCHITECTURE §6), adaptDay, analytics (e1RM, PRs, volume). All unit-tested, including "never outputs an exercise the gym can't do" property tests.
- [ ] Onboarding questionnaire (6 steps, PRD §4.1), then targets + generated program, with optional AI refine via the `coach` function (forced `create_plan`, validated).
- [ ] Train tab: program view (today's day per ARCHITECTURE §3), active workout logger for all three modes (reps · timed intervals · circuit rounds) with prefill, rest timer, swap limited to the location and PRs; history; exercise library + detail with alias + fuzzy search (T36); timestamp-based timers that survive locking and app switching, skip in circuits, demo (cues/image; video from Phase 6) during timers, band levels, last-session notes (T40); a completion summary (T38). Manual daily steps (`body_metrics.steps`).
- [ ] Location switch on Today and at workout start → `adaptDay` with visible "swapped" markers.
- [ ] **Solo Coach tab:** the ported v3 AI coach (context snapshot, read tools run immediately, write tools → preview → accept/discard, device-local transcript and past chats, voice dictation) and the weekly review. PRD §4.1 Coach tab (solo).

- [ ] Flexible schedule, client side (D-023): `schedule_overrides` migration + RLS/pgTAP, move a workout, "Catch up" for 7 days, local-timezone days, tests for override precedence.

**Exit:** "never lose a set": an e2e test kills the app mid-workout and loses 0 logged sets, online and offline (COMPETITOR-INSIGHTS T1) · Duwayne generates a program for his home gym and logs a full training week in Pro · switching a day to "Commercial gym" adapts correctly · logging a prefilled set takes ≤ 2 taps · the solo coach proposes a plan change that applies only after Accept.

## Phase 3 — Move Duwayne onto Pro (≈ 3–5 days)
- [ ] Create the hosted Supabase project `fittrack-pro-staging` (free a free-plan slot first), push migrations, set the Netlify env vars (D-032).
- [ ] `scripts/migrate-v3.ts` exactly as [MIGRATION-V3.md](MIGRATION-V3.md): dry run, report, idempotent real run.
- [ ] Verify with MIGRATION-V3 §5 (counts, daily totals, bests, weight trend, active program).
- [ ] Put v3 into read-only mode for Duwayne (banner pointing to Pro). Keep it deployed for 60 days.

**Exit:** 100% of record counts match the dry-run report and the §5 checks pass · Duwayne uses Pro only for 7 days with no data gaps (v3 parity: food, describe-to-log with voice, recipes, water, weight + measurements, photos, training in all three modes, solo coach, weekly review).

## Phase 4 — Coaching (≈ 4 weeks)
- [ ] Migrations: admins, audit_log, trainers, coaching_relationships (+ `one_active_coach` index, no-self-coaching check), invites, checkins, messages, notes, nutrition_guidance (+ `guidance` bucket), the `brand` bucket (public read), push_subscriptions. Replace the Phase 1–2 owner-only `targets` policies with the consent-aware ones. Add the FK `photos.checkin_id → checkins` (`on delete set null`, deferrable). The helpers and every trainer policy in ARCHITECTURE §4. **pgTAP tests for every allow/deny case**, including ended, paused, revoked consent, another trainer's client, a lapsed trainer and column-restricted updates.
- [ ] RPCs and functions: `become_trainer`, `invite_valid`, `invite-accept`, `party_names`, consent updates (column grant), `pause_client`/`resume_client`, `assign_program` (always copies), `end_relationship` (ARCHITECTURE §4.2), `submit_checkin`, `reply_checkin`. Sync tests: "assign a program → the client pulls its days and items" and "relationship change → full pull brings the trainer's exercises".
- [ ] Become a trainer (free for 3 active clients, D-027). Invite by code, QR, link and email (share sheet / `mailto:`, ARCHITECTURE §12). Invite acceptance for new **and existing** members (BUSINESS-RULES S1, S2) with the consent screen. The member app fetches relationships + branding on launch/focus/online (ARCHITECTURE §5).
- [ ] Trainer workspace: Clients list (last active, workouts this week, nutrition adherence, status; PRD §4.2 defines them) + needs-attention feed; Client detail (profile, goals and limitations, training, nutrition, body, photos, equipment, check-ins, notes); set or adjust targets and attach meal guidance (text or PDF); Program builder (weeks/days/items, per-day location, equipment conflict detection + swap, templates, "Generate draft"); assign to client; trainer Exercise library (catalogue + own exercises); check-in inbox; messages; "Switch to my training".
- [ ] Client side: coached onboarding (BUSINESS-RULES S1: no targets write with nutrition consent, no generated program; "your coach is preparing your program"), assigned program appears in Train, coach notes in context, weekly check-in form, messages, consent controls, end coaching (S3).
- [ ] Messages over Supabase Realtime; Web Push through `notify` (ARCHITECTURE §12) for new messages, check-in replies, program assignments and check-in-due reminders, with the iOS "add to home screen" prompt in the invite flow.
- [ ] `nightly`, non-billing jobs: paused > 60 days → ended, tombstone purge, check-in-due pushes.
- [ ] Builder speed (D-029): "apply to all following weeks", insert into a copied workout, save a single workout as a template, structured sets (never free text). Trainers can attach their own video link to an exercise (D-028).
- [ ] Trainer automations (D-029): scheduled messages, push to the trainer when a client finishes a workout or sets a PR, a daily digest.
- [ ] Builder "Paste a workout" (AI → library exercises → `validatePlan()` → review). Prescribed-vs-completed view in Client detail. Client tags + filters. New-client onboarding flow (welcome message, default template, check-in day).
- [ ] Builder autosave with a saved/retrying state (D-024). If time (D-029): the trainer side of D-023 (move a client's day, insert a rest day). Notification preferences + coach notes mirrored into the thread (ARCHITECTURE §12).
- [ ] Coached-client AI rules (ARCHITECTURE §7) and the trainer's "Draft check-in reply".

**Exit:** Lisa joins via QR and appears with her equipment in < 2 minutes · Duwayne builds a 4-week, 4-day program in ≤ 10 minutes and one change applies to all following weeks · killing the browser mid-edit loses nothing (D-024) · Duwayne programs and coaches her for 1 week without WhatsApp, and her phone gets a push for each new message · in an automated test, after "end coaching" the trainer gets zero rows from every client-owned table (only their template copies of the programs, plus read-only message history), and the client still has their program, exercises and history.

## Phase 5 — The Lisa test + polish (4 weeks of use, building alongside)
- [ ] Branding: logo, colour (with the contrast fixer and preview, DESIGN-SYSTEM §6), display name and welcome message.
- [ ] Progress tab: one view of weight trend (7-day average), measurements, photos, PRs and the weekly summary (entry screens exist since Phases 1–2). Trainer "summarise week" AI.
- [ ] Barcode scanning for food (camera; falls back to typing the number).
- [ ] Meal ideas (v3's meal-plan generator reworked as ideas, off by default for coached clients; DECISIONS D-007).
- [ ] Audit every screen against the states rule and DESIGN-SYSTEM §5; fix what's missing.
- [ ] If time (D-029): templates update clients (D-025): `source_template_id`, the "update clients using this template" flow, keep customised items. First-run tips for new clients (T10).
- [ ] Trainer workspace at 390 px: edit a client's day, messages, check-in replies (DESIGN-SYSTEM §4). Must be in before the pilot (D-029).
- [ ] Client detail "since start" progress view (weekly adherence, weight trend, measurements, volume, PRs) and a shareable progress summary (COMPETITOR-INSIGHTS T17).
- [ ] Weekly sets per muscle group in Client detail. "What's new" panel and a week's notice to trainers before UI changes (T29).
- [ ] Weekly feedback session with Lisa → backlog in PROGRESS.md → fix the top 3 each week.

**Exit:** the PRD §3 success criteria are met for 4 consecutive weeks.

## Phase 6 — Commercial readiness (≈ 3–4 weeks)
- [ ] Entitlements + the real `has_pro()` (replacing the stub) with a **backfill** for existing users (coaching rows for active relationships, comps for Duwayne and pilot trainers' clients) run before the switch; extend `invite-accept` and `end_relationship` with their entitlement writes (ARCHITECTURE §4.2, §9), free tier and 14-day trial (BUSINESS-RULES §3.5, §4), subscriptions, ledger (insert-only), nightly billing jobs (active-client counts with the free 3 and the cap, grace, continuation, referral credit).
- [ ] Exercise demo-video library (D-028), licensed, served through an Edge Function.
- [ ] Paystack: trainer billing (free 3, per-active-client fee or capped platform fee for in-app payers, monthly cap; invoices; D-027, D-031), solo Pro (web), optional coaching packages, session packs and single sessions with split payments ⚖. Self-serve cancel and renewal reminders (BUSINESS-RULES §3.6). Account screen: subscription status.
- [ ] Capacitor iOS/Android builds with native push. RevenueCat solo Pro in-app purchase. Store listings.
- [ ] Transactional email provider (invite emails, receipts, logo in emails).
- [ ] Admin tools: user lookup, comps, refunds, audit log, feature flags (`feature_flags` table) (PRD §4.3).
- [ ] Privacy policy, terms, POPIA consent texts, information officer registration ⚖. Data export and account deletion (runs `end_relationship` first, ARCHITECTURE §4.2).
- [ ] Landing page + trainer sign-up funnel. The name and trademark are final.
- [ ] If time (D-029): switching kit for trainers leaving Trainerize/TrueCoach/My PT Hub: a client list CSV import, plus hands-on help moving their templates for pilot trainers (COMPETITOR-INSIGHTS §2.4).
- [ ] Payments extras (T12): one-off products alongside a running package, several products per client, proration for mid-month starts.
- [ ] Trainer conversations before the pilot: 5 Cape Town PTs. Set the `[PRICE]`/`[PERCENT]` values (D-027, D-031) and check the after-pilot items in D-029.
- [ ] Pilot with 2–5 Cape Town trainers (free for 2 months).

**Exit:** the first trainer pays · zero P1 bugs open for 14 days · RLS and e2e suites green.

## After the pilot (only if trainer interviews confirm, D-029)
Session mode (D-021) · group session mode (D-026) · habits (D-022) · per-client modules and a custom term for "client" · session booking/calendar · progression rules (if not done before the pilot) · the switching kit (if not done before the pilot).

## Later (not scheduled)
**Priority after v1 (from reviews):** progression rules in the builder (e.g. +2.5 kg when every set hits the top of the range; T28) · client form-check videos to the coach (T32) · selling programs to solo members (T30) · group chat for teams (T15) · voice notes (T25) · client resource library and coach education (T34).

Apple Health/Google Fit, Whoop, InBody imports (T31) · studios/teams · multiple coaches per client · cash referral payouts · group programs · Afrikaans/isiXhosa localisation.
