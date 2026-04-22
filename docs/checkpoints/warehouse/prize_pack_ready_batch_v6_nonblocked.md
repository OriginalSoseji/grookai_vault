# PRIZE_PACK_READY_BATCH_V6_NONBLOCKED

Generated: 2026-04-20T05:30:25.110Z

## Context

Executed the exact 37-row nonblocked Prize Pack V6 subset from accessible evidence only under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`. The batch stayed bounded to the V6 nonblocked slice and promoted the clean subset only.

## Result

- Batch size attempted: 37
- Batch size completed: 32
- Classified: 33
- Staged: 32
- Approved: 32
- Promoted: 32
- Mapped: 32
- Image closed: 32
- Failures: {"CLASSIFIED_PARTIAL:MULTIPLE_SAME_NAME_SLOT_ROWS":1,"UNDERLYING_BASE_MISSING":4}

## Verification

- Pre-intake live audit: {"READY_TO_BRIDGE":33,"CONFLICT_REVIEW_REQUIRED":4}
- Warehouse candidates: 32/37 now in `PROMOTED`; 1 remains in `REVIEW_READY`; 4 never bridged because the underlying base row is missing in live canon.
- Promotion staging: 32/32 `PENDING/SUCCEEDED` bounded to the promotable subset, ending at `SUCCEEDED` for all promoted rows.
- Canon rows: 32/32 created with non-null `variant_key = play_pokemon_stamp`.
- Mapping: 32/32 active JustTCG mappings, duplicate external ids = 0, multi-active conflicts = 0.
- Images: exact rows = 0, representative rows = 32, `representative_shared_stamp` = 32, missing = 0.
- Drift check: base rows unchanged; no series-split behavior introduced; no representative image written into `image_url`.

## Blocked Residue

- Precheck blockers (4): `UNDERLYING_BASE_MISSING`
  - Radiant Tsareena | 016/195 | swsh12
  - Alolan Vulpix V | 033/195 | swsh12
  - Alolan Vulpix VSTAR | 034/195 | swsh12
  - Radiant Alakazam | 059/195 | swsh12
- Classification blocker (1): `CLASSIFIED_PARTIAL:MULTIPLE_SAME_NAME_SLOT_ROWS`
  - Lucario | 114/198 | sv01

## Post-Batch Prize Pack Status

- Remaining WAIT rows: 214
- DO_NOT_CANON rows: 165
- Blocked-by-official-acquisition rows: 19
- Promoted Prize Pack total before V6 nonblocked: 252
- Promoted Prize Pack total after V6 nonblocked: 284
- V6 nonblocked blocked residue: 5

## Representative Examples

| Name | Number | GV ID | Variant Key | Set | Mapping | Image |
| --- | --- | --- | --- | --- | --- | --- |
| Spidops ex | 019 | GV-PK-SVI-019-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Slowbro | 043 | GV-PK-SVI-043-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Dondozo | 061 | GV-PK-SVI-061-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Tatsugiri | 062 | GV-PK-SVI-062-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Magnezone ex | 065 | GV-PK-SVI-065-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Pawmot | 076 | GV-PK-SVI-076-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Banette ex | 088 | GV-PK-SVI-088-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Annihilape | 109 | GV-PK-SVI-109-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Hawlucha | 118 | GV-PK-SVI-118-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Great Tusk ex | 123 | GV-PK-SVI-123-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Muk | 127 | GV-PK-SVI-127-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |
| Toxicroak ex | 131 | GV-PK-SVI-131-PLAY-POKEMON-STAMP | play_pokemon_stamp | sv01 | mapped | representative_shared_stamp |

## Next Step

- Recommended next execution step: `PRIZE_PACK_BASE_ROUTE_REPAIR_V1`
