# Smart Search Phase 6 - Ownership Indexed Discovery V1

Date: 2026-06-17

## Objective

Make Smart Search understand vault ownership without scanning the whole catalog blindly.

## What Changed

- Added a read-only vault ownership ID helper:
  - direct active `vault_item_instances.card_print_id`
  - slab-backed active ownership through `slab_certs.card_print_id`
- Added an owned-inventory Explore discovery path.
- Routed owned-only filter searches through the user vault index when signed in.
- Kept scoped missing-from-vault searches as catalog discovery plus ownership post-filtering.

Supported examples:

- `cards I own`
- `cards in my vault`
- `reverse holos I own`
- `cards I own with exact images`
- `all reverse holos missing from my vault`

## Guardrails

- No database writes.
- No migrations.
- No AI query execution.
- No arbitrary SQL.
- Missing-from-vault still requires a catalog scope such as finish, year, stamp, image state, set, artist, or identity.
- Ownership results use active vault instances and slab-backed card print anchors.

## Verification

Commands run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm run web:build:strict
git diff --check -- apps/web/src/app/api/resolver/search/route.ts apps/web/src/lib/explore/getExploreRows.ts apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts
```

Results:

- Typecheck passed.
- Lint passed with the pre-existing warehouse `<img>` warning.
- Strict web build passed.
- Diff whitespace check passed.

## Remaining Follow-Up

The next improvement is UX-level clarity:

- show when a search is using vault ownership scope
- show sign-in required for ownership filters before users wonder why nothing appears
- add smarter empty states for broad ownership filters
