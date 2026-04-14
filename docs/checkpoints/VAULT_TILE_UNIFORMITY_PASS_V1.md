# VAULT TILE UNIFORMITY PASS V1

## Purpose
Make the Vault grid visually uniform and more card-dominant by standardizing tile height and tightening tile layout.

## Scope Lock
- vault tile presentation only
- no filter/search/top-bar redesign
- no behavior changes

## Current Problems
- tile heights vary based on text length
- image area is too small relative to tile footprint
- title/meta/price rhythm is inconsistent
- price rows do not align cleanly
- vault reads less premium because the grid lacks uniformity

## Audit
- vault grid owner:
  - `VaultPageState._buildVaultCards()` in `lib/main_vault.dart`
- tile widget owner:
  - `_VaultGridTile` in `lib/main_vault.dart`
- current image sizing:
  - artwork is inside an `Expanded` slot with a clipped fill image and a relatively small outer tile footprint driven by `childAspectRatio: 0.63`
- current title behavior:
  - title is `maxLines: 1`, but it sits in a free-flow column with no reserved title slot height
- current metadata behavior:
  - metadata is a single optional text row with no dedicated reserved height
- current price placement:
  - price pill is conditional and only rendered when pricing exists, so lower tile rhythm changes when a card has no visible value
- cause of height variance:
  - the grid cells are structurally fixed by the grid delegate, but the internal tile layout is not slot-based
  - image uses `Expanded`, while title/meta/price occupy variable space depending on whether metadata and price render
  - no dedicated price slot means the lower edge rhythm staggers visually across rows even when the card containers are technically equal height
