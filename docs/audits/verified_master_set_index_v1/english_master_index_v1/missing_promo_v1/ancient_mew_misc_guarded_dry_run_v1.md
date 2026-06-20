# Ancient Mew Misc Set Guarded Dry Run V1

- package_id: `MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERTS`
- source_governance_fingerprint: `3ca75e62877ff3c11f7f9fd992ae085c5fc2e4a26a0ab485b9b552da9133f4cf`
- package_fingerprint: `b8078b77231bc0a9c1241412669ace89de0ca62fe43d79a30677d47840a3763b`
- sql_hash: `1b94ebf95b31279f858f161e645d58bdf1f018abd8b6d564fd7c25b5f7ce0595`
- dry_run_proof: `89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5`
- rollback_verified: true

## Scope

| write class | count |
| --- | --- |
| set inserts | 1 |
| parent inserts | 1 |
| identity inserts | 1 |
| child inserts | 1 |
| external mapping inserts | 0 |
| pricing writes | 0 |
| image writes | 0 |
| deletes | 0 |
| merges | 0 |

## Target

| field | value |
| --- | --- |
| set | misc / Miscellaneous Cards & Products |
| card | Ancient Mew #1 |
| finish | cosmos |
| gv_id | GV-PK-MISC-001 |
| printing_gv_id | GV-PK-MISC-001-COSMOS |
| parent_id | 90c76326-1274-403d-8d8d-276e53319a0a |
| child_id | d91be6d3-58f8-4ebc-a3e7-e9b58b391e8d |

## Proof

| check | value |
| --- | --- |
| target_rows | 1 |
| inserted_set_rows | 1 |
| inserted_parent_rows | 1 |
| inserted_identity_rows | 1 |
| inserted_child_rows | 1 |
| external_mapping_rows | 0 |
| matching_cosmos_child_rows | 1 |

## Safety

- durable_db_writes_performed: false
- migrations_created: false
- external_mapping_writes_performed: false
- pricing_writes_performed: false
- image_writes_performed: false
- cleanup_performed: false
- quarantine_performed: false
- Japanese Exclusive Print and Nintedo/error variants remain excluded.

## Approval Text For Real Apply

```text
Approve real MISSING-PROMO-04E-ANCIENT-MEW-MISC-SET-PARENT-CHILD-INSERTS apply only. Fingerprint: b8078b77231bc0a9c1241412669ace89de0ca62fe43d79a30677d47840a3763b. SQL hash: 1b94ebf95b31279f858f161e645d58bdf1f018abd8b6d564fd7c25b5f7ce0595. Scope: 1 misc set insert, 1 Ancient Mew parent insert, 1 active identity insert, 1 cosmos child printing insert; set misc/Miscellaneous Cards & Products; gv_id GV-PK-MISC-001; printing_gv_id GV-PK-MISC-001-COSMOS. Dry-run proof: 89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5 == 89dfd2b9d0a3e2c4c536a49f2fc9eb4dec2afaf4aecee76c90538468df9d9cb5. No external mappings. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```

