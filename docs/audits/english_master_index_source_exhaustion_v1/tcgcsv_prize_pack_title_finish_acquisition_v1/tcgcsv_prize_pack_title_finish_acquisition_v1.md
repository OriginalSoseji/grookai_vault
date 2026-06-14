# TCGCSV Prize Pack Title Finish Acquisition V1

Audit-only source acquisition using exact finish phrases in TCGCSV/TCGplayer Prize Pack product titles.

## Safety

- dry_run: false
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Rule

Only explicit product-title finish phrases are accepted. Generic TCGplayer price subtypes are not accepted for Prize Pack finish truth.

## Summary

- target_rows: 63
- records_generated: 0
- fixture_files_written: 0
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| blocked_no_exact_title_finish_match | 62 |
| blocked_title_finish_match_without_set_denominator_proof | 1 |

## Accepted

No accepted rows.
