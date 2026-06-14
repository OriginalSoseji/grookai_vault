# PKG-08Y Host/Subset Relocation Cleanup Real Apply V1

Approved real apply for the Shining Fates host/subset relocation cleanup package.

## Result

- apply_status: pkg08y_host_subset_relocation_cleanup_real_apply_committed
- package_fingerprint_sha256: `c315ae87967cdde2c6e81343cefe0953c78e958c25ba6f372b52daa99c193ce6`
- db_write_committed: true
- parent_updates: 25
- child_deletes: 50
- migrations_created: false
- global_apply_performed: false
- merges_performed: false
- quarantine_performed: false
- stop_findings: 0

## Scope

- parent_relocations: 25
- normal_children_preserved: 25
- extra_child_deletes: 50

| extra_finish | rows |
| --- | --- |
| holo | 25 |
| reverse | 25 |

## Verification

- before_swsh45sv_parent_rows: 25
- after_swsh4_5_parent_rows: 25
- after_extra_child_rows: 0
- after_tcgdex_mapping_rows: 25
