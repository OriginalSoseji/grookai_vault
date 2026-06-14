# PKG-17E Stamped Active Finish Web Evidence V1

Generated: 2026-06-12T21:09:12.610Z

Audit-only targeted evidence capture for stamped rows that now have an unstamped base parent but still need exact active child finish evidence.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| target_rows | 25 |
| evidence_rows | 22 |
| ready_for_guarded_dry_run | 10 |
| review_only_single_source_family | 1 |
| blocked_no_exact_active_finish_evidence | 14 |
| blocked_conflicting_finish_evidence | 0 |
| fingerprint_sha256 | `1e655ea689401abeb9be3805bb266b471be3adc758dd19f7c18befdc0a0a5714` |

## Status Counts

| status | rows |
| --- | --- |
| blocked_no_exact_active_finish_evidence | 14 |
| ready_for_guarded_dry_run | 10 |
| review_only_single_source_family | 1 |

## Ready For Guarded Dry-Run

| set | number | card | variant | finish | sources |
| --- | --- | --- | --- | --- | --- |
| sv03.5 | 4 | Charmander | eb_games_stamp | reverse | pokecardvalues, pricecharting |
| sv03.5 | 7 | Squirtle | pokemon_center_stamp | reverse | pokecardvalues, pricecharting, tcgplayer |
| sv03.5 | 132 | Ditto | prize_pack_stamp | holo | ebay, tcgplayer |
| sv03.5 | 151 | Mew ex | prize_pack_stamp | holo | pricecharting, tcgplayer |
| sv06.5 | 2 | Galvantula | prize_pack_stamp | cosmos | ebay, pricecharting |
| swsh12.5 | 36 | Kyogre | prize_pack_stamp | cosmos | pricecharting, tcgplayer |
| swsh12.5 | 131 | Friends in Sinnoh | professor_program_stamp | reverse | dextcg, pricecharting |
| swsh12.5 | 135 | Lost Vacuum | prize_pack_stamp | cosmos | ebay, pricecharting |
| swsh12.5 | 145 | Trekking Shoes | prize_pack_stamp | cosmos | ebay, pricecharting |
| swsh12.5 | 146 | Ultra Ball | prize_pack_stamp | cosmos | ebay, pricecharting |

## Review / Blocked Rows

| set | number | card | variant | status | evidence_count |
| --- | --- | --- | --- | --- | --- |
| sv03.5 | 1 | Bulbasaur |  | blocked_no_exact_active_finish_evidence | 0 |
| sv03.5 | 16 | Pidgey |  | blocked_no_exact_active_finish_evidence | 0 |
| sv03.5 | 100 | Voltorb | professor_program_stamp | review_only_single_source_family | 1 |
| sv03.5 | 133 | Eevee |  | blocked_no_exact_active_finish_evidence | 0 |
| sv06.5 | 38 | Fezandipiti ex |  | blocked_no_exact_active_finish_evidence | 0 |
| sv06.5 | 61 | Night Stretcher | prize_pack_stamp | blocked_no_exact_active_finish_evidence | 0 |
| swsh12.5 | 130 | Friends in Hisui |  | blocked_no_exact_active_finish_evidence | 0 |
| swsh12.5 | 143 | Sky Seal Stone | prize_pack_stamp | blocked_no_exact_active_finish_evidence | 0 |
| swsh3.5 | 7 | Victini | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | 0 |
| swsh3.5 | 18 | Hatenna |  | blocked_no_exact_active_finish_evidence | 0 |
| swsh3.5 | 35 | Galarian Zigzagoon | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | 0 |
| swsh3.5 | 36 | Galarian Linoone | battle_academy_deck_mark | blocked_no_exact_active_finish_evidence | 0 |
| swsh4.5 | 58 | Boss's Orders | prize_pack_stamp | blocked_no_exact_active_finish_evidence | 0 |
| swsh4.5 | 59 | Gym Trainer | professor_program_stamp | blocked_no_exact_active_finish_evidence | 0 |
| swsh4.5 | 60 | Professor's Research | prize_pack_stamp | blocked_no_exact_active_finish_evidence | 0 |

## Guardrail

This report is not an apply package. Ready rows still require a separate rollback-only guarded dry-run, fingerprint, and explicit approval before any real write.
