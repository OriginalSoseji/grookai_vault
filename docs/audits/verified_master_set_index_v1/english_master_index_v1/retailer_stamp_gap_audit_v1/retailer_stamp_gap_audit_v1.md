# Retailer Stamp Gap Audit V1

Generated: 2026-06-17T05:55:09.516Z

Audit-only. No DB writes, migrations, cleanup, quarantine, or apply actions were performed.

## Summary

- Total retailer stamp candidates: 19
- Build-A-Bear Workshop candidates: 10
- Toys R Us candidates: 9
- Fingerprint: 8944e186ca750b320d2f7359224a58a61f2e04abedbc84e3cbe1d8027c8993d5

## Classification Counts

- already_in_db: 14
- master_index_legacy_stamped_finish_requires_active_finish: 2
- needs_active_finish_route_from_bulbapedia: 3

## Candidate Rows

| set | number | card | stamp | classification | evidence |
| --- | --- | --- | --- | --- | --- |
| bw10 | 14 | Squirtle | Build-A-Bear Workshop Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-plasma-blast/squirtle-build-a-bear-14 |
| bw11 | 17 | Charmander | Build-A-Bear Workshop Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-legendary-treasures/charmander-build-a-bear-17 |
| bw5 | 1 | Bulbasaur | Build-A-Bear Workshop Stamp | already_in_db | https://bulbapedia.bulbagarden.net/wiki/Bulbasaur_(Dark_Explorers_1)<br>https://www.thepricedex.com/set/bw5/dark-explorers/price-list<br>https://www.pricecharting.com/game/pokemon-dark-explorers/bulbasaur-build-a-bear-1 |
| sm1 | 28 | Psyduck | Build-A-Bear Workshop Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-sun-and-moon/psyduck-build-a-bear-28<br>https://www.thepricedex.com/set/sm1/sun-and-moon/price-list |
| sm1 | 90 | Snubbull | Build-A-Bear Workshop Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-promo/snubbull-build-a-bear-90<br>https://www.thepricedex.com/set/sm1/sun-and-moon/price-list |
| sm4 | 71 | Jigglypuff | Build-A-Bear Workshop Stamp | already_in_db | https://bulbapedia.bulbagarden.net/wiki/Jigglypuff_(Crimson_Invasion_71)<br>https://www.thepricedex.com/set/sm4/crimson-invasion/price-list<br>https://www.pricecharting.com/game/pokemon-crimson-invasion/jigglypuff-build-a-bear-71 |
| xy2 | 80 | Snorlax | Build-A-Bear Workshop Stamp | master_index_legacy_stamped_finish_requires_active_finish | https://www.pricecharting.com/game/pokemon-flashfire/snorlax-build-a-bear-80<br>https://www.thepricedex.com/set/xy2/flashfire/price-list |
| xy5 | 20 | Vulpix | Build-A-Bear Workshop Stamp | needs_active_finish_route_from_bulbapedia | https://bulbapedia.bulbagarden.net/wiki/Vulpix_(Primal_Clash_20)<br>https://www.thepricedex.com/set/xy5/primal-clash/price-list<br>https://www.pricecharting.com/game/pokemon-primal-clash/vulpix-build-a-bear-20 |
| xy6 | 67 | Meowth | Build-A-Bear Workshop Stamp | needs_active_finish_route_from_bulbapedia | https://bulbapedia.bulbagarden.net/wiki/Meowth_(Roaring_Skies_67)<br>https://www.thepricedex.com/set/xy6/roaring-skies/price-list<br>https://www.pricecharting.com/game/pokemon-roaring-skies/meowth-build-a-bear-67 |
| xy7 | 63 | Eevee | Build-A-Bear Workshop Stamp | needs_active_finish_route_from_bulbapedia | https://bulbapedia.bulbagarden.net/wiki/Eevee_(Ancient_Origins_63)<br>https://www.thepricedex.com/set/xy7/ancient-origins/price-list |
| g1 | 22 | Magikarp | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/magikarp-toys-r-us-22<br>https://www.thepricedex.com/set/g1/generations/price-list |
| g1 | 26 | Pikachu | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/pikachu-toys-r-us-26 |
| g1 | 32 | Slowpoke | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/slowpoke-toys-r-us-32<br>https://www.thepricedex.com/set/g1/generations/price-list |
| g1 | 50 | Clefairy | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/clefairy-toys-r-us-50 |
| g1 | 53 | Meowth | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/meowth-toys-r-us-53 |
| g1 | 8 | Tangela | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-generations/tangela-toys-r-us-8 |
| sm1 | 64 | Cosmog | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-sun-and-moon/cosmog-toys-r-us-promo-64 |
| sm3 | 110 | Stufful | Toys R Us Stamp | already_in_db | https://www.pricecharting.com/game/pokemon-burning-shadows/stufful-toys-r-us-110 |
| xy12 | 41 | Electabuzz | Toys R Us Stamp | master_index_legacy_stamped_finish_requires_active_finish | https://www.pricecharting.com/game/pokemon-evolutions/electabuzz-toys-r-us-41<br>https://www.thepricedex.com/set/xy12/evolutions/price-list |

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
