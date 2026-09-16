# UX Benchmark — SF-Migrator Console

Method: automated audit + numeric checks, re-runnable via `npm test`.
Standards: **WCAG 2.2 AA**, **Nielsen's 10 heuristics** (qualitative),
Apple HIG touch guidance, and a JS performance budget.

| Gate | Tool | Before | After |
| ---- | ---- | ------ | ----- |
| Text contrast (WCAG 1.4.3, ≥4.5:1) | `tests/unit/contrast.test.ts` (relative-luminance math) | **8/14** | **14/14** |
| Structure/names/roles (axe-core 4.9, full ruleset, 11 screens) | `tests/unit/a11y.test.ts` (client-rendered, representative state) | **3 violations** (steps 5–6) | **0 violations** |
| Keyboard focus visible (WCAG 2.4.7) | manual code check | missing on buttons/pips | `:focus-visible` ring on all interactive elements |
| Touch targets (WCAG 2.5.8 ≥24px) | measurement | pips 30px, others ok | pips 34px, toggles 48×27, buttons ~38px tall |
| Reduced motion | code check | transitions always on | `prefers-reduced-motion` disables transitions |
| Bundle budget (<200 KB JS gzip) | `vite build` | 177 KB / 55.6 KB gzip | unchanged (CSS-only + ARIA changes) |

## Baseline failures and fixes

**Contrast (6 fails → fixed by darkening one stop, verified numerically):**

| Pair | Before | After |
| ---- | ------ | ----- |
| muted `#7c86a0` on white | 3.64 | `#5f6b87` → **5.33** |
| white on accent (buttons, gauge) | 4.32 (indigo `#6c63ff`) | warm rose `#a94e80` → **5.14** |
| pip number on preset | 3.10 | inherits muted fix → **4.55** |
| notice ok text | 4.19 | `#1a6547` → **5.55** |
| notice warn text | 4.43 | `#7c5a0d` → **5.21** |
| code text on terminal | 12.63 (cool) | warm sepia `#f3cfe0` on `#2b1c26` → **11.42** |

**Motion & spacing pass (design-pattern review):**

- Hover = gentle lift (`translateY(-1px)` + deeper shadow), never a bare
  brightness filter; press = sink (`translateY(1px)` + inset shadow). All
  transitions declare their properties with 120–180ms ease-out timings.
- Spacing follows a 4px scale (4/8/12/16/20/24); section headers carry a
  consistent `4px 0 16px` margin.
- `prefers-reduced-motion` disables transitions *and* the background drift.
- Touch targets: pips 34px, toggles 48×27, buttons ~44px tall (WCAG 2.5.8).

**axe violations (all WCAG 4.1.2 name/role/value or best practice):**

- Step 5: 4 field checkboxes had no label (bare `<div>` rows) → rows are now
  real `<label>` elements; lookup `<select>` traded `title`-only for an
  explicit `aria-label`.
- Step 6: filter field/operator `<select>`s and the value `<input>`
  (placeholder is not a name) → `aria-label`s.
- Step 1: file upload had no name → `aria-label`.

**Polish added beyond the violations:**

- `role="progressbar"` with `aria-valuenow/min/max` on gauges.
- `role="status"` live regions on extraction/loading status lines.
- `role="alert"` on error notices; `aria-current="step"` on the stepper.

## Nielsen heuristics (qualitative pass)

1. Visibility of status — live progress gauges + `role="status"` + per-object
   "current" readout. ✓
2. Match with real world — wizard language mirrors the migration domain
   (orgs, objects, fields, filters). ✓
3. User control — pause/resume/cancel on jobs, Back/Edit anywhere, remove
   targets/filters. ✓
4. Consistency — one primitive set (`ui.tsx`), one envelope, one nav model. ✓
5. Error prevention — validation gates (Step 9 blocks loading), nickname
   uniqueness, min-one selections, disabled states. ✓
6. Recognition over recall — summary screen aggregates everything before
   destructive actions. ✓
7. Flexibility — import/export configs, per-object and global controls. ✓
8. Minimalism — one concern per step; no decoration without function. ✓
9. Error recovery — messages carry the server's reason; failed rows retry;
   troubleshooting guide in `docs/`. ✓
10. Help — `USER_GUIDE.md`, inline hints, sample config download. ✓

## Known limits (not covered by automation)

- jsdom has no layout engine, so axe cannot evaluate color-contrast — that is
  why contrast is a separate numeric gate above.
- No screen-reader or manual keyboard-only pass yet — recommended follow-up
  (NVDA/VoiceOver) before calling the UI fully done.
- Gradient display text (hero title) is decorative large text; glass
  translucency means real-world contrast varies with the backdrop — spot-check
  on a calibrated display if this ships to users with low vision.
