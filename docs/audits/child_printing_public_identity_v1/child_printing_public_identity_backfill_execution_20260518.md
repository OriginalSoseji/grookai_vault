# Child Printing Public Identity Backfill Execution

Generated: 2026-05-19T04:02:31.194Z
Status: COMMITTED_AND_VERIFIED

## Pre-Write Snapshot

- Total card printings: 55582
- Populated printing_gv_id rows: 0
- Existing collision groups: 0
- Parent gv_id checksum: f3f26d71e5df4aedbc77902f5f95c770fde0d2c15804c53b8ed986d013a80856
- Target checksum: dcb053f58cf4654804b121a98d5a4f0fedc79d2805dabb75bb6d935e3fd4cf74

## Candidate Counts

- Approved candidates: 44698
- Blocked candidates: 10884
- Missing parent gv_id blocked: 10377
- Parent variant boundary blocked: 507
- Proposed ID collision groups: 0

## Transaction Result

- Transaction status: COMMITTED
- Updated rows: 44698

## Post-Write Verification

- Populated printing_gv_id rows: 44698
- Blocked rows still null: 10884
- Blocked rows populated: 0
- Duplicate printing_gv_id groups: 0
- Parent gv_id checksum unchanged: true
- Pikachu denominator: 223
- Charizard denominator: 133

## Suffix Coverage

- HOLO: 13075
- MB: 67
- PB: 230
- RH: 15006
- STD: 16320

## Rollback Note

Rollback must clear only rows where `card_printings.id` and `printing_gv_id` match the approved candidate matrix captured by this execution artifact.

## Explicit Non-Actions

- No parent `card_prints.gv_id` changes.
- No Species Dex denominator changes.
- No scanner changes.
- No public child printing route enablement.
- No unrelated DB remediation.
