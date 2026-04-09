# XY8_IDENTITY_RESOLUTION_V1

## Context

`xy8` is the first XY-era duplicate surface after the Sun & Moon bucket closed. Live data shows the same identity-first pattern: unresolved rows are not lawful direct duplicate collapse targets, but they do resolve inside the canonical `xy8` namespace after deterministic normalization.

`xy8` also introduces one live twist that the SM standard path did not need: the suffix-routed canonical target `146a` already has its own active identity row, so collapse requires the archive-history fan-in branch on that single target.

## Classification Result

Live audit on `xy8` proves:

- `source_count = 19`
- `canonical_count = 164`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 18`
- `unmatched = 19`
- classification = `BASE_VARIANT_COLLAPSE`

That blocks direct duplicate collapse and activates the Class F path.

## Normalization Summary

`xy8` extends the existing normalization contract with `EX` punctuation repair while retaining the same token-routing rules:

- lawful normalized map count = `19`
- `name_normalize_v2_count = 18`
- `suffix_variant_count = 1`
- reused canonical target count = `0`
- invalid normalized groups = `0`
- cross-set targets = `0`

Observed live normalization surface:

- `EX` punctuation repair:
  `Houndoom EX -> Houndoom-EX`
  `M Mewtwo EX -> M Mewtwo-EX`
  `Glalie EX -> Glalie-EX`
- suffix routing:
  `Professor's Letter / 146 -> Professor's Letter / 146a`

## Fan-In Summary

Fan-in audit result:

- `fan_in_group_count = 1`
- `archived_identity_count = 1`

The only fan-in group is the suffix-routed `Professor's Letter` target:

- canonical target `1d161aed-2ab6-4707-9db2-3e300d658729 / Professor's Letter / 146a / GV-PK-BKT-146A`
- incoming unresolved source `41c4e0f3-73d2-4394-bdf8-31a13457754e / Professor's Letter / 146`
- existing canonical active identity `a0d0c824-f417-431a-b6af-3b2c0f33b830 / 146a`

The active selection rule keeps the existing canonical `146a` identity active because it is the exact canonical token match; the incoming `146` identity is preserved as inactive history.

## Mapping Proof

The normalized map is deterministic:

- every unresolved old parent maps exactly once
- every canonical target is used once
- no multiple canonical matches exist
- no unmatched rows remain after normalization
- no row outside `xy8` enters scope

Representative blocked pairs that force Class F:

- `914e73d1-f9c8-4ae3-a7aa-cdc4e83ebd38 / Houndoom EX / 21 -> 9871708a-bd9f-4f75-a1ab-ef27a5d57758 / Houndoom-EX / GV-PK-BKT-21`
- `41c4e0f3-73d2-4394-bdf8-31a13457754e / Professor's Letter / 146 -> 1d161aed-2ab6-4707-9db2-3e300d658729 / Professor's Letter / GV-PK-BKT-146A`
- `dab08c2e-9a22-47eb-9733-84f955290bf7 / Mewtwo EX / 164 -> 24fa77a1-40e4-47e0-a073-6f2fa75ad1aa / Mewtwo-EX / GV-PK-BKT-164`

## Deterministic Merge Note

`xy8` has one non-identical trait-key collision on the suffix-routed `Professor's Letter` pair:

- same trait key: `pokemon:stats / tcgdex / tcgdex`
- old rarity = `Uncommon`
- target rarity = `None`

That is a metadata-only placeholder conflict, not a semantic identity conflict. The lawful merge is to keep the target row and promote the informative rarity from `None` to `Uncommon` before deleting the old parent rows.

## Risks

- incorrect `EX` punctuation normalization would falsely leave lawful matches unmapped
- the single suffix route must stay pinned to canonical `146a`
- the fan-in selector must keep the canonical `146a` identity active
- the trait merge must not overwrite informative data with placeholders
- any non-deterministic merge in traits, printings, or external mappings remains a hard stop

## Invariants Preserved

- canonical `xy8` namespace remains unchanged
- no new `gv_id` are created
- no target `gv_id` are modified
- no cross-set collapse is permitted
- exactly one active identity remains on each canonical target after fan-in resolution

## Post-State Truth

Apply completed.

Verified post-state:

1. unresolved `xy8` null-`gv_id` parents = `0`
2. deleted old parent rows = `19`
3. remaining old parent rows = `0`
4. canonical `xy8` row count remains `164`
5. canonical namespace drift = `0`
6. fan-in groups resolved = `1`
7. archived identities retained = `1`
8. target identity rows on canonical targets = `20` total, `19` active, `1` inactive
9. clean target groups after collapse = `19`
10. remaining duplicate groups = `0`
11. old FK references = `0`

Apply operations:

- archived identity rows = `1`
- updated identity rows = `19`
- merged trait metadata rows = `1`
- inserted traits = `18`
- deleted old traits = `19`
- merged printing metadata rows = `57`
- deleted redundant printings = `57`
- updated external mappings = `19`
- updated vault items = `0`

Verified sample rows:

- `914e73d1-f9c8-4ae3-a7aa-cdc4e83ebd38 / Houndoom EX / 21 -> 9871708a-bd9f-4f75-a1ab-ef27a5d57758 / Houndoom-EX / GV-PK-BKT-21`
- `0b406b51-d378-4eec-8ce6-9968248e8935 / Houndoom EX / 153 -> 0e54791c-252c-4cd0-ba90-4f8a92dea243 / Houndoom-EX / GV-PK-BKT-153`
- `dab08c2e-9a22-47eb-9733-84f955290bf7 / Mewtwo EX / 164 -> 24fa77a1-40e4-47e0-a073-6f2fa75ad1aa / Mewtwo-EX / GV-PK-BKT-164`

The `Professor's Letter` fan-in target now holds `2` identity rows on `GV-PK-BKT-146A`: the existing canonical `146a` row remains active and the incoming `146` row is preserved as inactive history.
