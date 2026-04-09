# SM7_IDENTITY_RESOLUTION_V1

## Classification

`sm7` was classified as `BASE_VARIANT_COLLAPSE`, not lawful direct duplicate collapse.

Live class detection:

- `source_count = 35`
- `canonical_count = 183`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 33`
- `unmatched = 35`

This reinforces the established Sun & Moon identity-first pattern: the unresolved lane is a null-`gv_id` base-variant surface that must normalize into canonical `sm7` before any duplicate logic is relevant.

## Normalization Summary

The authoritative source identity lived on active `card_print_identity` rows with `set_code_identity = 'sm7'`, while the old parents remained structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

`sm7` uses the stabilized normalization contract:

- `NAME_NORMALIZE_V2`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction
  - suffix routing only when the canonical suffix target exists in `sm7`
  - no cross-number merging
  - no cross-set routing

Live split:

- `name_normalize_v2 = 33`
- `suffix_variant = 2`

The two suffix routes were:

- `10 -> 10a` (`Sceptile`)
- `148 -> 148a` (`Tate & Liza`)

Observed normalization surface:

- `GX` punctuation normalization, e.g. `Articuno GX -> Articuno-GX`
- unicode apostrophe normalization, e.g. `Bill’s Maintenance -> Bill's Maintenance`
- dash normalization remained available but was not needed to unlock any additional `sm7` rows

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `35`
- canonical `sm7` targets: `183`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `33`
- exact-token unmatched rows: `35`
- lawful base-variant map count: `35`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- invalid normalized rows: `0`
- cross-set targets: `0`

Representative blocked pair:

- old `564cfa01-e6e2-462b-91e9-dbe99dfa608b`
- old name `Bill’s Maintenance`
- old printed token `126`
- candidate canonical `70883e82-3101-48e4-9e5d-8007c230b9c7`
- candidate canonical name `Bill's Maintenance`
- candidate canonical `gv_id = GV-PK-CES-126`

Live FK inventory on old parents:

- `card_print_identity = 35`
- `card_print_traits = 35`
- `card_printings = 105`
- `external_mappings = 35`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit is lawful:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `105`
- metadata-only mergeable printing conflicts: `105`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants

- scope stays inside the null-parent `sm7` source lane and canonical `sm7` targets
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

- collapsed rows: `35`
- deleted old parent rows: `35`
- remaining unresolved null-`gv_id` rows for `sm7`: `0`
- canonical `sm7` row count after apply: `183`
- target `gv_id` drift count: `0`
- clean repaired groups: `35`
- remaining duplicate groups in repaired surface: `0`
- zero old FK references remain in:
  - `card_print_identity`
  - `card_print_traits`
  - `card_printings`
  - `external_mappings`
  - `vault_items`

FK movement summary:

- `updated_identity_rows = 35`
- `inserted_traits = 35`
- `deleted_old_traits = 35`
- `merged_printing_metadata_rows = 105`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 105`
- `updated_external_mappings = 35`
- `updated_vault_items = 0`

Sample before / after rows:

- first:
  - old `8dfd2103-36c3-4a05-bff3-d1a1ba2c0210`
  - old name `Sceptile`
  - old printed token `10`
  - target `67a64e87-734d-42f8-bcd4-1bfab048cdf4`
  - target name `Sceptile`
  - target `gv_id = GV-PK-CES-10A`
- middle:
  - old `80f4988a-c101-4351-8b15-0798eb9e7c8e`
  - old name `Articuno GX`
  - old printed token `154`
  - target `00b2f1eb-898e-43b0-be34-3165bfa5d9f6`
  - target name `Articuno-GX`
  - target `gv_id = GV-PK-CES-154`
- last:
  - old `92e9ffdd-ca1f-496f-a3ef-cf90a207e26d`
  - old name `Rayquaza GX`
  - old printed token `177`
  - target `5fe9d2f5-ee2c-43b3-bd0f-5aa06bf29d21`
  - target name `Rayquaza-GX`
  - target `gv_id = GV-PK-CES-177`

In all three samples:

- the old parent no longer exists
- the target parent remained canonical
- the target parent now has exactly `1` active identity row
