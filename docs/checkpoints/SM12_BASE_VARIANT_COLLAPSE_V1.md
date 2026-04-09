# SM12_BASE_VARIANT_COLLAPSE_V1

## Context

`sm12` duplicate collapse was blocked because the unresolved parents were not lawful same-set duplicates yet. Live proof before this step showed:

- `58` unresolved rows
- `0` lawful exact-token + normalized-name duplicate matches
- `57` same-token different-name conflicts
- `1` suffix token conflict (`143` vs canonical `143a`)

The real root cause was deeper than duplicate pairing:

- source parents had `card_prints.gv_id is null`
- source parents also had `card_prints.set_code is null`
- source parents had `card_prints.number is null`
- source parents had `card_prints.number_plain is null`
- the only authoritative identity for the old lane lived on active `card_print_identity` rows with `set_code_identity = 'sm12'`

This made `sm12` a base-identity normalization problem first, not a duplicate-collapse problem first.

## Problem

The unresolved `sm12` lane contained null-parent rows whose printed identity already pointed at lawful canonical `sm12` parents, but only after deterministic normalization:

- punctuation / hyphen form: `GX` vs `-GX`
- unicode apostrophe normalization: `’` vs `'`
- whitespace normalization
- one suffix-target case: alias token `143` collapsing into canonical `143a`

Until those base variants were collapsed, the duplicate-lane runner could not produce a lawful frozen map.

## Decision

Collapse the null-parent `sm12` base-variant lane directly into canonical `sm12` parents using:

- `NAME_NORMALIZE_V1`
  - lowercase
  - unicode apostrophe to ASCII
  - remove hyphen around `GX`
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - base identity = numeric portion of printed token
  - suffix letters are explicit variant markers

No new `gv_id` were created. No canonical `gv_id` were modified. No row outside the logical `sm12` source lane and canonical `sm12` target lane was touched.

## Proof

Pre-apply live proof:

- unresolved source rows: `58`
- canonical `sm12` targets: `271`
- conflict groups by derived base number: `58`
- groups with exactly one canonical target: `58`
- groups with zero canonical targets: `0`
- groups with multiple canonical targets: `0`
- frozen map count: `58`
- multiple old matches: `0`
- reused targets: `0`
- unmatched rows: `0`
- invalid same-base different-name rows after `NAME_NORMALIZE_V1`: `0`
- classification:
  - `name_normalize_v1 = 57`
  - `suffix_variant = 1`

Live FK inventory on old parents:

- `card_print_identity = 58`
- `card_print_traits = 58`
- `card_printings = 174`
- `external_mappings = 58`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit:

- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `174`
- mergeable metadata-only printing conflicts: `174`
- non-deterministic printing conflicts: `0`
- target identity rows before apply: `0`

## Risks

- wrong base pairing if normalization over-collapsed distinct names
- suffix handling collapsing onto the wrong canonical token
- stale apply surface if the source lane changed between audit and apply
- unsupported FK references outside the allowed handler list

These were gated explicitly and all passed before apply.

## Verification Plan

Verify after apply that:

1. all `58` old parents are deleted
2. remaining unresolved `sm12` null-`gv_id` parents = `0`
3. canonical `sm12` row count remains `271`
4. canonical namespace shows zero `gv_id` drift
5. the `58` repaired groups now each contain exactly one canonical row and zero non-canonical rows
6. first, middle, and last sample rows resolve through the existing canonical `gv_id`

## Post-Apply Truth

Apply succeeded.

- collapsed rows: `58`
- deleted old parent rows: `58`
- remaining unresolved null-`gv_id` rows for `sm12`: `0`
- canonical `sm12` row count after apply: `271`
- target `gv_id` drift count: `0`
- clean repaired groups: `58`
- remaining duplicate groups in repaired surface: `0`
- zero old FK references remain in:
  - `card_print_identity`
  - `card_print_traits`
  - `card_printings`
  - `external_mappings`
  - `vault_items`

FK movement summary:

- `updated_identity_rows = 58`
- `inserted_traits = 58`
- `deleted_old_traits = 58`
- `merged_printing_metadata_rows = 174`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 174`
- `updated_external_mappings = 58`
- `updated_vault_items = 0`

Sample before / after rows:

- first:
  - old `3557c913-b660-4951-8c91-ada6b8aa6c57`
  - old name `Venusaur & Snivy GX`
  - old printed token `1`
  - target `ff6e10ea-f595-4ac3-953b-6d14637c09c2`
  - target name `Venusaur & Snivy-GX`
  - target `gv_id = GV-PK-CEC-1`
- middle:
  - old `e6dd8146-8165-4235-9839-9255948acfa9`
  - old name `Oricorio GX`
  - old printed token `217`
  - target `4ee29070-3fce-4da2-bce5-a422c14a91c2`
  - target name `Oricorio-GX`
  - target `gv_id = GV-PK-CEC-217`
- last:
  - old `25610e85-bf8d-4edc-869d-497d72247dc4`
  - old name `Lillie’s Poké Doll`
  - old printed token `267`
  - target `ca5993a7-fa7e-4668-8153-53153c4ddfa0`
  - target name `Lillie's Poké Doll`
  - target `gv_id = GV-PK-CEC-267`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row

## Outcome

`sm12` base identity conflicts are resolved. The blocked duplicate surface is no longer present; the old null-parent lane was fully collapsed into canonical `sm12` and no follow-up duplicate collapse is needed for these `58` rows.
