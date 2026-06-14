# PKG-13B MEP TCGplayer Parent+Child Insert Guarded Dry Run V1

- package_id: `PKG-13B-MEP-TCGPLAYER-PARENT-CHILD-INSERTS`
- package_fingerprint_sha256: `e880e0c4a5cfda5410cd41d3cbd62cd8007c47ff83528ba5ca3e27ae091b4cbf`
- dry_run_status: pkg13b_mep_tcgplayer_parent_child_insert_completed_rolled_back_no_durable_change
- rollback_verified: true
- target_parent_rows: 2
- target_child_rows: 2
- target_external_mappings: 2
- by_set: {"mep":2}
- by_finish: {"cosmos":2}
- by_mapping_source: {"tcgplayer":2}
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Targets

| set | number | name | finish | mapping |
| --- | --- | --- | --- | --- |
| mep | 078 | Toxel | cosmos | tcgplayer:694692 |
| mep | 079 | Charmeleon | cosmos | tcgplayer:694693 |

This report is rollback-only proof. It does not perform a durable apply.
