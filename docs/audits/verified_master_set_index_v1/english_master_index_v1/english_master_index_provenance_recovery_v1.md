# English Master Index Provenance Recovery V1

This is an audit-only recovery map for Grookai rows in the `missing_set_code` bucket.

It does not infer set identity, does not create aliases, and does not authorize mutation. Rows with no set code cannot be mapped from name/finish alone.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- mutation_safe: false

## Summary

- missing_set_code_printing_rows: 5720
- unique_card_prints: 2158
- rows_with_card_number: 728
- rows_with_set_code: 0
- db_enrichment_executed: true
- db_card_print_rows_loaded: 5720
- db_external_mapping_rows_loaded: 2180

## Recovery Classification

| classification | unique card prints |
| --- | --- |
| external_mapping_recoverable | 1406 |
| possible_pocket_provenance_lead | 742 |
| provenance_field_recoverable | 10 |

## Evidence Fields

| field | unique card prints |
| --- | --- |
| printing_provenance | 2158 |
| external_mappings | 2148 |
| ai_metadata | 2130 |
| external_ids | 2130 |
| image_fields | 2117 |

## External Mapping Sources

| source | unique card prints |
| --- | --- |
| tcgdex | 2143 |
| justtcg | 19 |
| tcgplayer | 18 |
| none | 10 |

## External ID Patterns

| pattern | unique card prints |
| --- | --- |
| physical_tcg_set_dash_number | 803 |
| possible_pocket_a_series | 642 |
| other_external_id | 616 |
| possible_pocket_promo_a | 100 |
| numeric_marketplace_id | 18 |
| none | 10 |

## Finish Rows

| finish | printing rows |
| --- | --- |
| holo | 1993 |
| reverse | 1919 |
| normal | 1808 |

## Guardrails

- missing_set_code is not alias evidence
- name and finish are not source set authority
- external IDs and image URLs are recovery leads only
- no row is mutation-safe from this report
- no database writes, cleanup, quarantine, migrations, or apply paths are allowed

## Top Recovery Leads

| card_print_id | card_name | finish_profile | classification | evidence_fields | printing_count |
| --- | --- | --- | --- | --- | --- |
| 7a0034dc-d495-4423-8e54-dd43dc9eb4c9 | Abomasnow | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 831ea01a-9756-44dd-ba5e-7d836b299200 | Abra | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 880bf738-91f8-44f0-9026-5517058e9cbe | Absol EX | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 4b30c56f-6e8a-4b1c-a4ec-517c15ee2354 | Adaman | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 08b4e819-8c65-4e5e-bdc6-5db9d8cb4472 | Adaman | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 6922b72a-f472-4bea-9c3b-e4320f11924e | Aegislash EX | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 21840232-9191-4566-8e3e-046f74841288 | Aegislash EX | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| e3638edc-31a4-4b58-88e8-6d0dccf222d2 | Aerodactyl | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 1370621a-c89d-4700-be75-275b400e6fb5 | Aerodactyl ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 0e915001-674c-46c4-9d05-f793b44ce60d | Aerodactyl ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 172c97ad-710e-41ca-b117-083505a8a9f5 | Aerodactyl ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 576946b5-8ab3-49c2-8d7b-eaa50e7f822d | Aerodactyl ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 4f7b83ca-6291-4f21-bc09-add8bb57e266 | Aerodactyl EX | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 560fde08-0ef0-489d-b8f7-ee0d994cd070 | Aggron | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 58423acc-8f37-4d56-8774-4f21ca26e683 | Aipom | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 7d82ffdc-2ffe-48c9-9436-72e86aaa6916 | Alakazam | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 0c500907-b532-4c45-9b35-5cbe4059c21c | Alakazam ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| e3e88a4d-20ef-4fb5-8ccf-e220f5244728 | Alcremie | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| dc70d730-3f95-4164-a280-f8c8463017e5 | Alolan Diglett | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 145e93dc-2599-4674-8e1e-135b622b507c | Alolan Dugtrio ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 52d26452-166f-482a-b35a-fe8008a67b75 | Alolan Dugtrio ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 02e39451-bfa3-4427-9a13-40e7a7721d66 | Alolan Dugtrio ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| df85125b-e129-4d4f-8dcb-2dd0294b873b | Alolan Meowth | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 4ef56ba4-e705-467c-9ffe-cd64e2ddd51c | Alolan Meowth | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 970f0229-fde0-45f6-8555-2789d475cfcc | Alolan Persian | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 23e7115d-783b-4d7c-a73f-d08fdc9ac437 | Alomomola | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 6b10e418-2ffe-4e86-9bb5-947bcf29c504 | Altaria | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 29357eff-81f7-4232-93ac-49f1226abfd2 | Amarys | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| b9ce7f1f-9864-47fd-8688-006aff157783 | Ambipom | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| f2a05a34-e33f-4196-9888-d8aeffd796f6 | Appletun | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 6196ac6e-1301-451f-9bcf-1349cdafb4f8 | Applin | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| ecfef832-1104-4343-b6a8-c0b60633fdb6 | Applin | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| c4bef850-12ac-4a73-ba8b-7aa084d44f7a | Arbok | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 18e3f9cb-af34-4caa-af1d-20ce268fe051 | Arbok | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 1154a3c4-8965-4ac8-be8f-6963bdad7a35 | Arcanine | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 06a3b76b-23bf-4766-a7a4-c94c02993970 | Arcanine | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 7e1c6a1e-705d-4ac3-917e-af7f53271711 | Arcanine ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| ae7d743f-7c2a-4e52-b8f2-ed4d16fe0fe8 | Arceus | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 07985756-5aae-44e1-9ee4-7b517bf2a928 | Arceus ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
| 326908cd-e8f4-4b0e-9731-63b8c777a026 | Arceus ex | holo\|normal\|reverse | external_mapping_recoverable | ai_metadata, external_ids, external_mappings, image_fields, printing_provenance | 3 |
