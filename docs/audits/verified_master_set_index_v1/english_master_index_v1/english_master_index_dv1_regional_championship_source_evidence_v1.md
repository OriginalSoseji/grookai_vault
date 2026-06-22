# DV1 Regional Championship Source Evidence V1

Audit-only evidence capture for the remaining Dragon Vault league-stamp queue rows.

## Summary

| metric | value |
| --- | --- |
| target_rows | 3 |
| source_agreed_taxonomy_blocked | 3 |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| fingerprint_sha256 | `ad89f65dbaa2e602c437557c1e4750c322521b94a8bc5c48c700544f672b6691` |

## Finding

The three remaining Dragon Vault rows are not generic `league_stamp` facts. External sources consistently point to Regional Championships crosshatch promo lanes. This is strong evidence for source acquisition, but not a DB write package until taxonomy is governed.

Required governance before write:

- Convert generic `league_stamp` queue rows to exact `regional_championships_stamp` where supported.
- Decide whether `crosshatch_holo` maps to an active finish key such as `reverse`, remains display metadata, or requires a future finish key.
- Keep Staff Regional Championships separate from non-Staff Regional Championships.

## Rows

| set | number | card | current variant | observed variant | finish family | status | sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dv1 | 6 | Bagon | league_stamp | regional_championships_stamp | crosshatch_holo | source_agreed_taxonomy_blocked | 4 |
| dv1 | 7 | Shelgon | league_stamp | regional_championships_stamp | crosshatch_holo | source_agreed_taxonomy_blocked | 6 |
| dv1 | 8 | Salamence | league_stamp | regional_championships_stamp | crosshatch_holo | source_agreed_taxonomy_blocked | 5 |

## Evidence

### dv1 6 Bagon

Status: source_agreed_taxonomy_blocked

Blocked reason: Sources support a Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.

| source | kind | label | url |
| --- | --- | --- | --- |
| tcgplayer | marketplace_checklist | TCGplayer product: Bagon - 6/20 (Regional Championships). | https://www.tcgplayer.com/product/232883/pokemon-league-and-championship-cards-bagon-6-20-regional-championships |
| pricecharting | marketplace_checklist | PriceCharting product: Bagon [Regional Championships] #6. | https://www.pricecharting.com/game/pokemon-dragon-vault/bagon-regional-championships-6 |
| cardtrader | marketplace_checklist | CardTrader product: Bagon Regional Championships Holo Promo 6/20. | https://www.cardtrader.com/en/cards/114410-bagon-regional-championships-holo-promo-6-20-league-promos |
| pokecardvalues | collector_reference | Poke Card Values related Dragon Vault Regional Championships/Staff page family. | https://pokecardvalues.co.uk/cards/bagon-6-20-reverse-holo-staff-regional-championships-dragon-vault/dv1-6-3-83/ |

### dv1 7 Shelgon

Status: source_agreed_taxonomy_blocked

Blocked reason: Sources support a Winter Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.

| source | kind | label | url |
| --- | --- | --- | --- |
| bulbapedia_card_page | human_readable_checklist | Bulbapedia card page notes a 2014 Winter Regional Championships participant print. | https://bulbapedia.bulbagarden.net/wiki/Shelgon_(Dragon_Vault_7) |
| bulbapedia_set_page | human_readable_checklist | Bulbapedia Dragon Vault set page lists Shelgon 7/20 Regional and Staff crosshatch promo rows. | https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG) |
| tcgplayer | marketplace_checklist | TCGplayer product: Shelgon - 7/20 (Regional Championships). | https://www.tcgplayer.com/product/251200/pokemon-league-and-championship-cards-shelgon-7-20-regional-championships |
| pricecharting | marketplace_checklist | PriceCharting product: Shelgon [Regional Championship] #7. | https://www.pricecharting.com/game/pokemon-dragon-vault/shelgon-regional-championship-7 |
| cardtrader | marketplace_checklist | CardTrader product: Shelgon Winter Regional Championships Holo Promo 007/020. | https://www.cardtrader.com/en/cards/114413-shelgon-winter-regional-championships-holo-promo-007-020-dragon-vault |
| pokecardvalues | collector_reference | Poke Card Values product: Shelgon 7/20 Regional Championships. | https://pokecardvalues.co.uk/cards/shelgon-7-20-reverse-holo-regional-championships-dragon-vault/dv1-7-3-60/ |

### dv1 8 Salamence

Status: source_agreed_taxonomy_blocked

Blocked reason: Sources support a Spring Regional Championships/crosshatch promo lane, not the current generic League Stamp lane. Active finish mapping must be governed before a write package.

| source | kind | label | url |
| --- | --- | --- | --- |
| bulbapedia_card_page | human_readable_checklist | Bulbapedia card page notes a Spring Regional Championships crosshatch print and separate Staff version. | https://bulbapedia.bulbagarden.net/wiki/Salamence_(Dragon_Vault_8) |
| bulbapedia_set_page | human_readable_checklist | Bulbapedia Dragon Vault set page lists Salamence 8/20 Regional and Staff crosshatch promo rows. | https://bulbapedia.bulbagarden.net/wiki/Dragon_Vault_(TCG) |
| tcgplayer | marketplace_checklist | TCGplayer product: Salamence - 8/20 (Regional Championships). | https://www.tcgplayer.com/product/227091/pokemon-league-and-championship-cards-salamence-8-20-regional-championships |
| pricecharting | marketplace_checklist | PriceCharting product: Salamence [Regional Championship] #8. | https://www.pricecharting.com/game/pokemon-dragon-vault/salamence-regional-championship-8 |
| pokecardvalues | collector_reference | Poke Card Values related Dragon Vault Regional Championships family includes Salamence 8/20 Regional Championships. | https://pokecardvalues.co.uk/cards/shelgon-7-20-reverse-holo-regional-championships-dragon-vault/dv1-7-3-60/ |
