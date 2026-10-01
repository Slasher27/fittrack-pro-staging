# Decision log

Format: context → decision → consequences. To reverse a decision, add a new entry that supersedes it. Never edit old ones.

**Read this first: what's current.**
- Pricing: D-027 + D-031 (D-006's seat model and D-020's flat tiers are superseded).
- Look: D-030 (A · Quiet), which updates D-002.
- Pilot scope: D-029. Designed but **after the pilot**: D-021 session mode, D-022 habits, D-026 group sessions.
- Everything else below is current.

### D-001 · New repo on SvelteKit (2026-10-01)
**Context:** v3 is vanilla JS with no build step, by design (v3 CLAUDE.md §1). Pro adds a multi-role web workspace, branding, payments, native shells and a much larger test surface.
**Decision:** Pro is a new repo on SvelteKit + Tailwind v4 + Supabase. v3's "no framework, no build step" rule is superseded *for Pro only*.
**Consequences:** a build step and a dependency tree to manage. Proven v3 logic is ported into `lib/domain` with its tests, never rewritten from memory. v3 stays live until Phase 3.

### D-002 · New visual system (2026-10-01)
**Context:** v3's UI-UX-PLAN rejected palette redesigns ("the teal system stays"). The owner now considers the v3 UI cluttered and inaccessible for a commercial product.
**Decision:** Pro uses DESIGN-SYSTEM.md (neutral surfaces, one brand accent, Geist, WCAG 2.2 AA). The v3 rule applies to v3 only.
**Correction (2026-10-01):** v3 itself replaced the teal system with "Athletic Dark" (graphite + volt) on 2026-07-28. The decision stands: Pro uses its own system, and v3's visual rules, whatever they are, apply to v3 only.

### D-003 · TypeScript in `lib/` (2026-10-01)
**Decision:** domain, data, theme and billing code is TypeScript. Components use `lang="ts"` but stay simple. No class hierarchies.
**Why:** permissions, money and sync are where untyped mistakes are expensive.

### D-004 · Normalised tables, new Supabase project (2026-10-01)
**Context:** v3 stores every synced record as JSON in one `records` table. Trainers need to query across clients (adherence, volume, trends) under RLS.
**Decision:** use proper tables per entity (ARCHITECTURE §3) in a new project (`fittrack-pro`). v3 data comes in through a one-off migration (ROADMAP Phase 3).

### D-005 · Own LWW sync per table (2026-10-01)
**Options:** (a) port v3's LWW engine per table with a server-stamped pull cursor; (b) PowerSync/ElectricSQL (SQLite on the device, synced to Postgres).
**Decision:** (a). It's proven in v3, has no vendor cost or lock-in, and the data volume per user is tiny. Revisit (b) if conflict bugs or multi-device complexity grow.

### D-006 · Per-seat trainer pricing, optional platform fee (2026-10-01)
**Context:** the owner wants income that grows with client numbers. Options: a cut of every client's payment to the trainer, or per-seat pricing.
**Decision:** trainer base fee + per-active-client seats. A platform fee (%) applies only to coaching packages trainers *choose* to sell in-app. Trainers who bill off-platform pay seats only.
**Why:** demanding a share of trainers' existing income (often per-session, in person, paid by EFT or SnapScan) is the biggest adoption barrier. Seats capture the same growth without it.

### D-007 · No prescriptive meal plans (2026-10-01)
**Decision:** targets + meal *ideas* + fast logging. v3's meal-plan generator becomes "meal ideas", off by default for coached clients. Trainers can attach their own guidance.
**Why:** low adherence, thin local food data, and prescriptive diets edge into regulated dietetics (HPCSA) ⚖.

### D-008 · AI is constrained by the catalogue and validator (2026-10-01)
**Decision:** program generation is deterministic first. AI refinement may only pick catalogue exercises the gym can do, and must pass `validatePlan()`. AI never changes trainer-authored programs for coached clients.

### D-009 · Branding = logo + one colour, no white-label store apps in v1 (2026-10-01)
**Decision:** trainers customise a logo and one brand colour (auto-corrected for contrast). No custom backgrounds or themes. No per-trainer App Store apps.
**Why:** full theming breaks accessibility and dark mode. Per-trainer store apps mean a separate binary, review and developer account per trainer (Apple guideline 4.2.6 restricts template apps). Possibly an Enterprise tier later.

### D-010 · One active trainer per client (2026-10-01)
Enforced by a partial unique index. Multiple coaches (e.g. trainer + dietitian) are deferred.

### D-011 · Alumni referral credit: 12 months, account credit (2026-10-01)
See BUSINESS-RULES §3.4. Account credit, not cash, until volume justifies payouts ⚖.

### D-012 · Adults only in v1 (2026-10-01)
18+ age gate. Avoids processing minors' health data.

### D-013 · Trainer workspace is online-only (2026-10-01)
Offline-first effort goes where it matters: logging and training on the phone.

### D-014 · Ending coaching transfers the program to the client (2026-10-01)
**Context:** BUSINESS-RULES says the trainer keeps the programs they wrote and the client keeps what they were assigned. Copying the program to the client would orphan the client's local rows and the `program_day_id` references in their workout history.
**Decision:** `end_relationship()` transfers the assigned program to the client (`author_id = client`, `source='coached'`, `origin_trainer_id`), gives the trainer a template **copy**, and copies the trainer's own exercises that the client's programs and history use into client-owned exercises (ARCHITECTURE §4.2).
**Consequences:** the client's offline data stays valid with no purge. The trainer's copy has new ids. Account deletion on either side runs this first.

### D-015 · Soft deletes; nothing changes visibility without changing (2026-10-01)
**Context:** the server-stamped pull cursor (D-005) only returns rows that changed. Hard deletes, and rows that become visible or invisible without changing (an old program re-pointed at a client, a trainer's exercises once a relationship starts), would never reach the device.
**Decision:** synced tables are deleted softly (`deleted = true`); hard deletes only in account deletion and a 90-day tombstone purge. `programs.client_id` is immutable: assigning always creates a copy, unassigning archives. A relationship change makes the member app run a full pull. Synced tables have no unique constraints besides the primary key. Details: ARCHITECTURE §5.
**Consequences:** sync tests cover deletes, assignment, relationship changes and the purge horizon.

### D-016 · Lapsed trainers are read-only in the database (2026-10-01)
**Decision:** every trainer write policy also requires `trainer_can_write()` (status `trial`, `active` or `grace`). S7's "read-only workspace" is enforced by RLS, not just the UI. A lapsed trainer can still edit their own training program and own exercises (clients only pull exercise edits that matter for programs already assigned).

### D-017 · Web Push and Realtime for coaching (2026-10-01)
**Context:** the v1 success test is "no WhatsApp for programming". Messages without notifications lose to WhatsApp.
**Decision:** messages use Supabase Realtime while open and Web Push (VAPID, `notify` Edge Function) while closed, from Phase 4. Native push replaces Web Push in the Capacitor builds (Phase 6). Payloads never contain health data.
**Consequences:** iPhone clients must install the PWA (iOS 16.4+) to get pushes; the invite flow says so.

### D-018 · v3 parity before the migration (2026-10-01)
**Context:** Phase 3 moves Duwayne off v3 for good, but photos, recipes, describe-to-log, voice dictation and the solo AI coach were scheduled after it.
**Decision:** those features move into Phases 1 and 2, and the Phase 3 exit lists the parity set explicitly. The schema holds every v3 field the owner's data uses (count-based servings, measurements, circuit and timed sets, start and goal weight, training-day kcal); what is deliberately not migrated is listed in MIGRATION-V3.md §4.
**Consequences:** Phases 1 and 2 grow by about a week. `has_pro()` returns true for everyone until entitlements land in Phase 6.

### D-019 · v3 validator is hardened, not just ported (2026-10-01)
**Context:** v3's `validateGeneratedPlan()` only warns: unknown exercises are kept and missing kit is flagged. D-008 says AI output may only use catalogue exercises the gym can do.
**Decision:** Pro's `validatePlan()` ports v3's name resolution and warnings, then **rejects** unknown exercises and ones the gym can't do (ARCHITECTURE §6). Tests for both the ported and the new behaviour.

### D-020 · Flat client-count tiers replace per-seat pricing (2026-10-01) — supersedes D-006's seat model · **superseded by D-027**
**Context:** competitor reviews (COMPETITOR-INSIGHTS T3, T4). My PT Hub's most repeated praise is "unlimited clients" at a low flat price. Everfit and Trainerize are criticised for costs that climb with each client and for paid add-ons.
**Decision:** flat tiers by active-client band (BUSINESS-RULES §3.1), every feature in every tier, an affordable Unlimited tier. D-006's optional platform fee on in-app coaching packages stays.
**Consequences:** less revenue from large trainers. Growth comes from tier upgrades, alumni solo subscriptions and payments. `active_seats()` keeps its name but now only decides the tier.

### D-021 · Session mode for in-person training (2026-10-01) · **after pilot, D-029**
**Context:** most South African PTs train clients in person. Competitors treat this as an afterthought (COMPETITOR-INSIGHTS T8).
**Decision:** a trainer can run a coached client's workout on the trainer's own phone. Rows are owned by the client (`user_id = client`) with `workouts.led_by = trainer`, written under RLS (`coaches(client,'workouts')`, `trainer_can_write()`, `led_by = auth.uid()`). The client pulls them like any other change. The member app's session logger is reused, so it works offline.
**Consequences:** "last active" keeps excluding rows the trainer wrote. Trainer-led sessions show a "with Coach X" label in the client's history.

### D-022 · Habits are in v1 (2026-10-01) · **after pilot, D-029**
**Context:** habits came up in 4 of 24 My PT Hub reviews (praised where present; complaints about rigidity), and in TrueCoach and Everfit feedback (COMPETITOR-INSIGHTS T16).
**Decision:** client-owned `habits` + `habit_logs` (synced, offline). Each habit has a weekly target (1–7×), backfill up to 7 days, and can be self-set or trainer-assigned (`assigned_by`, consent `habits`). Built in Phase 5. Habits inside challenges, streak rewards and group challenges come later.

### D-023 · Flexible schedule: move, catch up, never a red cross (2026-10-01)
**Context:** TrueCoach reviews (COMPETITOR-INSIGHTS T24): clients can't move a workout or catch up a missed one, missed days show a disheartening red X, workouts follow the coach's timezone, trainers can't insert a rest day that shifts the week, and one template can't run on different weekdays for different clients.
**Decision:** client-owned `schedule_overrides` (synced, offline) on top of the program `schedule`. Clients move a workout within the week and catch up missed days for 7 days. Trainers can also move days and insert a rest day that shifts the next 7 days. Dates are always the client's local dates. Copy-on-assign (D-015) already lets each client run the same template on their own weekdays. Built in Phase 2 (client side) and Phase 4 (trainer side).

### D-024 · Program builder autosaves every edit (2026-10-01)
**Context:** "uploaded workouts don't save", "the page reloaded and erased what I typed" (T1, T5).
**Decision:** the online-only builder saves each change immediately (optimistic, with a visible "Saved" or "Not saved, retrying" state) and keeps an unsent-edit queue in IndexedDB until the server confirms. Leaving the page with unsaved edits warns.

### D-025 · Templates can update the clients using them (2026-10-01)
**Context:** the most repeated builder complaint across Trainerize (4 reviews), Everfit and TrueCoach (COMPETITOR-INSIGHTS T41): change a template and you have to edit every client by hand, or you can't tweak one client without breaking the link.
**Decision:** copies keep `source_template_id`. When a trainer edits a template, "Update clients using this template" lists those clients and lets the trainer pick who gets the change. Items the trainer already edited for one client are marked customised and are kept unless the trainer chooses to overwrite them. Built on copy-on-assign (D-015): it updates the client's own copy rows, so sync and RLS stay the same. Phase 5.

### D-026 · Group session mode (2026-10-01) · **after pilot, D-029**
**Context:** semi-private training (2–4 clients at once) is common in SA studios. Trainerize needs a device per person (T8).
**Decision:** session mode (D-021) can run up to 4 coached clients on one trainer device, switching between them per set. Each client's rows are written separately under the same RLS rules. Phase 5.

### D-027 · Pay per active client, free first 3, monthly cap (2026-10-01) — supersedes D-020
**Context:** 281 competitor reviews scored with Jev (COMPETITOR-INSIGHTS §6). Jev: the evidence fits "trainers hate cliffs and unused slots" (0.86), not "trainers hate paying more as they grow". D-020's bands still made trainers pay for empty slots, and weakened the owner's goal of income growing with clients (Jev 0.84).
**Decision:** first 3 active clients free forever, then `[PRICE]` per active client per month, with a monthly cap above which clients are free. Every feature at every size; no add-ons (BUSINESS-RULES §3.1). Prices are hypotheses to test in trainer interviews.
**Consequences:** `active_seats()` is the billing count again. The free start doubles as the trial. Revenue scales with clients until the cap.

### D-028 · Exercise videos before the paid pilot (2026-10-01)
**Context:** the exercise library with demonstration videos is the most praised theme in the reviews (12 positive rows, e.g. "movement videos meant I stopped writing descriptions; grew from 5 to 30 clients"). Jev: ship before the pilot (0.92); trainer-uploaded links alone are not enough (0.31).
**Decision:** a licensed demo-video library (MuscleWiki or equivalent, via the Edge Function pattern from v3's notes) in Phase 6, before the pilot. Trainers can attach their own video link to any exercise from Phase 4.
**Consequences:** a licence cost per month; video URLs are fetched through an Edge Function, never stored as permanent public links.

### D-029 · Scope triage from the scored reviews (2026-10-01)
**Context:** Phases 4–5 had grown with items added from single reviews. The scored evidence shows that people leave over broken trust (data loss 2.27, pricing 2.18, support 2.29, coach can't work from the phone 2.47) while missing-feature wishes are many but weak (1.80). 147 of 167 complaints are about the trainer's side.
**Decision** (Jev's pilot triage):
- **Must be in before the paid pilot:** builder speed (edit all following weeks, single-workout templates, structured sets, paste a workout), builder autosave (D-024), exercise videos (D-028), trainer automations (scheduled messages, finished-workout and PR alerts, a daily digest), trainer editing on a phone.
- **If time before the pilot:** template updates to clients (D-025), the trainer side of the flexible schedule (D-023), the switching kit, progression rules.
- **After the pilot, and only if trainer interviews confirm them:** session mode (D-021), habits (D-022), group session mode (D-026), per-client modules, session booking. The schema notes for them stay in ARCHITECTURE, marked "after pilot", so they can be added without redesign.
- **Not planned:** a trainer meal-plan builder (keeps D-007; resolves the PROGRESS open question), wearable integrations.
**Consequences:** Phase 5 shrinks to polish and the Lisa test. D-021, D-022 and D-026 stand as designs, not commitments.

### D-030 · Visual direction A · Quiet (2026-10-01)
**Context:** three neutral directions were drafted (Quiet, Athletic, Native) on the UI-directions canvas. The reviews' top reason to choose an app is "simple, all-in-one, without overwhelm" (COMPETITOR-INSIGHTS §6), and trainer branding must look intentional on any colour.
**Decision:** A · Quiet: monochrome default brand, hairline cards, Geist, full light and dark themes, teal/orange/violet macro colours (DESIGN-SYSTEM §2). The workout logger's active set uses large ± steppers (no keyboard). Borrowed from C · Native: grouped lists for settings-style screens.
**Consequences:** `docs/design/*.html` stay the reference for layout and flow only; DESIGN-SYSTEM §2 tokens win on colour.

### D-031 · In-app payers are billed by a capped platform fee instead of the per-client fee (2026-10-01)
**Context:** a straight revenue share (e.g. 20% of client fees instead of a monthly fee) was considered. Jev on the scored evidence: unattractive to most trainers, at best "mixed"; high leakage risk because most SA PTs are paid in cash/EFT (0.8); a share of income is what D-006 set out to avoid. A choice between models was rated best (0.92).
**Decision:** no choice screen. Per client per month: first 3 free; a client who paid the trainer through the app costs a capped `[PERCENT]` platform fee of that payment; any other active client costs the per-active-client fee (BUSINESS-RULES §3.1). A monthly cap on the total.
**Consequences:** "we only earn when you earn" for trainers who bill in-app, no forced move off cash/EFT, no leakage loophole. Nightly billing classifies each active client by whether a `client_payment` ledger row exists for that month.

### D-032 · Local Supabase until Phase 3 (2026-10-01)
**Context:** the owner's free Supabase plan already has 2 active projects (v3 + one other).
**Decision:** Phases 0–2 run on local Supabase (Docker) and CI only. The hosted `fittrack-pro-staging` project is created at the start of Phase 3, after freeing a slot.
**Consequences:** Netlify previews before Phase 3 show the shell without a working backend.
