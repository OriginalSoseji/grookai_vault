# Vault Mobile Browse Hierarchy — 2026-11-14

## Completed

- Reduced mobile-only vertical overhead in the Vault header and value summary,
  so the card artwork enters the first viewport sooner while preserving the
  collection actions, valuation freshness, collection counts, search, view
  density, price filter, sort and smart views.
- Kept the desktop hierarchy unchanged.
- Added a regression assertion that the first visible card begins before
  700px on the 384px Samsung viewport used by the web parity suite.

## Verification

- Vault collection parity: 5/5 passed. This covers desktop pagination and URL
  state, 384px overflow and first-card position, retained 2/3/4-column choices,
  price filters and sorting, and contiguous By Set groups.
- Synthetic fixture artwork is rejected by the production-safe public image
  policy; this check proves layout and behavior, not artwork rendering.
- No physical Samsung web-browser inspection is claimed. The available Duet
  display mirrors the workstation, not the phone.
- Full repository hooks and hosted PR checks remain required after commit.

## Source

- Vault mobile layout changes in `VaultCollectionView.tsx`,
  `VaultMobileToolbar.tsx`, and `globals.css`.
- Regression coverage in `vault-collection.pagination.spec.ts`.
- Scanner work remains deferred at the owner's direction.
