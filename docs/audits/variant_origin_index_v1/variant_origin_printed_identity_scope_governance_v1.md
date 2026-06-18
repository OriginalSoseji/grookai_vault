# Variant Origin Printed Identity Scope Governance V1

Read-only governance report for rows that should not be treated as campaign/error/stamp origin copy without a separate rule.

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Summary

- Rows reviewed: 73
- Not-origin-copy rows: 59
- Blocked rows: 14
- Manual review rows: 0
- Fingerprint: `e8afda9346fddcd1bf872a7d5c9853b4b852bbb32770e54a03a699f1372c0858`

## Governance Buckets

| bucket | count |
| --- | --- |
| printed_character_identity | 27 |
| printed_number_suffix | 25 |
| artwork_treatment_needs_source | 14 |
| trainer_subject_disambiguator | 3 |
| printed_number_prefix | 2 |
| name_suffix_disambiguator | 1 |
| promo_number_namespace | 1 |

## Policy

- Printed number suffixes are identity/checklist facts, not origin stories.
- Trainer-subject and name-suffix modifiers are search/display disambiguators unless separate distribution evidence exists.
- Alternate-art labels remain blocked from origin copy until exact source-backed art-treatment evidence exists.
- None of these classifications authorize DB writes, cleanup, inserts, deletes, or public copy promotion by themselves.

## Rows

| gv_id | card | token | governance_bucket | public_origin_copy_status | target_system |
| --- | --- | --- | --- | --- | --- |
| GV-PK-PR-BLW-BW004 | Reshiram bwp BW004 | number_prefix:BW | printed_number_prefix | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-BLW-BW005 | Zekrom bwp BW005 | number_prefix:BW | printed_number_prefix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-103A | Porygon ecard2 103a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-103B | Porygon ecard2 103b | b | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-50A | Golduck ecard2 50a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-50B | Golduck ecard2 50b | b | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-74A | Drowzee ecard2 74a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-74B | Drowzee ecard2 74b | b | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-95A | Mr. Mime ecard2 95a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AQ-95B | Mr. Mime ecard2 95b | b | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-EXCL | Unown exu ! | ! | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-QMARK | Unown exu ? | ? | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-A | Unown exu A | A | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-B | Unown exu B | B | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-C | Unown exu C | C | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-D | Unown exu D | D | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-E | Unown exu E | E | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-F | Unown exu F | F | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-G | Unown exu G | G | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-I | Unown exu I | I | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-J | Unown exu J | J | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-K | Unown exu K | K | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-L | Unown exu L | L | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-M | Unown exu M | M | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-N | Unown exu N | N | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-O | Unown exu O | O | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-P | Unown exu P | P | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-Q | Unown exu Q | Q | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-R | Unown exu R | R | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-S | Unown exu S | S | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-T | Unown exu T | T | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-U | Unown exu U | U | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-V | Unown exu V | V | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-W | Unown exu W | W | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-X | Unown exu X | X | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-Y | Unown exu Y | Y | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-UF-Z | Unown exu Z | Z | printed_character_identity | not_origin_copy | printed_identity_documentation |
| GV-PK-GEN-28A | Jolteon-EX g1 28a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-GEN-73A | Team Flare Grunt g1 73a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-RR-95 | Team Galactic's Invention G-107 Technical Machine G pl2 95 | name_suffix:g | name_suffix_disambiguator | not_origin_copy | search_and_display_identity |
| GV-PK-CIN-63A | Guzzlord-GX sm4 63a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-RCL-154-GIOVANNI | Boss's Orders (Giovanni) swsh2 154 | trainer_subject:giovanni | trainer_subject_disambiguator | not_origin_copy | search_and_display_identity |
| GV-PK-SHF-58-LYSANDRE | Boss's Orders (Lysandre) swsh4.5 58 | trainer_subject:lysandre | trainer_subject_disambiguator | not_origin_copy | search_and_display_identity |
| GV-PK-SHF-60-PROFESSOR-JUNIPER | Professor's Research (Professor Juniper) swsh4.5 60 | trainer_subject:professor_juniper | trainer_subject_disambiguator | not_origin_copy | search_and_display_identity |
| GV-PK-EVS-111 | Rayquaza VMAX swsh7 111 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-122 | Duraludon V swsh7 122 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-192 | Dragonite V swsh7 192 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-196 | Noivern V swsh7 196 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-205 | Leafeon VMAX swsh7 205 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-209 | Glaceon VMAX swsh7 209 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-212 | Sylveon VMAX swsh7 212 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-215 | Umbreon VMAX swsh7 215 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-218 | Rayquaza VMAX swsh7 218 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-220 | Duraludon VMAX swsh7 220 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-41 | Glaceon VMAX swsh7 41 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-70 | Golurk V swsh7 70 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-74 | Sylveon V swsh7 74 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-EVS-95 | Umbreon VMAX swsh7 95 | alt | artwork_treatment_needs_source | blocked | artwork_intelligence_or_rarity_art_identity |
| GV-PK-FCO-105A | N xy10 105a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-FFI-55A | M Lucario-EX xy3 55a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PHF-24A | M Manectric-EX xy4 24a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PHF-65A | Aegislash-EX xy4 65a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-ROS-77A | Shaymin-EX xy6 77a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-ROS-92A | Trainers' Mail xy6 92a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-AOR-75A | Hex Maniac xy7 75a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-BKP-107A | Professor Sycamore xy9 107a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-BKP-98A | Delinquent xy9 98a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-BKP-98B | Delinquent xy9 98b | b | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-XY-XY150A | Yveltal-EX xyp XY150a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-XY-XY177 | Karen xyp XY177 | XY | promo_number_namespace | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-XY-XY198A | M Camerupt-EX xyp XY198a | a | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-XY-XY200A | M Sharpedo-EX xyp XY200a | XYa | printed_number_suffix | not_origin_copy | printed_identity_documentation |
| GV-PK-PR-XY-XY67A | Jirachi xyp XY67a | XYa | printed_number_suffix | not_origin_copy | printed_identity_documentation |
