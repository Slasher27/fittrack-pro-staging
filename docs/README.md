# FitTrack Pro — specification pack

FitTrack Pro is the commercial successor to FitTrack v3: a coaching platform for
**personal trainers and their clients**, which also works as a **standalone
tracker for people without a trainer**.

This folder is the source of truth for the build. It is written for Claude Code
first and humans second: short sections, explicit rules, concrete exit criteria.

## Read in this order

| # | File | What it settles |
|---|------|-----------------|
| 1 | [CLAUDE.md](CLAUDE.md) | How to work in the new repo: stack, conventions, pre-flight, done-definition. Copied to the new repo root. |
| 2 | [PROGRESS.md](PROGRESS.md) | Where things stand and what's next. Updated at the end of every session. |
| 3 | [PRD.md](PRD.md) | Who it's for, positioning, what's in v1, what comes after the pilot. |
| 4 | [ROADMAP.md](ROADMAP.md) | Phase-gated build plan with exit criteria. |
| 5 | [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, repo layout, data model, row-level security, offline sync, AI coach, payments, theming. |
| 6 | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | The A · Quiet tokens, components, accessibility rules, trainer branding, screen inventory. |
| 7 | [BUSINESS-RULES.md](BUSINESS-RULES.md) | Accounts, coaching relationships, billing, entitlements, alumni referrals, scenarios S1–S14. |
| 8 | [DECISIONS.md](DECISIONS.md) | Decision log; the top says which decisions are current. |
| – | [MIGRATION-V3.md](MIGRATION-V3.md) | Field-level v3 → Pro data migration (Phase 3). |
| – | [COMPETITOR-INSIGHTS.md](COMPETITOR-INSIGHTS.md) | 281 scored competitor reviews and the lessons taken from them. Background, not build instructions. |

Visual reference: the **A · Quiet** direction on the UI-directions canvas
(https://claude.ai/artifact/6yajYRWCVThnQV2b5YrG1i) sets the look; [`design/`](design/) holds standalone HTML
screens (open them in a browser) that set **layout and flow**. They are canvas exports and are not hand-edited. DESIGN-SYSTEM §2 tokens win on colour and §7.1
lists other places where the spec overrides those files.

## How to work in this repo

Setup is done: this repo (`C:\Websitesittrack-pro`) holds `CLAUDE.md` at the root and the spec in `docs/`.
Start every Claude Code session with:
> Read CLAUDE.md and docs/PROGRESS.md, then continue the current phase from docs/ROADMAP.md.

Keep `C:\Websites\FitTrack-app` (v3) running at fit-trk.netlify.app for personal use until Phase 3 (migration) is done.

## Relationship to the v3 repo

v3 (`FitTrack-app`) stays frozen except for bug fixes. Its CLAUDE.md rules (no
build step, no framework, the "Athletic Dark" visual system) apply to v3 only and are
deliberately superseded for Pro — see DECISIONS.md D-001 and D-002. Proven v3 logic
is ported, not rewritten from memory: the exercise catalogue (318 exercises with
equipment tokens), `nutritionTargets()`, `hasEquip()`/`exAlternatives()`,
`validateGeneratedPlan()`, the coach tool loop and the LWW sync semantics.
