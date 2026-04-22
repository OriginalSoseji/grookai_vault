# PRIZE_PACK_READY_BATCH_V5

Generated: 2026-04-20T03:43:17.011Z

## Context

Executed the exact 10-row Prize Pack batch unlocked by Evidence V4 from the bounded candidate artifact. Scope stayed limited to those 10 confirmed rows under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`.

## Result

- Batch size attempted: 10
- Batch size completed: 10
- Classified: 10
- Staged: 10
- Approved: 10
- Promoted: 10
- Mapped: 10
- Image closed: 10
- Failures: 0

## Verification

- Warehouse candidates: 10/10 now in `PROMOTED` state.
- Promotion staging: 10/10 `SUCCEEDED` with `CREATE_CARD_PRINT`.
- Canon rows: 10/10 created with non-null `variant_key = play_pokemon_stamp`.
- Mapping: 10/10 active JustTCG mappings, duplicate external ids = 0, multi-active conflicts = 0.
- Images: exact rows = 0, representative rows = 10, representative_shared_stamp = 10, missing = 0.
- Drift check: base rows unchanged; no series-split behavior introduced.

## Post-Batch Prize Pack Status

- Remaining WAIT rows: 291
- DO_NOT_CANON rows: 125
- Promoted Prize Pack total before V5: 242
- Promoted Prize Pack total after V5: 252
- V5 candidate rows still open: 0

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
| Eldegoss | 016 | GV-PK-EVS-016-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Ludicolo | 034 | GV-PK-EVS-034-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Regieleki | 060 | GV-PK-EVS-060-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Pumpkaboo | 076 | GV-PK-EVS-076-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Medicham V | 083 | GV-PK-EVS-083-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Dialga | 112 | GV-PK-EVS-112-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Kyurem | 116 | GV-PK-EVS-116-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Regidrago | 124 | GV-PK-EVS-124-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Smeargle | 128 | GV-PK-EVS-128-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |
| Zinnia's Resolve | 164 | GV-PK-EVS-164-PLAY-POKEMON-STAMP | play_pokemon_stamp | swsh7 | mapped | representative_shared_stamp |

## Next Step

- Recommended next execution step: `PRIZE_PACK_FAMILY_ONLY_EVIDENCE_STRATEGY_V5`
