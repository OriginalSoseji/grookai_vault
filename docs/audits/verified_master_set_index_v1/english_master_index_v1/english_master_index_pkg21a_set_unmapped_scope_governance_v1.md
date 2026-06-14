# PKG-21A Set-Unmapped Scope Governance V1

Read-only governance classification for current `set_unmapped` rows after PKG-20A.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- source_set_unmapped_rows: 5443
- scope_excluded_non_write_rows: 5427
- blocked_rows: 16

## By Status

| status | rows |
| --- | --- |
| scope_excluded_non_write | 5427 |
| blocked_unclassified_unmapped_set | 16 |

## By Category

| category | rows |
| --- | --- |
| pokemon_tcg_pocket_digital_domain | 5427 |
| unclassified_set_unmapped | 16 |

## By Set Code

| set_code | rows |
| --- | --- |
| B1 | 993 |
| A1 | 858 |
| A4 | 723 |
| A3 | 717 |
| A2 | 621 |
| A2b | 333 |
| A3b | 321 |
| A4a | 315 |
| A2a | 288 |
| A1a | 258 |
| legacy_orphan | 16 |

## Governance

- Pocket/digital set codes are not English physical TCG Master Index debt.
- This artifact does not delete, hide, quarantine, migrate, or rewrite any DB row.
- Legacy orphan rows remain blocked until lineage is resolved.
