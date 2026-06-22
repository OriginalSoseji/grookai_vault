# Prize Pack Post-Collexy Fixture Recheck V1

Audit-only comparison of the current post-Collexy Prize Pack queue against preserved Prize Pack source fixtures.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- write_ready_now: 0

## Summary

- target_rows: 33
- fixture_files_loaded: 38
- fixture_records_loaded: 259
- rows_with_exact_fixture_match: 14
- multi_source_finish_review_candidates: 0
- write_ready_now: 0
- fingerprint_sha256: `fa07ef6590f2e2fe7ebd8beceb34082c11f0c1d2be2d40164365087836e9ca73`

| status | rows |
| --- | --- |
| no_exact_fixture_match | 19 |
| preservation_only_review_blocked | 14 |

## Target Rows

| set | number | card | stamp | candidate finishes | matches | status |
| --- | --- | --- | --- | --- | --- | --- |
| sve | 13 | Basic Psychic Energy | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh1 | 117 | Galarian Zigzagoon | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh1 | 156 | Air Balloon | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh1 | 159 | Crushing Hammer | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh1 | 169 | Marnie | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh1 | 170 | Metal Saucer | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh1 | 171 | Ordinary Rod | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh1 | 180 | Rare Candy | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh1 | 186 | Aurora Energy | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh2 | 109 | Falinks | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh2 | 165 | Scoop Up Net | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh2 | 171 | Capture Energy | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh2 | 174 | Twin Energy | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh3 | 159 | Bird Keeper | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh3 | 160 | Cape of Toughness | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh4 | 157 | Nessa | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh5 | 37 | Octillery | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh5 | 96 | Houndoom | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh5 | 123 | Cheryl | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh5 | 125 | Escape Rope | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh5 | 129 | Level Ball | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh5 | 140 | Rapid Strike Energy | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh5 | 141 | Single Strike Energy | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swsh6 | 70 | Malamar | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh6 | 140 | Fog Crystal | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh6 | 148 | Path to the Peak | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh7 | 94 | Umbreon V | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh7 | 161 | Stormy Mountains | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh9 | 41 | Manaphy | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh9 | 132 | Boss's Orders | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swsh9 | 144 | Magma Basin | Prize Pack Stamp | - | 0 | no_exact_fixture_match |
| swshp | SWSH195 | Leafeon VSTAR | Prize Pack Stamp | stamped | 1 | preservation_only_review_blocked |
| swshp | SWSH197 | Glaceon VSTAR | Prize Pack Stamp | - | 0 | no_exact_fixture_match |

## Governance

- This pass compares existing fixture evidence only.
- Preservation-only TCGCSV rows are not treated as new independent evidence.
- Multi-source review candidates still require separate adjudication before any dry-run package can be prepared.
- No DB writes, migrations, cleanup, or apply occurred.
