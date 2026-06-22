# Collexy BW Holofoil Source Acquisition V1

Generated: 2026-06-22T17:39:59.420Z

Audit-only. No DB writes, no migrations, no apply.

This pass checks the current stamped/special source-acquisition packet against Collexy's Black & White holofoil overview. Collexy can provide card-level finish context for some League / Play Pokemon / Player Rewards variants, but this report does not promote rows automatically.

## Summary

| metric | value |
| --- | --- |
| target_rows | 171 |
| source_sentences | 57 |
| matched_rows | 17 |
| candidate_records | 17 |
| promotable_rows | 0 |
| fingerprint_sha256 | `36a27c9521ce56c9c497f74fef4f46d2e59e2d7a13b6f5f9b2567a7b8b70d4e3` |

## By Classification

| classification | count |
| --- | --- |
| finish_bound_card_match_variant_mismatch | 8 |
| finish_bound_variant_synonym_review | 7 |
| finish_bound_league_family_synonym_review | 2 |

## Candidate Records

| set | number | card | stamp/variant | finish | classification | evidence label |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 8 | Karrablast | League Stamp | reverse | finish_bound_card_match_variant_mismatch | Karrablast has two extra variants, i.e. (a) one extra variant with the "City Championships"-stamp, and (b) one extra variant with the "City Championships"-stamp and "Staff"-stamp. |
| bw3 | 11 | Shelmet | League Stamp | reverse | finish_bound_card_match_variant_mismatch | Shelmet has two extra variants, i.e. (a) one extra variant with the "Regional Championships"-stamp, and (b) one extra variant with the "Regional Championships"-stamp and "Staff"-stamp. |
| bw5 | 4 | Scyther | League Stamp | reverse | finish_bound_variant_synonym_review | Scyther has 4 extra variants, i.e. (a) one extra variant with the "Pokémon League"-stamp and the "1st Place"-stamp, (b) one extra variant with the "Pokémon League"-stamp and the "2nd Place"-stamp, (c) one extra variant with the "Pokémon ... |
| bw5 | 12 | Flareon | League Stamp | reverse | finish_bound_card_match_variant_mismatch | Flareon has 2 extra variants, i.e. (a) one extra variant with the "Regional Championships"-stamp, and (b) one extra variant with the "Regional Championships"-stamp and "Staff"-stamp. |
| bw8 | 118 | Colress | League Stamp | reverse | finish_bound_league_family_synonym_review | Colress has one extra variant with the "Play! Pokémon Logo"-stamp from the Player Rewards Program. |
| bw8 | 123 | Hypnotoxic Laser | League Stamp | reverse | finish_bound_league_family_synonym_review | Hypnotoxic Laser has one extra variant with the "Play! Pokémon Logo"-stamp from the Player Rewards Program. |
| bw9 | 11 | Leafeon | League Stamp | reverse | finish_bound_card_match_variant_mismatch | Leafeon has 4 extra variants, i.e. (a) one extra variant with the "State Championships"-stamp, and (b) one extra variant with the "State Championships"-stamp and "Staff"-stamp, (c) one extra variant with the "Regional Championships"-stam... |
| bw9 | 23 | Glaceon | League Stamp | reverse | finish_bound_card_match_variant_mismatch | Glaceon has 2 extra variants, i.e. (a) one extra variant with the "City Championships"-stamp, and (b) one extra variant with the "City Championships"-stamp and "Staff"-stamp. |
| bw1 | 15 | Tepig | Player Rewards Crosshatch Stamp | reverse | finish_bound_card_match_variant_mismatch | Tepig has one extra variant from the Pokémon League. |
| bw1 | 105 | Grass Energy | Play! Pokemon Stamp | reverse | finish_bound_variant_synonym_review | Grass Energy has one extra variant with the "Play! Pokémon Logo"-stamp from the Pokémon League. |
| bw1 | 106 | Fire Energy | Play! Pokemon Stamp | reverse | finish_bound_variant_synonym_review | Fire Energy has one extra variant with the "Play! Pokémon Logo"-stamp from the Pokémon League. |
| bw2 | 95 | Pokémon Catcher | Prize Pack Stamp | reverse | finish_bound_card_match_variant_mismatch | Pokémon Catcher has one extra variant with the "Play! Pokemon Logo"-stamp from the Player Rewards Program. |
| bw9 | 100 | Frozen City | Prize Pack Stamp | reverse | finish_bound_card_match_variant_mismatch | Frozen City has one extra variant with the "Play! Pokémon Logo"-stamp from the Player Rewards Program. |
| bw3 | 80 | Escavalier | National Championships Staff Stamp | reverse | finish_bound_variant_synonym_review | Escavalier has two extra variants, i.e. (a) one extra variant with the "National Championships"-stamp, and (b) one extra variant with the "National Championships"-stamp and "Staff"-stamp. |
| bw5 | 25 | Vaporeon | States Championships Staff Stamp | reverse | finish_bound_variant_synonym_review | Vaporeon has 4 extra variants, i.e. (a) one extra variant with the "State Championships"-stamp, and (b) one extra variant with the "State Championships"-stamp and "Staff"-stamp, (c) one extra variant with the "Regional Championships"-sta... |
| bw5 | 37 | Jolteon | Regional Championships Staff Stamp | reverse | finish_bound_variant_synonym_review | Jolteon has (a) one extra variant with the "Regional Championships"-stamp, and (b) one extra variant with the "Regional Championships"-stamp and "Staff"-stamp. |
| bw5 | 84 | Eevee | City Championships Staff Stamp | reverse | finish_bound_variant_synonym_review | Eevee has (a) one extra variant with the "City Championships"-stamp, and (b) one extra variant with the "City Championships"-stamp and "Staff"-stamp. |

## Guardrail

Rows are review-only until exact stamp-label synonym governance is approved and a source-delta guard confirms the candidate closes a current gap without creating conflicts.
