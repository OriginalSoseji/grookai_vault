# Smart Search Phase 5 - Broad Filter Discovery V1

Date: 2026-06-17

## Objective

Allow governed Smart Search filters to discover catalog rows even when the user does not provide a specific card-name query.

Examples now supported through the broad discovery path:

- `all reverse holos from 2014-2026`
- `cards with exact images`
- `cards missing images`
- `Build-A-Bear stamped cards`
- filter-form searches with finish, image state, stamp, year, set, artist, or identity scope

## What Changed

- Added a broad child-printing discovery path for filter-only Smart Search requests.
- Routed no-text finish/image/stamp searches through child `card_printings` discovery instead of the name resolver.
- Preserved child printing context in results:
  - `printing_gv_id`
  - selected child route query
  - finish key
  - finish display label
  - child image truth fields
- Reused the existing Explore row builder so broad filter results render like normal resolver results.
- Updated Smart Search parsing so recognized finish and stamp phrases become filters instead of leftover text.

## Guardrails

- No arbitrary SQL.
- No AI query execution.
- No database writes.
- No migrations.
- No truth-rule changes.
- Broad discovery is capped with `SMART_FILTER_DISCOVERY_LIMIT`.
- Ownership-only broad discovery remains guarded because it needs a dedicated vault inventory index path.

## Verification

Commands run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check -- apps/web/src/lib/explore/getExploreRows.ts apps/web/src/app/api/resolver/search/route.ts apps/web/src/lib/search/smartSearchIntent.ts apps/web/src/components/explore/ExplorePageClient.tsx
```

Results:

- Typecheck passed.
- Lint passed with the pre-existing warehouse `<img>` warning.
- Strict web build passed.
- Diff whitespace check passed.

## Remaining Follow-Up

Add a dedicated ownership-indexed discovery path for broad vault prompts such as:

- `all cards missing from my vault`
- `all reverse holos missing from my vault`
- `cards I own with exact images`

This should be built as a separate guarded pass so it can use the vault inventory model directly instead of scanning arbitrary catalog rows.
