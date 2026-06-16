# ENRICH-12B External ID Payload Mapping Readiness V1

Package: `ENRICH-12B-EXTERNAL-ID-PAYLOAD-MAPPING-READINESS`

## Result

- Candidate parent rows: 14
- Candidate mapping rows: 15
- Ready mapping rows: 0
- Blocked mapping rows: 15
- Existing owner rows: 15
- Fingerprint: `c7cf5406b6730fed04e04436c121322a12041c5e418abc81033edc3a000073a2`

## Readiness

| status | rows |
| --- | --- |
| blocked_variant_source_id_owned_by_base_parent | 11 |
| blocked_existing_source_external_owner | 4 |

## By Source

| source | rows |
| --- | --- |
| tcgdex | 13 |
| pokemonapi | 2 |

## Blocked Rows

| set | number | name | modifier | source | external_id | status | existing_owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sv02 | 61 | Chien-Pao ex | prize_pack_stamp | pokemonapi | sv2-61 | blocked_variant_source_id_owned_by_base_parent | sv02 61 Chien-Pao ex |
| swshp | SWSH167 | Professor Burnet | professor_program_stamp | pokemonapi | swshp-SWSH167 | blocked_variant_source_id_owned_by_base_parent | swshp SWSH167 Professor Burnet |
| bw1 | 53 | Whirlipede | league_stamp | tcgdex | bw1-53 | blocked_variant_source_id_owned_by_base_parent | bw1 53 Whirlipede |
| bw1 | 79 | Watchog | league_stamp | tcgdex | bw1-79 | blocked_variant_source_id_owned_by_base_parent | bw1 79 Watchog |
| bw1 | 81 | Lillipup | league_stamp | tcgdex | bw1-81 | blocked_variant_source_id_owned_by_base_parent | bw1 81 Lillipup |
| bw2 | 82 | Unfezant | league_stamp | tcgdex | bw2-82 | blocked_variant_source_id_owned_by_base_parent | bw2 82 Unfezant |
| bw3 | 32 | Cryogonal | league_stamp | tcgdex | bw3-32 | blocked_variant_source_id_owned_by_base_parent | bw3 32 Cryogonal |
| hgss1 | 39 | Delibird | league_stamp | tcgdex | hgss1-39 | blocked_variant_source_id_owned_by_base_parent | hgss1 39 Delibird |
| sv03 | 086 | Espeon | obsidian_flames_stamp | tcgdex | sv03-086 | blocked_variant_source_id_owned_by_base_parent | sv03 086 Espeon |
| sv05 | 123 | Raging Bolt ex | prize_pack_stamp | tcgdex | sv05-123 | blocked_variant_source_id_owned_by_base_parent | sv05 123 Raging Bolt ex |
| sv8pt5 | 122 | Professor's Research |  | tcgdex | sv08.5-122 | blocked_existing_source_external_owner | sv08.5 122 Professor's Research |
| sv8pt5 | 123 | Professor's Research |  | tcgdex | sv08.5-123 | blocked_existing_source_external_owner | sv08.5 123 Professor's Research |
| sv8pt5 | 124 | Professor's Research |  | tcgdex | sv08.5-124 | blocked_existing_source_external_owner | sv08.5 124 Professor's Research |
| sv8pt5 | 125 | Professor's Research |  | tcgdex | sv08.5-125 | blocked_existing_source_external_owner | sv08.5 125 Professor's Research |
| swshp | SWSH167 | Professor Burnet | professor_program_stamp | tcgdex | swshp-SWSH167 | blocked_variant_source_id_owned_by_base_parent | swshp SWSH167 Professor Burnet |

## Recommended Next Step

Do not create external_mappings from these payloads. All candidate source/external IDs are already actively owned elsewhere; resolve ownership or leave payloads as non-authoritative references.

## Safety

- Audit only.
- DB writes performed: false.
- Migrations created: false.
- No external mapping inserts, parent writes, child writes, identity writes, deletes, merges, image writes, or global apply.
