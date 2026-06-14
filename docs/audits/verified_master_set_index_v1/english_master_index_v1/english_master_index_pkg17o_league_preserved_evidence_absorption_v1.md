# PKG-17O League Preserved Evidence Absorption V1

Audit-only pass over existing preserved League evidence and the local PriceCharting CSV.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| league_active_finish_targets | 78 |
| preserved_evidence_rows_scanned | 1900 |
| rows_with_any_preserved_match | 73 |
| two_source_exact_active_finish_ready_for_guarded_dry_run | 0 |
| crosshatch_alias_governance_required_before_dry_run | 0 |
| single_source_exact_active_finish_second_source_needed | 16 |
| no_preserved_source_match | 21 |

## By Readiness Status

| status | count |
| --- | --- |
| blocked_no_explicit_active_finish | 56 |
| no_preserved_source_match | 21 |
| single_source_exact_active_finish_second_source_needed | 16 |
| crosshatch_alias_review_only | 1 |

## Two-Source Exact Active Finish Ready

None.

## Crosshatch Alias Governance Required

These are not package-ready until the finish taxonomy explicitly maps the source label to the active child finish.

| set | number | name | variant | finish | exact families | alias families |
| --- | --- | --- | --- | --- | --- | --- |
| pl3 | 5 | Garchomp | league_stamp | reverse |  | pricecharting |

## Single-Source Exact Active Finish Rows

| set | number | name | variant | finish | source families |
| --- | --- | --- | --- | --- | --- |
| bw1 | 107 | Water Energy | league_stamp | reverse | pokecardvalues |
| hgss1 | 97 | Pokémon Collector | league_stamp | reverse | pokecardvalues |
| hgss1 | 103 | Double Colorless Energy | league_stamp | reverse | pokecardvalues |
| hgss2 | 82 | Rare Candy | league_stamp | reverse | pokecardvalues |
| sm1 | 41 | Primarina | league_stamp | reverse | pokecardvalues |
| sm3 | 94 | Diancie | league_stamp | reverse | pokecardvalues |
| sm6 | 77 | Buzzwole | league_stamp | reverse | pokecardvalues |
| sm7 | 95 | Metagross | league_stamp | reverse | pokecardvalues |
| sm8 | 108 | Naganadel | league_stamp | reverse | pokecardvalues |
| sm8 | 181 | Lost Blender | league_stamp | reverse | pokecardvalues |
| swsh4 | 153 | League Staff | league_cup_staff_stamp | reverse | pricecharting |
| xy1 | 121 | Muscle Band | league_stamp | reverse | pokecardvalues |
| xy2 | 89 | Fiery Torch | league_stamp | reverse | pokecardvalues |
| xy2 | 91 | Magnetic Storm | league_stamp | reverse | pokecardvalues |
| xy2 | 94 | Pokémon Fan Club | league_stamp | reverse | pokecardvalues |
| xy3 | 88 | Battle Reporter | league_stamp | reverse | pokecardvalues |

## Guardrail

No row from this report may be written until it has a guarded dry-run package, fresh fingerprint, dry-run proof, and explicit apply approval.
