# DESIGN_SYSTEM_TIGHTENING_V1 Implementation

Date: 2026-05-20

## Scope

This pass tightened shared visual-system and mobile-containment behavior only.

No data, pricing, scanner, Species Dex denominator logic, card identity, public route policy, or migrations changed.

## Changes

- Removed the dark-mode rule that inverted `bg-slate-900` / `bg-slate-950` to white.
- Added dark-mode color treatment for form fields, disabled controls, amber/emerald/sky status surfaces, borders, and text.
- Added a dark-mode card-detail watermark wash so identity panels do not mix a light overlay with dark text.
- Added shared mobile safe-content padding and page-level horizontal clipping.
- Fixed `PageContainer` sizing so horizontal padding no longer expands mobile pages beyond the viewport.
- Tightened mobile header behavior:
  - brand area now flexes and truncates correctly;
  - action area no longer scrolls horizontally;
  - secondary mobile header actions hide under 430px;
  - login remains visible.
- Increased mobile bottom-nav safe-area spacing.
- Capped card-detail image width/height on small screens to prevent first-viewport clipping.
- Strengthened primary search-button state while preserving existing UI structure.

## Verification

Commands run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run build
git diff --check
```

Results:

- Typecheck: PASS
- Lint: PASS with existing warning in `WarehouseSubmissionForm.tsx` for `<img>`
- Build: PASS
- Diff check: PASS

## Browser Smoke Notes

Local production server smoke required starting `next start` from `apps/web` directly. Starting through `npm --prefix` from the repo root served the wrong static chunk path and caused false `ChunkLoadError` results.

Local data smoke was partially limited by environment fetch behavior:

- `/explore?q=charizard%20cameo` rendered shell and mobile chrome, but local fetch returned `TypeError: fetch failed`.
- Card detail smoke could not be fully proven locally because tested production IDs did not resolve in the local data context.

Production or preview smoke should still confirm:

- `/explore?q=charizard%20cameo`
- `/card/GV-PK-PRE-002`
- `/sets/sv8pt5`
- `/dex/pikachu`
- `/vault`

## Remaining Polish Debt

- Full card-detail visual confirmation should happen after deploy/preview against production data.
- Mobile dark-mode toggle placement below 430px needs a deliberate interaction design. It is intentionally hidden there for now to protect header fit.
- Search fetch failure in local smoke is environment-specific and should be rechecked in preview/prod.
- This pass does not redesign search result hierarchy, card detail content order, set pagination, or Dex row density.

## Confirmation

- No DB writes
- No migrations
- No scanner changes
- No pricing changes
- No Species Dex denominator changes
- No parent `gv_id` changes
- No public child route enablement
