# PKG-13C SVP Holo Parent+Child Insert Guarded Dry Run V1

- package_id: `PKG-13C-SVP-HOLO-PARENT-CHILD-INSERTS`
- package_fingerprint_sha256: `18b29ce632a171dd3b2e01d84e49b5d720a3d55617346ddcb3e1eacea8c077d4`
- dry_run_status: pkg13c_svp_holo_parent_child_insert_completed_rolled_back_no_durable_change
- rollback_verified: true
- target_parent_rows: 2
- target_child_rows: 2
- target_external_mappings: 2
- by_set: {"svp":2}
- by_finish: {"holo":2}
- by_mapping_source: {"tcgplayer":2}
- finish_adjudication: human/marketplace holo evidence overrides TCGdex normal for this narrow package only
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Targets

| set | number | name | finish | mapping | conflict |
| --- | --- | --- | --- | --- | --- |
| svp | 175 | Espeon ex | holo | tcgplayer:655095 | tcgdex normal: https://api.tcgdex.net/v2/en/cards/svp-175 |
| svp | 176 | Umbreon ex | holo | tcgplayer:655094 | tcgdex normal: https://api.tcgdex.net/v2/en/cards/svp-176 |

This report is rollback-only proof. It does not perform a durable apply.
