# SM2_IDENTITY_RESOLUTION_V1

## Context

`sm2` was the next set in the duplicate-collapse queue, but the live exact-token proof had to decide the execution class before any apply step.

Pre-resolution audit showed:

- `43` unresolved parents
- `169` canonical `sm2` parents
- `0` lawful exact-token + normalized-name matches
- `38` same-token different-name conflicts
- `43` exact-token unmatched rows

That disqualified direct duplicate collapse immediately. `sm2` follows the same identity-first pattern as `sm12` and `sm10`: the unresolved lane is a null-`gv_id` base-variant surface, not a lawful duplicate surface yet.

## Classification

Live class detection:

- `exact_matches = 0`
- `source_count = 43`
- `conflicts = 38`
- `unmatched = 43`
- decision: `BASE_VARIANT_COLLAPSE`

This is not:

- alias collapse
- promotion
- cross-set absorption
- namespace creation

This is:

- same-set `sm2` identity normalization
- base-variant collapse into canonical `sm2`
- prerequisite enforcement so invalid duplicate collapse cannot run

## Root Cause

The old parents were structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

The authoritative printed identity lived on active `card_print_identity` rows with `set_code_identity = 'sm2'`.

The conflict pattern was deterministic and limited to lawful normalization categories:

- `38` punctuation / unicode / spacing / `GX` formatting normalizations
- `5` suffix routes:
  - `19 -> 19a` (`Alolan Sandshrew`)
  - `21 -> 21a` (`Alolan Vulpix`)
  - `128 -> 128a` (`Max Potion`)
  - `130 -> 130a` (`Rescue Stretcher`)
  - `157 -> 157a` (`Metagross GX` -> `Metagross-GX`)

## Resolution Path

Use adaptive detection in the runner, but execute the `BASE_VARIANT_COLLAPSE` branch for the live `sm2` surface.

Normalization contracts:

- `NAME_NORMALIZE_V1`
  - lowercase
  - unicode apostrophe to ASCII
  - remove hyphen around `GX`
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction from the printed token
  - suffix letters route only within the same base number
  - no cross-number or cross-set merging

Frozen-map invariants:

- every old parent maps exactly once
- every target parent stays inside canonical `sm2`
- no reused targets
- no unmatched rows
- no cross-set targets
- no new `gv_id`
- no modified canonical `gv_id`

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `43`
- canonical `sm2` targets: `169`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `38`
- exact-token unmatched rows: `43`
- lawful base-variant map count: `43`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- cross-set targets: `0`
- normalization split:
  - `name_normalize_v1 = 38`
  - `suffix_variant = 5`

Live FK inventory on old parents:

- `card_print_identity = 43`
- `card_print_traits = 43`
- `card_printings = 129`
- `external_mappings = 43`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit is expected to mirror the prior Class F path:

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

## Invariants

- scope stays inside the null-parent `sm2` source lane and canonical `sm2` targets
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
- remaining unresolved null-`gv_id` rows for `sm2`: `0`
- canonical `sm2` row count after apply: `169`
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
  - old `3921725d-e3d2-4e00-9212-30ae1e2b3147`
  - old name `Turtonator GX`
  - old printed token `18`
  - target `c0e902ba-7797-4db5-b54a-24531703b32f`
  - target name `Turtonator-GX`
  - target `gv_id = GV-PK-GRI-18`
- middle:
  - old `e54d06db-566d-403e-b6e1-24cb9d47758b`
  - old name `Toxapex GX`
  - old printed token `136`
  - target `92b632be-c298-4471-ac5b-d249bdebe4da`
  - target name `Toxapex-GX`
  - target `gv_id = GV-PK-GRI-136`
- last:
  - old `65e847d0-0830-4b72-9f92-2e1e1065de51`
  - old name `Drampa GX`
  - old printed token `160`
  - target `5a30a9d1-decb-4483-b041-e7ca0e4fb2d9`
  - target name `Drampa-GX`
  - target `gv_id = GV-PK-GRI-160`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row
