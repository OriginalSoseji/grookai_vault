# GLOBAL_PRINT_IDENTITY_KEY_UNIQUENESS_TRANSITION_V1

## Context

The global `print_identity_key` migration preflight passed. The next required step is uniqueness transition, not backfill.

Locked preflight result:

- `column_exists = yes`
- `current_key_duplicate_group_count = 0`
- `proposed_v3_duplicate_group_count = 0`
- `standalone_print_identity_key_unique_index_exists = yes`
- `retirement_required_before_backfill = yes`
- `derivation_input_blocker_count = 1363`
- `safe_to_proceed_to_uniqueness_transition = yes`

This artifact is schema/index transition only. No backfill and no canonical row mutation are in scope.

## Problem

The standalone unique index on non-null `print_identity_key` is unsafe as a global uniqueness surface.

Why it is unsafe:

- `print_identity_key` is not sufficient by itself to represent lawful identity globally
- future same-number distinct printed identities must coexist inside the same set
- uniqueness must account for set and number scope, not only the derived printed-identity token

If that standalone index remains in place, future lawful backfill and same-number conflict handling would be blocked for the wrong reason.

## Decision

Transition uniqueness enforcement in this order:

1. create the V3 composite unique index on `(set_id, number_plain, print_identity_key, coalesce(variant_key, ''))`
2. fail closed if that index cannot be created
3. retire only the standalone `print_identity_key` unique index
4. defer all backfill work to a later phase

## Migration Contents

New index:

- `uq_card_prints_identity_v3_print_identity`
- unique partial index on:
  - `set_id`
  - `number_plain`
  - `print_identity_key`
  - `coalesce(variant_key, '')`
- predicate:
  - `set_id is not null`
  - `number_plain is not null`
  - `print_identity_key is not null`

Retired index:

- `card_prints_print_identity_key_uq`

Explicit non-scope:

- no `card_prints` row updates
- no `print_identity_key` computation
- no `gv_id` changes
- no `external_mappings` changes

## Invariants Preserved

- canonical rows remain unchanged
- `gv_id` remains unchanged
- replay safety is preserved via guarded `if not exists` / `if exists` DDL
- existing lawful identity surfaces remain valid
- future `print_identity_key` backfill is unblocked from the uniqueness topology perspective

## Verification

Post-apply proof requirements:

- V3 index exists
- standalone `print_identity_key` unique index no longer exists
- duplicate groups under the V3 key remain `0`
- `card_prints` row counts are unchanged
- canonical row counts are unchanged
- `gv_id` values are unchanged

Live post-apply result:

- `v3_index_created = yes`
- `standalone_unique_index_retired = yes`
- `remaining_print_identity_key_index_count_excluding_v3 = 0`
- `v3_duplicate_group_count = 0`
- `card_prints_row_count = 25343`
- `canonical_row_count = 21781`
- `row_checksum_before = d6330258b2d7600c7b38285f77266513`
- `row_checksum_after = d6330258b2d7600c7b38285f77266513`
- `gvid_checksum_before = 3a9927165dfbf2c69a7ce987b24c1655`
- `gvid_checksum_after = 3a9927165dfbf2c69a7ce987b24c1655`

Interpretation:

- canonical row data did not change
- `gv_id` did not change
- the transition stayed strictly at the index layer

## Why It Matters

This transition removes the unsafe global uniqueness assumption and establishes the lawful V3 identity surface needed for future same-number distinct printed identities.

It does that without destabilizing the closed canonical layer and without forcing premature backfill across the `1363` derivation-blocker rows.

## Next Execution Recommendation

Exact next codex type:

- `GLOBAL_PRINT_IDENTITY_KEY_DERIVATION_BLOCKER_AUDIT_V1`

Why this is the next safe step:

- uniqueness transition can complete now
- authoritative backfill is still blocked by missing derivation inputs
- the blocker surface must be decomposed before any `print_identity_key` compute/apply phase begins
