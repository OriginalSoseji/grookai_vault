# Bulbapedia Prize Pack Normal Acquisition V1

Audit-only acquisition for Prize Pack stamped normal finishes.

## Safety

- dry_run: false
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Rule

Only exact Bulbapedia Prize Pack card-list rows with promotion `Standard Set` are accepted as `normal`. Alternate promotion labels are not promoted here.

## Summary

- target_rows: 63
- source_entries_parsed: 1016
- records_generated: 0
- fixture_files_written: 0
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| blocked_bulbapedia_prize_pack_foil_requires_finish_rule | 34 |
| blocked_multi_finish_prize_pack_requires_multi_child_package | 24 |
| blocked_no_exact_bulbapedia_prize_pack_match | 5 |

## Accepted

_No accepted rows._
