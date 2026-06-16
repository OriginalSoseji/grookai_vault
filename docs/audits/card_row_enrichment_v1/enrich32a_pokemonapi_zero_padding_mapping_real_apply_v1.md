# ENRICH-32A PokemonAPI Zero Padding Mapping Real Apply V1

Real apply report for deactivating only PokemonAPI duplicate external mappings where the duplicate is leading-zero formatting.

## Safety

- Rollback only: false
- DB writes persisted: true
- Migrations created: false
- Card/child/image rows touched: false

## Proof

| metric | value |
| --- | --- |
| target_groups | 26 |
| target_mapping_rows_active_before | 26 |
| mappings_deactivated | 26 |
| remaining_source_card_duplicate_groups_after_transient_update | 169 |

## Targets

| set | number | name | keep | deactivate |
| --- | --- | --- | --- | --- |
| swsh10 | 17 | Hisuian Lilligant V | swsh10-17 | swsh10-017 |
| swsh10 | 2 | Hisuian Voltorb | swsh10-2 | swsh10-002 |
| swsh10 | 23 | Cyndaquil | swsh10-23 | swsh10-023 |
| swsh10 | 24 | Quilava | swsh10-24 | swsh10-024 |
| swsh10 | 26 | Heatran VMAX | swsh10-26 | swsh10-026 |
| swsh10 | 3 | Hisuian Electrode | swsh10-3 | swsh10-003 |
| swsh10 | 30 | Starmie V | swsh10-30 | swsh10-030 |
| swsh10 | 35 | Barboach | swsh10-35 | swsh10-035 |
| swsh10 | 38 | Glaceon | swsh10-38 | swsh10-038 |
| swsh10 | 43 | Hisuian Basculin | swsh10-43 | swsh10-043 |
| swsh10 | 50 | Luxray V | swsh10-50 | swsh10-050 |
| swsh10 | 53 | Hisuian Typhlosion V | swsh10-53 | swsh10-053 |
| swsh10 | 57 | Togekiss | swsh10-57 | swsh10-057 |
| swsh10 | 59 | Mismagius | swsh10-59 | swsh10-059 |
| swsh10 | 6 | Yanma | swsh10-6 | swsh10-006 |
| swsh10 | 70 | Hisuian Growlithe | swsh10-70 | swsh10-070 |
| swsh10 | 77 | Rampardos | swsh10-77 | swsh10-077 |
| swsh10 | 78 | Lucario V | swsh10-78 | swsh10-078 |
| swsh10 | 83 | Hisuian Decidueye V | swsh10-83 | swsh10-083 |
| swsh10 | 84 | Hisuian Decidueye VSTAR | swsh10-84 | swsh10-084 |
| swsh10 | 86 | Kleavor | swsh10-86 | swsh10-086 |
| swsh10 | 9 | Kricketot | swsh10-9 | swsh10-009 |
| swsh10 | 90 | Hisuian Overqwil | swsh10-90 | swsh10-090 |
| swsh10 | 92 | Hisuian Sneasel | swsh10-92 | swsh10-092 |
| swsh10 | 93 | Hisuian Sneasler | swsh10-93 | swsh10-093 |
| swsh10 | 95 | Poochyena | swsh10-95 | swsh10-095 |

Fingerprint: `b4730cd8855bfe00578e26b310805c519686cc56cea1ca4c673fc72b0d71df0a`

Dry-run proof: `03240951eea3bc47a15f1000a90f251b7dc2b4c09918282624b8a938eab7cd1c`

## Approval Phrase

`Approve real ENRICH-32A-POKEMONAPI-ZERO-PADDING-MAPPING-DEACTIVATION apply only. Fingerprint: b4730cd8855bfe00578e26b310805c519686cc56cea1ca4c673fc72b0d71df0a. Dry-run proof: 03240951eea3bc47a15f1000a90f251b7dc2b4c09918282624b8a938eab7cd1c. Scope: 26 PokemonAPI leading-zero duplicate mapping deactivations. No card_print writes. No child writes. No deletes. No migrations. No image writes. No global apply.`
