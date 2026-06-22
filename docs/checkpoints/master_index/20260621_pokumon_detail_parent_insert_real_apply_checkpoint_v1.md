# Pokumon Detail Parent Insert Real Apply Checkpoint V1

Date: 2026-06-21

## Summary

Applied the approved `POKUMON-DETAIL-PARENT-INSERTS` package from exact Pokumon detail-page stamped/special finish evidence.

Package:

```text
POKUMON-DETAIL-PARENT-INSERTS
```

Fingerprint:

```text
d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0
```

Dry-run proof:

```text
f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73
```

Apply proof:

```text
3b1ee841caf443f029b8dfa6b78e725f7dfa70fc6ba9c026c10585f3f4d60d0d
```

## Applied Scope

- parent inserts: 22
- active identity inserts: 22
- child printing inserts: 23
- finishes: `reverse=17`, `normal=6`
- deletes: 0
- merges: 0
- migrations: 0
- global apply: false
- unsupported cleanup: false

Variant counts:

- `regional_championships_staff_stamp=5`
- `championship_staff_stamp=2`
- `league_stamp=2`
- `national_championships_stamp=2`
- `prerelease_stamp=2`
- `professor_program_stamp=2`
- `city_championships_staff_stamp=1`
- `europe_championships_staff_stamp=1`
- `national_championships_staff_stamp=1`
- `pokemon_10th_anniversary_stamped=1`
- `regional_championships_stamp=1`
- `staff_stamp=1`
- `thank_you_stamp=1`

## Proof

Result artifact:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pokumon_detail_parent_insert_real_apply_v1.json
```

Post-apply proof:

```json
{
  "parent_targets": 22,
  "child_targets": 23,
  "inserted_parent_rows": 22,
  "inserted_identity_rows": 22,
  "inserted_child_rows": 23
}
```

## Safety Statement

- db_writes_performed: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false
- stop_findings: 0
