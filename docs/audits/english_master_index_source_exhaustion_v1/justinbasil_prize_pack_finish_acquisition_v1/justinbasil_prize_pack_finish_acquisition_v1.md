# JustInBasil Prize Pack Finish Acquisition V1

Audit-only source acquisition for Prize Pack stamped active finishes.

## Safety

- dry_run: false
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Source Rule

JustInBasil Prize Pack pages state that `S` means available in non-holo and `H` means available in cosmos holofoil, and that the listed cards are stamped with the Play! Pokemon logo. This lane accepts only exact set-code, card-number, card-name matches with exactly one source finish mark.

## Summary

- target_rows: 63
- source_entries_parsed: 223
- records_generated: 0
- fixture_files_written: 0
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| blocked_no_exact_justinbasil_prize_pack_match | 62 |
| blocked_multi_finish_prize_pack_requires_multi_child_package | 1 |

## Accepted

_No accepted rows._

## Safety Notes

- Rows marked both `S, H` are blocked for a separate multi-child package.
- This script performs no DB writes.
- This script creates generated evidence fixtures only.
