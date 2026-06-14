# PKG-05A Missing Master-Verified Set Inserts Readiness V1

This is a read-only bucket plan. It does not execute apply, create migrations, delete rows, merge rows, run cleanup, or perform identity modifier work.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Bucket

- package_id: PKG-05A-MISSING-MASTER-VERIFIED-SET-INSERTS
- package_fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- target_bucket_size_range: 5-10
- recommended_bucket_size: 0
- recommended_bucket_size_reason: Only four sets satisfy all PKG-05A insert-only guardrails. Do not pad the bucket with riskier sets.
- selected_set_count: 0
- expected_parent_rows: 0
- expected_child_printings: 0

## Selected Sets

No sets selected.

## Exclusion Summary

| reason | count |
| --- | --- |
| live_set_collision_or_existing_set | 201 |
| live_parent_rows_present_for_set_alias | 193 |
| tcgdex_card_id_coverage_not_exact_parent_count | 120 |
| tcgdex_alias_unavailable | 8 |
| not_all_printings_master_verified | 5 |
| no_master_index_cards | 2 |
| no_master_index_printings | 2 |
| not_all_cards_master_verified | 1 |

## Exclusion Samples

| reason | set_key | set_name | expected_parent_rows | expected_child_printings |
| --- | --- | --- | --- | --- |
| live_set_collision_or_existing_set | tk-bw-e | BW trainer Kit (Excadrill) | 30 | 30 |
| live_set_collision_or_existing_set | tk-bw-z | BW trainer Kit (Zoroark) | 30 | 30 |
| live_set_collision_or_existing_set | tk-dp-l | DP trainer Kit (Lucario) | 11 | 11 |
| live_set_collision_or_existing_set | tk-dp-m | DP trainer Kit (Manaphy) | 12 | 12 |
| live_set_collision_or_existing_set | tk-hs-g | HS trainer Kit (Gyarados) | 1 | 1 |
| live_set_collision_or_existing_set | tk-hs-r | HS trainer Kit (Raichu) | 1 | 1 |
| live_set_collision_or_existing_set | jumbo | Jumbo cards | 0 | 0 |
| live_set_collision_or_existing_set | 2023sv | McDonald's Collection 2023 | 15 | 15 |
| live_set_collision_or_existing_set | 2024sv | McDonald's Collection 2024 | 15 | 15 |
| live_set_collision_or_existing_set | mee | Mega Evolution Energy | 8 | 16 |
| live_set_collision_or_existing_set | mep | MEP Black Star Promos | 60 | 85 |
| live_set_collision_or_existing_set | mfb | My First Battle | 34 | 34 |
| live_set_collision_or_existing_set | ex5.5 | Poké Card Creator Pack | 5 | 5 |
| live_set_collision_or_existing_set | fut2020 | Pokémon Futsal 2020 | 5 | 5 |
| live_set_collision_or_existing_set | sp | Sample | 0 | 0 |
| live_set_collision_or_existing_set | tk-sm-r | SM trainer Kit (Alolan Raichu) | 19 | 19 |
| live_set_collision_or_existing_set | tk-sm-l | SM trainer Kit (Lycanroc) | 18 | 18 |
| live_set_collision_or_existing_set | exu | Unseen Forces Unown Collection | 28 | 28 |
| live_set_collision_or_existing_set | wp | W Promotional | 7 | 7 |
| live_set_collision_or_existing_set | tk-xy-b | XY trainer Kit (Bisharp) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-bw-e | BW trainer Kit (Excadrill) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-bw-z | BW trainer Kit (Zoroark) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-dp-l | DP trainer Kit (Lucario) | 11 | 11 |
| live_parent_rows_present_for_set_alias | tk-dp-m | DP trainer Kit (Manaphy) | 12 | 12 |
| live_parent_rows_present_for_set_alias | tk-hs-g | HS trainer Kit (Gyarados) | 1 | 1 |
| live_parent_rows_present_for_set_alias | tk-hs-r | HS trainer Kit (Raichu) | 1 | 1 |
| live_parent_rows_present_for_set_alias | 2023sv | McDonald's Collection 2023 | 15 | 15 |
| live_parent_rows_present_for_set_alias | 2024sv | McDonald's Collection 2024 | 15 | 15 |
| live_parent_rows_present_for_set_alias | mee | Mega Evolution Energy | 8 | 16 |
| live_parent_rows_present_for_set_alias | mfb | My First Battle | 34 | 34 |
| live_parent_rows_present_for_set_alias | ex5.5 | Poké Card Creator Pack | 5 | 5 |
| live_parent_rows_present_for_set_alias | fut2020 | Pokémon Futsal 2020 | 5 | 5 |
| live_parent_rows_present_for_set_alias | tk-sm-r | SM trainer Kit (Alolan Raichu) | 19 | 19 |
| live_parent_rows_present_for_set_alias | tk-sm-l | SM trainer Kit (Lycanroc) | 18 | 18 |
| live_parent_rows_present_for_set_alias | tk-xy-b | XY trainer Kit (Bisharp) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-xy-latia | XY trainer Kit (Latias) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-xy-latio | XY trainer Kit (Latios) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-xy-n | XY trainer Kit (Noivern) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-xy-p | XY trainer Kit (Pikachu Libre) | 30 | 30 |
| live_parent_rows_present_for_set_alias | tk-xy-su | XY trainer Kit (Suicune) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-bw-e | BW trainer Kit (Excadrill) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-bw-z | BW trainer Kit (Zoroark) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-dp-l | DP trainer Kit (Lucario) | 11 | 11 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-dp-m | DP trainer Kit (Manaphy) | 12 | 12 |
| tcgdex_card_id_coverage_not_exact_parent_count | mep | MEP Black Star Promos | 60 | 85 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-sm-r | SM trainer Kit (Alolan Raichu) | 19 | 19 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-sm-l | SM trainer Kit (Lycanroc) | 18 | 18 |
| tcgdex_card_id_coverage_not_exact_parent_count | wp | W Promotional | 7 | 7 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-b | XY trainer Kit (Bisharp) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-latia | XY trainer Kit (Latias) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-latio | XY trainer Kit (Latios) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-n | XY trainer Kit (Noivern) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-p | XY trainer Kit (Pikachu Libre) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-su | XY trainer Kit (Suicune) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-sy | XY trainer Kit (Sylveon) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | tk-xy-w | XY trainer Kit (Wigglytuff) | 30 | 30 |
| tcgdex_card_id_coverage_not_exact_parent_count | basep | Wizards Black Star Promos | 53 | 58 |
| tcgdex_card_id_coverage_not_exact_parent_count | base4 | Base Set 2 | 131 | 132 |
| tcgdex_card_id_coverage_not_exact_parent_count | neo4 | Neo Destiny | 114 | 235 |
| tcgdex_card_id_coverage_not_exact_parent_count | ecard2 | Aquapolis | 199 | 360 |
| tcgdex_alias_unavailable | fut20 | Pokémon Futsal Collection | 5 | 5 |
| tcgdex_alias_unavailable | swsh45sv | Shining Fates Shiny Vault | 122 | 122 |
| tcgdex_alias_unavailable | cel25c | Celebrations: Classic Collection | 25 | 25 |
| tcgdex_alias_unavailable | swsh9tg | Brilliant Stars Trainer Gallery | 30 | 30 |
| tcgdex_alias_unavailable | swsh10tg | Astral Radiance Trainer Gallery | 30 | 30 |
| tcgdex_alias_unavailable | swsh11tg | Lost Origin Trainer Gallery | 30 | 30 |
| tcgdex_alias_unavailable | swsh12tg | Silver Tempest Trainer Gallery | 30 | 30 |
| tcgdex_alias_unavailable | swsh12pt5gg | Crown Zenith Galarian Gallery | 70 | 70 |
| not_all_printings_master_verified | ex9 | Emerald | 107 | 209 |
| not_all_printings_master_verified | bw8 | Plasma Storm | 138 | 279 |
| not_all_printings_master_verified | sm8 | Lost Thunder | 240 | 490 |
| not_all_printings_master_verified | swsh3.5 | Champion's Path | 80 | 142 |
| not_all_printings_master_verified | sv03.5 | 151 | 207 | 383 |
| no_master_index_cards | jumbo | Jumbo cards | 0 | 0 |
| no_master_index_cards | sp | Sample | 0 | 0 |
| no_master_index_printings | jumbo | Jumbo cards | 0 | 0 |
| no_master_index_printings | sp | Sample | 0 | 0 |
| not_all_cards_master_verified | sm1 | Sun & Moon | 173 | 371 |

## Stop Rules

- Do not execute apply from this report.
- Do not include any set with an existing live set row or live parent row collision.
- Do not include any set with external mapping collisions.
- Do not include sets with non-master-verified card or printing facts.
- Do not mix deletes, merges, unsupported cleanup, or identity modifier work into PKG-05A.
- A future apply package must create its own fresh snapshot, rollback proof, dry-run transaction artifact, and approval fingerprint.
