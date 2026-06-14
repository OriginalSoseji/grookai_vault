# PKG-20A Overgeneration Child Delete Guarded Dry Run V1

Rollback-only dry run for unsupported child printing overgeneration candidates.

## Safety

- package_id: PKG-20A-OVERGENERATION-CHILD-DELETE
- dry_run_only: true
- db_writes_performed: false
- durable_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Scope

- target_child_deletes: 9453
- finishes: {"holo":5321,"reverse":2133,"normal":1999}
- blocked_source_rows: 0

| lane | rows |
| --- | --- |
| holo_overgeneration_candidate_no_dependencies | 5321 |
| reverse_overgeneration_candidate_no_dependencies | 2133 |
| normal_overgeneration_candidate_no_dependencies | 1999 |

## Top Sets

| set | rows |
| --- | --- |
| sm12 | 270 |
| sv10.5w | 264 |
| sv10.5b | 263 |
| sm11 | 253 |
| sm8 | 243 |
| sm10 | 227 |
| sm9 | 196 |
| sm7 | 187 |
| sm5 | 183 |
| sm1 | 180 |
| xy8 | 176 |
| xy5 | 173 |
| sm2 | 170 |
| sm3 | 163 |
| bw7 | 162 |
| xy1 | 162 |
| sm6 | 157 |
| ex15 | 149 |
| xy9 | 149 |
| xy10 | 145 |
| bw8 | 142 |
| gym1 | 134 |
| gym2 | 133 |
| bw6 | 132 |
| xy12 | 131 |
| xy4 | 131 |
| xy11 | 130 |
| bw1 | 126 |
| bw9 | 124 |
| sm4 | 124 |
| xy6 | 122 |
| xy3 | 121 |
| bw5 | 120 |
| ex3 | 116 |
| xy2 | 115 |
| neo4 | 113 |
| bw10 | 112 |
| xy7 | 112 |
| neo1 | 111 |
| bw4 | 106 |

## Proof

- before_hash: ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562
- after_hash: ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562
- rollback_proof_hash_match: true

## Recommended Real Apply Approval

```text
Approve real PKG-20A-OVERGENERATION-CHILD-DELETE apply only. Fingerprint: 7b43729871a9a96e609f054fb673a9035481f4d24fa04ddb2861d57a2a6821c3. Scope: 9453 unsupported overgeneration child deletes; finishes holo=5321, reverse=2133, normal=1999; lanes holo_overgeneration_candidate_no_dependencies=5321, reverse_overgeneration_candidate_no_dependencies=2133, normal_overgeneration_candidate_no_dependencies=1999. Dry-run proof: ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562 == ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562. No global apply. No migrations. No parent writes. No merges. No quarantine.
```
