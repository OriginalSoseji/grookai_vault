# SM3_IDENTITY_RESOLUTION_V1

## Context

`sm3` was the next set in the duplicate-collapse queue, but the live exact-token proof had to decide the execution class before any apply step.

Pre-resolution audit showed:

- `43` unresolved parents
- `169` canonical `sm3` parents
- `0` lawful exact-token + normalized-name matches
- `37` same-token different-name conflicts
- `43` exact-token unmatched rows

That disqualified direct duplicate collapse immediately. `sm3` follows the same identity-first pattern as `sm12`, `sm10`, and `sm2`: the unresolved lane is a null-`gv_id` base-variant surface, not a lawful duplicate surface yet.

## Classification Result

Live class detection:

- `exact_matches = 0`
- `source_count = 43`
- `same_token_different_name_conflicts = 37`
- `unmatched = 43`
- decision: `BASE_VARIANT_COLLAPSE`

This is not:

- alias collapse
- promotion
- cross-set absorption
- namespace creation

This is:

- same-set `sm3` identity normalization
- base-variant collapse into canonical `sm3`
- prerequisite enforcement so invalid duplicate collapse cannot run

## Normalization Summary

The old parents were structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

The authoritative printed identity lived on active `card_print_identity` rows with `set_code_identity = 'sm3'`.

The conflict pattern was deterministic and limited to lawful normalization categories:

- `37` `NAME_NORMALIZE_V1` matches after punctuation normalization
  - this includes the dash-separator repair `Rotom Dex—Poké Finder Mode -> Rotom Dex Poké Finder Mode`
  - it also includes the expected `GX` punctuation normalization surface
- `6` explicit suffix routes:
  - `18 -> 18a` (`Charmander`)
  - `39 -> 39a` (`Tapu Fini GX -> Tapu Fini-GX`)
  - `88 -> 88a` (`Darkrai GX -> Darkrai-GX`)
  - `92 -> 92a` (`Kirlia`)
  - `105 -> 105a` (`Porygon-Z`)
  - `112 -> 112a` (`Acerola`)

Normalization contracts used for `sm3`:

- `NAME_NORMALIZE_V1`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction from the printed token
  - suffix letters route only within the same base number
  - no cross-number or cross-set merging

## Exact Audit Counts

Pre-apply proof:

- unresolved source rows: `43`
- canonical `sm3` targets: `169`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `37`
- exact-token unmatched rows: `43`
- lawful base-variant map count: `43`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- invalid normalized rows after the `sm3` punctuation extension: `0`
- cross-set targets: `0`
- normalization split:
  - `name_normalize_v1 = 37`
  - `suffix_variant = 6`

Representative exact-token blocked pair:

- old `c5bad8cc-21c7-4370-be08-93fa40c71461`
- old name `Rotom Dex—Poké Finder Mode`
- old printed token `122`
- candidate canonical `2a2ea802-154d-47ba-a364-db7523b3e043`
- candidate canonical name `Rotom Dex Poké Finder Mode`
- candidate canonical `gv_id = GV-PK-BUS-122`

## Mapping Proof

Frozen-map invariants:

- every old parent maps exactly once
- every target parent stays inside canonical `sm3`
- no reused targets
- no unmatched rows
- no cross-set targets
- no new `gv_id`
- no modified canonical `gv_id`

Live FK inventory on old parents:

- `card_print_identity = 43`
- `card_print_traits = 43`
- `card_printings = 129`
- `external_mappings = 43`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit passed on dry-run:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `129`
- metadata-only mergeable printing conflicts: `129`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants Preserved

- scope stays inside the null-parent `sm3` source lane and canonical `sm3` targets
- canonical namespace remains unchanged
- apply order is fixed:
  1. `card_print_identity`
  2. `card_print_traits`
  3. `card_printings`
  4. `external_mappings`
  5. `vault_items`
  6. verify zero old references
  7. delete old parents

## Post-State Truth

Apply succeeded.

- collapsed rows: `43`
- deleted old parent rows: `43`
- remaining unresolved null-`gv_id` rows for `sm3`: `0`
- canonical `sm3` row count after apply: `169`
- target `gv_id` drift count: `0`
- clean repaired groups: `43`
- remaining duplicate groups in repaired surface: `0`
- zero old FK references remain in:
  - `card_print_identity`
  - `card_print_traits`
  - `card_printings`
  - `external_mappings`
  - `vault_items`

FK movement summary:

- `updated_identity_rows = 43`
- `inserted_traits = 43`
- `deleted_old_traits = 43`
- `merged_printing_metadata_rows = 129`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 129`
- `updated_external_mappings = 43`
- `updated_vault_items = 0`

Sample before / after rows:

- first:
  - old `e83d0f82-da6b-4092-9348-ea3a470fc63e`
  - old name `Golisopod GX`
  - old printed token `17`
  - target `67de1f0a-29ff-470f-b49c-370d1e67b9f9`
  - target name `Golisopod-GX`
  - target `gv_id = GV-PK-BUS-17`
- middle:
  - old `01f1aa8d-833e-4650-86ce-355b9a708f80`
  - old name `Tapu Fini GX`
  - old printed token `133`
  - target `b52783bd-be26-4871-b165-98e4ddf3b472`
  - target name `Tapu Fini-GX`
  - target `gv_id = GV-PK-BUS-133`
- last:
  - old `26c835c3-386e-4a9a-80e5-65d384447427`
  - old name `Noivern GX`
  - old printed token `160`
  - target `d4167ee2-a2c3-4387-9525-e6366fec5959`
  - target name `Noivern-GX`
  - target `gv_id = GV-PK-BUS-160`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row
