# Child Printing Public Identity Backfill Pre-Execution Gate

Generated: 2026-05-19T03:51:55.792Z

Status: PASS - NO WRITE EXECUTED.

This gate refreshed live database evidence immediately before any approved `printing_gv_id` backfill execution. It is a pre-execution gate only; no backfill was run.

## Scope

- Contract: `CHILD_PRINTING_PUBLIC_IDENTITY_V1`
- Candidate source: `docs/audits/child_printing_public_identity_v1/child_printing_public_identity_candidates_20260518.json`
- Backfill plan: `docs/audits/child_printing_public_identity_v1/child_printing_public_identity_backfill_no_write_plan_20260518.md`
- Target table: `public.card_printings`
- Target column: `printing_gv_id`

## Live Schema Precheck

| Check | Result |
| --- | --- |
| `card_printings.printing_gv_id` exists | PASS |
| `printing_gv_id` nullable | PASS |
| `printing_gv_id` data type | `text` |
| Partial unique index exists | PASS |
| Total `card_printings` rows | 55,582 |
| Existing populated `printing_gv_id` rows | 0 |
| Existing duplicate `printing_gv_id` groups | 0 |
| Existing parent `gv_id` collisions | 0 |

## Live Candidate Regeneration

| Measure | Expected | Live | Drift |
| --- | ---: | ---: | ---: |
| Total candidates | 55,582 | 55,582 | 0 |
| Approved candidates | 44,698 | 44,698 | 0 |
| Blocked candidates | 10,884 | 10,884 | 0 |
| Missing parent `gv_id` blocked | 10,377 | 10,377 | 0 |
| Parent variant boundary blocked | 507 | 507 | 0 |
| Proposed ID collision groups | 0 | 0 | 0 |
| Unsupported finish keys | 0 | 0 | 0 |

## Approved Finish Distribution

| Finish key | Approved candidates |
| --- | ---: |
| normal | 16,320 |
| holo | 13,075 |
| reverse | 15,006 |
| pokeball | 230 |
| masterball | 67 |

## Gate Decision

PASS for pre-execution readiness.

The live database still matches the planned candidate matrix for the `44,698` approved rows, and the remote schema is ready for a separately approved governed backfill.

This gate does not authorize execution by itself. The next step must still be an explicit apply task that loads exactly the approved candidate matrix, dry-runs the guarded update in a transaction, verifies the expected `44,698` update count, and only then commits.

## Explicit Non-Actions

- No DB writes.
- No backfill executed.
- No migration applied.
- No parent `card_prints.gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No public child printing route enablement.
