# SM10_IDENTITY_RESOLUTION_V1

## Context

`sm10` was the next set in the duplicate-collapse queue, but the live exact-token proof had to decide the execution class before any apply step.

Pre-resolution audit showed:

- `56` unresolved parents
- `234` canonical `sm10` parents
- `0` lawful exact-token + normalized-name matches
- `53` same-token different-name conflicts
- `56` exact-token unmatched rows

That disqualified direct duplicate collapse immediately. The set follows the same identity-first pattern that blocked `sm12`: the unresolved lane is a null-`gv_id` base-variant surface, not a lawful duplicate surface yet.

## Classification

Live class detection:

- `exact_matches = 0`
- `source_count = 56`
- `conflicts = 53`
- `unmatched = 56`
- decision: `BASE_VARIANT_COLLAPSE`

This is not:

- alias collapse
- promotion
- cross-set absorption
- namespace creation

This is:

- same-set `sm10` identity normalization
- base-variant collapse into canonical `sm10`
- prerequisite enforcement so invalid duplicate collapse cannot run

## Root Cause

The old parents were structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

The authoritative printed identity lived on active `card_print_identity` rows with `set_code_identity = 'sm10'`.

The conflict pattern was deterministic and limited to lawful normalization categories:

- `53` punctuation / unicode / spacing / `GX` formatting normalizations
- `3` suffix routes:
  - `182 -> 182a` (`Pokégear 3.0`)
  - `189 -> 189a` (`Welder`)
  - `195 -> 195a` (`Dedenne GX` -> `Dedenne-GX`)

## Resolution Path

Use adaptive detection in the runner, but execute the `BASE_VARIANT_COLLAPSE` branch for the live `sm10` surface.

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
- every target parent stays inside canonical `sm10`
- no reused targets
- no unmatched rows
- no cross-set targets
- no new `gv_id`
- no modified canonical `gv_id`

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `56`
- canonical `sm10` targets: `234`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `53`
- exact-token unmatched rows: `56`
- lawful base-variant map count: `56`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- cross-set targets: `0`
- normalization split:
  - `name_normalize_v1 = 53`
  - `suffix_variant = 3`

Live FK inventory on old parents:

- `card_print_identity = 56`
- `card_print_traits = 56`
- `card_printings = 168`
- `external_mappings = 56`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit passed:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `168`
- metadata-only mergeable printing conflicts: `168`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants

- scope stays inside the null-parent `sm10` source lane and canonical `sm10` targets
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

- collapsed rows: `56`
- deleted old parent rows: `56`
- remaining unresolved null-`gv_id` rows for `sm10`: `0`
- canonical `sm10` row count after apply: `234`
- target `gv_id` drift count: `0`
- clean repaired groups: `56`
- remaining duplicate groups in repaired surface: `0`
- zero old FK references remain in:
  - `card_print_identity`
  - `card_print_traits`
  - `card_printings`
  - `external_mappings`
  - `vault_items`

FK movement summary:

- `updated_identity_rows = 56`
- `inserted_traits = 56`
- `deleted_old_traits = 56`
- `merged_printing_metadata_rows = 168`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 168`
- `updated_external_mappings = 56`
- `updated_vault_items = 0`

Sample before / after rows:

- first:
  - old `3477458e-9507-4aa0-9a04-b812229ef9c8`
  - old name `Pheromosa & Buzzwole GX`
  - old printed token `1`
  - target `33b6c8f1-13ce-4262-87f2-261def21eba0`
  - target name `Pheromosa & Buzzwole-GX`
  - target `gv_id = GV-PK-UNB-1`
- middle:
  - old `6a46491d-189a-4592-9062-dc710c699989`
  - old name `Muk & Alolan Muk GX`
  - old printed token `197`
  - target `0645b4b0-4e21-428e-bdd8-2eccf86414d3`
  - target name `Muk & Alolan Muk-GX`
  - target `gv_id = GV-PK-UNB-197`
- last:
  - old `b1f9d7e9-854b-4a9e-822e-8896545f6d66`
  - old name `Celesteela GX`
  - old printed token `228`
  - target `c49f1734-7817-4ff6-a030-11b26d792902`
  - target name `Celesteela-GX`
  - target `gv_id = GV-PK-UNB-228`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row
