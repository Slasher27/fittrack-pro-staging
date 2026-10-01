# Business rules

Status: draft v1 (2026-10-01). Prices are hypotheses marked `[PRICE]`/`[PERCENT]`; they are set
in Phase 6, after the trainer conversations and before the pilot. Not legal or tax advice: confirm the payment,
VAT and POPIA points marked ⚖ with an accountant/attorney before charging money.

The rule for this document: **anything that changes the data model or money flow
is decided here now. Pure UX edge cases are deferred to testing** (see §8).

---

## 1. Principles

1. **One person, one account.** Roles are capabilities on an account, not separate accounts. Duwayne is a trainer *and* tracks his own training on the same login.
2. **The client owns their data.** Always. A trainer gets *access* to a client's data while a coaching relationship is active, scoped by consent. Ending the relationship ends the access.
3. **Access to the app (entitlement) is separate from billing.** The app asks one question: "does this user have Pro right now?". Many billing sources can answer yes (§4). Billing systems never toggle features directly.
4. **Relationships keep history.** Coaching relationships are never deleted or overwritten. They change status, with timestamps. Revenue share and analytics rely on that history.
5. **Money is a ledger.** Every charge, platform fee, referral credit and refund is an immutable row. Balances are computed, never stored as a single mutable number.

---

## 2. Roles

| Role | How you get it | What it unlocks |
|------|----------------|-----------------|
| **Member** | Signing up | The tracker: logging food, water, weight and workouts. Free tier limits apply (§3). |
| **Pro member** | Any active entitlement source (§4) | Full tracker, generated programs, AI coach (metered), progress photos, check-ins. |
| **Client** | Accepting a trainer's invite | Everything Pro, plus the trainer's programs, notes, check-ins and branding. |
| **Trainer** | Becoming a trainer (free for up to 3 active clients, no card; §3.1) | Trainer workspace (web), any number of clients (billed per active client, §3.1), program builder, branding, payments. |
| **Admin** | Set in the database by the owner | Support tools, comps, refunds, read-only audit. |

A trainer is always also a member. A trainer cannot be their own client.
One client has **at most one active trainer** in v1 (see §8, deferred: multiple coaches).

---

## 3. Revenue streams

### 3.1 Trainer billing: pay only for clients who train (D-027, D-031)
No tiers, no bands, no add-ons. Every feature is included at every size, branding and payments too.
Each **active client** (relationship `active`, logged something in the billing month) is billed one of two ways,
decided automatically per client per month, so a trainer never pays twice for the same client:

| Client this month | What the trainer pays for them |
|-------------------|--------------------------------|
| One of the trainer's first 3 active clients | Nothing, forever. No card needed. |
| Paid the trainer **through the app** (§3.2) | A platform fee of `[PERCENT]` of that payment, capped at `[PRICE]` per client per month. No per-client fee. |
| Paid the trainer some other way (cash, EFT, SnapScan) | The per-active-client fee, `[PRICE]`. |
| Paused, or didn't train | Nothing. |

A **monthly cap** `[PRICE]` limits the trainer's total bill; above it every extra client is free.
Annual billing is 2 months free, never required. The pricing page has a calculator.
A trainer's status is `trial` while they have no card on file (the free 3 only), `active` once billing is set up,
then `grace`/`lapsed` if payment fails (S7). There is no timed trainer trial. Adding a client never blocks.
`[PRICE]`/`[PERCENT]` values are set before the pilot (ROADMAP Phase 6).

*Why this shape* (COMPETITOR-INSIGHTS §6): trainers hate price cliffs and paying for unused slots, and accept
paying more as they grow. Charging per active client keeps the platform's income growing with client numbers.
New and online trainers can start with no monthly cost at all ("we only earn when you earn"), while trainers paid
in cash are never forced to move their payments into the app.

### 3.2 In-app client payments (optional)
A trainer can sell coaching packages, session packs and single sessions in the app (Phase 6). The client pays by card;
the payout goes to the trainer through Paystack split payments (subaccounts) ⚖. The platform fee (§3.1) replaces the
per-active-client fee for that client that month, and every processor fee is shown before the trainer creates a package (§3.6).
- Clients paying a trainer in-app never also pay for Pro: coaching includes it.
- Real-time 1:1 training is generally treated by Apple as a "person-to-person service" (App Store guideline 3.1.3(d)), which allows payment outside in-app purchase. Programs delivered without real-time contact are a grey area. ⚖ **Verify before launch.** The fallback is to sell coaching packages on the web only.

### 3.3 Solo Pro subscription
Members without a trainer upgrade to Pro: monthly `[PRICE]`, annual `[PRICE]`.
- Inside the iOS/Android apps this **must** be an in-app purchase (store fee 15% on the small-business programmes). It goes through RevenueCat.
- On the web it is sold via Paystack. One entitlement covers both.

### 3.4 Alumni referral credit (trainer incentive)
When a client's coaching ends and they **continue on solo Pro**, the trainer earns
**`[PERCENT]` (hypothesis 20%) of that client's solo subscription revenue for 12 months**.
It is paid as **credit against the trainer's own subscription**, not cash. This avoids
running cash payouts, which brings compliance work ⚖. Cash payouts can come later.

Conditions (each one blocks a way to game it):
- The relationship lasted at least **30 days** and had at least **4 logged workouts or check-ins** (no link-and-unlink farming).
- Revenue is measured **net of store fees and refunds**.
- It stops early if the client starts coaching with **another** trainer (that trainer now covers them), deletes their account, or requests a refund.
- If the client returns to the *same* trainer, coaching resumes and the referral period ends (the client counts as an active client again).

### 3.5 Free tier
Members on the free tier get unlimited manual logging (food, water, weight,
workouts) and one gym profile (a limit enforced in the app, since gym profiles are created offline), with no AI coach and no generated programs.
Logging is never paywalled: it is the habit that converts people to Pro.
New members start with a **14-day Pro trial**, so onboarding always produces targets and a program. When the trial ends, the program stays usable (view and log). Regeneration, progression, extra gym profiles and the AI coach need Pro.

### 3.6 Billing promises (competitor pain → our policy, COMPETITOR-INSIGHTS T2)
- One public pricing page. The price shown is the price paid. No add-ons, no setup fees.
- Cancel in the app or on the web in ≤ 2 clicks, effective at the end of the period. No emails or calls needed.
- A renewal reminder email 7 days before an annual renewal. Price changes are announced 60 days ahead, and existing customers keep their price for 12 months.
- Pilot trainers keep their launch price for life while subscribed.
- If a trainer cancels, their templates, programs and exercises are kept for 12 months and come back if they resubscribe. Client data stays with the clients (§6).
- Monthly billing is always available. Annual is a discount, never a requirement.
- Every processor fee (card, recurring, payout) is shown on the package set-up screen before a trainer creates a package.
- A trainer can approve a pause on a client's recurring package (holiday, injury, credit on account) instead of refunding.

---

## 4. Entitlements

```
has_pro(user) = any entitlements row with starts_at <= now() < coalesce(ends_at, infinity), where source is:
  - store          active store subscription                (RevenueCat webhook)
  - web            active web subscription                  (Paystack webhook)
  - coaching       relationship active or paused, and the trainer is trial/active/grace
                   (invite-accept opens it; end_relationship and the nightly job close it)
  - trial          the 14-day member trial                  (written at sign-up)
  - continuation   Pro after coaching ends: 14 days (S3) or 30 days (S7)
                   (end_relationship / nightly)
  - comp           admin comp, with expiry                  (admin tools)
```

Stored in `entitlements` rows (`source`, `starts_at`, `ends_at`, `ref`), one row per
source and `ref` (a repeat coaching or continuation period is a new row). `has_pro` is a SQL function and the **only** thing the client app checks.
Only these writers create or close rows: the two webhooks, `invite-accept`,
`end_relationship`, the nightly job, sign-up and admin tools, all with the service role.
No feature code toggles access directly. Until Phase 6, `has_pro` returns true for everyone
(ARCHITECTURE §3).

When several sources are active at once, that's fine. The app doesn't care. Billing
overlap (paying twice) is handled in the scenarios below.

---

## 5. Coaching relationship lifecycle

```
invite (code) ──accept──▶ active ──pause──▶ paused ──resume──▶ active
                            │                 │
                            └── end (either side, or the system) ──▶ ended
```

A relationship row exists only once an invite is accepted. Pending, expired and revoked
invites live in the `invites` table.

| Field | Notes |
|-------|-------|
| `trainer_id`, `client_id` | |
| `status` | `active` · `paused` · `ended` |
| `invite_code`, `accepted_at`, `paused_at`, `ended_at`, `ended_by` (`trainer`/`client`/`system`), `end_reason` | |
| `consent` | jsonb: what the trainer may see (`profile`, `workouts`, `nutrition`, `body`, `photos`, `checkins`; `habits` is added with habits, after the pilot). All on by default except `photos`. Client can change at any time (ARCHITECTURE §4.1). |
| `referral_until` | Set when the relationship ends and the conditions in §3.4 hold. |

Invites: a code/QR/link, single-use, 14-day expiry, optionally tied to an email.
Accepting an invite works for **new sign-ups and existing members** (see S2).

---

## 6. Data access rules (POPIA) ⚖

Health and body data is *special personal information* under POPIA. Rules:
- Explicit consent at sign-up for the app to process it, and **separate** consent when a client links to a trainer, showing exactly what the trainer will see.
- The trainer sees **only** the consented categories and **only while the relationship is active or paused**.
- **Targets while coached:** if the client consented to `nutrition`, only the trainer sets their targets (the client sees them read-only, with "Ask your coach"). Without that consent the client sets their own.
- **After `ended`:** the trainer loses access to everything the client created. Both sides keep read-only access to their message history; the client keeps the trainer's notes and nutrition guidance. The client keeps every program they were assigned (ownership passes to them), and the trainer keeps a template copy of each one, as their IP (ARCHITECTURE §4.2). Anonymised aggregates for the trainer's own stats are deferred (§8).
- Account deletion deletes the person's data within 30 days, keeping only the financial ledger rows needed for tax (anonymised).
- 18+ only in v1 (age gate at sign-up), so no minors' data.
- Data hosted in a Supabase region chosen deliberately and written in the privacy policy (cross-border transfer clause).

---

## 7. Scenario catalogue (pre-empted now)

| # | Scenario | Rule |
|---|----------|------|
| S1 | **New person joins via trainer invite** | Signs up with the code → relationship `active` → Pro via coaching. The onboarding questionnaire runs, and its answers are shared with the trainer under consent. It doesn't generate a program (Train shows "Your coach is preparing your program"), and with nutrition consent it doesn't write targets ("Your coach will set your targets"). The trainer's needs-attention feed shows "program needed" / "targets needed". |
| S2 | **Existing solo member joins a trainer** | Enters the code (or opens the link) while signed in → consent screen → `active`. All their history comes with them. If they pay for solo Pro, the app shows "Your coaching now includes Pro" with a deep link to cancel the store subscription. We can't cancel or refund App Store subscriptions on their behalf. No double features: entitlements simply overlap until the store subscription lapses. Web subscriptions are paused automatically. |
| S3 | **Client leaves the trainer (or the trainer ends it)** | Status `ended`, trainer access revoked immediately, client keeps all data and their assigned programs (the trainer keeps template copies; ARCHITECTURE §4.2). If they don't have Pro from another source: 14 days of Pro continuation, then the free tier, with an "alumni" offer for solo Pro. Referral credit as in §3.4. |
| S4 | **Short 3-month block, client goes solo** | S3 plus §3.4: the trainer earns referral credit for 12 months. The client keeps their last program active and the generator takes over progression. |
| S5 | **Client switches trainers** | Ending A and accepting B are separate steps. Accepting B while A is active asks the client to end A first. A's referral credit stops when B becomes active. |
| S6 | **Trainer pauses a client** (holiday, injury) | `paused`: the trainer keeps access, they aren't billed, and the client keeps Pro for up to 60 days. After that the nightly job ends it (`ended_by=system`) and S3 applies, including referral credit if §3.4 holds. |
| S7 | **Trainer stops paying** | 14-day grace period: everything works and the trainer gets warnings. Then the trainer becomes `lapsed`: the workspace is read-only (RLS `trainer_can_write()`) and the relationships stay `active` but unbilled. Clients get 30 days of Pro continuation with a notice ("your coach's plan has lapsed"). If the trainer hasn't paid by then, the nightly job ends the relationships (`ended_by=system`): S3 applies, except that the 30 days already given replace S3's 14-day continuation and no referral credit is earned. Programs stay with clients. |
| S8 | **Trainer deletes their account** | All relationships `ended` (`ended_by=system`). Clients are treated as in S3 (no referral credit). Programs assigned to clients stay with the clients. |
| S9 | **Client deletes their account** | Any active relationship is ended first (the trainer keeps template copies of their programs), then the data is deleted (§6). The trainer sees "Former client" in history, with no data. |
| S10 | **Client pays trainer outside the app** | Normal. The client is billed to the trainer as an active client and has Pro. |
| S11 | **Client pays trainer in-app, then the trainer ends it mid-month** | The coaching package is a trainer–client contract. Refunds are at the trainer's discretion through the processor, and the platform fee is refunded pro rata. A policy shown at checkout. ⚖ |
| S12 | **Trainer wants to coach themselves or their partner** | A partner is fine (that's the Lisa test). Coaching yourself is blocked (a database check). |
| S13 | **Client has an active trainer and buys solo Pro anyway** | Purchase screen hidden while coached. If it happens through a store edge case: overlap is allowed, no automatic refund, and support can comp. |
| S14 | **Duplicate accounts (same person, two emails)** | Admin-only merge tool, deferred. v1: support guidance. |

---

## 8. Deferred to testing / later (decided not to decide yet)

**Strong candidate for after v1: selling programs.** Trainers sell a ready-made program (no coaching) to solo members, the platform takes the §3.2 fee. It also gives a client who leaves over price a cheaper way to stay with the same trainer (TrueCoach review, COMPETITOR-INSIGHTS T30). Needs a scenario row and a decision before it is built.
Multiple coaches per client (trainer + dietitian), studios/teams, cash payouts,
currencies other than ZAR, promo codes and discounts, family plans, gifting,
trainer marketplace/discovery, trainer-to-trainer client transfers, partial-month
proration details, chargeback handling flows, anonymised aggregate stats for trainers about former clients. Each needs a row in §7 before it is built.
