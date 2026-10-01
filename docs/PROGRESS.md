# Progress

> ## Current status (2026-10-01)
> **Phase:** 0 — Foundations: **done** (all exit criteria met 2026-10-01, PR #1). Phase 1 — Member core, offline: not started.
> **Next action:** merge PR #1, then start Phase 1 with its first item: decide what happens to v3 `meals` (see below). The Supabase CLI is a devDependency (`pnpm supabase …`). Netlify site `fittrack-pro-staging` is linked to the repo (previews on every PR).
> **Blockers / open questions:**
> - Final product name (in Phase 6, before the pilot).
> - Supabase region choice (closest to South Africa), to record in the privacy policy.
> - ⚖ items in BUSINESS-RULES.md, to check with an accountant/attorney before Phase 6.
> - **Decide at the start of Phase 1:** what happens to v3 `meals` (28 seed meal-plan meals + any custom meals). Pro has no saved-meal entity (D-007; recents and multi-add replace it). Options: drop them, turn custom meals into multi-add favourites, or add a small "saved meals" feature in Phase 1.

## Exit criteria log
| Phase | Criterion | Met on | Evidence |
|-------|-----------|--------|----------|
| 0 | Sign up/in works against local Supabase | 2026-10-01 | `tests/e2e/auth.e2e.ts`: sign-up (age gate + consent), sign-in, sign-out, redirect back, password reset via Mailpit; 34/34 e2e pass locally |
| 0 | Gallery passes axe, zero serious/critical, 390 + 1280 px | 2026-10-01 | `tests/e2e/a11y.e2e.ts` (light + dark, plus auth and shell screens); a planted violation is caught (sanity check) |
| 0 | Sign up/in works in CI · CI green | 2026-10-01 | PR #1: GitHub Actions jobs "Lint, typecheck, unit" and "RLS (pgTAP) and e2e" both green (run 36846603056) |
| 0 | Netlify preview builds and loads the shell | 2026-10-01 | https://deploy-preview-1--fittrack-pro-staging.netlify.app: shell, gallery and service worker load; no-backend notice as expected (D-032) |
| 0 | PROGRESS.md updated | 2026-10-01 | This entry |

## Feedback backlog (Lisa test, Phase 5)
| Date | From | Issue | Severity | Status |
|------|------|-------|----------|--------|
| | | | | |

## Session log
Newest first. Each entry: date · what was done · decisions (link to DECISIONS.md) · what's next.

- **2026-10-01** · Phase 0 build (branch `feat/phase-0-foundations`). Scaffold: SvelteKit 2 / Svelte 5, Vite 8, TS 6, Tailwind 4.3, adapter-static (200.html fallback), ESLint/Prettier, Vitest, Playwright + axe. Local Supabase: `0001_profiles.sql` (all §3 columns + sync defaults, owner-only RLS, no member delete, sign-up trigger with age gate + consent) and `supabase/tests/profiles.test.sql` (17 pgTAP allow/deny). `tokens.css` uses `light-dark()` with Auto/Light/Dark; 17 §3 components + Notice/Icon/Placeholder; `/dev/components` gallery (shown in dev, or with `PUBLIC_DEV_ROUTES=1`). Auth: sign-up/in/reset/out. Shell: member tabs (bottom/rail), trainer sidebar (top menu on phone), placeholders, PWA (manifest, placeholder icons, service-worker shell cache, works offline). CI workflow + netlify.toml. Results: lint/check clean, 12/12 unit, 17/17 pgTAP, 34/34 e2e. Decisions: D-033 (consent in auth metadata). Notes: no danger/red token exists, so destructive buttons use the warn set; `notify_prefs` deferred to Phase 4. Then: Netlify site created and linked, PR #1 opened, CI and preview green. **Phase 0 closed.** Next: merge PR #1, Phase 1.

- **2026-10-01** · Created this repo from the spec pack in FitTrack-app `docs/pro` (now this repo's `docs/`). GitHub remote: Slasher27/fittrack-pro-staging. Next: Phase 0.
- **2026-10-01** · Chose UI direction A · Quiet (D-030). Billing: in-app payers pay a capped platform fee instead of the per-client fee (D-031). Docs streamlined: after-pilot items moved out of the v1 scope lists, trainer conversations moved to just before the pilot (Phase 6), a "what's current" summary at the top of DECISIONS. Committed on branch `docs/fittrack-pro-spec`.
- **2026-10-01** · Scored all 281 competitor review rows with Jev (impact, lesson, side; research/review-log-scored.csv). Pricing → per active client, free first 3, monthly cap (D-027). Exercise videos before the pilot (D-028). Scope triage (D-029): builder speed, autosave, automations, videos and phone editing before the pilot; session mode, habits, group sessions, per-client modules and booking after the pilot if interviews confirm; meal-plan builder not planned (D-007 stands). Trainer interviews added as a gate before Phase 4.
- **2026-10-01** · Logged 30 Trainerize reviews (81 rows; 9.4/10 before 2024 vs 6.4 after the acquisition). Added T40–T41. New: templates update assigned clients (D-025), group session mode (D-026), background-safe timers and other logger details, band logging, scheduled messages, trainer notifications and daily digest, client first-run tips, a switching kit for trainers leaving competitors, payment extras.
- **2026-10-01** · Logged 25 Everfit reviews (75 rows, avg 9.6/10). Add-ons are the top complaint (6 of 25), confirming D-020. Added T33–T39. New in spec: "Paste a workout" AI import, prescribed-vs-completed view, weekly sets per muscle, alias/fuzzy exercise search, completion summary, manual steps, client tags, new-client onboarding flow, custom "client" term, laptop layout for the member app. Open question: session booking.
- **2026-10-01** · Logged 30 TrueCoach reviews (77 tagged rows, avg 7.7/10, 6 scored ≤ 4). Added T24–T32. Flexible schedule (D-023), builder autosave (D-024), no-price-cliff rule, trainer data kept 12 months after cancelling, notification preferences, coach notes in the thread, per-client modules, change management. Progression rules, form-check videos and program sales are queued as the first priorities after v1.
- **2026-10-01** · Logged 24 My PT Hub reviews from GetApp page 2 (48 tagged rows in research/review-log.csv). Re-scored T2, T3, T4, T10, T12. Added T16–T23. Habits moved into v1 (D-022), trial includes every feature, monthly billing always, processor fees shown upfront, client package pause, long-term progress view. Open question: trainer meal-plan builder vs D-007.
- **2026-10-01** · Competitor review pass (My PT Hub, Trainerize, TrueCoach, Everfit on Capterra/Trustpilot; GetApp blocks automated reading) → COMPETITOR-INSIGHTS.md. Pricing changed to flat client-count tiers with every feature included (D-020), billing promises (BUSINESS-RULES §3.6), session mode (D-021), "never lose a set" gate, phone-ready trainer editing, program-ending alert. Next: Phase 0.
- **2026-10-01** · Spec review and fixes, verified over three rounds of independent sub-agent review (6 passes: internal consistency, v3 code fact-check, design files vs spec, migration re-check, final confirmation). Sync made safe against visibility changes (copy-on-assign, full pull on relationship change, soft deletes, purge horizon); RLS completed (trainers, invites, column-level rules, storage buckets, `trainer_can_write()`); `end_relationship` program/exercise transfer; entitlement sources aligned with S3/S6/S7; Web Push + Realtime; schema holds all v3 data; new MIGRATION-V3.md; v3 parity moved before Phase 3; every PRD item scheduled; design tokens fixed for contrast and §7.1 design overrides. Decisions D-014 to D-019. v3 docs marked frozen. Next: Phase 0.
- **2026-10-01** · Spec pack created (README, CLAUDE, PRD, BUSINESS-RULES, ARCHITECTURE, DESIGN-SYSTEM, ROADMAP, DECISIONS). UI concept canvas made. Next: Phase 0.
