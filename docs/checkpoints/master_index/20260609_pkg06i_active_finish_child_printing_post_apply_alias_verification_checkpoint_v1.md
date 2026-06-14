# PKG-06I Post-Apply Alias Verification V1

This read-only verification resolves the PKG-06I post-apply verifier stop finding.

| Field | Value |
| --- | --- |
| package_id | PKG-06I-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| verification_status | pkg06i_committed_and_alias_verified |
| db_writes_performed | false |
| migrations_created | false |
| inserted_rows_found | 84 |
| target_parent_rows | 78 |
| parent_rows_unchanged | true |
| stop_findings | 0 |

## Alias Resolution

- live DB set_code `mcd19` maps to Master Index set key `2019sm`.
- The original apply committed and inserted all 84 rows.
- The only stop finding was alias-only: `inserted_set_2019sm_count_not_8`.

## Alias-Aware Counts

{
  "2019sm": 8,
  "bw4": 8,
  "pop8": 9,
  "sv10": 8,
  "sve": 9,
  "svp": 9,
  "swsh8": 8,
  "xy3": 9,
  "xy7": 8,
  "xy8": 8
}
