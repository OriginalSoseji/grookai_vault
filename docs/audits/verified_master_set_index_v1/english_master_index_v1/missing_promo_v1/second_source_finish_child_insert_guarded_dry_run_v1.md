# Second Source Finish Child Insert Guarded Dry Run V1

Rollback-only dry-run for child printings proven by second-source special finish evidence. No durable DB writes are performed.

## Summary

| metric | value |
| --- | --- |
| target_count | 2 |
| by_finish | {"holo":1,"normal":1} |
| by_family | {"championship_stamp":1,"league_stamp":1} |
| package_fingerprint_sha256 | 2685545ff2bd82267b2582eb6057c39f1c575129ed79a9186ab104c788985e7a |
| sql_hash_sha256 | 366dcbe03abbf78775fa07ee3e4e02b8c4b45810bc8455ccd03f04c9e1d76cdc |
| dry_run_proof_sha256 | bff21af16ad5cd3aab246e0e399a83184a1c4ba4624c88498327d4f3756b6a2c |
| rollback_proof_sha256 | 6b5654436092fa72ad86ef5255de00f2ddb8805a34fd1ef3d842ed09090f14da |

## Targets

| set | number | name | variant/modifier | finish | printing_gv_id |
| --- | --- | --- | --- | --- | --- |
| dp1 | 98 | Shinx | city_championships_stamp | normal | GV-PK-DP1-98-CITY-CHAMPIONSHIPS-STAMP-STD |
| swsh9 | 123 | Arceus VSTAR | league_stamp | holo | GV-PK-SWSH9-123-LEAGUE-STAMP-HOLO |

## Recommended Approval

```text
Approve real MISSING-PROMO-04L-SECOND-SOURCE-FINISH-CHILD-INSERTS apply only. Fingerprint: 2685545ff2bd82267b2582eb6057c39f1c575129ed79a9186ab104c788985e7a. SQL hash: 366dcbe03abbf78775fa07ee3e4e02b8c4b45810bc8455ccd03f04c9e1d76cdc. Scope: 2 child-only card_printing inserts from second-source finish evidence; finishes holo=1, normal=1. Dry-run proof: bff21af16ad5cd3aab246e0e399a83184a1c4ba4624c88498327d4f3756b6a2c == bff21af16ad5cd3aab246e0e399a83184a1c4ba4624c88498327d4f3756b6a2c. No parent writes. No identity writes. No external mapping writes. No pricing writes. No image writes. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```

