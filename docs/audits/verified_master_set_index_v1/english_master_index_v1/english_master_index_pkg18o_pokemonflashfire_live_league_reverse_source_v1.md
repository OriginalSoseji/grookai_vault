# PKG-18O PokemonFlashfire Live League Reverse Source V1

Audit-only fixture generation against the live residual stamped/special queue.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| source_rows_reviewed | 29 |
| live_residual_league_targets | 50 |
| fixture_records_written | 0 |
| manual_review_rows | 2 |
| skipped_source_rows | 27 |

## Fixture Records

| set | number | card | finish | source url |
| --- | --- | --- | --- | --- |

## Manual Review Rows

| set | number | card | target stamp | proposed finish | reason | source url |
| --- | --- | --- | --- | --- | --- | --- |
| pl3 | 5 | Garchomp | League Stamp | reverse | live_source_page_describes_national_championships_crosshatch_staff_context_not_plain_league_stamp | https://pokemonflashfire.com/product/garchomp-5147-2010-reverse-holo-pokemon-league-promo/ |
| hgss2 | 7 | Politoed | League Stamp | reverse | live_source_page_describes_national_championships_crosshatch_staff_context_not_plain_league_stamp | https://pokemonflashfire.com/product/politoed-795-reverse-holo-pokemon-league-promo/ |

## Skipped Source Rows

| set | number | card | reason |
| --- | --- | --- | --- |
| bw1 | 53 | Whirlipede | not_in_live_residual_league_active_finish_queue |
| bw1 | 79 | Watchog | not_in_live_residual_league_active_finish_queue |
| bw1 | 81 | Lillipup | not_in_live_residual_league_active_finish_queue |
| bw11 | 109 | Bianca | not_in_live_residual_league_active_finish_queue |
| bw2 | 82 | Unfezant | not_in_live_residual_league_active_finish_queue |
| bw3 | 32 | Cryogonal | not_in_live_residual_league_active_finish_queue |
| bw8 | 120 | Escape Rope | not_in_live_residual_league_active_finish_queue |
| hgss1 | 39 | Delibird | not_in_live_residual_league_active_finish_queue |
| pl1 | 104 | Broken Time-Space | not_in_live_residual_league_active_finish_queue |
| pl3 | 26 | Dusknoir FB | not_in_live_residual_league_active_finish_queue |
| pl4 | 32 | Spiritomb | not_in_live_residual_league_active_finish_queue |
| pl4 | 87 | Expert Belt | not_in_live_residual_league_active_finish_queue |
| xy8 | 101 | Flabébé | not_in_live_residual_league_active_finish_queue |
| xy8 | 102 | Floette | not_in_live_residual_league_active_finish_queue |
| pl2 | 89 | Bebe's Search | not_in_live_residual_league_active_finish_queue |
| pl2 | 98 | Volkner's Philosophy | not_in_live_residual_league_active_finish_queue |
| pl2 | 33 | Snorlax | not_in_live_residual_league_active_finish_queue |
| hgss2 | 21 | Poliwrath | not_in_live_residual_league_active_finish_queue |
| hgss2 | 82 | Rare Candy | not_in_live_residual_league_active_finish_queue |
| hgss1 | 97 | Pokémon Collector | not_in_live_residual_league_active_finish_queue |
| bw11 | 36 | Pokemon Catcher | not_in_live_residual_league_active_finish_queue |
| pl2 | 43 | Uxie | not_in_live_residual_league_active_finish_queue |
| pl2 | 97 | Underground Expedition | not_in_live_residual_league_active_finish_queue |
| pl2 | 102 | Upper Energy | not_in_live_residual_league_active_finish_queue |
| pl3 | 136 | Cynthia's Guidance | not_in_live_residual_league_active_finish_queue |
| pl3 | 56 | Dragonite FB | not_in_live_residual_league_active_finish_queue |
| dp6 | 125 | Roseanne's Research | not_in_live_residual_league_active_finish_queue |

This is not a DB write package. These records are source evidence that may feed a later guarded readiness pass.
