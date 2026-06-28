# MEE TCGdex Reference Lifecycle Drain Closeout

Date: 2026-06-28

## Scope

Close out the TCGdex reference pricing source expansion by proving that the newly inserted TCGdex reference evidence has:

- raw snapshot lineage
- provider-agnostic lifecycle observations
- ordered lifecycle events through `rollup_eligible`
- no public/app-visible/market-truth leakage

This is internal Market Evidence Engine foundation work only. It does not publish prices.

## Completed Work

### TCGdex Reference Evidence

- Inserted `310,744` internal `market_reference_candidates` rows.
- Inserted `310,744` internal `market_reference_normalized_evidence` rows.
- Source mix:
  - `tcgdex_tcgplayer_reference`: `110,675`
  - `tcgdex_cardmarket_reference`: `200,069`

### TCGdex Raw Snapshot Repair

Migration applied:

- `supabase/migrations/20260625140000_market_reference_tcgdex_raw_snapshot_support_v1.sql`

Repair SQL artifacts:

- `docs/sql/mee_tcgdex_reference_raw_snapshot_repair_v1_preflight.sql`
- `docs/sql/mee_tcgdex_reference_raw_snapshot_repair_v1_apply.sql`
- `docs/sql/mee_tcgdex_reference_raw_snapshot_repair_v1_readback.sql`

Apply result:

- inserted acquisition runs: `1`
- inserted raw snapshots: `19,135`
- updated TCGdex candidates with raw snapshot lineage: `310,744`

Readback result:

- TCGdex candidate rows: `310,744`
- candidate rows with raw snapshot: `310,744`
- candidate rows with acquisition run: `310,744`
- distinct raw snapshots: `19,135`
- bad snapshot source rows: `0`
- candidate/snapshot raw import mismatch rows: `0`
- snapshot hash mismatch rows: `0`

### Lifecycle Drain

All TCGdex reference rows were projected into the provider-agnostic MEE lifecycle.

Readback:

- lifecycle observations: `310,744`
- expected lifecycle events: `2,175,208`
- remaining eligible TCGdex reference rows: `0`

Lifecycle stage counts:

| Stage | Events |
| --- | ---: |
| `acquired` | `310,744` |
| `raw_stored` | `310,744` |
| `normalized` | `310,744` |
| `matched` | `310,744` |
| `classified` | `310,744` |
| `quality_gated` | `310,744` |
| `rollup_eligible` | `310,744` |

Boundary proof:

- `publishable=true` lifecycle events: `0`
- `app_visible=true` lifecycle events: `0`
- `market_truth=true` lifecycle events: `0`

## Audit Note

The generic post-drain audit became too heavy after the TCGdex insert volume. Narrow readbacks were used for final proof because they target only the new TCGdex sources and avoid full-table scans across the expanded warehouse.

To keep future drains auditable at this scale, `scripts/audits/market_evidence_lifecycle_backfill_batch_plan_v1.mjs` now supports an optional `MEE_LIFECYCLE_REFERENCE_SOURCES` filter. Default behavior remains unchanged when the variable is omitted.

## Public Boundary

This work did not write:

- `pricing_observations`
- `ebay_active_prices_latest`
- public pricing views
- app-visible pricing
- public price rollups
- identity tables
- vault tables
- image/storage tables

TCGdex remains an internal evidence adapter. It is not price truth.
