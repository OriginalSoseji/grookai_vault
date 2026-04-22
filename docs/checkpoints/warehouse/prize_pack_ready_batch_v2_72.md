# PRIZE_PACK_READY_BATCH_V2

## Context

Executed the exact 72-row `CONFIRMED_IDENTITY` Prize Pack subset from Evidence V2 under `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`. The batch stayed bounded to `docs/checkpoints/warehouse/prize_pack_ready_batch_v2_72.json` and promoted the clean subset only.

## Batch Identity

- Attempted rows: 72
- Source set id: prize-pack-series-cards-pokemon
- Governing rule: GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1
- Pre-intake live audit: 72 READY_TO_BRIDGE
- Effective set classes: me01, sv03, sv03.5, sv04, sv05, sv06, sv07, sv6pt5

## Phase Counts

- Classified: 72
- Staged: 70
- Approved: 70
- Promoted: 70
- Mapped: 70
- Image-closed: 70
- Blocked: 2

## Failure Class

- Hearthflame Mask Ogerpon ex | 040/167 | sv06 | CLASSIFIED_PARTIAL:MULTIPLE_SAME_NAME_SLOT_ROWS | unsupported_existing_variant_key=twilight_masquerade_stamp
- Wellspring Mask Ogerpon ex | 064/167 | sv06 | CLASSIFIED_PARTIAL:MULTIPLE_SAME_NAME_SLOT_ROWS | unsupported_existing_variant_key=twilight_masquerade_stamp

Both blockers are bounded coexistence failures, not evidence failures. The incoming `play_pokemon_stamp` variant is lawful, but runtime coexistence still rejects an existing `twilight_masquerade_stamp` occupant on the same base slot.

## Mapping Closure

- Promoted rows mapped: 70/70
- Duplicate active external ids: 0
- Multi-active mapping rows: 0

## Image Closure

- Promoted rows with exact image_url: 0
- Promoted rows with representative_image_url: 70
- `representative_shared_stamp`: 70
- Missing image coverage: 0

## Evidence Subset Status

- Promoted from this 72-row subset: 70
- Remaining blocked residue inside this subset: 2
- Remaining confirmed-ready rows: 0
- Untouched `DO_NOT_CANON`: 33
- Untouched `WAIT`: 418

The V2 confirmed subset is not fully exhausted because the 2-row Ogerpon residue remains blocked in review.

## Representative Promoted Examples

- Mela | 167/182 | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp
- Garganacl | 104/182 | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp
- Brambleghast | 021/162 | play_pokemon_stamp | sv05 | mapped | representative_shared_stamp
- Farigiraf ex | 108/162 | play_pokemon_stamp | sv05 | mapped | representative_shared_stamp
- Hero's Cape | 152/162 | play_pokemon_stamp | sv05 | mapped | representative_shared_stamp
- Skeledirge ex | 137/182 | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp
- Okidogi | 111/167 | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp
- Dodrio | 085/165 | play_pokemon_stamp | sv03.5 | mapped | representative_shared_stamp
- Techno Radar | 180/182 | play_pokemon_stamp | sv04 | mapped | representative_shared_stamp
- Claydol | 095/197 | play_pokemon_stamp | sv03 | mapped | representative_shared_stamp
- Flutter Mane | 078/162 | play_pokemon_stamp | sv05 | mapped | representative_shared_stamp
- Dragapult ex | 130/167 | play_pokemon_stamp | sv06 | mapped | representative_shared_stamp

## Recommended Next Execution Step

`STAMPED_BASE_REPAIR_V6`
