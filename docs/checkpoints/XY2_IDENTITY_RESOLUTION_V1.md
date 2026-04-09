# XY2_IDENTITY_RESOLUTION_V1

## Context

`xy2` continues the XY-era identity-drift pattern established by `xy8`: unresolved rows are not lawful direct duplicate collapse targets, but they do resolve inside the canonical `xy2` namespace after deterministic normalization.

Like `xy8`, `xy2` also has one suffix-routed canonical target that already carries an active identity row, so the archive-history fan-in branch is required on exactly one target.

## Classification Result

Live audit on `xy2` proves:

- `source_count = 16`
- `canonical_count = 109`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 15`
- `unmatched = 16`
- classification = `BASE_VARIANT_COLLAPSE`

That blocks direct duplicate collapse and activates the Class F path.

## Normalization Summary

`xy2` uses `NAME_NORMALIZE_V3` plus `TOKEN_NORMALIZE_V1`:

- lawful normalized map count = `16`
- `name_normalize_v3_count = 15`
- `suffix_variant_count = 1`
- reused canonical target count = `0`
- invalid normalized groups = `0`
- cross-set targets = `0`

Observed live normalization surface:

- `EX` punctuation repair:
  `Charizard EX -> Charizard-EX`
  `Magnezone EX -> Magnezone-EX`
  `M Kangaskhan EX -> M Kangaskhan-EX`
- suffix routing:
  `Blacksmith / 88 -> Blacksmith / 88a`

## Fan-In Summary

Fan-in audit result:

- `fan_in_group_count = 1`
- `archived_identity_count = 1`

The only fan-in group is the suffix-routed `Blacksmith` target:

- canonical target `e52ae0fc-75c2-4d79-828e-22c46bca1c65 / Blacksmith / 88a / GV-PK-FLF-88A`
- incoming unresolved source `22ea58d5-cea2-4061-b31c-4863ed8e4980 / Blacksmith / 88`
- existing canonical active identity `3e6a024f-7ddf-4955-9589-3b2649ca3b76 / 88a`

The active selection rule keeps the existing canonical `88a` identity active because it is the exact canonical token match; the incoming `88` identity is preserved as inactive history.

## Mapping Proof

The normalized map is deterministic:

- every unresolved old parent maps exactly once
- every canonical target is used once
- no multiple canonical matches exist
- no unmatched rows remain after normalization
- no row outside `xy2` enters scope

Representative blocked pairs that force Class F:

- `66f01d2a-95ec-4cc1-86ce-4cdd763ce49f / Charizard EX / 11 -> bca12938-f6ad-49a3-8b31-55490442787d / Charizard-EX / GV-PK-FLF-11`
- `22ea58d5-cea2-4061-b31c-4863ed8e4980 / Blacksmith / 88 -> e52ae0fc-75c2-4d79-828e-22c46bca1c65 / Blacksmith / GV-PK-FLF-88A`
- `24dd70bd-a6d0-44e9-a8d1-f0a164775459 / M Kangaskhan EX / 109 -> 1d8a6062-0f4a-4666-8a44-4b34ecc47565 / M Kangaskhan-EX / GV-PK-FLF-109`

## Risks

- incorrect `EX` punctuation normalization would falsely leave lawful matches unmapped
- the single suffix route must stay pinned to canonical `88a`
- the fan-in selector must keep the canonical `88a` identity active
- any non-deterministic merge in traits, printings, or external mappings remains a hard stop

## Invariants Preserved

- canonical `xy2` namespace remains unchanged
- no new `gv_id` are created
- no target `gv_id` are modified
- no cross-set collapse is permitted
- exactly one active identity remains on each canonical target after fan-in resolution

## Post-State Truth

Apply completed successfully.

Post-apply verification proved:

1. unresolved `xy2` null-`gv_id` parents = `0`
2. deleted old parent rows = `16`
3. remaining old parent rows = `0`
4. canonical `xy2` row count remains `109`
5. canonical namespace drift = `0`
6. fan-in groups resolved = `1`
7. archived identities retained = `1`
8. old FK references = `0`
9. target identity rows on mapped canonical parents = `17` total, `16` active, `1` inactive
10. clean resolved target groups = `16`

Apply operations:

- `archived_identity_rows = 1`
- `updated_identity_rows = 16`
- `merged_trait_metadata_rows = 0`
- `inserted_traits = 15`
- `deleted_old_traits = 16`
- `merged_printing_metadata_rows = 48`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 48`
- `updated_external_mappings = 16`
- `updated_vault_items = 0`

Verified sample rows:

- `66f01d2a-95ec-4cc1-86ce-4cdd763ce49f / Charizard EX / 11 -> bca12938-f6ad-49a3-8b31-55490442787d / Charizard-EX / GV-PK-FLF-11`; old parent removed, target now has `1` active identity row
- `22ea58d5-cea2-4061-b31c-4863ed8e4980 / Blacksmith / 88 -> e52ae0fc-75c2-4d79-828e-22c46bca1c65 / Blacksmith / GV-PK-FLF-88A`; old parent removed, target now has `2` identity rows (`1` active, `1` inactive history)
- `24dd70bd-a6d0-44e9-a8d1-f0a164775459 / M Kangaskhan EX / 109 -> 1d8a6062-0f4a-4666-8a44-4b34ecc47565 / M Kangaskhan-EX / GV-PK-FLF-109`; old parent removed, target now has `1` active identity row
