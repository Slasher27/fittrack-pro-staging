# v3 → Pro data migration (Phase 3)

Status: v1.1 (2026-10-01). Checked against the v3 code, not v3's docs. This moves **one user's**
(Duwayne's) data from the v3 Supabase project into Pro. v3 file references are to
`C:\Websites\FitTrack-app`.

## 1. The script

`scripts/migrate-v3.ts`, run locally with the Pro service-role key and v3 read access.
`--dry-run` writes nothing and prints a report: counts per v3 store, per Pro table, every
dropped or unresolved item, and the verification numbers in §5. The real run is idempotent:
Pro ids are **UUID v5** of `"<v3 store>:<v3 id>"` under a fixed namespace, so re-running
upserts the same rows. It commits in small batches (ARCHITECTURE §5).

## 2. Inputs

1. **v3 `records` rows** for the user (`store`, `id`, `data`, `up`, `deleted`). Skip rows with `deleted = true`.
2. **v3 Storage** `photos/{v3 uid}/{id}.jpg` for photo records with `remote: true`.
3. **A v3 Settings → Export JSON file**, made **on the phone that took the photos** (Export throws on a
   photo record that has no local blob, `app/settingsView.js` `exportData`). It's needed because v3 keeps
   `settings` (targets incl. `kcalTrain`, `goalWeight`, `startWeight`, `reviewDay`) in device-local kv that
   never syncs (`app/db.js` `SYNCED_KV`). Export strips `aiKey`. It also carries base64 photos that never uploaded.
4. **v3 code as a library:** the script loads, in a VM context, v3 `app/seed.js` + `app/exercises.js` (the
   catalogue, `sideWord`, `DEFAULT_PROGRAM`, `DEFAULT_EQUIPMENT`), `app/targets.js` (`parseTarget`,
   `normalizeTarget`, `targetLabel`) and the helpers in `app/settings.js` (`exFind`, `isUnilateral`,
   `defaultRest`). It then applies v3 `loadProgram`'s in-memory normalisation to every plan exercise
   (`app/settings.js`): `perSide` from `isUnilateral()` or the target text, `normalizeTarget()`, `mode`
   inference, and rest = time-mode 20 s (skipping) / 30 s, else `defaultRest()`. v3 never writes these back,
   so stored plans may still hold free-text `target` without `tgt`. It also applies v3's EQUIP fill-ins
   (`app/settings.js`: missing `dumbbells`, `bars`, `plates`, `bands`, `gear`, `barKg`).

**Things that may be missing from `records`** (v3 writes them unstamped, so they're never pushed unless edited):
- `plan-default` / `plan-legacy`: build the plan v3 shows (legacy kv `program` if present → `plan-legacy`,
  else v3 `DEFAULT_PROGRAM` → `plan-default`) when there are no `plans` rows, **or** when kv `activePlan`
  or any `workouts.planId` references it and it's missing.
- kv `activePlan` missing, or naming a plan that doesn't exist → the earliest plan by `createdAt` (v3's rule).
- Built-in exercises are never in `records`. Pro seeds the same 318 ids (ROADMAP Phase 2), so names and ids resolve against Pro's global catalogue.

## 3. Mapping

**Name → exercise:** resolve with v3's `exFind` rules (name or alias, case-insensitive) against Pro's
global catalogue. Unresolved names (they exist: v3 keeps unknown AI-generated names as text in plans)
become own `exercises` rows (`owner_id` = Duwayne, `requires` = `[]`, `metric` from the logged mode),
listed in the report.

**Times:** a v3 timestamp `ts` is used only when it falls on the record's `date` in Africa/Johannesburg;
otherwise the time comes from the default given for that store (v3 lets you back-date log, water and
workout entries while `ts` stays "now").

| v3 | Pro |
|----|-----|
| `foods` | Every custom food, plus every non-custom food referenced by `log` or a recipe, becomes an **owned** food (`owner_id` = Duwayne). `group` → `group_name`. `source`: `group:'Online'` → `off`, `estimated:true` → `ai`, else `user`. Weight/volume serving (`servingUnit()` matches, e.g. `"100 g"`, `"40 g"`, `"100 ml"`) → `per100` from `foodPer100(f)` with keys renamed (`protein` → `protein_g`, `carbs` → `carbs_g`, `fat` → `fat_g`, `unit` dropped), and `servings = [{label: serving, grams: base}]`. Count serving (`"1 egg"`) → `per100` null, `servings = [{label, grams: null, kcal, protein_g, carbs_g, fat_g}]`. Recipes (`kind:'recipe'`) → `kind='recipe'`, `ingredients = [{food_id: map(foodId), grams: g}]`, `cooked_g = cookedG`. Unreferenced built-in foods are dropped (Pro has its own seed). |
| `log` | `food_logs`. `food_id` = mapped `foodId` (null if that food was deleted). `name`, `servings`, `serving_label = serving`, macros copied (`protein` → `protein_g` …), `estimated` kept. `grams = servings × base` for weight foods, else null. `meal_slot = meal` (may be missing → null). `eaten_at` = `ts` if it falls on `date`, else `date` at the slot's default time (breakfast 08:00, lunch 13:00, snack 16:00, dinner 19:00, none 12:00). |
| `measurements` | `body_metrics`: `weight` → `weight_kg`; `waist`, `chest`, `arm`, `thigh` → `…_cm`; `notes`; `date`. |
| `water` | `water_logs`: `ml`; `at` = `ts` if it falls on `date`, else `date` 12:00. |
| `photos` | `photos`: `taken_on = date`, `pose = category`, `note`, `storage_path = '{pro uid}/{pro id}.jpg'`. Blob from v3 Storage (if `remote`) or the Export base64, uploaded there, then `remote = true`. |
| `workouts` | `workouts`: `date`, `title`, `notes`; `started_at` = `ts` if it falls on `date`, else `date` 12:00; `finished_at = started_at` (v3 records no finish time; every saved v3 session is finished); `program_id` = mapped `planId` (null for pre-plan sessions); `program_day_id` = mapped `planId` + `dayKey` (null if the plan or day is gone). Each `exercises[i]` → `workout_blocks` (`position = i`, `exercise_id` resolved, `mode`, `target = tgt` or normalised `target`, `items` with resolved names, `rest_s = rest`, `per_side = perSide`). Each set → `workout_sets` (`set_index`; `weight` → `weight_kg`, `reps`, `secs`, `rest` → `rest_s`, parsed as numbers with `''` → null; `done`). |
| `plans` | `programs` authored by Duwayne, `client_id` null. `source`: `ai` → `generated`, `shared` → `shared`, `seed`/`custom` → `custom`. `status`: the active plan → `active`, others → `archived`. `title = name`, `description`, `meta = {rationale, weekly_focus, shared_from, v3_id}`, `created_at`/`starts_on` from `createdAt`, `weeks` null. Day keys in sorted order (`A`, `B`, `C`…) → `program_days` (`day_index` 0, 1, 2…, `week` null, `title`). `schedule {Mon:'A'}` → `{"1": 0}` (ISO weekday). Each normalised exercise → `program_items` (`position`, `exercise_id` resolved, `mode`, `target = tgt`, circuit `items` resolved, `rest_s = rest`, `per_side = perSide`, `type`). |
| own `exercises` (stamped/custom) | Expected to be empty (v3 has no UI that writes them); mapped like the catalogue if present. |
| kv `equipment` (`EQUIP`, after fill-ins) | One `gym_profiles` row "Home" (`is_default`, `assume_full = commercial`). Each bar → a barbell item (`weights` = its kg); `plates` `{kg, n}` → a plates item with `weights` = the list of kg values; `dumbbells`, `kettlebells` → items with `weights` lists; `pulley` → the cable/pulley catalogue item when true; `bands` and `gear` strings → catalogue items via a mapping table in the script. Any unmapped string **fails the dry run** until it's added to the table. |
| kv `profile` | `profiles.questionnaire` = the whole object (limitations stay at `questionnaire.injuries`; `reviewDay` stays in it). `sex`, `height_cm = heightCm`, `birth_year = year(updatedAt or createdAt or today) − age` (`updatedAt` is reset whenever the age is re-entered). |
| Export `settings` | One `targets` row (`kcal`, `kcal_train = targets.kcalTrain`, `protein_g`, `carbs_g`, `fat_g`, `water_ml = 3000`, `set_by = 'self'`, `effective_from` = the first log date). `profiles.start_weight_kg = startWeight`, `goal_weight_kg = goalWeight`. `settings.reviewDay` → `questionnaire.reviewDay` only if the profile has none (the profile value wins, as in v3). |

## 4. Not migrated

- `meals` (seed meal-plan meals and custom meals): decided at the start of Phase 1 (PROGRESS.md).
- Device-local or derived kv: `coachChat`, `coachArchive`, `reviews`, `lastReview`, `woDraft`, `session`, `syncState`, `tombstones`, `sbproject`, `mealSeedVersion`, `exerciseSeedVersion`, `howtoDismissed`, `insightDismissals`, `localOnly`, `aiKey`.
- Settings `theme`, `notify`, `lastNotify` (Pro has its own settings).
- EQUIP `n` (plate counts), `barKg`, `dbMaxKg`, `plateKg`, `microPlateKg`, bar `name` (Pro stores available weights, not counts).
- Legacy kv `program` when `plans` rows exist (v3 ignores it too).
- Workout `prs` and `dayKey` once its plan is gone (PRs are recomputed), photo `ts`, food `custom` (implied by ownership), unreferenced built-in foods, v3's built-in exercises (Pro seeds the same catalogue).
- v3 `ai_usage` rows (cost history stays in v3).

## 5. Verification (dry run and after the real run)

- Row counts per v3 store vs Pro table, and every dropped/unresolved item listed.
- Daily kcal and protein totals for the last 8 weeks: v3 vs Pro, equal to 1 kcal / 0.1 g.
- Best set and e1RM per exercise: v3 `exerciseBests()` vs Pro `analytics` on the migrated data.
- Latest weight and 7-day average; photo count with blobs present.
- The active program renders the same days, exercises, targets (incl. "per leg/arm") and rest as v3's Train tab.
