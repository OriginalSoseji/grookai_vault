# SM6_IDENTITY_RESOLUTION_V1

## Classification

`sm6` was classified as `BASE_VARIANT_COLLAPSE`, not lawful direct duplicate collapse.

Live class detection:

- `source_count = 27`
- `canonical_count = 146`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 26`
- `unmatched = 27`

This keeps the Sun & Moon identity-first invariant intact: the unresolved `sm6` lane is a null-`gv_id` base-variant surface that must normalize into canonical `sm6` before any duplicate logic is lawful.

## Normalization Summary

The authoritative source identity lived on active `card_print_identity` rows with `set_code_identity = 'sm6'`, while the old parents remained structurally incomplete:

- `card_prints.gv_id is null`
- `card_prints.set_code is null`
- `card_prints.number is null`
- `card_prints.number_plain is null`

`sm6` uses the stabilized normalization contract:

- `NAME_NORMALIZE_V2`
  - lowercase
  - unicode apostrophe to ASCII
  - normalize dash separators to spaces
  - normalize `GX` punctuation
  - collapse whitespace
  - trim
- `TOKEN_NORMALIZE_V1`
  - numeric base extraction
  - suffix routing only when the canonical suffix target exists in `sm6`
  - no cross-number merging
  - no cross-set routing

Live split:

- `name_normalize_v2 = 26`
- `suffix_variant = 1`

The single suffix route was:

- `102 -> 102a` (`Beast Ring`)

Observed normalization surface:

- `GX` punctuation normalization, e.g. `Palkia GX -> Palkia-GX`
- unicode apostrophe handling remained available but was not needed to unlock additional `sm6` rows
- dash normalization remained available but was not needed to unlock additional `sm6` rows

## Mapping Proof

Pre-apply proof:

- unresolved source rows: `27`
- canonical `sm6` targets: `146`
- exact-token lawful matches: `0`
- exact-token same-token different-name conflicts: `26`
- exact-token unmatched rows: `27`
- lawful base-variant map count: `27`
- multiple-match old rows: `0`
- reused targets: `0`
- unmatched base-variant rows: `0`
- invalid normalized rows: `0`
- cross-set targets: `0`

Representative blocked pair:

- old `5f6af358-a342-44c3-ae56-cb81cdb6479c`
- old name `Palkia GX`
- old printed token `20`
- candidate canonical `b6e9b3cb-0b02-48f0-8c15-20e1c2b44ad9`
- candidate canonical name `Palkia-GX`
- candidate canonical `gv_id = GV-PK-FLI-20`

Live FK inventory on old parents:

- `card_print_identity = 27`
- `card_print_traits = 27`
- `card_printings = 81`
- `external_mappings = 27`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Collision audit is lawful:

- target identity rows before apply: `0`
- trait conflicts: `0`
- external mapping conflicts: `0`
- printing finish conflicts: `81`
- metadata-only mergeable printing conflicts: `81`
- non-deterministic printing conflicts: `0`

## Risks

- wrong normalization collapsing distinct cards that only look similar
- suffix routing onto the wrong canonical target
- stale apply surface between audit and apply
- unsupported FK references outside the handled table list

These remain hard-stop conditions.

## Invariants

- scope stays inside the null-parent `sm6` source lane and canonical `sm6` targets
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

1. unresolved `sm6` null-`gv_id` parents = `0`
2. remaining old parent rows = `0`
3. canonical `sm6` row count remains `146`
4. canonical namespace drift count = `0`
5. route-resolvable target count = `27`
6. clean repaired group count = `27`
7. remaining duplicate group count = `0`

FK movement summary:

- `updated_identity_rows = 27`
- `inserted_traits = 27`
- `deleted_old_traits = 27`
- `merged_printing_metadata_rows = 81`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 81`
- `updated_external_mappings = 27`
- `updated_vault_items = 0`

Remaining FK references to old parents:

- `card_print_identity = 0`
- `card_print_traits = 0`
- `card_printings = 0`
- `external_mappings = 0`
- `vault_items = 0`
- unsupported FK references with non-zero rows: `0`

Backup artifacts created before apply:

- `backups/sm6_preapply_schema.sql`
- `backups/sm6_preapply_data.sql`

Sample before/after rows:

- `5f6af358-a342-44c3-ae56-cb81cdb6479c / Palkia GX / 20 -> b6e9b3cb-0b02-48f0-8c15-20e1c2b44ad9 / Palkia-GX / GV-PK-FLI-20`
- `0438c28f-3e0b-4827-a4bd-95f6c3ae03ab / Zygarde GX / 123 -> 8ccda479-0e5c-467c-901d-37be8badc812 / Zygarde-GX / GV-PK-FLI-123`
- `7537fa6b-5622-48e6-8333-a0943f882a71 / Ultra Necrozma GX / 140 -> 6f9dd0d5-cad4-43ac-b0c1-3445320f12ed / Ultra Necrozma-GX / GV-PK-FLI-140`

In all three samples, the old parent no longer exists and the canonical target now has exactly `1` active identity row.

