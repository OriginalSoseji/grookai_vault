# PRIZE_PACK_READY_BATCH_V10

Generated: 2026-04-20T19:09:02.149Z

## Context

Executed the exact 11-row Prize Pack V10 subset unlocked by the late-Scarlet & Violet nonblocked evidence pass under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`.

## Result

- Batch size attempted: 11
- Batch size completed: 11
- Classified: 11
- Staged: 11
- Approved: 11
- Promoted: 11
- Mapped: 11
- Image closed: 11
- Failures: {}

## Verification

- Pre-intake live audit: {"ALREADY_PROMOTED":2,"ALREADY_IN_WAREHOUSE":9}
- Warehouse candidates: 11/11 reached `PROMOTED` with bounded bridge + classification only.
- Promotion staging: 11/11 exact-batch staging rows reached `SUCCEEDED`.
- Canon rows: 11/11 created with non-null `variant_key = play_pokemon_stamp`.
- Mapping: 11/11 active JustTCG mappings, duplicate external ids = 0, multi-active conflicts = 0.
- Images: exact rows = 0, representative rows = 11, representative_shared_stamp = 11, missing = 0.
- Drift check: base rows unchanged; no series-split behavior introduced; no representative image written into `image_url`.

## Post-Batch Prize Pack Status

- Remaining WAIT rows: 135
- DO_NOT_CANON rows: 174
- Blocked-by-official-acquisition rows: 21
- Promoted Prize Pack total before V10: 350
- Promoted Prize Pack total after V10: 361

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
| Town Store | 196/197 | GV-PK-OBF-196-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv03 | mapped | representative_shared_stamp |
| Iron Valiant ex | 089/182 | GV-PK-PAR-089-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp |
| Technical Machine: Blindside | 176/182 | GV-PK-PAR-176-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp |
| Technical Machine: Turbo Energize | 179/182 | GV-PK-PAR-179-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp |
| Hyper Aroma | 152/167 | GV-PK-TWM-152-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp |
| Ogre's Mask | 159/167 | GV-PK-TWM-159-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp |
| Scoop Up Cyclone | 162/167 | GV-PK-TWM-162-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp |
| Survival Brace | 164/167 | GV-PK-TWM-164-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp |
| Legacy Energy | 167/167 | GV-PK-TWM-167-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp |
| Grand Tree | 136/142 | GV-PK-SCR-136-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv07 | mapped | representative_shared_stamp |
| Janine's Secret Art | 059/064 | GV-PK-SFA-059-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv6pt5 | mapped | representative_shared_stamp |

## Next Step

- Recommended next execution step: `PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V11_NONBLOCKED`
