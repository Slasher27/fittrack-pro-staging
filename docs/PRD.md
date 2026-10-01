# Product requirements — FitTrack Pro

Status: v1.1 (2026-10-01). Working name "FitTrack Pro" (the final name and trademark check come in Phase 6, before the pilot).

## 1. One-liner and positioning
A coaching app South African personal trainers give their clients, in their own
colours, that knows each client's equipment. It's also good enough to use on your own.

**Why trainers switch to it** (each backed by COMPETITOR-INSIGHTS §6):
1. **It never loses a set.** Offline-first logging and autosaved programming. Data loss is the most damaging complaint about competitors.
2. **Workouts fit each client's kit.** Every day knows its location; swaps never suggest equipment the client doesn't have.
3. **Food logging that actually works.** Native, fast, describe-to-log, SA foods. No broken MyFitnessPal sync.
4. **Built for South Africa.** Rand, Paystack, local foods, POPIA, in-person training treated as normal.
5. **Fair billing.** Pay only for clients who train, or only a capped share of each in-app client payment instead of the per-client fee (D-027, D-031). Clients can stay on as solo members after coaching, and the trainer keeps earning (BUSINESS-RULES §3.4).

## 2. Who it's for

| Persona | Need | Pays |
|---------|------|------|
| **Trainer** (first: Duwayne; then 2–5 Cape Town PTs) | Program clients without WhatsApp and spreadsheets, see adherence at a glance, look professional | Per active client, or a capped fee on in-app payments (BUSINESS-RULES §3.1) |
| **Coached client** (first: Lisa) | Know exactly what to do today, log it quickly, feel seen by the coach | Their trainer, in or outside the app |
| **Solo member** | A plan that fits *their* kit and goals, plus fast food logging | Free, or solo Pro |

The competitor pain points we design against: COMPETITOR-INSIGHTS.md.

Market focus: South Africa first (ZAR pricing, local foods and retailers, POPIA). English only in v1.

## 3. Success criteria for v1 (the Lisa test)
- Duwayne coaches Lisa for **4 consecutive weeks** entirely in the app (no WhatsApp for programming).
- Lisa logs food on **≥5 days/week** and **≥90%** of assigned workouts are logged in the app.
- Median time to log a food from Today **≤ 10 s**. Logging a set **≤ 2 taps** when values are prefilled.
- Duwayne's own training and nutrition history is migrated from v3 with nothing lost (Phase 3).
- Every screen passes the accessibility checklist in DESIGN-SYSTEM.md §5.

## 4. Scope v1

### 4.1 Client and solo app (phone, installable PWA, later wrapped with Capacitor)
- **Onboarding questionnaire** (6 steps, ported from v3): about you · goal · training · where you train · food · lifestyle. Output: targets (deterministic) + a program (generated or trainer-assigned).
- **Gym profiles:** several named locations (Home, Commercial, Park, Travel). Each has equipment from the **catalogue**. Custom items must map to capability tokens. Weight ranges per item (dumbbells 2–32 kg, kettlebells 12/16/24, and so on).
- **Today:** coach note, today's workout with a location switch, nutrition summary, water, weight trend, quick log.
- **Train:** program view, active workout logger (prefilled from last time, rest timer, swap limited to the current location's kit, PRs), history, exercise library (318 exercises, ported). Exercise search uses aliases and fuzzy matching ("lateral fly" finds "lateral raise"). A completion summary after each workout (volume, PRs, a fun comparison). **Logger details (T40):** one "Start" button, timers that keep running when the phone locks or another app is open, skip/next inside circuits, the demo (cues and image; video from Phase 6, D-028) staying visible while a timer runs, band levels per set, and notes from the last time this workout was done.
- **Nutrition:** timeline log, search, barcode, describe-to-log (AI, typed or dictated), recents/multi-add, recipes, custom foods, water. Local foods are seeded (SA staples and retailer products via Open Food Facts).
- **Progress:** weight trend (7-day average), measurements, photos (private by default), PRs, weekly summary.
- **Coach tab:** if coached, messages and check-ins with the trainer plus program notes. If solo, the AI coach (ported v3 tool loop, metered).
- **Flexible schedule (D-023):** move today's workout to another day, catch up missed workouts for 7 days ("Catch up", never a red cross). Days follow the client's own timezone.
- **Check-ins:** a weekly form (weight, photos optional, adherence, energy/sleep/stress, free text). The trainer reviews it and replies.
- **Account:** subscription status, consent controls (what my coach sees), notification preferences per type and frequency, data export, delete account.

### 4.2 Trainer workspace (web, desktop-first, responsive)
- **Clients:** list with last active, workouts this week, nutrition adherence and status. A "needs attention" feed. Invite (code, QR, link, email via the device share sheet until Phase 6 adds a mail provider). Client tags (e.g. "online", "in-person", "rehab") with filters.
  - *Last active:* the newest `synced_at` across the client's `food_logs`, `water_logs`, `body_metrics`, `workouts`, `workout_sets` and `photos` that the trainer may see (rows the trainer or the system wrote don't count).
  - *Workouts this week:* finished workouts since Monday vs scheduled days in the assigned program.
  - *Nutrition adherence:* days in the last 7 with food logged and kcal within ±10% of that day's target (`kcal_train` on training days). Shown as "5/7 days".
  - *Needs attention:* no activity for 3+ days, adherence below 4/7, a check-in waiting for review, an unread message, or a new client still needing a program or targets, or a program ending within 7 days.
- **Client detail:** profile and goals, limitations, **gym profiles and equipment**, logs, trends, photos (if consented), check-ins, notes. Each completed workout shows **prescribed vs completed side by side** (weight, reps, swaps). Weekly sets per muscle group.
- **Program builder:** weeks → days → exercises (sets × rep ranges, time targets or circuit rounds, load, rest, notes, per-day location; "apply this change to the following weeks"). Insert, duplicate and reorder anywhere. A library of single-day workout templates that drop into any day. Every edit autosaves (D-024). **Paste a workout:** the trainer pastes a written workout and AI maps it to library exercises for review (validated, D-008). Equipment conflicts are flagged against the client's gym profile, with one-click swaps. "Generate draft from profile" (rules + AI, catalogue-only). Templates are reusable across clients.
- **Nutrition targets:** set or adjust a client's targets, attach the trainer's own meal guidance (text or PDF).
- **New-client onboarding flow:** when a client joins, an optional automatic welcome message, a default template program and a check-in day are set (T11).
- **Client schedule:** move a client's day or insert a rest day that shifts the week (D-023).
- **Templates that update clients (Phase 5 if time, D-025/D-029):** edit a template, then choose which clients get the change. One-off client tweaks are kept.
- **Scheduled messages (Phase 4, D-029):** write now, send later, and manage scheduled messages in bulk (T11).
- **Trainer notifications:** a client finished a workout, set a PR, sent a message or submitted a check-in, plus an optional daily digest.
- **Phone-ready editing (Phase 5, before the pilot, D-029):** editing a client's day, messages and check-in replies work at 390 px (COMPETITOR-INSIGHTS T7).
- **Check-in inbox.**
- **Messages:** 1:1 text, with a photo preview before sending. Coach notes on workouts and logs also appear in the thread (T25). Voice notes and video attachments later.
- **Branding:** logo + brand colour (DESIGN-SYSTEM.md §6), display name, welcome message.
- **Billing:** active clients this month, which are free, fee-billed or paid in-app, and the month's bill (D-027, D-031), invoices, self-serve cancel (BUSINESS-RULES §3.6). Optional in-app coaching packages (Phase 6).
- **Switch to my training:** opens the trainer's own member app.

### 4.3 Platform/admin (minimal)
Comps, refunds, user lookup, audit log, feature flags. **Change management:** client-facing UI changes are announced in-app ("What's new"), and trainers get a heads-up a week before anything their clients will notice (T29). In-app help and a support form, with a one-business-day response target during the pilot (COMPETITOR-INSIGHTS T13).

### 4.4 Designed, but after the pilot (D-029)
Built only if trainers ask for them once the app is in use. Their designs are kept in DECISIONS and ARCHITECTURE so they can be added without rework.
- **Session mode (D-021):** the trainer runs a client's workout on their own phone during an in-person session; it logs into the client's history.
- **Group session mode (D-026):** up to 4 clients' sessions on one trainer device.
- **Habits (D-022):** e.g. "10k steps", "8 h sleep", each with a weekly target (1–7×), ticked on Today, backfill up to 7 days, self-set or assigned by the coach.
- **Per-client modules:** hide Nutrition, Habits or the AI coach for a client, and rename "client" (e.g. "athlete").
- **Session booking / calendar.**

## 5. Out of scope for v1 (non-goals)
- **Prescriptive meal plans.** The app sets targets and offers meal *ideas*. v3's meal-plan generator becomes "meal ideas", off by default for coached clients unless the trainer enables it. Trainers attach their own guidance. (DECISIONS D-007)
- Group classes, scheduling and calendar booking. Video calls. Wearables (Apple Health/Google Fit come after v1). A trainer marketplace. Custom app-store listings per trainer (DECISIONS D-009). Multiple languages.

## 6. Key user stories (acceptance-level)
1. As a trainer, I invite Lisa by QR. She signs up, completes onboarding, and appears in my client list with her equipment within 2 minutes.
2. As a trainer, when I add "Cable pull-through" to a day set at Lisa's home gym, I see a conflict and a one-click swap suggestion.
3. As a client, I open the app, see today's workout and my coach's note, tap Start, and log my sets with last time's values prefilled.
4. As a client, I switch today's workout from Home gym to Commercial gym, and the exercises that need missing kit are swapped automatically, with a visible "swapped" marker.
5. As a client, I end coaching. My trainer can no longer see my data, and I keep my program and history.
6. As a solo member, I finish onboarding and get a 4-week program that only uses my kit, plus calorie and protein targets.
7. As a trainer, I set my brand colour and logo, and Lisa's app shows them after her next sync. Contrast is automatically adjusted if my colour fails accessibility.
