# MEE-VARIANT-AWARE-INGESTION-V1

## Status

- Implemented internal variant assignment foundation.
- Applied targeted remote schema migrations:
  - `20260629130000_market_evidence_variant_assignment_v1`
  - `20260629131000_market_evidence_variant_read_models_v1`
- Backfilled deterministic variant assignments for existing reference and listing evidence.
- No public pricing view was replaced by this package.

## Why

The market evidence engine was assigning listing and reference evidence at the parent `card_print_id` level. That allowed clear finish-specific evidence such as `reverse holo`, `cracked ice`, or `cosmos holo` to collapse into one parent lane.

The regression card was `GV-PK-AR-1` Charizard Arceus #1. It already had child printings:

- `GV-PK-AR-1-HOLO`
- `GV-PK-AR-1-RH`
- `GV-PK-AR-1-CRACKED-ICE`

The visible eBay listings were not present in the warehouse, but the engine also lacked the child-lane assignment model needed to ingest them safely.

## Implemented

- `market_evidence_variant_assignments`
  - Internal sidecar table for assigning evidence rows to parent and child finish lanes.
  - Supports both `market_reference_candidates` and `market_listing_card_candidates`.
  - Stores `card_printing_id`, `printing_gv_id`, normalized finish key, assignment status, confidence, flags, and payload.
  - Enforces `publishable=false`, `app_visible=false`, and `market_truth=false`.

- `normalize_market_evidence_finish_key_v1(text)`
  - Normalizes finish text for `holo`, `reverse`, `cracked_ice`, `cosmos`, `pokeball`, `masterball`, and `rocket_reverse`.

- Internal read models:
  - `v_market_evidence_variant_assignment_current_v1`
  - `v_market_evidence_variant_assignment_card_summary_v1`
  - `v_market_evidence_variant_assignment_lane_summary_v1`
  - `v_market_reference_variant_signal_rollups_v1`
  - `v_market_listing_variant_active_ask_rollups_v1`
  - `v_market_listing_variant_query_targets_v1`
- Finish alias handling:
  - `cracked_ice` query targets include both `cracked ice holo` and `cosmos holo`.
  - Existing/future `cosmos` evidence may map to `cracked_ice` only when the parent has no true `cosmos` child.

- Nightly automation:
  - `mee_nightly_droplet_worker_v1.mjs` now includes an idempotent variant assignment backfill phase after lifecycle projection and before quality scoring.

- Acquisition planning:
  - The eBay dry-run planner now preserves `card_printing_id`, `printing_gv_id`, and `finish_key`.
  - Default target loading now uses variant query targets where child printings exist, and parent rows only when no child rows exist.
  - The eBay projection layer now persists `card_printing_id`, `printing_gv_id`, and `finish_key` inside the raw observation `target` payload for future runs.

## Live Readback

Variant assignment backfill:

```json
{
  "assignment_rows": 517268,
  "reference_assignment_rows": 333055,
  "listing_assignment_rows": 184213,
  "exact_child_finish_rows": 306931,
  "single_child_inferred_rows": 51869,
  "parent_has_no_child_rows": 27252,
  "unknown_finish_needs_review_rows": 16846,
  "ambiguous_finish_conflict_rows": 0,
  "no_matching_child_finish_rows": 113792,
  "public_boundary_leak_rows": 0
}
```

Variant read models:

```json
{
  "reference_variant_rollup_rows": 23925,
  "listing_variant_rollup_rows": 2219,
  "variant_query_target_rows": 71318,
  "reverse_query_targets": 15545,
  "holo_query_targets": 10851,
  "cracked_ice_query_targets": 262,
  "cracked_ice_cosmos_alias_targets": 131,
  "cosmos_query_targets": 357,
  "public_boundary_leak_rows": 0
}
```

## Regression: GV-PK-AR-1

`GV-PK-AR-1` now has separate internal reference lanes:

| Printing | Finish | Low | Median | High | Eligible Evidence |
| --- | --- | ---: | ---: | ---: | ---: |
| `GV-PK-AR-1-HOLO` | `holo` | 30.77 | 44.77 | 56.57 | 3 |
| `GV-PK-AR-1-RH` | `reverse` | 42.28 | 51.41 | 52.27 | 3 |

The `normal` Cardmarket evidence for this card is not assigned to a child lane because the parent has no `normal` child printing. It is held as `no_matching_child_finish` instead of being blended into the parent.

Variant query targets now include:

- `Pokemon "Charizard" "Arceus" "1" "holo"`
- `Pokemon "Charizard" "Arceus" "1" "holofoil"`
- `Pokemon "Charizard" "Arceus" "1" "reverse holo"`
- `Pokemon "Charizard" "Arceus" "1" "reverse holofoil"`
- `Pokemon "Charizard" "Arceus" "1" "cracked ice holo"`
- `Pokemon "Charizard" "Arceus" "1" "cosmos holo"`

After the first focused variant-aware eBay pass:

```json
{
  "requests": 100,
  "fetched_items": 617,
  "new_market_listing_candidates": 578,
  "new_internal_rollups": 61,
  "gv_pk_ar_1_cracked_ice_raw_single_listing_count": 24,
  "gv_pk_ar_1_cracked_ice_raw_single_active_ask_median": 43.69,
  "gv_pk_ar_1_cracked_ice_slab_listing_count": 6,
  "gv_pk_ar_1_cracked_ice_slab_active_ask_median": 154.00,
  "public_boundary_leak_rows": 0
}
```

`GV-PK-AR-1-CRACKED-ICE` now has internal active-ask evidence separated from the holo and reverse lanes. This remains review-only and not app-visible.

## Boundaries

- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing view replacement.
- No app-visible pricing change.
- No identity table writes.
- No card print/card printing identity mutation.
- No vault writes.
- No image/storage writes.
- No deletes.
- No global apply.

## Verification

- `node --test tests/contracts/mee_variant_assignment_v1.test.mjs` (`8/8`)
- `npm run contracts:test` (`625/625`)
- Targeted live readbacks against linked Supabase project.
- Migration history shows both variant migrations applied.
