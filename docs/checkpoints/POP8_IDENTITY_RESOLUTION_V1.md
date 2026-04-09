# POP8_IDENTITY_RESOLUTION_V1

## Context

`pop8` continues the cross-era identity-drift pattern already proven in the SM, XY, and `dc1` buckets: unresolved rows are not lawful direct duplicate-collapse targets, but they do resolve inside the canonical `pop8` namespace after deterministic normalization.

The `pop8` surface is minimal. Live data shows one unresolved row, explained entirely by unicode apostrophe drift, with no suffix routing and no active-identity fan-in.

## Classification Result

Live audit on `pop8` proves:

- `source_count = 1`
- `canonical_count = 17`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 1`
- `unmatched = 1`
- classification = `BASE_VARIANT_COLLAPSE`

That blocks direct duplicate collapse and activates the Class F path.

## Normalization Summary

`pop8` uses `NAME_NORMALIZE_V3` plus `TOKEN_NORMALIZE_V1`:

- lawful normalized map count = `1`
- `name_normalize_v3_count = 1`
- `suffix_variant_count = 0`
- reused canonical target count = `0`
- invalid normalized groups = `0`
- cross-set targets = `0`

Observed live normalization surface:

- unicode apostrophe repair:
  `Roseanne’s Research -> Roseanne's Research`

## Fan-In Summary

Fan-in audit result:

- `fan_in_group_count = 0`
- `archived_identity_count = 0`

No canonical `pop8` target receives more than one active incoming identity, so the standard Class F repoint path is sufficient.

## Mapping Proof

The normalized map is deterministic:

- every unresolved old parent maps exactly once
- every canonical target is used once
- no multiple canonical matches exist
- no unmatched rows remain after normalization
- no row outside `pop8` enters scope

Representative blocked pair that forces Class F:

- `cdba5e35-172d-4b62-9b3c-03b19c283ea9 / Roseanne’s Research / 11 -> b12fb97d-7f8a-42f9-a574-1efcf8d995da / Roseanne's Research / GV-PK-POP8-11`

## Risks

- incorrect unicode apostrophe normalization would falsely leave the lawful match unmapped
- any non-deterministic merge in traits, printings, or external mappings remains a hard stop
- no cross-set collapse is permitted

## Invariants Preserved

- canonical `pop8` namespace remains unchanged
- no new `gv_id` are created
- no target `gv_id` are modified
- no cross-set collapse is permitted
- exactly one active identity remains on each canonical target

## Post-State Truth

Apply completed successfully.

Post-apply verification proved:

1. unresolved `pop8` null-`gv_id` parents = `0`
2. deleted old parent rows = `1`
3. remaining old parent rows = `0`
4. canonical `pop8` row count remains `17`
5. canonical namespace drift = `0`
6. fan-in groups resolved = `0`
7. archived identities retained = `0`
8. old FK references = `0`
9. target identity rows on mapped canonical parents = `1` total, `1` active, `0` inactive
10. clean resolved target groups = `1`

Apply operations:

- `archived_identity_rows = 0`
- `updated_identity_rows = 1`
- `merged_trait_metadata_rows = 0`
- `inserted_traits = 1`
- `deleted_old_traits = 1`
- `merged_printing_metadata_rows = 0`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 0`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`

Verified sample row:

- `cdba5e35-172d-4b62-9b3c-03b19c283ea9 / Roseanne’s Research / 11 -> b12fb97d-7f8a-42f9-a574-1efcf8d995da / Roseanne's Research / GV-PK-POP8-11`; old parent removed, target now has `1` active identity row


