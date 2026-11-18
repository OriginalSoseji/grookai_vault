# Vault Browsing Refinement — 2026-11-17

## Outcome

The Vault collection first screen is denser on mobile and exposes the start of the card grid within the canonical 384 × 824 Samsung viewport. Search, grid/detail/compact view selection, smart views, collection statistics, valuation provenance, and route behavior remain available.

## Changes

- Reduced mobile page and overview spacing and used the compact shared page title.
- Removed the Vault value panel's decorative radial wash to follow `APP_VISUAL_SYSTEM_CONTRACT_V1`'s flat-surface direction.
- Tightened the value summary and moved the workspace link into the collection heading, preserving its 44px minimum target.
- Reduced mobile toolbar padding and section spacing without reducing search or view control heights.
- Added a regression assertion that the mobile search is visible and the first collection tile begins within the initial viewport.

## Source

- `apps/web/src/components/vault/VaultCollectionView.tsx`
- `apps/web/src/components/vault/VaultMobileToolbar.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tests/parity/vault-collection.pagination.spec.ts`

## Verification

- `npm run test:parity -- tests/parity/vault-collection.pagination.spec.ts` — 2 passed (desktop URL/pagination and Samsung viewport).
- `npx eslint src/components/vault/VaultCollectionView.tsx src/components/vault/VaultMobileToolbar.tsx tests/parity/vault-collection.pagination.spec.ts` — passed.
- `NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY=true npm run typecheck` — passed.
- `git diff --check` — passed.
- Captured and visually reviewed `apps/web/.tmp/vault-samsung-dark-after.png`; the card grid begins at the lower edge of the initial viewport. The fixture's card artwork is intentionally blank, so this capture verifies layout only.

## Data and publication

This is a presentation-only change. No production data, schema, account, marketplace, or listing state was changed. No release build has been published from this checkpoint.
