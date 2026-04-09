# SM5_IDENTITY_RESOLUTION_V1

## Classification

`sm5` was classified as `BASE_VARIANT_COLLAPSE`, not lawful direct duplicate collapse.

Live class detection:

- `source_count = 31`
- `canonical_count = 173`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 27`
- `unmatched = 31`

This reinforces the established Sun & Moon identity-first pattern: the unresolved lane is a null-`gv_id` base-variant surface that must normalize into canonical `sm5` before any duplicate logic is relevant.

## Normalization Summary

The authoritative source identity lived on active `card_print_identity` rows with `set_code_identity = 'sm5'`, while the old parents remained structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

`sm5` uses the stabilized normalization contract:

- `NAME_NORMALIZE_V2`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction
  - suffix routing only when the canonical suffix target exists in `sm5`
  - no cross-number merging
  - no cross-set routing

Live split:

- `name_normalize_v2 = 27`
- `suffix_variant = 4`

The four suffix routes were:

- `119 -> 119a` (`Cynthia`)
- `122 -> 122a` (`Escape Board`)
- `125 -> 125a` (`Lillie`)
- `153 -> 153a` (`Lusamine`)

Observed normalization surface:

- `GX` punctuation normalization, e.g. `Leafeon GX -> Leafeon-GX`
- unicode apostrophe handling remains available but was not needed to unlock any additional `sm5` rows beyond the stabilized rule set
- dash normalization remained available but was not needed to unlock any additional `sm5` rows

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `31`
- canonical `sm5` targets: `173`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `27`
- exact-token unmatched rows: `31`
- lawful base-variant map count: `31`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- invalid normalized rows: `0`
- cross-set targets: `0`

Representative blocked pair:

- old `dab79114-9fc2-48ae-8ee7-030b6b6106c2`
- old name `Dialga GX`
- old printed token `100`
- candidate canonical `0bb73e15-a248-41a0-ad82-4c7dee329311`
- candidate canonical name `Dialga-GX`
- candidate canonical `gv_id = GV-PK-UPR-100`

Live FK inventory on old parents:

- `card_print_identity = 31`
- `card_print_traits = 31`
- `card_printings = 93`
- `external_mappings = 31`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit is lawful:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `93`
- metadata-only mergeable printing conflicts: `93`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants

- scope stays inside the null-parent `sm5` source lane and canonical `sm5` targets
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

Apply completed successfully.

Post-apply verification:

1. unresolved `sm5` null-`gv_id` parents = `0`
2. remaining old parent rows = `0`
3. canonical `sm5` row count remains `173`
4. canonical namespace drift count = `0`
5. route-resolvable target count = `31`
6. clean repaired group count = `31`
7. remaining duplicate group count = `0`

FK movement summary:

- `updated_identity_rows = 31`
- `inserted_traits = 31`
- `deleted_old_traits = 31`
- `merged_printing_metadata_rows = 93`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 93`
- `updated_external_mappings = 31`
- `updated_vault_items = 0`

Remaining FK references to old parents:

- `card_print_identity = 0`
- `card_print_traits = 0`
- `card_printings = 0`
- `external_mappings = 0`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Backup artifacts created before apply:

- `backups/sm5_preapply_schema.sql`
- `backups/sm5_preapply_data.sql`

Sample before/after rows:

- `0b1cc96b-48af-4ef8-9f2a-33dd33cf7e78 / Leafeon GX / 13 -> 9e6cbb8a-6c8c-4ef6-b673-6648c05700fd / Leafeon-GX / GV-PK-UPR-13`
- `aa170a91-c597-4ec3-a690-1604f66c9795 / Celesteela GX / 144 -> 8838cc60-3074-4ecd-957d-6af1177f6296 / Celesteela-GX / GV-PK-UPR-144`
- `42400f68-46e2-4d92-af32-693905cac391 / Solgaleo GX / 173 -> e417b646-a174-4c90-a1e1-3063b9662541 / Solgaleo-GX / GV-PK-UPR-173`

In all three samples, the old parent no longer exists and the canonical target now has exactly `1` active identity row.
