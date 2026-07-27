# Japanese Master Index V4 Payload Preflight

Generated: 2026-07-27T05:10:09.561Z

## Status

- Status: `preflight_complete_repository_schema_drift`
- Payload fingerprint: `14be9772c50707a8e200e3b8d63d4bf831fab0de63c63741b3253623bc26d3e3`
- Blocking collisions: 0
- Non-blocking natural-key accommodations: 0

## Proposed Rows

- Sets: 1041
- Parent card_prints: 3888
- card_print_identity: 3888
- Source evidence: 3980
- Family review: 3888
- Deferred public child printings: 3888

## Boundaries

- The database was opened in a proven read-only transaction.
- No database writes, Storage writes, SQL payload, or apply command were generated.
- Public child rows are identifiers/contracts only and remain blocked behind separate visibility and self-hosted-image approval.
- No English card, pricing, family-link, or identity rows were mutated.

## Repository Schema Drift

- `card_print_identity_source_evidence`: **no creating migration found in the repository**
- `card_print_family_review_queue`: **no creating migration found in the repository**

This drift must be repaired before a fresh-chain apply package can be considered production-ready.
