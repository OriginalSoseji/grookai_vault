# INTERACTION_HIERARCHY_V1 Implementation

Date: 2026-05-20

## Scope

This pass implemented the first visual hierarchy enforcement layer after `DESIGN_SYSTEM_TIGHTENING_V1`.

No data, pricing, scanner, Species Dex denominator logic, route policy, migrations, or resolver ranking changed.

## Implemented Priority Rules

Priority order now has shared presentation hooks:

1. Card identity
2. Selected finish / variant
3. Ownership state
4. Interaction / action
5. Price
6. Cameo / search context
7. Metadata
8. Diagnostics

## Changes

- Added `INTERACTION_HIERARCHY_V1` contract.
- Added shared hierarchy CSS classes for identity, selected version, ownership, action, price, search context, metadata, and diagnostics.
- Made selected `Variant / Finish` panels feel more important than metadata by giving them a distinct selected-version surface.
- Kept ownership positive and visible without letting it replace card identity.
- Quieted price presentation on search and vault tiles so price does not outrank ownership or identity.
- Separated cameo/search context from variant/finish treatment:
  - child finish context remains a selected-version signal;
  - `Cameo:` and `Cameo trainer:` labels render as lower-priority search context.
- De-emphasized GV-ID / printing ID diagnostics on card, search, set, and vault surfaces.

## Surfaces Touched

- Shared card grid tile
- Explore grid/list/details results
- Set card tiles with finish selection
- Card detail identity and vault summary
- Variant / finish selector
- Vault card tiles

## Deferred

- No full card-detail layout redesign.
- No search ranking changes.
- No resolver or database changes.
- No mobile app parity pass in this lane.
- No public child printing routes.

## Verification Plan

Run:

```powershell
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm run contracts:test
npm run contracts:runtime-health
git diff --check
```

Preview or production smoke should visually check:

- `/explore?q=charizard%20cameo`
- `/explore?q=GV-PK-ME03-033-RH`
- `/sets/sv8pt5`
- `/card/GV-PK-PRE-002`
- `/vault`

## Confirmation

- No DB writes
- No migrations
- No scanner changes
- No pricing changes
- No Species Dex denominator changes
- No resolver ranking changes
- No public child route enablement
