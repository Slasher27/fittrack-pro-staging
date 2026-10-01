# Design system

Status: v2 (2026-10-01). **Visual direction: A · Quiet** (D-030), from the UI-directions canvas
(https://claude.ai/artifact/6yajYRWCVThnQV2b5YrG1i: Today light/dark, the workout logger, desktop, trainer branding).
Its look and the tokens below replace the colours and styling of `docs/design/*.html`, which remain the reference
for **layout, content and flow** of each screen (§7): `Foundations.html` shows the components, and the other eight
files are screens. Build screens to match their structure in the Quiet look. They are references, not code to copy: rebuild them with the Svelte components and tokens
below. **This file wins if a design file and this file disagree**; §7.1 lists the known cases.

## 1. Principles
1. **One job per screen.** Today shows what to do now. Everything else is one tap away.
2. **Logging is fast.** A food in ≤ 10 s from Today (recents, multi-add, barcode, describe-to-log typed or dictated), a prefilled set in ≤ 2 taps (PRD §3).
3. **Equipment-aware everywhere.** Every workout knows its location. Swaps never suggest missing kit.
4. **Coach in the loop, not in the way.** Trainer notes appear in context. Solo members get the same app minus the coach layer.
5. **Calm by default.** One accent colour, neutral surfaces, numbers first. No gradients, glow, confetti or decorative charts.

## 2. Tokens (`src/lib/ui/tokens.css`)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--bg` | `#F7F7F8` | `#0B0B0C` | App background |
| `--surface` | `#FFFFFF` | `#161618` | Cards, sheets, tab bar |
| `--surface-2` | `#EFEFF1` | `#1F1F22` | Insets, coach note, rest timer |
| `--line` | `#E4E4E7` | `#2A2A2E` | Hairline card borders and dividers (decorative) |
| `--line-strong` | `#7C7C86` (≥ 3.6:1 on every surface) | `#74747E` (≥ 3.5:1) | Input and secondary-button borders, inactive progress segments, any non-text UI that must be seen (≥ 3:1) |
| `--ink` | `#18181B` (16.5:1 on `--bg`) | `#F4F4F5` (17.9:1 on `--bg`) | Primary text |
| `--ink-2` | `#52525B` (7.2:1 on `--bg`) | `#A1A1AA` (7.0:1 on `--surface`) | Secondary text — the lightest text colour allowed |
| `--brand` | `#18181B` (white text 17.7:1) | `#F4F4F5` (`--on-brand` 17.9:1) | Primary buttons, the active tab, selected chips, links, focus ring. **Trainer-overridable.** The default is monochrome, so with no trainer nothing on screen has a hue |
| `--brand-hover` | `#3F3F46` | `#D4D4D8` | Hover/pressed state of brand fills. Trainer-overridable (derived) |
| `--brand-ink` | `#18181B` | `#F4F4F5` | Brand-coloured text and icons, incl. on `--brand-tint`. Trainer-overridable (derived) |
| `--brand-tint` | `#E8E8E9` | `#1F1F22` | Active-tab pill, selected chips. Trainer-overridable (derived) |
| `--on-brand` | `#FFFFFF` | `#0B0B0C` | Text on brand |
| `--protein` | `#0E7490` (5.0:1) | `#22D3EE` (10.0:1) | Data: protein (teal, so it never collides with a trainer's blue). **Not** overridden by branding |
| `--carbs` | `#C2410C` (5.2:1) | `#FB923C` (8.0:1) | Data: carbs |
| `--fat` | `#7C3AED` (5.7:1) | `#A78BFA` (6.6:1) | Data: fat |
| `--ok` | `#0F7A5A` | `#5FD3A4` | On track, set done |
| `--ok-tint` / `--ok-ink` | `#E3F4EC` / `#0B5E45` (6.8:1) | `#13261F` / `#5FD3A4` (8.6:1) | "On track" chips, done sets |
| `--warn` | `#B4590B` | `#F2A65A` | Attention, equipment conflict: icons and borders only (4.4:1 on `--bg` is too low for text) |
| `--warn-tint` / `--warn-ink` | `#FFF4E5` / `#8A4A00` (6.3:1) | `#2A2116` / `#F2A65A` (7.8:1) | Warning banners and chips, warning text |

**Look (A · Quiet, D-030):** hairline `--line` borders on cards, no shadows, gradients or blur. The brand colour
appears only on things you can tap. Coach notes and status stay neutral. Dark mode is a full theme (Auto / Light / Dark);
the workout logger follows it.

Data colours differ in **lightness**, not just hue, and are always paired with a text label.
`--line` is for decorative dividers only. Status colours (`--ok*`, `--warn*`) are never replaced by
brand colours, even when a design uses the brand tint for a status. The brand tokens' trainer values
come from `deriveBrandTokens()` (ARCHITECTURE §8); the values above are the defaults.
Weight-change colour depends on the goal: a loss is `--ok` only when the goal is to lose fat.
For muscle, recomp and health goals the change is shown neutral (`--ink-2`) with its text.

**Type:** Geist (400/500/600/700), self-hosted. Display 32/38 · 700. Title 22/28 · 600. Body 16/24 · 400 (never below 15 for content).
Label 13 · 600 · uppercase · +0.06em (the smallest text anywhere, including tab labels and badges). Numbers use `font-variant-numeric: tabular-nums`.

**Spacing:** 4 px base: 4, 8, 12, 16, 20, 24, 32, 40, 56. Screen gutter 20 px on phone, 32 to 40 on web.
**Radius:** 10 (inputs inside tables), 12 (buttons, inputs), 16 (cards), 999 (chips).
**Motion:** 150–220 ms ease-out. Everything respects `prefers-reduced-motion`.

## 3. Components (build these first, in `src/lib/ui`)
Button (primary, secondary, ghost, destructive; 48 px, 44 px compact) · IconButton (44 × 44, required `label`) ·
Chip/ToggleChip (`aria-pressed`) · SegmentedControl · Field (label + input + hint + error, always a visible label) ·
Card · Sheet (bottom sheet on phone, dialog on web; focus trap, Esc closes) · Tabs (bottom nav on phone, sidebar on web) ·
Stat (label + value + delta with text, not just an arrow) · ProgressRing · MacroBar · SetRow (weight, reps, done) ·
RestTimer (`role="timer"`) · EmptyState · Toast (polite live region) · Avatar (initials fallback) · BrandLogo.

## 4. Navigation
- **Member/client (phone):** bottom tabs Today · Train · Nutrition · Progress · Coach. On a laptop (≥ 1024 px) the same app shows a left rail instead of bottom tabs and a two-column Today. Clients use it from home on a big screen (COMPETITOR-INSIGHTS T37). The active workout is full-screen with no tabs and minimises to a bar.
- **Trainer (web):** sidebar Clients · Programs · Exercise library · Check-ins · Messages · Brand & settings, with "Switch to my training" at the bottom. Phone layout: the sidebar becomes a top-level menu. It's designed for desktop, but editing a client's day, messaging and replying to check-ins must work fully at 390 px (trainers do this between sessions, COMPETITOR-INSIGHTS T7). Session mode (after the pilot, D-021/D-029) will reuse the member app's workout logger.

## 5. Accessibility checklist (a PR fails if any item fails)
- [ ] WCAG 2.2 AA. Text contrast ≥ 4.5:1 (≥ 3:1 at 24 px+ or 19 px bold). Non-text UI ≥ 3:1.
- [ ] Touch targets ≥ 44 × 44. Primary actions 48 px high.
- [ ] Everything works at 200% text size (Dynamic Type / browser zoom) with no clipped text and no horizontal scroll at 320 px.
- [ ] Real semantics: `<button>`, `<a href>`, `<label for>`, `<fieldset>/<legend>` for radio and checkbox groups, `<table>` with `<th scope>` for tabular data.
- [ ] Every icon-only control has an accessible name. Decorative SVGs are `aria-hidden`.
- [ ] A visible focus ring (2 px `--brand` + 2 px offset). Logical tab order. Sheets trap focus and restore it on close.
- [ ] Colour never carries meaning alone (status = text + icon, macros = label + value).
- [ ] Live regions for timers, toasts and sync status, with no chatty announcements.
- [ ] `prefers-reduced-motion` and `prefers-color-scheme` respected. Theme choices: Auto / Light / Dark.
- [ ] An axe-core e2e run passes with zero serious or critical violations.

## 6. Trainer branding rules
- The trainer can set a **logo** (square + optional wide) and **one brand colour**. That's it.
- Backgrounds, text, data colours and status colours are **not** customisable. They are what keep the app legible and accessible in light and dark mode for every client.
- The brand colour is auto-corrected for contrast (ARCHITECTURE §8). The trainer sees a before/after and the reason.
- Branding shows on: Today header (logo + "Coached by …"), splash, primary buttons, active tab, selected chips, invite page and emails.
- A custom app icon and an own App Store listing are **not** in v1 (DECISIONS D-009).

## 7. Screen inventory (v1)

| Area | Screens | Design file (`docs/design/`) |
|------|---------|-----------|
| Auth | Sign in, sign up, invite landing, reset, age/consent | – |
| Foundations | Tokens and components (the `/dev/components` gallery, Phase 0) | Foundations |
| Onboarding | The 6 questionnaire steps (PRD §4.1): You, Goal, Training, Where you train (with its Gym equipment sub-screen), Food, Lifestyle; then the result screen, Your plan | OnboardGoal (step 2), OnboardGyms (step 4), Equipment (step 4 sub-screen) |
| Member app | Today, Train (program), Active workout, Exercise detail/swap, History, Nutrition, Food search/add, Recipe, Progress, Photos, Check-in form, Coach (trainer chat / AI), Settings, Gym profiles (reuses the Equipment design), Consent controls, Subscription | Today, Workout (= Active workout), Nutrition |
| Trainer | Clients, Client detail (overview, training, nutrition, body, check-ins, equipment), Program builder, Templates, Exercise library, Check-in inbox, Messages, Brand, Billing | TrainerDashboard, ProgramBuilder |

Every screen needs: loading, empty, error, offline and "no permission" states designed before it's built.

### 7.1 Where the spec overrides the design files

The design files are exported from the canvas and are not hand-edited. Until they're
re-exported, build these points from the spec, not the file:

- **All files:** load Geist self-hosted, not from Google Fonts. Text below 13 px → 13 px. Headings on the §2 scale (32/38, 22/28). Radius 14 → 16 (cards) or 12 (controls). Raw hex → tokens (the Quiet values in §2 apply): `#2445D8` → `--brand`, `#E8EDFF` → `--brand-tint`, `#1A33A8` → `--brand-hover`/`--brand-ink`, `#5B6372` → `--ink-2`, `#D5D9E0` and `#B6BCC6` → `--line-strong`, `#F7F9FF` → `--brand-tint`, `#FBFBFC` → `--surface-2`, `#E3F4EC`/`#0B5E45`/`#13261F` → `--ok-tint`/`--ok-ink`, `#FFF8EE` → `--warn-tint`, `#2A3140` → `--line-strong` (dark). Every tap target ≥ 44 px.
- **Foundations:** "log in under 5 seconds" → §1 principle 2 (≤ 10 s). The trainer nav must match §4 (names, plus "Switch to my training"). Theme: Auto / Light / Dark, not "follows system". Location names follow PRD §4.1 ("Park", not "Outdoors"). The product name is FitTrack Pro, not "FitTrack Coach".
- **OnboardGoal:** "Training days per week" is a radio group (`fieldset`/`legend`), not `aria-pressed` buttons.
- **OnboardGyms:** "you can add more later" is true only on Pro or the trial (BUSINESS-RULES §3.5); say "Add more anytime with Pro" for free members.
- **Equipment:** no `role="tab"` without tab panels (use a SegmentedControl); no links nested inside a `<label>`; "Save" continues the onboarding flow (to step 5) when reached from onboarding.
- **Today:** add the describe-to-log entry (typed, with the mic) and quick log (ROADMAP Phase 1), and for coached clients the trainer logo + "Coached by …" header (§6). Coach-note time comes from `notes.created_at`.
- **Nutrition:** the mic button dictates into the describe-to-log text box; there must be a visible text box too.
- **Workout:** every set row is prefilled from last time when history exists (PRD §3, ≤ 2 taps). The elapsed time is a `role="timer"` element, not an `aria-label` on a `<span>`.
- **TrainerDashboard:** no "Export" button and no "sample data" label (not in PRD §4.2). The "Check-in due" status uses `--warn-tint`/`--warn-ink` with text, not the brand tint. Client rows are ≥ 44 px tall.
- **ProgramBuilder:** "Full equipment · no sled" isn't possible (`assume_full` is all-or-nothing): show "Full equipment", or the client's actual equipment list. "Limitations" reads `questionnaire.injuries`. "Last 7 days" shows a "not shared" state when the client hasn't consented to that category. The swap button is ≥ 44 px.
