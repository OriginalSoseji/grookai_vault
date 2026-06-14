# PriceCharting Stamped Active Finish Acquisition V1

Audit-only extraction from the preserved PriceCharting CSV. Rows are accepted only when one product title matches set, card number, card name, stamped identity, and an explicit active finish label.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- target_rows: 339
- records_generated: 0
- fingerprint_sha256: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

| status | rows |
| --- | --- |
| no_exact_pricecharting_active_finish_match | 333 |
| blocked_multiple_exact_pricecharting_active_finish_matches | 6 |

## Accepted Rows

| set | number | name | variant | finish | product |
| --- | --- | --- | --- | --- | --- |
