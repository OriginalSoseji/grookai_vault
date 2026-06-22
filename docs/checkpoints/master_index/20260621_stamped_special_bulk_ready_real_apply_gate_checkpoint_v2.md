# Stamped/Special Bulk Ready Real Apply Gate Checkpoint V2

Generated: 2026-06-21

## Scope

This checkpoint consolidates the currently prepared stamped/special rollback-only dry-run packages into one no-write bulk real-apply gate.

This exists to reduce approval friction without weakening package-level safety.

This supersedes V1 because `SECOND-SOURCE-MANUAL-PARENT-INSERTS` changed from 2 rows to 3 rows after the Vaporeon / Dark Explorers Regional Championships Staff row was source-confirmed and rollback-tested.

## Included Packages

```text
POKUMON-DETAIL-PARENT-INSERTS
LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS
DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS
DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS
SECOND-SOURCE-MANUAL-PARENT-INSERTS
```

## Status

- real_apply_performed: false
- db_writes_performed: false
- migrations_created: false
- deletes_performed: false
- cleanup_performed: false
- quarantine_performed: false
- global_apply_performed: false

## Combined Scope

- parent_insert_scope: 78
- active_identity_insert_scope: 78
- child_printing_insert_scope: 79
- deletes: 0
- merges: 0
- cleanup: 0
- migrations: 0

Finish counts:

- reverse: 65
- normal: 6
- holo: 7
- cosmos: 1

## Package Proofs

### POKUMON-DETAIL-PARENT-INSERTS

- parent_insert_scope: 22
- active_identity_insert_scope: 22
- child_printing_insert_scope: 23
- finishes: reverse=17, normal=6
- fingerprint_sha256: `d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0`
- dry_run_proof_sha256: `f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73`
- rollback_verified: true

### LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS

- parent_insert_scope: 46
- active_identity_insert_scope: 46
- child_printing_insert_scope: 46
- finishes: reverse=45, cosmos=1
- fingerprint_sha256: `c5bf150695b2e4c2d009de7e4c39cb2e4acf341ceaccb64e6bd2e0d20d741fc1`
- dry_run_proof_sha256: `d89787b8681dcd269a21d40944681d0a92edad536a84428bec9e387680b20853`
- rollback_verified: true

### DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS

- parent_insert_scope: 5
- active_identity_insert_scope: 5
- child_printing_insert_scope: 5
- finishes: holo=5
- fingerprint_sha256: `46ee2cb0ad4702303aee2da1964578169dc101e6811d6d4a5b5655c3ba99893f`
- dry_run_proof_sha256: `fad519d5dc38f70bc3d3e1ad5db7cb5ddf90b1bfbb5d21669d701e3c071ac4c5`
- rollback_verified: true

### DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS

- parent_insert_scope: 2
- active_identity_insert_scope: 2
- child_printing_insert_scope: 2
- finishes: holo=2
- fingerprint_sha256: `e69e902cea92414cc5e2c8e25679815713c02ef052d15c15d9e4ee5bb8d8019b`
- dry_run_proof_sha256: `189a08eebdf16f493dbfec8bd89fc9017facd565c69d6a6fa6101435ea14c063`
- rollback_verified: true

### SECOND-SOURCE-MANUAL-PARENT-INSERTS

- parent_insert_scope: 3
- active_identity_insert_scope: 3
- child_printing_insert_scope: 3
- finishes: reverse=3
- fingerprint_sha256: `1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2`
- dry_run_proof_sha256: `61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572`
- rollback_verified: true

## Required Bulk Approval Phrase

Do not run a real apply unless the operator provides this exact scoped approval:

```text
Approve real STAMPED-SPECIAL-BULK-READY-PARENT-INSERTS apply only. Scope: five prepared rollback-proven packages: POKUMON-DETAIL-PARENT-INSERTS, LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS, DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS, DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS, and SECOND-SOURCE-MANUAL-PARENT-INSERTS. Combined scope: 78 stamped/special parent inserts, 78 active identity inserts, 79 child printing inserts; finishes reverse=65, normal=6, holo=7, cosmos=1. Package fingerprints: d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0; c5bf150695b2e4c2d009de7e4c39cb2e4acf341ceaccb64e6bd2e0d20d741fc1; 46ee2cb0ad4702303aee2da1964578169dc101e6811d6d4a5b5655c3ba99893f; e69e902cea92414cc5e2c8e25679815713c02ef052d15c15d9e4ee5bb8d8019b; 1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2. Dry-run proofs: f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73; d89787b8681dcd269a21d40944681d0a92edad536a84428bec9e387680b20853; fad519d5dc38f70bc3d3e1ad5db7cb5ddf90b1bfbb5d21669d701e3c071ac4c5; 189a08eebdf16f493dbfec8bd89fc9017facd565c69d6a6fa6101435ea14c063; 61afe4fc04739e1dd5ed182f264efa4451361c01800d6a54d3f869523306c572. No global apply. No migrations. No deletes. No merges. No cleanup.
```

## Guardrails

Bulk apply remains blocked if:

- any package fingerprint changes
- any dry-run proof changes
- any package scope changes
- a package is already partially applied
- target rows no longer match the dry-run artifacts
- migrations appear
- deletes, merges, cleanup, or global apply are added

If any package becomes stale, split it out and apply only the non-stale packages with a new gate.

## Verification Commands

```powershell
node --check scripts\audits\english_master_index_pokumon_detail_parent_insert_guarded_dry_run_v1.mjs
node --check scripts\audits\english_master_index_league_placement_stamp_guarded_dry_run_v1.mjs
node --check scripts\audits\english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.mjs
node --check scripts\audits\english_master_index_dv1_stamp_holo_second_wave_guarded_dry_run_v1.mjs
node --check scripts\audits\english_master_index_second_source_manual_parent_insert_guarded_dry_run_v1.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
```
