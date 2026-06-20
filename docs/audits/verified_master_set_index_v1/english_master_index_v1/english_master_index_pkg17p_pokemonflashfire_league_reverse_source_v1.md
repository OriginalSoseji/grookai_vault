# PKG-17P PokemonFlashfire League Reverse Source V1

Audit-only fixture generation from manually reviewed PokemonFlashfire/DJS Pokemon Cards League reverse product and category pages.

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
| current_queue_matches | 18 |
| fixture_records_written | 18 |
| skipped_rows | 11 |

## Fixture Records

| set | number | name | finish | source url |
| --- | --- | --- | --- | --- |
| bw1 | 53 | Whirlipede | reverse | https://pokemonflashfire.com/product/whirlipede-53114-reverse-holo-pokemon-league-promo/ |
| bw1 | 79 | Watchog | reverse | https://pokemonflashfire.com/product/watchog-79114-reverse-holo-pokemon-league-promo/ |
| bw1 | 81 | Lillipup | reverse | https://pokemonflashfire.com/product/lillipup-81114-reverse-holo-pokemon-league-promo/ |
| bw11 | 109 | Bianca | reverse | https://pokemonflashfire.com/product/bianca-109113-reverse-holo-pokemon-league-promo/ |
| bw2 | 82 | Unfezant | reverse | https://pokemonflashfire.com/product/unfezant-8298-reverse-holo-pokemon-league-promo/ |
| bw3 | 32 | Cryogonal | reverse | https://pokemonflashfire.com/product/cryogonal-32101-reverse-holo-pokemon-league-promo/ |
| bw8 | 120 | Escape Rope | reverse | https://pokemonflashfire.com/product/escape-rope-120135-reverse-holo-pokemon-league-promo/ |
| hgss1 | 39 | Delibird | reverse | https://pokemonflashfire.com/product/delibird-39123-reverse-holo-pokemon-league-promo/ |
| pl1 | 104 | Broken Time-Space | reverse | https://pokemonflashfire.com/product/broken-time-space-104127-reverse-holo-pokemon-league-promo/ |
| pl3 | 26 | Dusknoir FB | reverse | https://pokemonflashfire.com/product/dusknoir-fb-26147-reverse-holo-pokemon-league-promo/ |
| pl4 | 32 | Spiritomb | reverse | https://pokemonflashfire.com/product/spiritomb-3299-reverse-holo-pokemon-league-promo/ |
| pl4 | 87 | Expert Belt | reverse | https://pokemonflashfire.com/product/expert-belt-8799-reverse-holo-pokemon-league-promo/ |
| xy8 | 101 | Flabébé | reverse | https://pokemonflashfire.com/product/flabebe-101162-reverse-holo-pokemon-league-promo/ |
| xy8 | 102 | Floette | reverse | https://pokemonflashfire.com/product/floette-102162-reverse-holo-pokemon-league-promo/ |
| pl3 | 5 | Garchomp | reverse | https://pokemonflashfire.com/product/garchomp-5147-2010-reverse-holo-pokemon-league-promo/ |
| hgss2 | 7 | Politoed | reverse | https://pokemonflashfire.com/product/politoed-795-reverse-holo-pokemon-league-promo/ |
| hgss2 | 82 | Rare Candy | reverse | https://pokemonflashfire.com/product/rare-candy-8295-reverse-holo-pokemon-league-promo/ |
| hgss1 | 97 | Pokémon Collector | reverse | https://pokemonflashfire.com/product/pokemon-collector-97123-reverse-holo-pokemon-league-promo/ |

## Skipped Rows

| set | number | name | reason |
| --- | --- | --- | --- |
| pl2 | 89 | Bebe's Search | not_in_current_pkg17a_active_finish_queue |
| pl2 | 98 | Volkner's Philosophy | not_in_current_pkg17a_active_finish_queue |
| pl2 | 33 | Snorlax | not_in_current_pkg17a_active_finish_queue |
| hgss2 | 21 | Poliwrath | not_in_current_pkg17a_active_finish_queue |
| bw11 | 36 | Pokemon Catcher | not_in_current_pkg17a_active_finish_queue |
| pl2 | 43 | Uxie | not_in_current_pkg17a_active_finish_queue |
| pl2 | 97 | Underground Expedition | not_in_current_pkg17a_active_finish_queue |
| pl2 | 102 | Upper Energy | not_in_current_pkg17a_active_finish_queue |
| pl3 | 136 | Cynthia's Guidance | not_in_current_pkg17a_active_finish_queue |
| pl3 | 56 | Dragonite FB | not_in_current_pkg17a_active_finish_queue |
| dp6 | 125 | Roseanne's Research | not_in_current_pkg17a_active_finish_queue |

## Source Handling

The fixture stores URL and label evidence only. It does not store page dumps. This lane is not a DB write package.
