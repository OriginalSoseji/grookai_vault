# TCGCSV Stamped Subtype Acquisition V1

Audit-only source acquisition lane using TCGCSV/TCGplayer products plus price `subTypeName`.

## Safety

- dry_run: false
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- target_rows: 339
- sets_attempted: 77
- records_generated: 0
- fixture_files_written: 0
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| blocked_no_exact_tcgcsv_product_match | 281 |
| blocked_tcgcsv_group_not_mapped | 39 |
| blocked_tcgcsv_group_ambiguous | 16 |
| blocked_no_active_tcgcsv_subtype_match | 3 |

## Accepted

No exact TCGCSV subtype matches were accepted.
