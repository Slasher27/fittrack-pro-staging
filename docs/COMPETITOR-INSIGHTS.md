# Competitor insights

Status: v1 (2026-10-01). A living document: add evidence, re-score, and keep §3 in sync with the PRD.

## 1. Method (repeat every quarter, and before each phase)

1. **Collect** reviews for each competitor from Capterra, G2, Trustpilot, the App Store and Google Play (the *client* app reviews matter as much as the trainer reviews), and r/personaltraining. GetApp blocks automated reading, so read it by hand or use Capterra (same review base).
2. **Log** each useful review as one row in the review log (§4): competitor · source · date · rating · reviewer role · theme · sentiment · short quote · link. Paraphrase rather than copying whole reviews.
3. **Tag** it with one theme from the fixed list in §2. Add a new theme only when 3+ reviews need it.
4. **Score** each theme: `frequency (1–5) × severity (1–5)`. Severity 5 = makes trainers leave (data loss, billing problems). Severity 1 = nice to have.
5. **Decide** a response per theme: **Table stakes** (must match), **Differentiator** (beat them clearly), **Later**, or **Non-goal**. Write it into §3 with the PRD/ROADMAP item it maps to.
6. **Validate** the top themes in trainer conversations before the pilot (ROADMAP Phase 6). Reviews tell you where the pain is; trainers tell you whether they'd pay to fix it.

## 2. Sources so far

| Competitor | Rating (source, Oct 2026) | Notes |
|------------|---------------------------|-------|
| My PT Hub | 4.6/5, 3,206 reviews (Capterra) | Loved for "unlimited clients" at a low flat price (about £15/month mentioned). Complaints: the jump from the 3-client tier, glitches/data loss, cluttered mobile UI, exercise library, billing confusion. |
| ABC Trainerize | 4.6/5, 694 (Capterra) · 3.2/5, 98 (Trustpilot) | Strong programming and automation. Complaints: paid add-ons, outdated exercise visuals, MyFitnessPal sync, learning curve for older clients. Trustpilot: crashes, workouts not saving, billing/cancellation disputes, slow support since the ABC acquisition. |
| TrueCoach | 4.8/5, 838 (Capterra) | Simple, good video library. Complaints: rigid invoicing (no single-session charges), coaches can't program from their phone, no scheduling/habits, one workout per day. |
| Everfit | 4.8/5, 424 (Capterra) | Modern, easy, good support. Complaints: cost climbs with client count, no progression builder, no scheduling, missing automated alerts (program ending, meal plan expiry). |

### 2.1 My PT Hub, GetApp page 2 (24 reviews, Sep 2025 – Jul 2026, logged 2026-10-01)
Average likelihood to recommend 8.6/10. Every reviewer is a self-employed coach or a 2–10 person studio.
- **Why they chose it:** price-to-feature value and **unlimited clients** (2 of 24 say so explicitly; 4 more praise general value, re-tagged after a Jev check). Many switched from Trainerize, Everfit or QuickCoach.
- **Most praised:** easy for *clients*, everything in one place, responsive support, **branding** (3 mention their logo or brand look, and one says clients "would pay extra for the app").
- **New complaints this sample surfaced:** habits too rigid (only one-off or daily, no backfilling missed days, no habits inside challenges) · weak reporting for long-term progress · trainers wanting a structured meal-plan builder (options per meal, auto-fit to macros) · trial hiding add-ons (white label, packages) · undisclosed processor fees and 12-month-only billing · clients unable to pause recurring payments · form and agreement templates · cluttered client UI and lag on long histories.

### 2.2 TrueCoach, GetApp (30 reviews, 2019 – 2026, logged 2026-10-01)
Average 7.7/10, and 6 reviewers scored it 4 or lower (the most unhappy group so far).
- **Praised:** simple for clients, a video library of real people, quick programming, compliance tracking, fast support.
- **Why people leave:** the platform stopped improving while prices went up, a cumbersome program editor (copy-paste between tabs, no inserting into a copied workout, sets typed as text), **rigid scheduling** (clients can't move or catch up a workout, missed days get a red X, workouts follow the coach's timezone, no "insert a rest day" that shifts the week), lost uploads and workouts, a view-only coach app, a price that **doubles from 20 to 21 clients**, and paying for unused slots.
- **Wanted:** progression rules, habits and lifestyle metrics, per-client feature toggles, control over reminder emails, voice notes, form-check videos, selling programs, group chat, integrations (Whoop, InBody).

### 2.3 Everfit, GetApp (25 reviews, Nov 2025 – Sep 2026, logged 2026-10-01)
Average 9.6/10. Most switched from Trainerize, and the market leader on experience is Everfit.
- **Praised:** clean, calm, "neurodivergent-friendly" layout, support within hours, a public roadmap, the **AI builder that turns a typed workout into library exercises** (3 mentions), automations and onboarding flows, habits, alternate exercises for different setups, education for coaches (Everfit Academy).
- **The complaint:** **add-ons**. 6 of 25 say paid add-ons make it expensive, and one bought a billing add-on that didn't work.
- **Wanted:** session booking (3), prescribed-vs-completed side by side, sets per muscle group, exercise search with synonyms, "edit all following workouts", a desktop app for clients, manual step logging, scheduled messages, a coach directory, a results screen when the trainer logs a 1:1 session.

### 2.4 Trainerize, GetApp (30 reviews, 2017 – 2025, logged 2026-10-01)
Average 8.4/10 overall, but **9.4 before 2024 and 6.4 from 2024 on**: the drop follows the ABC Fitness acquisition ("got progressively worse… since another company acquired them", data deleted, clients locked out). These trainers are switching now. A smooth move-over is a sales channel (ROADMAP Phase 6 switching kit).
- **Praised (the bar to meet):** master programs copied to clients, scheduled automated messages ("the best feature"), push to the coach when a client finishes a workout or sets a PR, nightly reports, PR celebrations for clients, deactivating clients without losing data.
- **Complaints:** the coach mobile app is useless for programming (3), nutrition depends on a broken MyFitnessPal sync (3), add-on fees, hard to navigate even after years, Android crashes, timers stop when switching to a music app, **templates can't update assigned clients** (4), one device per client in group sessions, no training-day vs rest-day macros, one package per client in payments.

## 3. Theme matrix → our response

| # | Theme | Seen at | F×S | Response | Where in spec |
|---|-------|---------|-----|----------|---------------|
| T1 | **Data loss / workouts not saving / crashes** | Trainerize, My PT Hub | 4×5=20 | **Differentiator.** Offline-first, every set saved locally on tap, sync retries. "Never lose a set" is a release gate. | ARCHITECTURE §5, ROADMAP Phase 2 exit |
| T2 | **Billing surprises, hard to cancel, price rises, hidden processor fees, 12-month lock-in** | Trainerize, My PT Hub | 4×5=20 | **Differentiator.** One-page pricing, no add-ons, monthly always available, every processor fee shown before a trainer creates a package, self-serve cancel in ≤ 2 clicks, a renewal reminder email, price lock for pilot trainers. | BUSINESS-RULES §3.6, ROADMAP Phase 6 |
| T3 | **Pricing punishes small or growing client lists** (and "unlimited clients" is the top reason to choose) | My PT Hub, Everfit | 5×4=20 | **Differentiator.** Pay only per *active* client, first 3 free, monthly cap: no cliffs, no empty slots (D-027, replacing D-020). Clients who pay in-app cost a capped platform fee instead (D-031). Scored evidence: the pain is cliffs and unused slots, not growth (Jev 0.86). | BUSINESS-RULES §3.1, D-027
| T4 | **Basic features behind paid add-ons, hidden in the trial** | Everfit (6 of 25), Trainerize, My PT Hub | 5×4=20 | **Differentiator.** Every feature at every size, the free first 3 clients included (branding, packages in test mode). No tiers, no add-ons (D-027). | BUSINESS-RULES §3.1 |
| T5 | **Workout builder rigidity** (rep ranges, timed exercises, supersets/circuits, several sessions a day, edits not carrying forward) | My PT Hub, TrueCoach, Everfit | 4×4=16 | **Table stakes.** Rep ranges, time targets and circuits are already in the schema (`program_items.mode/target/items`). Adding "apply to the following weeks". Several sessions per day: **Later** (needs a schedule change). | ARCHITECTURE §3, PRD §4.2, ROADMAP Phase 4 |
| T6 | **Exercise library gaps, custom exercises awkward** | all four | 4×3=12 | **Table stakes.** 318 exercises to start, plus the trainer's own exercises (name, kit tokens, cues, video link). Target: under 30 s to add one. Trainer video links in Phase 4, a licensed demo-video library in Phase 6 (D-028). | ROADMAP Phase 4 (trainer exercise library) |
| T7 | **Coaches can't edit from the phone** | TrueCoach | 3×3=9 | **Table stakes.** The trainer workspace must support editing a client's day, messaging and check-in replies at 390 px. | DESIGN-SYSTEM §4, ROADMAP Phase 5 |
| T8 | **In-person sessions are an afterthought** | My PT Hub | 3×4=12 | **After pilot, validate first** (D-029). One review row plus an unsourced "most SA PTs train in person": ask in interviews. Design kept (D-021). | D-021, D-029
| T9 | **Nutrition weak or outsourced** (macros not visible to clients, MyFitnessPal sync pain) | My PT Hub, Trainerize | 3×4=12 | **Differentiator.** Native fast food logging with targets always visible and no third-party sync dependency. | PRD §4.1 |
| T10 | **Learning curve, cluttered client UI, lag on long histories** | Trainerize, My PT Hub | 4×3=12 | **Differentiator.** Accessibility gate, plain language, one job per screen. | DESIGN-SYSTEM §1, §5 |
| T11 | **Missing automation and alerts** (program ending, no activity, auto messages) | Everfit, Trainerize (praised) | 3×3=9 | **Table stakes.** Needs-attention feed (no activity 3+ days, low adherence, check-in waiting, program ending within 7 days) + Web Push. Scheduled messages, finished-workout/PR alerts and a daily digest in Phase 4 (D-029). | PRD §4.2, ROADMAP Phase 4 |
| T12 | **Payments inflexible** (single sessions, session packs, pausing recurring payments, unsupported countries) | TrueCoach, My PT Hub | 3×3=9 | **Phase 6.** Packages, session packs, single sessions, and a trainer-approved pause on a client's recurring package. Paystack covers SA. Expand processors only when going international. | ROADMAP Phase 6 |
| T13 | **Slow or canned support** | Trainerize | 3×4=12 | **Differentiator.** Founder-led support during the pilot: in-app help, one-business-day response target. | PRD §4.3 |
| T14 | **Localisation and units** | My PT Hub | 2×2=4 | **Table stakes.** Metric by default, units per user, ZAR, SA foods. | PRD §2 |
| T15 | **Session booking/calendar, communities, video calls** | Everfit (3), TrueCoach, My PT Hub | 3×3=9 | **Open question** for trainer interviews: in-person SA trainers may need booking more than online coaches do. Communities later. **Non-goal:** video calls. Booking after the pilot, only if interviews demand it (D-029). | PRD §5 |
| T16 | **Habits too rigid** (only daily, no "3× a week", can't backfill, not in challenges) | My PT Hub (4 of 24), TrueCoach, Everfit | 4×3=12 | **After pilot, validate first** (D-029). Design kept (D-022). | D-022, D-029
| T17 | **Weak long-term reporting** | My PT Hub (3 of 24) | 3×3=9 | **Table stakes, Phase 5.** Client detail "since start" view (weight trend, measurements, volume, PRs, adherence by week) and a shareable progress summary. | ROADMAP Phase 5 |
| T18 | **Forms and agreements** (custom intake forms, a training agreement template) | My PT Hub | 2×3=6 | **Later.** A PAR-Q + training-agreement template with e-acceptance is a good fit for SA in-person PTs. Check with trainer interviews. | – |
| T19 | **Trainers want a meal-plan builder** (options per meal, auto-fit to macros, macro calculator) | My PT Hub (2 of 24) | 3×3=9 | **Not planned.** D-007 stands: targets + trainer-attached guidance (Jev 1.0 against a builder given HPCSA risk). | D-007, D-029
| T20 | **Branding is a buying reason** | My PT Hub (3 of 24) | 3×4=12 (positive) | **Confirmed.** Logo + colour for every trainer (D-009). A white-label store app stays a later premium option. Reviews show demand for it. | D-009 |
| T21 | **Moving data between coach accounts** | My PT Hub | 1×2=2 | **Later.** | – |
| T22 | **AI wanted, without extra cost** | My PT Hub | 2×3=6 | **Covered.** AI is included for everyone and metered fairly (ARCHITECTURE §7). | ARCHITECTURE §7 |
| T23 | **Client enrolment friction** | My PT Hub | 2×3=6 | **Covered.** QR invite → onboarding → visible to the trainer in < 2 minutes (Phase 4 exit). | ROADMAP Phase 4 |
| T24 | **Rigid schedule** (can't move or catch up a workout, red X for missed days, coach timezone, no "insert rest day", one template on different weekdays) | TrueCoach | 3×4=12 | **Differentiator.** D-023: move, "Catch up" for 7 days, client's own timezone, trainer shift of the week. Copy-on-assign gives each client their own weekdays. | D-023, ROADMAP Phase 2/4 |
| T25 | **Messaging gaps** (coach comments buried in workouts, no photo preview, voice notes wanted or capped) | TrueCoach, Everfit | 3×3=9 | **Table stakes.** Coach notes mirrored into the thread and a photo preview (Phase 4). Voice notes are **later, high priority**. | ARCHITECTURE §12 |
| T26 | **Per-client customisation** (hide modules, client groups/tags, "athlete" instead of "client") | TrueCoach, Everfit | 2×3=6 | Client tags and filters (Phase 4). Module toggles and a custom term for "client": **after the pilot, if interviews confirm (D-029).** | PRD §4.2 |
| T27 | **No control over reminders** | TrueCoach | 2×2=4 | **Covered.** Notification preferences per type and frequency. | ARCHITECTURE §12 |
| T28 | **No progression automation** | TrueCoach (3), Trainerize (praised) | 3×4=12 | **Later, first after v1.** Progression rules per program item. | ROADMAP Later |
| T29 | **UI changes surprise clients** | TrueCoach | 1×3=3 | **Covered.** "What's new" + a week's heads-up to trainers. | PRD §4.3 |
| T30 | **Selling programs / on-demand for self-directed clients** | TrueCoach, Everfit (praised) | 2×4=8 | **Later, high priority.** Fits our alumni model: a cheaper way to stay with the same trainer. | BUSINESS-RULES §8 |
| T31 | **Integrations** (Garmin, Strava, Whoop, InBody, heart rate, endurance metrics) | Everfit, TrueCoach, My PT Hub | 3×2=6 | **Later.** Apple Health/Google Fit first (steps, heart rate). Endurance coaching is a niche to revisit. | ROADMAP Later |
| T32 | **Form-check videos from clients** | TrueCoach, Everfit (praised) | 3×3=9 | **Later, high priority.** Needs storage and cost limits. | ROADMAP Later |
| T33 | **Manual step logging** | Everfit, My PT Hub | 2×2=4 | **Phase 1.** `body_metrics.steps` (also usable as a habit target once habits exist, after the pilot). | ARCHITECTURE §3 |
| T34 | **Coach resources and education** | Everfit (praised 3×; caps criticised) | 2×3=6 | **Later.** A resource library for clients and a coach-growth content hub would suit SA trainers building online businesses. | – |
| T35 | **Coach discovery / marketplace** | Everfit | 1×2=2 | **Non-goal v1.** | PRD §5 |
| T36 | **Exercise search** (exact spelling, no synonyms, poor relevance) | Everfit | 2×3=6 | **Table stakes, Phase 2.** Aliases + fuzzy matching ranked by pattern and popularity. | ROADMAP Phase 2 |
| T37 | **Clients want a desktop/web version** | Everfit (2) | 2×2=4 | **Covered.** The member app is a PWA that must also work well on a laptop. | DESIGN-SYSTEM §4 |
| T38 | **Workout completion delight** (volume compared to animals, results screen) | Everfit (praised 2×) | 2×2=4 | **Phase 2.** A completion summary: volume, PRs, a fun comparison, and the same screen after session mode (after the pilot). | PRD §4.1 |
| T39 | **Health-privacy compliance for regulated professionals** (physios, chiros) | Everfit | 2×3=6 | **Covered for SA by POPIA design.** Revisit if targeting physios. | BUSINESS-RULES §6 |
| T40 | **Workout logger details** (timers stop in the background, can't skip inside a circuit, no demo while a timer runs, no band logging, past notes hidden, confusing two-step start) | Trainerize | 3×3=9 | **Table stakes, Phase 2.** Timestamp timers, skip/next, inline demo, `band` per set, last-session notes, one Start button. | ARCHITECTURE §6, ROADMAP Phase 2 |
| T41 | **Templates don't update assigned clients; can't tweak one client** | Trainerize (4), Everfit (2), TrueCoach | 4×4=16 | **Differentiator, Phase 5 if time (D-029).** D-025: choose which clients get a template change, and keep one-off tweaks. | D-025 |

**Covered already, confirmed by Trainerize:** training-day vs rest-day calories (`targets.kcal_train`) · programs start on any day (`starts_on`) · deactivating without deleting (pause, S6) · a native food database instead of MyFitnessPal sync (T9).

**Also strengthened by these pages:** T22 AI (praised 3× at Everfit for turning a typed workout into library exercises → adding *"Paste a workout"* to the builder, Phase 4) · T17 reporting (prescribed vs completed side by side, sets per muscle group per week → Phase 4/5) · T5 "edit all following workouts" (2 more mentions) · T11 automations (4 Everfit mentions → onboarding flow for new clients, Phase 4) · T3 (TrueCoach's 20→21 price cliff → our no-cliff rule).

## 4. Review log

Keep it in `research/review-log.csv` (`docs/research/` in the new repo) (columns: `competitor,source,date,rating,role,theme,sentiment,quote,url`).
Aim for ≥ 30 rows per competitor before re-scoring. The summaries in §2 come from the first pass. §2.1–2.4 are logged row by row: 109 reviews, 281 tagged rows.

## 5. Sources
- My PT Hub, Capterra: https://capterra.com/p/146651/My-PT-Hub/reviews/
- Trainerize, Capterra: https://capterra.com/p/140262/Trainerize/reviews/
- Trainerize, Trustpilot: https://ie.trustpilot.com/review/trainerize.com
- TrueCoach, Capterra: https://capterra.com/p/155784/truecoach/reviews/
- Everfit, Capterra: https://www.capterra.com/p/202837/Everfit/reviews/

## 6. Scored lessons (281 rows, Jev, 2026-10-01)

Every row in the review log was scored with Jev for **impact** (0–4: for a complaint, how much it threatens keeping
the customer; for praise, how strong a reason it is to choose or stay), the **kind of lesson** and **whose experience**
it is. Results per row: `research/review-log-scored.csv`. Re-run when ≥ 50 new rows are logged.

| Lesson (complaints) | Rows | Avg impact | What it means for us |
|---------------------|------|-----------|----------------------|
| Missing feature | 76 | 1.80 | Many wishes, each weak. Don't chase breadth. |
| Reliability (bugs, lost data, lag, sync) | 22 | 2.27 | The worst single row: "data deleted, clients locked out" (3.97). Never lose anything, the trainer's edits included (D-024). |
| Pricing trust (rises, add-ons, lock-in) | 22 | 2.18 | Honest, gentle pricing (D-027, BUSINESS-RULES §3.6). |
| UX friction | 23 | 1.62 | Mostly the trainer's builder: copy-paste, no "edit all following", sets as text. |
| Flexibility (rigid schedule/builder) | 14 | 1.93 | Move/catch up, template updates (D-023, D-025). |
| Support / vendor | 5 | 2.29 | Few rows, high impact: support that answers but doesn't fix. |
| Coach can't work from phone | 4 | 2.47 | Trainer editing on a phone before the pilot (D-029). |

**Who hurts:** 147 of 167 complaints are about the trainer's tools, 13 about the client app, 7 about billing.
The trainer's program builder is the most important screen still to design.

**What wins customers (praise, avg impact):** "simple, all-in-one, good value" dominates (69 of 114 positive rows);
then the exercise library with videos (top positive theme, 12 rows, 2.75), ease of use (2.83), fair pricing (2.98),
responsive support (2.74), automations (scheduled messages, nightly report, PR alerts) and progress graphs.

**Trainerize since the acquisition** (20 rows from 2024 on): average rating 6.4, down from 9.4 before. Data loss,
pricing and a broken MyFitnessPal sync lead. Those trainers are switching now: the switching kit is worth doing if time allows.

**Decisions taken from this section:** D-027 (pricing), D-028 (videos before the pilot), D-029 (pilot scope triage).
**Still to do:** client-side app-store reviews (only 13 complaints come from clients) and the trainer interviews.

