# Special Variant Printing Operational Worklists V1

These worklists are offline operational queues. They do not approve, publish, map, or mutate any card or printing.

## Current Queues

- Human image/evidence confirmation: 143
- Source or identity repair: 2886
- Exact variant image acquisition: 3295

## Locked Boundaries

- All 143 applied candidates remain `quarantined_candidate` and `hidden_pending_review`.
- Pricing publication is prohibited while a child remains hidden.
- The 420 authority failures remain blocked.
- Representative imagery never proves a stamp, error, finish, or print marker.
- No queue item can approve or apply itself.

## Source Queue Lanes

| Lane | Rows |
| --- | ---: |
| identity_or_finish_conflict | 381 |
| missing_child_no_source_finish_evidence | 2406 |
| public_child_identity_incomplete | 60 |
| tcgcsv_product_missing | 1 |
| variant_identity_corroborated_finish_needs_second_source | 38 |

## Exact Image Status

| Current status | Rows |
| --- | ---: |
| representative_shared | 1916 |
| representative_shared_collision | 6 |
| representative_shared_stamp | 1373 |

## Next Human Gate

Review the 143 P0 rows against exact card evidence. A separate governed promotion gate must apply any confirmed decision; this worklist does not change database state.
