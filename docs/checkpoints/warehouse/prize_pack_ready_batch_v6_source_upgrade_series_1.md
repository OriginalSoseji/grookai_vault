# PRIZE_PACK_READY_BATCH_V6_SOURCE_UPGRADE_SERIES_1

Generated: 2026-04-21T04:14:35.702Z

## Context

Executed the exact 19-row Prize Pack subset unlocked by the local official Series 1 checklist import under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`.

## Result

- Batch size attempted: 19
- Batch size completed: 19
- Classified: 19
- Staged: 19
- Approved: 19
- Promoted: 19
- Mapped: 19
- Image closed: 19
- Failures: {}

## Verification

- Pre-intake live audit: {"READY_TO_BRIDGE":19}
- Warehouse candidates: 19/19 reached `PROMOTED` with bounded bridge + classification only.
- Promotion staging: 19/19 exact-batch staging rows reached `SUCCEEDED`.
- Canon rows: 19/19 created with non-null `variant_key = play_pokemon_stamp`.
- Mapping: 19/19 active JustTCG mappings, duplicate external ids = 0, multi-active conflicts = 0.
- Images: exact rows = 0, representative rows = 19, representative_shared_stamp = 19, missing = 0.
- Drift check: base rows unchanged; no series-split behavior introduced; no representative image written into `image_url`.

## Post-Batch Prize Pack Status

- Remaining WAIT rows before Series 1 source-upgrade batch: 104
- Remaining WAIT rows after Series 1 source-upgrade batch: 85
- DO_NOT_CANON rows: 186
- Blocked-by-official-acquisition rows before Series 1 source-upgrade batch: 88
- Blocked-by-official-acquisition rows after Series 1 source-upgrade batch: 69
- Promoted Prize Pack total before Series 1 source-upgrade batch: 373
- Promoted Prize Pack total after Series 1 source-upgrade batch: 392
- Series 2 official acquisition: BLOCKED_UNTOUCHED

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
| Victini VMAX | 022/163 | GV-PK-BST-022-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Empoleon V | 040/163 | GV-PK-BST-040-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Orbeetle | 065/163 | GV-PK-BST-065-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Crobat | 091/163 | GV-PK-BST-091-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Tyranitar V | 097/163 | GV-PK-BST-097-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Corviknight V | 109/163 | GV-PK-BST-109-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Corviknight VMAX | 110/163 | GV-PK-BST-110-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Exp. Share | 126/163 | GV-PK-BST-126-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh5 | mapped | representative_shared_stamp |
| Blaziken V | 020/198 | GV-PK-CRE-020-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Blaziken VMAX | 021/198 | GV-PK-CRE-021-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Froslass | 036/198 | GV-PK-CRE-036-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Zeraora V | 053/198 | GV-PK-CRE-053-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Gardevoir | 061/198 | GV-PK-CRE-061-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Lycanroc | 087/198 | GV-PK-CRE-087-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Spiritomb | 103/198 | GV-PK-CRE-103-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Single Strike Urshifu | 108/198 | GV-PK-CRE-108-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Avery | 130/198 | GV-PK-CRE-130-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Impact Energy | 157/198 | GV-PK-CRE-157-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |
| Spiral Energy | 159/198 | GV-PK-CRE-159-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh6 | mapped | representative_shared_stamp |

## Next Step

- Recommended next execution step: `MANUAL_BROWSER_DOWNLOAD_AND_LOCAL_JSON_IMPORT_FOR_PRIZE_PACK_V1_SERIES_2`
