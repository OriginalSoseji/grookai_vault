# PRIZE_PACK_EVIDENCE_SOURCE_UPGRADE_V1

Generated: 2026-04-21T17:45:58.209Z

## Scope

- Target only `WAIT_FOR_MORE_EVIDENCE` Prize Pack rows with a unique base route, a single confirmed series hit (`[1]` or `[2]`), and best evidence tier `TIER_3`.
- No canon writes, promotion, mapping, or image changes were attempted.

## Current Target

- target_rows = 19
- current_wait_pool = 251
- do_not_canon_total = 165
- already_promoted_total = 252

## Official Source Probe

### Series 1

- official_card_list_url = https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_1_web_cardlist_en.pdf
- local_json_path = `docs/checkpoints/warehouse/prize_pack_series_1_official.json`
- acquisition_status = ready
- note = Local official checklist JSON is available and usable.

### Series 2

- official_card_list_url = https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_2_web_cardlist_en.pdf
- local_json_path = `docs/checkpoints/warehouse/prize_pack_series_2_official.json`
- acquisition_status = ready
- note = Local official checklist JSON is available and usable.

## Result

- tier_upgraded = 19
- ready_for_warehouse = 19
- still_wait = 0

## Blocker

- blocker_class = NONE
- blocker_detail = no target rows remain blocked by the imported official checklist data
- smallest_bounded_followup = proceed with the generated ready batch candidate, then acquire the remaining missing official checklist JSON separately

## Target Rows


