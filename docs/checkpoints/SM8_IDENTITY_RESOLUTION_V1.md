# SM8_IDENTITY_RESOLUTION_V1

## Classification

`sm8` was classified as `BASE_VARIANT_COLLAPSE`, not lawful direct duplicate collapse.

Live class detection:

- `source_count = 41`
- `canonical_count = 236`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 40`
- `unmatched = 41`

This continues the established Sun & Moon identity-first pattern: the unresolved lane is a null-`gv_id` base-variant surface that must normalize into canonical `sm8` before any duplicate logic is relevant.

## Normalization Summary

The authoritative source identity lived on active `card_print_identity` rows with `set_code_identity = 'sm8'`, while the old parents remained structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

`sm8` uses the stabilized extended normalization contract:

- `NAME_NORMALIZE_V2`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction
  - suffix routing only when the canonical suffix target exists in `sm8`
  - no cross-number merging
  - no cross-set routing

Live split:

- `name_normalize_v2 = 40`
- `suffix_variant = 1`

The only suffix route was:

- `188 -> 188a` (`Professor Elm’s Lecture -> Professor Elm's Lecture`)

No new normalization rule beyond `NAME_NORMALIZE_V2` was required.

## Rule Extensions Used

`sm8` exercised the full stabilized rule set safely:

- `GX` punctuation normalization, e.g. `Shuckle GX -> Shuckle-GX`
- unicode apostrophe normalization, e.g. `Professor Elm’s Lecture -> Professor Elm's Lecture`
- dash normalization remained available but was not needed to unlock any additional `sm8` rows beyond the existing rule set
- suffix routing was required once and was deterministic

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `41`
- canonical `sm8` targets: `236`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `40`
- exact-token unmatched rows: `41`
- lawful base-variant map count: `41`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- invalid normalized rows: `0`
- cross-set targets: `0`

Representative blocked pair:

- old `3e1a4f2f-678f-4207-b82f-d511dca8f786`
- old name `Shuckle GX`
- old printed token `17`
- candidate canonical `03a49ea2-4bf4-49aa-9bb5-2f5c72ce432c`
- candidate canonical name `Shuckle-GX`
- candidate canonical `gv_id = GV-PK-LOT-17`

Live FK inventory on old parents:

- `card_print_identity = 41`
- `card_print_traits = 41`
- `card_printings = 123`
- `external_mappings = 41`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit is lawful:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `123`
- metadata-only mergeable printing conflicts: `123`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants

- scope stays inside the null-parent `sm8` source lane and canonical `sm8` targets
- canonical namespace remains unchanged
- no new `gv_id` are created
- no canonical `gv_id` are modified
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

- collapsed rows: `41`
- deleted old parent rows: `41`
- remaining unresolved null-`gv_id` rows for `sm8`: `0`
- canonical `sm8` row count after apply: `236`
- target `gv_id` drift count: `0`
- clean repaired groups: `41`
- remaining duplicate groups in repaired surface: `0`
- zero old FK references remain in:
  - `card_print_identity`
  - `card_print_traits`
  - `card_printings`
  - `external_mappings`
  - `vault_items`

FK movement summary:

- `updated_identity_rows = 41`
- `inserted_traits = 41`
- `deleted_old_traits = 41`
- `merged_printing_metadata_rows = 123`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 123`
- `updated_external_mappings = 41`
- `updated_vault_items = 0`

Sample before / after rows:

- first:
  - old `3e1a4f2f-678f-4207-b82f-d511dca8f786`
  - old name `Shuckle GX`
  - old printed token `17`
  - target `03a49ea2-4bf4-49aa-9bb5-2f5c72ce432c`
  - target name `Shuckle-GX`
  - target `gv_id = GV-PK-LOT-17`
- middle:
  - old `278951f2-ada4-4184-a4ee-8f9306454573`
  - old name `Zeraora GX`
  - old printed token `201`
  - target `72085443-8a59-4fec-a445-a6e77937558c`
  - target name `Zeraora-GX`
  - target `gv_id = GV-PK-LOT-201`
- last:
  - old `2fc675ad-e793-487c-895a-76404798dbfa`
  - old name `Lugia GX`
  - old printed token `227`
  - target `3d280ecc-aa6e-47b0-a053-d2f4cbabd979`
  - target name `Lugia-GX`
  - target `gv_id = GV-PK-LOT-227`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row
