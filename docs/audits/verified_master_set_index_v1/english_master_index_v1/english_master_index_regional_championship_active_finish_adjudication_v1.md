# Regional Championship Active Finish Adjudication V1

Audit-only adjudication for Dragon Vault Regional Championships rows after identity governance.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- dry_run_package_prepared: false
- write_ready_now: 0

## Decision

Regional Championships is the parent identity. Crosshatch remains evidence/display metadata, not a canonical `finish_key`. The active child finish candidate is `holo` for the three governed DV1 rows.

| metric | value |
| --- | --- |
| target_rows | 3 |
| future_dry_run_candidates | 3 |
| target_child_finish_holo | 3 |
| write_ready_now | 0 |
| fingerprint_sha256 | `b79c620d260893ede2e542b0fbb3417a182ad850f8551cb49c37dbd0c2b65743` |

## Rows

| set | number | name | variant | finish | status |
| --- | --- | --- | --- | --- | --- |
| dv1 | 6 | Bagon | regional_championships_stamp | holo | active_finish_governed_future_dry_run_candidate |
| dv1 | 7 | Shelgon | regional_championships_stamp | holo | active_finish_governed_future_dry_run_candidate |
| dv1 | 8 | Salamence | regional_championships_stamp | holo | active_finish_governed_future_dry_run_candidate |

## Guardrail

This report prepares the rows for a future guarded dry-run package only. It does not authorize DB writes. Do not create a `crosshatch` finish key from this report.
