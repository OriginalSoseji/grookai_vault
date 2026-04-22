# Prize Pack Evidence V3

Generated at: 2026-04-19T05:26:18.442Z

## Context

This pass recomputes the live Prize Pack wait pool after the earlier ready batches and evidence corroboration work, then investigates one bounded evidence slice only.

## Recomputed Live Backlog

- wait_for_more_evidence: 366
- do_not_canon_total: 80
- already_promoted_prize_pack_total: 222

## Target Slice

- slice_size: 40
- effective_set_code: swsh9
- effective_set_name: Brilliant Stars
- shared_question: For the 40 Brilliant Stars (swsh9) Prize Pack family-only rows with unique base routes and no current external series confirmation, do Prize Pack Series 1-8 card-list sources document each card in exactly one series, multiple series, or none?

## Evidence Sources Used

- Existing Prize Pack V2/V2-corroboration/inspection artifacts
- Bulbapedia Prize Pack Series One (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_One_(TCG))
- Bulbapedia Prize Pack Series Two (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Two_(TCG))
- Bulbapedia Prize Pack Series Three (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Three_(TCG))
- Bulbapedia Prize Pack Series Four (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG))
- Bulbapedia Prize Pack Series Five (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Five_(TCG))
- Bulbapedia Prize Pack Series Six (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Six_(TCG))
- Bulbapedia Prize Pack Series Seven (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Seven_(TCG))
- Bulbapedia Prize Pack Series Eight (https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Eight_(TCG))

## Reclassification Summary

- rows_investigated: 40
- moved_to_ready: 20
- moved_to_do_not_canon: 19
- still_wait: 1

## Matched Series Patterns

- [2,3]: 19
- [2]: 18
- [3]: 2
- []: 1

## Newly READY_FOR_WAREHOUSE

- Torterra | 008/172 | swsh9 | confirmed_series=2
- Shaymin V | 013/172 | swsh9 | confirmed_series=2
- Shaymin VSTAR | 014/172 | swsh9 | confirmed_series=2
- Charizard VSTAR | 018/172 | swsh9 | confirmed_series=2
- Eiscue | 044/172 | swsh9 | confirmed_series=2
- Raichu V | 045/172 | swsh9 | confirmed_series=3
- Pachirisu | 052/172 | swsh9 | confirmed_series=2
- Dusknoir | 062/172 | swsh9 | confirmed_series=2
- Whimsicott VSTAR | 065/172 | swsh9 | confirmed_series=2
- Lucario | 079/172 | swsh9 | confirmed_series=2
- Honchkrow V | 088/172 | swsh9 | confirmed_series=2
- Zamazenta V | 105/172 | swsh9 | confirmed_series=2

## Newly DO_NOT_CANON

- Grotle | 007/172 | swsh9 | confirmed_series=2, 3
- Moltres | 021/172 | swsh9 | confirmed_series=2, 3
- Entei V | 022/172 | swsh9 | confirmed_series=2, 3
- Lumineon V | 040/172 | swsh9 | confirmed_series=2, 3
- Manaphy | 041/172 | swsh9 | confirmed_series=2, 3
- Raikou V | 048/172 | swsh9 | confirmed_series=2, 3
- Liepard | 091/172 | swsh9 | confirmed_series=2, 3
- Bibarel | 121/172 | swsh9 | confirmed_series=2, 3
- Arceus V | 122/172 | swsh9 | confirmed_series=2, 3
- Arceus VSTAR | 123/172 | swsh9 | confirmed_series=2, 3
- Tornadus | 126/172 | swsh9 | confirmed_series=2, 3
- Boss's Orders | 132/172 | swsh9 | confirmed_series=2, 3

## Still WAIT

- Whimsicott V | 160/172 | swsh9 | reason=no_series_match_after_v3_series_page_coverage

## Remaining Prize Pack Wait Pool

- remaining_wait_after_v3: 327
- BASE_ROUTE_AMBIGUOUS: 38
- NO_SERIES_CONFIRMATION: 288
- STILL_UNPROVEN_AFTER_V3_TARGET_SLICE: 1

## Newly Unlocked Executable Subset

- prize_pack_ready_batch_v4_candidate_rows: 20

## Recommended Next Step

- PRIZE_PACK_READY_BATCH_V4

