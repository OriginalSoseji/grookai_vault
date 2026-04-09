# SM11_IDENTITY_RESOLUTION_V1

## Context

`sm11` follows the established Sun & Moon duplicate pattern: unresolved rows are not lawful direct duplicate collapse targets, and they are not alias-lane rows. The correct entry path is identity-first Class F normalization inside the canonical `sm11` namespace.

Unlike `sm4`, live `sm11` does **not** require active-identity fan-in resolution. The normalized map is one-old-to-one-canonical for the full unresolved surface.

## Classification Result

Live audit on `sm11` proves:

- `source_count = 12`
- `canonical_count = 258`
- `exact_matches = 0`
- `same_token_different_name_conflicts = 12`
- `unmatched = 12`
- classification = `BASE_VARIANT_COLLAPSE`

That blocks direct duplicate collapse and activates the standard Class F path.

## Normalization Summary

`sm11` resolves entirely through `NAME_NORMALIZE_V2` and does not require suffix routing:

- lawful normalized map count = `12`
- `name_normalize_v2_count = 12`
- `suffix_variant_count = 0`
- reused canonical target count = `0`
- invalid normalized groups = `0`
- cross-set targets = `0`

Observed live normalization surface:

- `GX` punctuation repair:
  `Aerodactyl GX -> Aerodactyl-GX`
  `Rowlet & Alolan Exeggutor GX -> Rowlet & Alolan Exeggutor-GX`
  `Dragonite GX -> Dragonite-GX`
- unicode apostrophe repair:
  `Blaine’s Quiz Show -> Blaine's Quiz Show`
  `Blue’s Tactics -> Blue's Tactics`

## Fan-In Summary

Fan-in audit result:

- `fan_in_group_count = 0`
- `archived_identity_count = 0`

No multi-source convergence occurs on canonical `sm11` parents, so the `sm4` archive-history branch stays inactive here.

## Mapping Proof

The normalized map is deterministic:

- every unresolved old parent maps exactly once
- every canonical target is used once
- no multiple canonical matches exist
- no unmatched rows remain after normalization
- no row outside `sm11` enters scope

Representative blocked pairs that force Class F:

- `c3b07f58-8f7c-482d-a17a-79762a726e0d / Aerodactyl GX / 106 -> af58f59e-ebef-47e2-8b9a-99ec78437d40 / Aerodactyl-GX / GV-PK-UNM-106`
- `4210e167-b96d-46eb-a545-52af380d84f9 / Blaine’s Quiz Show / 186 -> 2c9ede13-128b-4015-9238-615742bc3385 / Blaine's Quiz Show / GV-PK-UNM-186`
- `260149de-243d-4b58-9d88-4c42bfbc09c1 / Dragonite GX / 248 -> dd51115f-9d16-4814-aeec-0e37b7477609 / Dragonite-GX / GV-PK-UNM-248`

## Risks

- incorrect `GX` punctuation normalization would falsely leave lawful matches unmapped
- punctuation-only drift must not be mistaken for cross-set or semantic divergence
- any non-deterministic merge in traits, printings, or external mappings remains a hard stop
- stale live data could change counts, so the runner must fail closed on drift

## Invariants Preserved

- canonical `sm11` namespace remains unchanged
- no new `gv_id` are created
- no target `gv_id` are modified
- no cross-set collapse is permitted
- no active/inactive archival step is required because fan-in count is `0`

## Post-State Truth

Apply completed.

Verified post-state:

1. unresolved `sm11` null-`gv_id` parents = `0`
2. deleted old parent rows = `12`
3. remaining old parent rows = `0`
4. canonical `sm11` row count remains `258`
5. canonical namespace drift = `0`
6. fan-in groups resolved = `0`
7. archived identities retained = `0`
8. target identity rows on canonical targets = `12` total, `12` active, `0` inactive
9. clean target groups after collapse = `12`
10. remaining duplicate groups = `0`
11. old FK references = `0`

Apply operations:

- archived identity rows = `0`
- updated identity rows = `12`
- inserted traits = `12`
- deleted old traits = `12`
- merged printing metadata rows = `36`
- deleted redundant printings = `36`
- updated external mappings = `12`
- updated vault items = `0`

Verified sample rows:

- `c3b07f58-8f7c-482d-a17a-79762a726e0d / Aerodactyl GX / 106 -> af58f59e-ebef-47e2-8b9a-99ec78437d40 / Aerodactyl-GX / GV-PK-UNM-106`
- `d1724470-ae4b-4633-8b6c-c3855cc9c72c / Rowlet & Alolan Exeggutor GX / 214 -> 0c2be620-377e-45d0-ae2f-c66cbdaaf47e / Rowlet & Alolan Exeggutor-GX / GV-PK-UNM-214`
- `260149de-243d-4b58-9d88-4c42bfbc09c1 / Dragonite GX / 248 -> dd51115f-9d16-4814-aeec-0e37b7477609 / Dragonite-GX / GV-PK-UNM-248`
