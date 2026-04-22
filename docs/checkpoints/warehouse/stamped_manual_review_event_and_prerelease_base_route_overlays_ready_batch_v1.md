# stamped_manual_review_event_and_prerelease_base_route_overlays_ready_batch_v1

## Context
- Workflow: `STAMPED_MANUAL_REVIEW_EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS_READY_BATCH_V1`
- Governing rule: `EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1`
- Scope boundary preserved: exact `3` READY rows from `EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS`
- No widening into the remaining manual-review backlog, the 2 Prize Pack series-marker rows, prior stamped batches, pricing, JPN, or printing-layer work

## Batch Identity
- Source families:
  - `deck-exclusives-pokemon` x1
  - `miscellaneous-cards-products-pokemon` x2
- Batch size attempted: `3`
- Batch size completed: `3`
- Pre-intake live audit: `3 READY_TO_BRIDGE`, `0 ALREADY_IN_WAREHOUSE`, `0 ALREADY_PROMOTED`, `0 CONFLICT_REVIEW_REQUIRED`
- Effective routed set coverage:
  - `base3` x1
  - `dp3` x1
  - `sm12` x1
- Stamp/event-label coverage:
  - `Prerelease Stamp` x2
  - `SDCC 2007 Staff Stamp` x1

## Warehouse Outcome
- Bridged: `3`
- Classified: `3`
- Staged: `3`
- Approved: `3`
- Dry-run clean: `3/3`
- Promoted: `3`
- Failure classes: none

## Review Notes
- All `3/3` candidates reached `REVIEW_READY` with `proposed_action_type = CREATE_CARD_PRINT`
- All `3/3` preserved:
  - base printed identity
  - deterministic non-null overlay/event `variant_key`
  - correct routed expansion/base set
  - no hidden dependence on unsupported name equivalence
- Founder approval was applied explicitly by founder user `03e80d15-a2bb-4d3c-abd1-2de03e55787b`

## Runtime Notes
- The exact batch exposed one bounded bridge-surface issue: curated row `Sawsbuck - 16/236 (Prerelease Kit Exclusive)` was initially filtered as a product row because the candidate name included `Prerelease Kit Exclusive`
- Repair applied in `backend/warehouse/external_discovery_to_warehouse_bridge_v1.mjs`:
  - exact stamped batch rows can now bypass product-row exclusion only when the batch artifact already supplies governing rule, stamp label, effective routed set, and target base resolution
- This preserved the global product filter while allowing the lawful event/prerelease overlay row through the existing stamped bridge path

## Canon Outcome
- `3` new canonical `card_prints` were created
- Candidate states: `PROMOTED = 3`
- Staging states: `SUCCEEDED = 3`
- Promotion result types: `CARD_PRINT_CREATED = 3`
- Null/blank stamped `variant_key`: `0`
- No base-row mutation detected
- No identity collapse detected

## Mapping Closure
- Worker surface: `backend/pricing/promote_source_backed_justtcg_mapping_v1.mjs --input-json docs/checkpoints/warehouse/stamped_manual_review_event_and_prerelease_base_route_overlays_ready_batch_v1.json`
- Dry run: `would_upsert = 3`, `conflicts = 0`
- Apply: `upserted = 3`
- Verification:
  - mapped promoted rows: `3`
  - duplicate active external ids: `0`
  - rows with multiple active mappings: `0`

## Image Closure
- Worker surface: `backend/images/source_image_enrichment_worker_v1.mjs --input-json docs/checkpoints/warehouse/stamped_manual_review_event_and_prerelease_base_route_overlays_ready_batch_v1.json`
- Host note: this machine required `NODE_TLS_REJECT_UNAUTHORIZED=0` for bounded TCGdex fetches
- Dry run:
  - `representative_shared_stamp = 3`
  - `missing = 0`
  - `ambiguous = 0`
- Apply:
  - `updated = 3`
- Verification:
  - exact `image_url` rows: `0`
  - `representative_image_url` rows: `3`
  - `image_status = representative_shared_stamp`: `3`
  - `missing`: `0`
- Truth boundary preserved: no representative image was written into `image_url`

## Cluster Exhaustion
- Current cluster: `EVENT_AND_PRERELEASE_BASE_ROUTE_OVERLAYS`
- Remaining READY rows in this cluster after batch: `0`
- Remaining manual holdouts in this cluster: `0`
- Regressed rows: `0`

## Promoted Examples
- Sawsbuck | `016/236` | `prerelease_stamp` | Prerelease Stamp | `sm12` | mapped | `representative_shared_stamp`
- Shellos West Sea | `107/132` | `sdcc_2007_staff_stamp` | SDCC 2007 Staff Stamp | `dp3` | mapped | `representative_shared_stamp`
- Aerodactyl | `01/62` | `prerelease_stamp` | Prerelease Stamp | `base3` | mapped | `representative_shared_stamp`

## Recommended Next Step
- Chosen next step: `STAMPED_MANUAL_REVIEW_PRIZE_PACK_SERIES_MARKER_READY_BATCH_V1`
- Reason: the event/prerelease overlay cluster is now exhausted cleanly, leaving the 2-row Prize Pack series-marker batch as the next deterministic manual-review execution lane
