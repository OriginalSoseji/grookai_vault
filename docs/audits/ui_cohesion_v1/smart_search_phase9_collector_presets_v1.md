# Smart Search Phase 9 - Collector Presets V1

Date: 2026-06-17

## Objective

Give users fast entry points into common Grookai collector workflows without adding new search semantics.

## What Changed

- Added a `Collector presets` strip on the Explore landing state.
- Added the same preset strip on Explore result pages.
- Presets are simple, shareable Smart Search URLs.
- Initial presets:
  - Modern Pikachu reverse holos
  - Missing image worklist
  - Stamped special cards
  - My reverse holos
  - Reverse holo vault gaps
  - Exact image catalog
- Added a sentence-search CTA for a Build-A-Bear stamped card query.

## Safety Notes

- UI-only change.
- No database writes.
- No migrations.
- No resolver truth changes.
- No API contract changes.
- No vault mutations.

## Verification

Commands run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check -- apps/web/src/components/explore/ExplorePageClient.tsx
```

Results:

- Typecheck passed.
- Lint passed with the pre-existing warehouse `<img>` warning.
- Strict web build passed.
- Diff whitespace check passed.

## Remaining Follow-Up

Next high-value step:

- Add AI-assisted query translation on top of the deterministic Smart Search contract.
- Keep AI output constrained to the existing safe filter schema.
