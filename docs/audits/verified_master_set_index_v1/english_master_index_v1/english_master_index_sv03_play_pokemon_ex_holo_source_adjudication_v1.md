# SV03 Play Pokemon ex Holo Source Adjudication V1

Generated: 2026-06-12T19:26:40.280Z

Audit-only source adjudication for remaining SV03 Play Pokemon stamped ex rows. No database writes, migrations, cleanup, quarantine, or apply SQL were performed.

## Summary

| metric | value |
| --- | --- |
| target_rows | 2 |
| accepted_rows | 2 |
| blocked_rows | 0 |
| write_ready_now | 0 |
| fingerprint_sha256 | `70b4789bd1fd340131545ee4a1cbff1c3cc4bce7b6798aa8c721eb071115a974` |

## Rows

| number | card | variant | finish | status | exact_finish_sources | exact_stamp_sources | blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | play_pokemon_stamp | holo | accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run | 3 | 3 | none |
| 66 | Tyranitar ex | play_pokemon_stamp | holo | accepted_exact_holo_play_pokemon_stamp_ready_for_child_insert_dry_run | 3 | 3 | none |

## Evidence

### Toedscruel ex 22/197

| source | kind | type | finish | label | url |
| --- | --- | --- | --- | --- | --- |
| pokumon | collector_reference | finish_presence | holo | Holofoil Play Pokemon Toedscruel ex (022/197 Play Pokemon Prize Pack Series 4 Special Print) | https://pokumon.com/card/holofoil-play-pokemon-toedscruel-ex-022-197-play-pokemon-prize-pack-series-4-special-print/ |
| tcgplayer_product | marketplace_checklist | finish_presence | holo | Toedscruel ex - Prize Pack Series Cards / 022/197 / Double Rare / Holofoil | https://www.tcgplayer.com/product/538743/pokemon-prize-pack-series-cards-toedscruel-ex |
| bulbapedia_obsidian_flames_additional_cards | human_readable_checklist | checklist_entry |  | Toedscruel ex 22/197 listed as "Play! Pokemon" Stamp Play! Pokemon Prize Pack Series Four exclusive in Obsidian Flames additional cards. | https://bulbapedia.bulbagarden.net/wiki/Obsidian_Flames_(TCG) |
| tcgcollector_prize_pack_series_four | collector_reference | checklist_entry |  | Toedscruel ex (Obsidian Flames 22/197) appears in Play! Pokemon Prize Pack Series Four checklist. | https://www.tcgcollector.com/sets/1220/play-pokemon-prize-pack-series-four |
| ebay_product_catalog | marketplace_checklist | finish_presence | holo | Toedscruel ex - Prize Pack Series Cards / 022/197 / Double Rare / Holofoil | https://www.ebay.com/p/19067890392 |

### Tyranitar ex 66/197

| source | kind | type | finish | label | url |
| --- | --- | --- | --- | --- | --- |
| pokumon | collector_reference | finish_presence | holo | Holofoil Play Pokemon Tyranitar ex (066/197 Play Pokemon Prize Pack Series 4 Special Print) | https://pokumon.com/card/holofoil-play-pokemon-tyranitar-ex-066-197-play-pokemon-prize-pack-series-4-special-print/ |
| tcgplayer_product | marketplace_checklist | finish_presence | holo | Tyranitar ex - Prize Pack Series Cards / 066/197 / Double Rare / Holofoil | https://www.tcgplayer.com/product/538744/pokemon-prize-pack-series-cards-tyranitar-ex |
| bulbapedia_obsidian_flames_additional_cards | human_readable_checklist | checklist_entry |  | Tyranitar ex 66/197 listed as "Play! Pokemon" Stamp Play! Pokemon Prize Pack Series Four exclusive in Obsidian Flames additional cards. | https://bulbapedia.bulbagarden.net/wiki/Obsidian_Flames_(TCG) |
| tcgcollector_prize_pack_series_four | collector_reference | checklist_entry |  | Tyranitar ex (Obsidian Flames 66/197) appears in Play! Pokemon Prize Pack Series Four checklist. | https://www.tcgcollector.com/sets/1220/play-pokemon-prize-pack-series-four |
| ebay_product_catalog | marketplace_checklist | finish_presence | holo | Tyranitar ex - Prize Pack Series Cards / 066/197 / Double Rare / Holofoil | https://www.ebay.com/p/7067898600 |

## Boundary

This report only upgrades source adjudication. Child insertion still requires a separate guarded rollback dry-run, real-apply gate, and explicit package approval.

