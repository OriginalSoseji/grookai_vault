# Image Truth Missing-Display Source Packet V1

Generated: 2026-06-23T03:22:01.055Z

Status: audit only. No DB writes. No migrations.

## Guardrails

- image_scope: english_physical only
- target_table: card_printings
- parent_overwrite_allowed: false
- source_url_required: true
- image_confidence_allowed: exact, representative, or missing_variant_visual
- guessed_confidence_allowed: false
- dry_run_required_before_db_write: true

## Summary

- source fixture records loaded: 77028
- full English physical missing-display rows: 119
- target rows reviewed: 119
- exact-required target rows: 5
- display-only target rows: 114
- source URL preserved: 118
- source URL still needed: 1
- dry-run ready rows: 0

## Rows

| set | queue | card | number | finish | source status | image confidence | dry run ready | source url | printing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mep | exact_required_missing_display | Serperior | 064 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/serperior-holo-64 | GV-PK-MEP-064-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Barbaracle | 065 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/barbaracle-holo-65 | GV-PK-MEP-065-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Tyrantrum | 066 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/tyrantrum-holo-66 | GV-PK-MEP-066-STAFF-STAMP-HOLO |
| mep | exact_required_missing_display | Doublade | 067 | holo | source_url_preserved | representative | false | https://www.pricecharting.com/game/pokemon-promo/doublade-holo-67 | GV-PK-MEP-067-STAFF-STAMP-HOLO |
| misc | exact_required_missing_display | Ancient Mew | 1 | cosmos | source_url_needed | blocked_no_source | false | - | GV-PK-MISC-001-COSMOS |
| tk-bw-e | display_only_missing_display | Lillipup | 1 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7290/lillipup-bw-trainer-kit-excadrill-1-30 | GV-PK-TK-tk-bw-e-1-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 10 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7299/fighting-energy-bw-trainer-kit-excadrill-10-30 | GV-PK-TK-tk-bw-e-10-STD |
| tk-bw-e | display_only_missing_display | Timburr | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7300/timburr-bw-trainer-kit-excadrill-11-30 | GV-PK-TK-tk-bw-e-11-STD |
| tk-bw-e | display_only_missing_display | Audino | 12 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7301/audino-bw-trainer-kit-excadrill-12-30 | GV-PK-TK-tk-bw-e-12-STD |
| tk-bw-e | display_only_missing_display | Drilbur | 13 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7302/drilbur-bw-trainer-kit-excadrill-13-30 | GV-PK-TK-tk-bw-e-13-STD |
| tk-bw-e | display_only_missing_display | Gurdurr | 14 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7303/gurdurr-bw-trainer-kit-excadrill-14-30 | GV-PK-TK-tk-bw-e-14-STD |
| tk-bw-e | display_only_missing_display | Potion | 15 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7304/potion-bw-trainer-kit-excadrill-15-30 | GV-PK-TK-tk-bw-e-15-STD |
| tk-bw-e | display_only_missing_display | PlusPower | 16 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7305/pluspower-bw-trainer-kit-excadrill-16-30 | GV-PK-TK-tk-bw-e-16-STD |
| tk-bw-e | display_only_missing_display | Excadrill | 17 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7306/excadrill-bw-trainer-kit-excadrill-17-30 | GV-PK-TK-tk-bw-e-17-STD |
| tk-bw-e | display_only_missing_display | Audino | 18 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7307/audino-bw-trainer-kit-excadrill-18-30 | GV-PK-TK-tk-bw-e-18-STD |
| tk-bw-e | display_only_missing_display | Herdier | 19 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7308/herdier-bw-trainer-kit-excadrill-19-30 | GV-PK-TK-tk-bw-e-19-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 2 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7291/fighting-energy-bw-trainer-kit-excadrill-2-30 | GV-PK-TK-tk-bw-e-2-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 20 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7309/fighting-energy-bw-trainer-kit-excadrill-20-30 | GV-PK-TK-tk-bw-e-20-STD |
| tk-bw-e | display_only_missing_display | Energy Search | 21 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7310/energy-search-bw-trainer-kit-excadrill-21-30 | GV-PK-TK-tk-bw-e-21-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 22 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7311/fighting-energy-bw-trainer-kit-excadrill-22-30 | GV-PK-TK-tk-bw-e-22-STD |
| tk-bw-e | display_only_missing_display | Potion | 23 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7312/potion-bw-trainer-kit-excadrill-23-30 | GV-PK-TK-tk-bw-e-23-STD |
| tk-bw-e | display_only_missing_display | Pokémon Communication | 24 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7313/pokemon-communication-bw-trainer-kit-excadrill-24-30 | GV-PK-TK-tk-bw-e-24-STD |
| tk-bw-e | display_only_missing_display | Drilbur | 25 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7314/drilbur-bw-trainer-kit-excadrill-25-30 | GV-PK-TK-tk-bw-e-25-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 26 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7315/fighting-energy-bw-trainer-kit-excadrill-26-30 | GV-PK-TK-tk-bw-e-26-STD |
| tk-bw-e | display_only_missing_display | Lillipup | 27 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7316/lillipup-bw-trainer-kit-excadrill-27-30 | GV-PK-TK-tk-bw-e-27-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 28 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7317/fighting-energy-bw-trainer-kit-excadrill-28-30 | GV-PK-TK-tk-bw-e-28-STD |
| tk-bw-e | display_only_missing_display | Timburr | 29 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7318/timburr-bw-trainer-kit-excadrill-29-30 | GV-PK-TK-tk-bw-e-29-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 3 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7292/fighting-energy-bw-trainer-kit-excadrill-3-30 | GV-PK-TK-tk-bw-e-3-STD |
| tk-bw-e | display_only_missing_display | Energy Switch | 4 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7293/energy-switch-bw-trainer-kit-excadrill-4-30 | GV-PK-TK-tk-bw-e-4-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 5 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7294/fighting-energy-bw-trainer-kit-excadrill-5-30 | GV-PK-TK-tk-bw-e-5-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 6 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7295/fighting-energy-bw-trainer-kit-excadrill-6-30 | GV-PK-TK-tk-bw-e-6-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 7 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7296/fighting-energy-bw-trainer-kit-excadrill-7-30 | GV-PK-TK-tk-bw-e-7-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 8 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7297/fighting-energy-bw-trainer-kit-excadrill-8-30 | GV-PK-TK-tk-bw-e-8-STD |
| tk-bw-e | display_only_missing_display | Fighting Energy | 9 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7298/fighting-energy-bw-trainer-kit-excadrill-9-30 | GV-PK-TK-tk-bw-e-9-STD |
| tk-bw-z | display_only_missing_display | Purrloin | 1 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7320/purrloin-bw-trainer-kit-zoroark-1-30 | GV-PK-TK-tk-bw-z-1-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 10 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7329/darkness-energy-bw-trainer-kit-zoroark-10-30 | GV-PK-TK-tk-bw-z-10-STD |
| tk-bw-z | display_only_missing_display | PlusPower | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7330/pluspower-bw-trainer-kit-zoroark-11-30 | GV-PK-TK-tk-bw-z-11-STD |
| tk-bw-z | display_only_missing_display | Patrat | 12 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7331/patrat-bw-trainer-kit-zoroark-12-30 | GV-PK-TK-tk-bw-z-12-STD |
| tk-bw-z | display_only_missing_display | Zorua | 13 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7332/zorua-bw-trainer-kit-zoroark-13-30 | GV-PK-TK-tk-bw-z-13-STD |
| tk-bw-z | display_only_missing_display | Pidove | 14 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7333/pidove-bw-trainer-kit-zoroark-14-30 | GV-PK-TK-tk-bw-z-14-STD |
| tk-bw-z | display_only_missing_display | Tranquill | 15 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7334/tranquill-bw-trainer-kit-zoroark-15-30 | GV-PK-TK-tk-bw-z-15-STD |
| tk-bw-z | display_only_missing_display | Energy Retrieval | 16 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7335/energy-retrieval-bw-trainer-kit-zoroark-16-30 | GV-PK-TK-tk-bw-z-16-STD |
| tk-bw-z | display_only_missing_display | Zoroark | 17 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7336/zoroark-bw-trainer-kit-zoroark-17-30 | GV-PK-TK-tk-bw-z-17-STD |
| tk-bw-z | display_only_missing_display | Pokémon Communication | 18 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7337/pokemon-communication-bw-trainer-kit-zoroark-18-30 | GV-PK-TK-tk-bw-z-18-STD |
| tk-bw-z | display_only_missing_display | Minccino | 19 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7338/minccino-bw-trainer-kit-zoroark-19-30 | GV-PK-TK-tk-bw-z-19-STD |
| tk-bw-z | display_only_missing_display | Watchog | 2 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7321/watchog-bw-trainer-kit-zoroark-2-30 | GV-PK-TK-tk-bw-z-2-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 20 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7339/darkness-energy-bw-trainer-kit-zoroark-20-30 | GV-PK-TK-tk-bw-z-20-STD |
| tk-bw-z | display_only_missing_display | Pidove | 21 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7340/pidove-bw-trainer-kit-zoroark-21-30 | GV-PK-TK-tk-bw-z-21-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 22 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7341/darkness-energy-bw-trainer-kit-zoroark-22-30 | GV-PK-TK-tk-bw-z-22-STD |
| tk-bw-z | display_only_missing_display | Zorua | 23 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7342/zorua-bw-trainer-kit-zoroark-23-30 | GV-PK-TK-tk-bw-z-23-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 24 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7343/darkness-energy-bw-trainer-kit-zoroark-24-30 | GV-PK-TK-tk-bw-z-24-STD |
| tk-bw-z | display_only_missing_display | Purrloin | 25 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7344/purrloin-bw-trainer-kit-zoroark-25-30 | GV-PK-TK-tk-bw-z-25-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 26 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7345/darkness-energy-bw-trainer-kit-zoroark-26-30 | GV-PK-TK-tk-bw-z-26-STD |
| tk-bw-z | display_only_missing_display | Energy Search | 27 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7346/energy-search-bw-trainer-kit-zoroark-27-30 | GV-PK-TK-tk-bw-z-27-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 28 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7347/darkness-energy-bw-trainer-kit-zoroark-28-30 | GV-PK-TK-tk-bw-z-28-STD |
| tk-bw-z | display_only_missing_display | Patrat | 29 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7348/patrat-bw-trainer-kit-zoroark-29-30 | GV-PK-TK-tk-bw-z-29-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 3 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7322/darkness-energy-bw-trainer-kit-zoroark-3-30 | GV-PK-TK-tk-bw-z-3-STD |
| tk-bw-z | display_only_missing_display | Minccino | 4 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7323/minccino-bw-trainer-kit-zoroark-4-30 | GV-PK-TK-tk-bw-z-4-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 5 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7324/darkness-energy-bw-trainer-kit-zoroark-5-30 | GV-PK-TK-tk-bw-z-5-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 6 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7325/darkness-energy-bw-trainer-kit-zoroark-6-30 | GV-PK-TK-tk-bw-z-6-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 7 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7326/darkness-energy-bw-trainer-kit-zoroark-7-30 | GV-PK-TK-tk-bw-z-7-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 8 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7327/darkness-energy-bw-trainer-kit-zoroark-8-30 | GV-PK-TK-tk-bw-z-8-STD |
| tk-bw-z | display_only_missing_display | Darkness Energy | 9 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/7328/darkness-energy-bw-trainer-kit-zoroark-9-30 | GV-PK-TK-tk-bw-z-9-STD |
| tk-dp-l | display_only_missing_display | Geodude | 1 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3961/geodude-dp-trainer-kit-lucario-1-11 | GV-PK-TK-tk-dp-l-1-STD |
| tk-dp-l | display_only_missing_display | Quick Ball | 10 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3970/quick-ball-dp-trainer-kit-lucario-10-11 | GV-PK-TK-tk-dp-l-10-STD |
| tk-dp-l | display_only_missing_display | Fighting Energy | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3971/fighting-energy-dp-trainer-kit-lucario-11-11 | GV-PK-TK-tk-dp-l-11-STD |
| tk-dp-l | display_only_missing_display | Graveler | 2 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3962/graveler-dp-trainer-kit-lucario-2-11 | GV-PK-TK-tk-dp-l-2-STD |
| tk-dp-l | display_only_missing_display | Machoke | 4 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3964/machoke-dp-trainer-kit-lucario-4-11 | GV-PK-TK-tk-dp-l-4-STD |
| tk-dp-l | display_only_missing_display | Machop | 5 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3965/machop-dp-trainer-kit-lucario-5-11 | GV-PK-TK-tk-dp-l-5-STD |
| tk-dp-l | display_only_missing_display | Riolu | 6 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3966/riolu-dp-trainer-kit-lucario-6-11 | GV-PK-TK-tk-dp-l-6-STD |
| tk-dp-l | display_only_missing_display | Starly | 7 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3967/starly-dp-trainer-kit-lucario-7-11 | GV-PK-TK-tk-dp-l-7-STD |
| tk-dp-l | display_only_missing_display | Energy Search | 8 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3968/energy-search-dp-trainer-kit-lucario-8-11 | GV-PK-TK-tk-dp-l-8-STD |
| tk-dp-l | display_only_missing_display | Potion | 9 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3969/potion-dp-trainer-kit-lucario-9-11 | GV-PK-TK-tk-dp-l-9-STD |
| tk-dp-m | display_only_missing_display | Buizel | 1 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3949/buizel-dp-trainer-kit-manaphy-1-12 | GV-PK-TK-tk-dp-m-1-STD |
| tk-dp-m | display_only_missing_display | Energy Search | 10 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3958/energy-search-dp-trainer-kit-manaphy-10-12 | GV-PK-TK-tk-dp-m-10-STD |
| tk-dp-m | display_only_missing_display | Potion | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3959/potion-dp-trainer-kit-manaphy-11-12 | GV-PK-TK-tk-dp-m-11-STD |
| tk-dp-m | display_only_missing_display | Water Energy | 12 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3960/water-energy-dp-trainer-kit-manaphy-12-12 | GV-PK-TK-tk-dp-m-12-STD |
| tk-dp-m | display_only_missing_display | Floatzel | 2 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3950/floatzel-dp-trainer-kit-manaphy-2-12 | GV-PK-TK-tk-dp-m-2-STD |
| tk-dp-m | display_only_missing_display | Goldeen | 3 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3951/goldeen-dp-trainer-kit-manaphy-3-12 | GV-PK-TK-tk-dp-m-3-STD |
| tk-dp-m | display_only_missing_display | Piplup | 5 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3953/piplup-dp-trainer-kit-manaphy-5-12 | GV-PK-TK-tk-dp-m-5-STD |
| tk-dp-m | display_only_missing_display | Prinplup | 6 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3954/prinplup-dp-trainer-kit-manaphy-6-12 | GV-PK-TK-tk-dp-m-6-STD |
| tk-dp-m | display_only_missing_display | Seaking | 7 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3955/seaking-dp-trainer-kit-manaphy-7-12 | GV-PK-TK-tk-dp-m-7-STD |
| tk-dp-m | display_only_missing_display | Totodile | 8 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3956/totodile-dp-trainer-kit-manaphy-8-12 | GV-PK-TK-tk-dp-m-8-STD |
| tk-dp-m | display_only_missing_display | Dusk Ball | 9 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/3957/dusk-ball-dp-trainer-kit-manaphy-9-12 | GV-PK-TK-tk-dp-m-9-STD |
| tk-sm-l | display_only_missing_display | Caterpie | 1 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13459/caterpie-sm-trainer-kit-lycanroc-1-30 | GV-PK-TK-tk-sm-l-1-STD |
| tk-sm-l | display_only_missing_display | Fletchling | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13461/fletchling-sm-trainer-kit-lycanroc-11-30 | GV-PK-TK-tk-sm-l-11-STD |
| tk-sm-l | display_only_missing_display | Yungoos | 12 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13462/yungoos-sm-trainer-kit-lycanroc-12-30 | GV-PK-TK-tk-sm-l-12-STD |
| tk-sm-l | display_only_missing_display | Fletchinder | 13 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13463/fletchinder-sm-trainer-kit-lycanroc-13-30 | GV-PK-TK-tk-sm-l-13-STD |
| tk-sm-l | display_only_missing_display | Rockruff | 14 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13464/rockruff-sm-trainer-kit-lycanroc-14-30 | GV-PK-TK-tk-sm-l-14-STD |
| tk-sm-l | display_only_missing_display | Pikipek | 15 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13465/pikipek-sm-trainer-kit-lycanroc-15-30 | GV-PK-TK-tk-sm-l-15-STD |
| tk-sm-l | display_only_missing_display | Lycanroc | 16 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13352/lycanroc-sm-trainer-kit-lycanroc-16-30 | GV-PK-TK-tk-sm-l-16-STD |
| tk-sm-l | display_only_missing_display | Makuhita | 18 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13466/makuhita-sm-trainer-kit-lycanroc-18-30 | GV-PK-TK-tk-sm-l-18-STD |
| tk-sm-l | display_only_missing_display | Hau | 19 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13482/hau-sm-trainer-kit-lycanroc-19-30 | GV-PK-TK-tk-sm-l-19-STD |
| tk-sm-l | display_only_missing_display | Great Ball | 21 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13484/great-ball-sm-trainer-kit-lycanroc-21-30 | GV-PK-TK-tk-sm-l-21-STD |
| tk-sm-l | display_only_missing_display | Toucannon | 22 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13467/toucannon-sm-trainer-kit-lycanroc-22-30 | GV-PK-TK-tk-sm-l-22-STD |
| tk-sm-l | display_only_missing_display | Hau | 23 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13483/hau-sm-trainer-kit-lycanroc-23-30 | GV-PK-TK-tk-sm-l-23-STD |
| tk-sm-l | display_only_missing_display | Great Ball | 25 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13485/great-ball-sm-trainer-kit-lycanroc-25-30 | GV-PK-TK-tk-sm-l-25-STD |
| tk-sm-l | display_only_missing_display | Big Malasada | 27 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13486/big-malasada-sm-trainer-kit-lycanroc-27-30 | GV-PK-TK-tk-sm-l-27-STD |
| tk-sm-l | display_only_missing_display | Rockruff | 29 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13468/rockruff-sm-trainer-kit-lycanroc-29-30 | GV-PK-TK-tk-sm-l-29-STD |
| tk-sm-l | display_only_missing_display | Trumbeak | 4 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13460/trumbeak-sm-trainer-kit-lycanroc-4-30 | GV-PK-TK-tk-sm-l-4-STD |
| tk-sm-l | display_only_missing_display | Fighting Energy | 5 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13471/fighting-energy-sm-trainer-kit-lycanroc-5-30 | GV-PK-TK-tk-sm-l-5-STD |
| tk-sm-r | display_only_missing_display | Zubat | 11 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11824/zubat-sm-trainer-kit-alolan-raichu-11-30 | GV-PK-TK-tk-sm-r-11-STD |
| tk-sm-r | display_only_missing_display | Spearow | 13 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11828/spearow-sm-trainer-kit-alolan-raichu-13-30 | GV-PK-TK-tk-sm-r-13-STD |
| tk-sm-r | display_only_missing_display | Pikachu | 14 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11819/pikachu-sm-trainer-kit-alolan-raichu-14-30 | GV-PK-TK-tk-sm-r-14-STD |
| tk-sm-r | display_only_missing_display | Potion | 15 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13450/potion-sm-trainer-kit-alolan-raichu-15-30 | GV-PK-TK-tk-sm-r-15-STD |
| tk-sm-r | display_only_missing_display | Grubbin | 16 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11826/grubbin-sm-trainer-kit-alolan-raichu-16-30 | GV-PK-TK-tk-sm-r-16-STD |
| tk-sm-r | display_only_missing_display | Alolan Raichu | 17 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11817/alolan-raichu-sm-trainer-kit-alolan-raichu-17-30 | GV-PK-TK-tk-sm-r-17-STD |
| tk-sm-r | display_only_missing_display | Bewear | 18 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13440/bewear-sm-trainer-kit-alolan-raichu-18-30 | GV-PK-TK-tk-sm-r-18-STD |
| tk-sm-r | display_only_missing_display | Hau | 19 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13451/hau-sm-trainer-kit-alolan-raichu-19-30 | GV-PK-TK-tk-sm-r-19-STD |
| tk-sm-r | display_only_missing_display | Lightning Energy | 2 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13443/lightning-energy-sm-trainer-kit-alolan-raichu-2-30 | GV-PK-TK-tk-sm-r-2-STD |
| tk-sm-r | display_only_missing_display | Psychic Energy | 20 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13452/psychic-energy-sm-trainer-kit-alolan-raichu-20-30 | GV-PK-TK-tk-sm-r-20-STD |
| tk-sm-r | display_only_missing_display | Great Ball | 21 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13458/great-ball-sm-trainer-kit-alolan-raichu-21-30 | GV-PK-TK-tk-sm-r-21-STD |
| tk-sm-r | display_only_missing_display | Drowzee | 22 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13439/drowzee-sm-trainer-kit-alolan-raichu-22-30 | GV-PK-TK-tk-sm-r-22-STD |
| tk-sm-r | display_only_missing_display | Hau | 23 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13456/hau-sm-trainer-kit-alolan-raichu-23-30 | GV-PK-TK-tk-sm-r-23-STD |
| tk-sm-r | display_only_missing_display | Great Ball | 25 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13457/great-ball-sm-trainer-kit-alolan-raichu-25-30 | GV-PK-TK-tk-sm-r-25-STD |
| tk-sm-r | display_only_missing_display | Togedemaru | 26 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11825/togedemaru-sm-trainer-kit-alolan-raichu-26-30 | GV-PK-TK-tk-sm-r-26-STD |
| tk-sm-r | display_only_missing_display | Pikachu | 29 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11818/pikachu-sm-trainer-kit-alolan-raichu-29-30 | GV-PK-TK-tk-sm-r-29-STD |
| tk-sm-r | display_only_missing_display | Stufful | 4 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/11827/stufful-sm-trainer-kit-alolan-raichu-4-30 | GV-PK-TK-tk-sm-r-4-STD |
| tk-sm-r | display_only_missing_display | Golbat | 6 | normal | source_url_preserved | representative | false | https://www.tcgcollector.com/cards/13441/golbat-sm-trainer-kit-alolan-raichu-6-30 | GV-PK-TK-tk-sm-r-6-STD |
