# SLAB MIXED ROW QUANTITY AUDIT

## Status

PRESENTATION BUG

## Data Truth

Founder data for `card_print_id = 5557ba0d-6aa7-451f-8195-2a300235394e` now proves mixed ownership is real:

- founder user: `03e80d15-a2bb-4d3c-abd1-2de03e55787b`
- slab cert `106183226` exists in `slab_certs`
- active raw instance count: `1`
- active slab instance count: `1`
- total active instances: `2`

Exact owned objects:

- active raw instance
  - `vault_item_instances.id = 71707056-deb2-4241-a448-313e64d2d61e`
  - `gv_vi_id = GVVI-065CAB28-000365`
  - `card_print_id = 5557ba0d-6aa7-451f-8195-2a300235394e`
  - `slab_cert_id = null`
  - `legacy_vault_item_id = null`

- active slab instance
  - `vault_item_instances.id = bd69091f-d845-4a63-bbe6-1b679ab91034`
  - `gv_vi_id = GVVI-065CAB28-000366`
  - `card_print_id = null`
  - `slab_cert_id = cc1c09ea-8fa7-43d7-a00a-11545b766016`
  - `legacy_vault_item_id = 3b4b38c6-75b7-4b8f-9680-dfaf970e0431`
  - `grade_company = PSA`
  - `grade_value = MINT 9`
  - `grade_label = PSA MINT 9`

Linked anchors for the same card:

- raw-style active anchor
  - `vault_items.id = d1d7e75e-0efb-4fa0-9537-d5f3aca20db0`
  - `is_graded = false`
  - `condition_label = NM`

- slab-style active anchor
  - `vault_items.id = 3b4b38c6-75b7-4b8f-9680-dfaf970e0431`
  - `is_graded = true`
  - `grade_company = PSA`
  - `grade_value = MINT 9`
  - `grade_label = PSA MINT 9`
  - `condition_label = SLAB`

Conclusion:

- the data is actually `1 raw + 1 slab`
- there is no duplicate slab creation bug in the current state
- `Qty 2` is data-correct as a total-object count

## Read Model Analysis

Relevant files:

- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)

Current web vault row derivation:

- `getCanonicalVaultCollectorRows.ts` aggregates one row per `card_print_id`
- for mixed rows it derives:
  - `owned_count = aggregate.totalCount`
  - `total_count = aggregate.totalCount`
  - `raw_count = aggregate.rawCount`
  - `slab_count = aggregate.slabCount`
  - `slab_items = aggregate.slabItems`
  - `is_slab = aggregate.slabCount > 0`
  - `grader/grade/cert_number = primary slab only`

For this founder/card:

- `owned_count = 2`
- `raw_count = 1`
- `slab_count = 1`
- `is_slab = true`
- `grader/grade/cert_number` come from the slab object only

Important shaping loss:

- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) normalizes the collector row into `VaultCardData`
- that mapper preserves:
  - `owned_count`
  - `is_slab`
  - `grader`
  - `grade`
  - `cert_number`
- but it drops:
  - `raw_count`
  - `slab_count`
  - `slab_items`

So the read model already knows the row is mixed, but the current UI contract loses the mixed-summary fields before rendering.

## Vault Tile Analysis

Relevant file:

- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)

Current tile behavior:

- if `item.is_slab` is true, the row is rendered in the slab presentation lane
- the slab lane uses:
  - `slabSummary = grader + grade`
  - `cert_number`
  - `Qty {item.owned_count}`
- `item.owned_count` is the total object count, not the slab count

Exact seams that create the misleading presentation:

1. header strip:
   - `Qty {item.owned_count}`
2. slab panel:
   - `Slab` label
   - slab metadata from only the slab object
   - `Qty {item.owned_count}`

Effect:

- the row visually presents itself as “the slab row”
- but the quantity shown is the total count across raw + slab
- this makes `Qty 2` look like “2 slabs” or “2 of this slab state,” which is misleading

This is especially confusing because the tile does not display the raw component anywhere once `is_slab` is true.

## Card Detail Comparison

Relevant files:

- [getOwnedObjectSummaryForCard.ts](/c:/grookai_vault/apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

Card detail already has the more honest model:

- it computes:
  - `totalCount`
  - `rawCount`
  - `slabCount`
  - grouped summary lines
- it renders lines like:
  - `1 Raw`
  - `1 PSA 9`

So the inconsistency is explicit:

- card detail is object-aware
- vault row is mixed-data-aware internally, but presentation collapses to a slab-looking row plus total qty

## Exact Reason Qty 2 Is Showing

`Qty 2` is showing because:

1. the aggregated vault row correctly represents `2` owned objects total
2. the same row is marked `is_slab = true` because at least one slab exists
3. the vault UI chooses the slab rendering lane for the entire row
4. the tile uses total `owned_count` inside that slab lane
5. the mapper dropped `raw_count` / `slab_count`, so the tile cannot tell the user `1 Raw + 1 PSA 9`

This is not a wrong count.
It is a misleading mixed-row presentation.

## Smallest Safe Fix Direction

Recommended direction:

Option 2 — Replace generic qty with object-aware summary for mixed rows

Reason:

- preserves one-row-per-card
- uses already-derived truth (`raw_count`, `slab_count`)
- avoids a larger row-splitting redesign
- aligns vault semantics with the already-honest card-detail summary

Smallest safe implementation boundary:

1. extend `VaultCardData` / vault normalization to keep:
   - `raw_count`
   - `slab_count`
   - optionally `slab_items`
2. update [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
   - if `raw_count > 0 && slab_count > 0`, do not show a generic slab `Qty {owned_count}`
   - instead show an honest mixed summary such as:
     - `1 Raw + 1 PSA 9`
3. preserve current single-row aggregation and all current actions

Not recommended as the first fix:

- splitting raw/slab into separate visible vault rows
- changing the underlying aggregation model

## File Inventory

- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- [getOwnedObjectSummaryForCard.ts](/c:/grookai_vault/apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
- [slab_mixed_row_quantity_audit.sql](/c:/grookai_vault/docs/audits/slab_mixed_row_quantity_audit.sql)
