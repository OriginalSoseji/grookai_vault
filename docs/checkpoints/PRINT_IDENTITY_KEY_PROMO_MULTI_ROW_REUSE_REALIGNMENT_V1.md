# PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1

## Context

The promo collision family was audited as:

- `conflict_group_size = 3`
- `TRUE_CANONICAL = 1`
- `SHADOW_ROW = 1`
- `MALFORMED_ROW = 1`

Canonical row:

- `50386954-ded6-4909-8d17-6b391aeb53e4`

Rows to remove:

- `5557ba0d-6aa7-451f-8195-2a300235394e` as `SHADOW_ROW`
- `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4` as `MALFORMED_ROW`

## Resolution Method

This execution unit realigns both non-canonical rows to the canonical row by:

1. repointing dependent FK-bearing rows to the canonical parent
2. merging duplicate trait / printing surfaces lawfully
3. preserving canonical `card_prints` row data unchanged
4. deleting the two non-canonical rows

## Invariants Preserved

- canonical `card_prints` row unchanged
- `gv_id` unchanged
- no unrelated rows touched
- no FK orphans allowed
- no duplicate promo identity remains in the audited family after apply

## Expected Verify Surface

- `rows_deleted = 2`
- `rows_repointed = 2`
- `remaining_collisions = 0`

## Live Apply Result

Dependent surfaces moved off the two non-canonical rows:

- `card_printings` redundant rows deleted: `3`
- `external_mappings` updated: `1`
- `justtcg_variant_price_snapshots` updated: `5`
- `justtcg_variant_prices_latest` updated: `5`
- `justtcg_variants` updated: `5`
- `pricing_watch` updated: `1`
- `pricing_watch` redundant rows deleted: `1`
- `shared_cards` updated: `1`
- `slab_certs` updated: `1`
- `vault_items` updated: `3`
- `vault_item_instances` updated: `2`

Post-verify:

- canonical row checksum unchanged
- `gv_id` unchanged
- no FK orphans
- no remaining references to deleted rows
- only the canonical promo row remains in the audited family

The next lawful step after successful apply is to rerun the bounded promo `print_identity_key` backfill lane.
