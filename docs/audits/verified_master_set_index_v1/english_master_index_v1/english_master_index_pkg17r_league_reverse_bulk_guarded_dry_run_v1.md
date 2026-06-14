# PKG-17R League Reverse Bulk Guarded Dry Run V1

Rollback-only dry-run for two-source League Stamp reverse parent identity inserts.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 14
- identity_inserts: 14
- child_inserts: 14
- deletes: 0
- merges: 0

## Targets

| set | number | name | stamp_label | variant_key | finish | base_parent_id |
| --- | --- | --- | --- | --- | --- | --- |
| bw1 | 53 | Whirlipede | League Stamp | league_stamp | reverse | 68600d39-7fbd-4d1e-97ae-684955e53e05 |
| bw1 | 79 | Watchog | League Stamp | league_stamp | reverse | e67ff8fa-b1c0-4be4-9989-3783e8d3d7e8 |
| bw1 | 81 | Lillipup | League Stamp | league_stamp | reverse | 23f77e4a-186b-46f5-bdee-e832ca467f12 |
| bw11 | 109 | Bianca | League Stamp | league_stamp | reverse | f5517ff1-034f-4388-89d2-0bc1f4ca5944 |
| bw2 | 82 | Unfezant | League Stamp | league_stamp | reverse | d5e557e6-186e-4c57-95f6-85373517711b |
| bw3 | 32 | Cryogonal | League Stamp | league_stamp | reverse | e6a84ebc-2184-42db-ad04-f19c762133f6 |
| bw8 | 120 | Escape Rope | League Stamp | league_stamp | reverse | 9563479b-7524-48ef-a1cb-612e4afeed08 |
| hgss1 | 39 | Delibird | League Stamp | league_stamp | reverse | 5fb7382a-f366-42ed-bd64-6a9c91e98a32 |
| pl1 | 104 | Broken Time-Space | League Stamp | league_stamp | reverse | db232ebe-fb95-44df-b0fe-3e38794e4c14 |
| pl3 | 26 | Dusknoir FB | League Stamp | league_stamp | reverse | 899905ba-d076-4021-b408-85c210ecd4ac |
| pl4 | 32 | Spiritomb | League Stamp | league_stamp | reverse | f9b8c712-2eec-44a6-9741-b6620b72b19f |
| pl4 | 87 | Expert Belt | League Stamp | league_stamp | reverse | 379e8680-8572-456b-b818-1610544a188a |
| xy8 | 101 | Flabébé | League Stamp | league_stamp | reverse | 4f5f59ea-417a-443b-beaf-5d13bf1223e5 |
| xy8 | 102 | Floette | League Stamp | league_stamp | reverse | d65a9c23-da54-4eb5-995f-071fb8c24c67 |

## Result

- dry_run_status: pkg17r_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `a1a1f102c7576b94a86cc30e9851e58a7032f3c0feaa5f2ee2e10f59e15f9fba`
- dry_run_proof_sha256: `9e318aac9d54ab56bd38140f371154302909e04b7efa308b72d7f39fd9bee9f3`
- stop_findings: 0

## Approval Text

```text
Approve real PKG-17R-LEAGUE-REVERSE-BULK-PARENT-INSERTS apply only. Fingerprint: a1a1f102c7576b94a86cc30e9851e58a7032f3c0feaa5f2ee2e10f59e15f9fba. Scope: 14 stamped parent inserts, 14 identity inserts, 14 child printing inserts; finishes reverse=14; stamp labels League Stamp=14; sets bw1=3, pl4=2, xy8=2, bw11=1, bw2=1, bw3=1, bw8=1, hgss1=1, pl1=1, pl3=1. Dry-run proof: 0270d48129a894fb25b0ed7668f78cc6e8b8fae443733f22c2bb05067dc6042e == 0270d48129a894fb25b0ed7668f78cc6e8b8fae443733f22c2bb05067dc6042e. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
