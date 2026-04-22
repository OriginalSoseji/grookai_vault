# PRIZE_PACK_READY_BATCH_V7_SOURCE_UPGRADE_SERIES_2

Generated: 2026-04-21T18:05:03.929Z

## Context

Executed the exact 22-row Prize Pack subset unlocked by the validated official-equivalent Series 2 checklist fallback import under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`.

## Result

- Batch size attempted: 22
- Batch size completed: 22
- Classified: 22
- Staged: 22
- Approved: 22
- Promoted: 22
- Mapped: 22
- Image closed: 22
- Failures: {}

## Verification

- Pre-intake live audit: {"READY_TO_BRIDGE":22}
- Warehouse candidates: 22/22 reached `PROMOTED` with bounded bridge + classification only.
- Promotion staging: 22/22 exact-batch staging rows reached `SUCCEEDED`.
- Canon rows: 22/22 created with non-null `variant_key = play_pokemon_stamp`.
- Mapping: 22/22 active JustTCG mappings, duplicate external ids = 0, multi-active conflicts = 0.
- Images: exact rows = 0, representative rows = 22, representative_shared_stamp = 22, missing = 0.
- Drift check: base rows unchanged; no series-split behavior introduced; no representative image written into `image_url`.

## Post-Batch Prize Pack Status

- Remaining WAIT rows before Series 2 source-upgrade batch: 85
- Remaining WAIT rows after Series 2 source-upgrade batch: 63
- DO_NOT_CANON rows: 186
- Blocked-by-official-acquisition rows before Series 2 source-upgrade batch: 69
- Blocked-by-official-acquisition rows after Series 2 source-upgrade batch: 47
- Promoted Prize Pack total before Series 2 source-upgrade batch: 392
- Promoted Prize Pack total after Series 2 source-upgrade batch: 414
- Series 2 official acquisition: VALIDATED_FALLBACK_IMPORT_EXECUTED

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
| Oricorio | 042/264 | GV-PK-FST-042-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Inteleon V | 078/264 | GV-PK-FST-078-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Inteleon VMAX | 079/264 | GV-PK-FST-079-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Boltund V | 103/264 | GV-PK-FST-103-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Boltund VMAX | 104/264 | GV-PK-FST-104-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Mew V | 113/264 | GV-PK-FST-113-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Mew VMAX | 114/264 | GV-PK-FST-114-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Meloetta | 124/264 | GV-PK-FST-124-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Gengar V | 156/264 | GV-PK-FST-156-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Gengar VMAX | 157/264 | GV-PK-FST-157-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Genesect V | 185/264 | GV-PK-FST-185-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Latias | 193/264 | GV-PK-FST-193-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Latios | 194/264 | GV-PK-FST-194-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Dunsparce | 207/264 | GV-PK-FST-207-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Adventurer's Discovery | 224/264 | GV-PK-FST-224-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Battle VIP Pass | 225/264 | GV-PK-FST-225-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Cram-o-matic | 229/264 | GV-PK-FST-229-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Elesa's Sparkle | 233/264 | GV-PK-FST-233-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Power Tablet | 236/264 | GV-PK-FST-236-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Fusion Strike Energy | 244/264 | GV-PK-FST-244-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh8 | mapped | representative_shared_stamp |
| Leafeon VSTAR | SWSH195 | GV-PK-PR-SW-195-PLAY-POKEMON-STAMP | play_pokemon_stamp | swshp | mapped | representative_shared_stamp |
| Glaceon VSTAR | SWSH197 | GV-PK-PR-SW-197-PLAY-POKEMON-STAMP | play_pokemon_stamp | swshp | mapped | representative_shared_stamp |

## Next Step

- Recommended next execution step: `PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V18_NONBLOCKED`
