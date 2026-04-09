# DC1_IDENTITY_RESOLUTION_V1

## Context

`dc1` continues the cross-era identity-drift pattern already proven in the SM and XY buckets: unresolved rows are not lawful direct duplicate-collapse targets, but they do resolve inside the canonical `dc1` namespace after deterministic normalization.

Unlike `xy8` and `xy2`, the `dc1` surface is small and clean. The live unresolved lane is only two rows, both explained by `EX` punctuation drift, with no suffix routing and no active-identity fan-in.

## Classification Result

Live audit on `dc1` proves:

- `source_count = 2`
- `canonical_count = 34`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 2`
- `unmatched = 2`
- classification = `BASE_VARIANT_COLLAPSE`

That blocks direct duplicate collapse and activates the Class F path.

## Normalization Summary

`dc1` uses `NAME_NORMALIZE_V3` plus `TOKEN_NORMALIZE_V1`:

- lawful normalized map count = `2`
- `name_normalize_v3_count = 2`
- `suffix_variant_count = 0`
- reused canonical target count = `0`
- invalid normalized groups = `0`
- cross-set targets = `0`

Observed live normalization surface:

- `Team Aqua's Kyogre EX -> Team Aqua's Kyogre-EX`
- `Team Magma's Groudon EX -> Team Magma's Groudon-EX`

## Fan-In Summary

Fan-in audit result:

- `fan_in_group_count = 0`
- `archived_identity_count = 0`

No canonical `dc1` target receives more than one active incoming identity, so the standard Class F repoint path is sufficient.

## Mapping Proof

The normalized map is deterministic:

- every unresolved old parent maps exactly once
- every canonical target is used once
- no multiple canonical matches exist
- no unmatched rows remain after normalization
- no row outside `dc1` enters scope

Representative blocked pairs that force Class F:

- `a7f846a7-2d62-4752-807d-e1b4da3586cc / Team Aqua's Kyogre EX / 6 -> 51d1fc8b-c457-4e79-9f90-e63a8802d3c0 / Team Aqua's Kyogre-EX / GV-PK-DCR-6`
- `44734f4a-f97d-4258-a185-8c030d73b98b / Team Magma's Groudon EX / 15 -> 50385ac4-9060-4375-b898-7ea6574d5c82 / Team Magma's Groudon-EX / GV-PK-DCR-15`

## Risks

- incorrect `EX` punctuation normalization would falsely leave lawful matches unmapped
- any non-deterministic merge in traits, printings, or external mappings remains a hard stop
- no cross-set collapse is permitted

## Invariants Preserved

- canonical `dc1` namespace remains unchanged
- no new `gv_id` are created
- no target `gv_id` are modified
- no cross-set collapse is permitted
- exactly one active identity remains on each canonical target

## Post-State Truth

Apply completed successfully.

Post-apply verification proved:

1. unresolved `dc1` null-`gv_id` parents = `0`
2. deleted old parent rows = `2`
3. remaining old parent rows = `0`
4. canonical `dc1` row count remains `34`
5. canonical namespace drift = `0`
6. fan-in groups resolved = `0`
7. archived identities retained = `0`
8. old FK references = `0`
9. target identity rows on mapped canonical parents = `2` total, `2` active, `0` inactive
10. clean resolved target groups = `2`

Apply operations:

- `archived_identity_rows = 0`
- `updated_identity_rows = 2`
- `merged_trait_metadata_rows = 0`
- `inserted_traits = 2`
- `deleted_old_traits = 2`
- `merged_printing_metadata_rows = 6`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 6`
- `updated_external_mappings = 2`
- `updated_vault_items = 0`

Verified sample rows:

- `a7f846a7-2d62-4752-807d-e1b4da3586cc / Team Aqua's Kyogre EX / 6 -> 51d1fc8b-c457-4e79-9f90-e63a8802d3c0 / Team Aqua's Kyogre-EX / GV-PK-DCR-6`; old parent removed, target now has `1` active identity row
- `44734f4a-f97d-4258-a185-8c030d73b98b / Team Magma's Groudon EX / 15 -> 50385ac4-9060-4375-b898-7ea6574d5c82 / Team Magma's Groudon-EX / GV-PK-DCR-15`; old parent removed, target now has `1` active identity row
