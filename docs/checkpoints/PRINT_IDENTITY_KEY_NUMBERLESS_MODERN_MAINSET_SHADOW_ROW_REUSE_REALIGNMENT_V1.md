# PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1

## Context

- Prior collision audit proved the 693-row subset was not a `print_identity_key`
  derivation problem.
- Each in-scope row was an `IDENTITY_EQUIVALENT_SHADOW_ROW`:
  - same set as an existing numbered canonical row
  - same normalized printed name
  - TCGdex `localId` recovered the canonical `number_plain`
  - exactly one lawful canonical target per shadow row
- This execution unit performed `REUSE_CANONICAL_REALIGNMENT`, not promotion and
  not derivation.

## Shadow Row Definition

A row was in scope only if all of the following were true:

- `gv_id is not null`
- `print_identity_key is null`
- `set_code` blank on the row, but `sets.code` resolved to a modern main-set lane
- `number` blank and `number_plain` blank
- active `tcgdex` mapping existed
- recovered TCGdex number matched an existing same-set numbered canonical row
- normalized printed name matched that canonical row exactly

Live preconditions:

- `modern_family_row_count = 1125`
- `shadow_row_count = 693`
- `distinct_shadow_count = 693`
- `distinct_canonical_count = 693`
- `multi_target_count = 0`
- `shadow_to_shadow_target_count = 0`
- `unsupported_fk_rows_in_scope = 0`

## Mapping Logic

Frozen map:

- `shadow_id -> canonical_id`

Derivation inputs:

- `shadow_set_code` from `sets.code`
- `recovered_number_plain` from `raw_imports.payload.card.localId`
- normalized printed name using the existing normalization surface already used in
  the upstream audit

Mapping safety outcomes:

- each shadow row mapped exactly once
- each canonical target was used exactly once
- no cross-set routing occurred
- no shadow-to-shadow routing occurred

## Rows Affected

Supported FK inventory before apply:

- `card_print_identity = 693`
- `card_print_traits = 693`
- `card_printings = 1309`
- `external_mappings = 693`
- `vault_items = 0`

Apply result:

- `rows_deleted = 693`
- `rows_repointed = 693`
- `updated_identity_rows = 693`
- `inserted_traits = 693`
- `deleted_old_traits = 693`
- `merged_printing_metadata_rows = 1309`
- `deleted_redundant_printings = 1309`
- `updated_external_mappings = 693`
- `updated_vault_items = 0`

Representative mappings:

- `6ae26833-ddd6-41bd-bf41-6f0e83bf0a4e -> 9cea14a4-7a2d-4bd5-96e7-fb2353bee055`
  `Hoppip`, `sv02-001`, `GV-PK-PAL-1`
- `3ad658ab-9d57-40a6-8779-43ddb670577f -> b8afa6e0-4788-4aa8-a95c-7fc5a2a992c2`
  `Skiploom`, `sv02-002`, `GV-PK-PAL-2`
- `7094de60-056f-4a3b-85be-62d12f207874 -> 096d959c-0a61-4542-b105-be07bfa39b5b`
  `Jumpluff`, `sv02-003`, `GV-PK-PAL-3`
- `88325277-7d5e-4dc8-90f4-de7ed052dec5 -> a1dd6c41-0743-4f25-ae37-87b07afc9699`
  `Pineco`, `sv02-004`, `GV-PK-PAL-4`
- `232f5e23-9fa1-4001-ba45-731eba47386a -> a411bda8-a0ad-4102-a14c-911469302d65`
  `Forretress ex`, `sv02-005`, `GV-PK-PAL-5`

## Invariants Preserved

- canonical target row content was unchanged
  - target checksum before = target checksum after
- all non-shadow surviving `card_prints` rows were unchanged
  - survivor checksum before = survivor checksum after
- `gv_id` values were unchanged
- active identity total remained stable
  - `10605 -> 10605`
- target identity surface became lawful and complete
  - `target active identity rows: 0 -> 693`
- no FK orphans were introduced
  - `card_print_identity = 0`
  - `card_print_traits = 0`
  - `card_printings = 0`
  - `external_mappings = 0`
  - `vault_items = 0`
- duplicate numbered canonical groups remained absent
  - `duplicate_canonical_group_count_after = 0`

## Blocker Surface Impact

- `remaining_blocked_rows_before = 1332`
- `remaining_blocked_rows_after = 639`

Interpretation:

- the 693-row shadow family is removed from the blocked derivation surface
- the remaining 639 rows are the true unresolved `print_identity_key` blockers

## Risks Checked

- unsupported `card_prints` foreign keys existed in schema, but all had `0`
  in-scope rows and therefore did not block deletion
- target identity rows were empty before apply, so active-identity collision was
  impossible under the live surface
- external mapping overlap on `(source, external_id)` was `0`, so remap stayed
  within the existing uniqueness contract

## Final State

- `PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_SHADOW_ROW_REUSE_REALIGNMENT_V1`
  completed successfully
- 693 ingestion shadow rows removed
- canonical identity preserved
- blocker surface reduced deterministically to `639`
