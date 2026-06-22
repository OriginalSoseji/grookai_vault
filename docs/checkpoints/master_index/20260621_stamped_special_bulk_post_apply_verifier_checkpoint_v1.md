# Stamped/Special Bulk Post-Apply Verifier Checkpoint V1

Date: 2026-06-21

## Purpose

Create a deterministic read-only post-apply verifier for the five-package stamped/special bulk gate.

This checkpoint does not authorize or perform the real apply. It preserves the exact verification command future Codex should run after the operator approves and executes the bulk package.

## Source Gate

The verifier consumes the frozen guarded dry-run artifacts from:

- `POKUMON-DETAIL-PARENT-INSERTS`
- `LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS`
- `DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS`
- `DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS`
- `SECOND-SOURCE-MANUAL-PARENT-INSERTS`

## Verification Script

```powershell
node scripts\audits\english_master_index_stamped_special_bulk_post_apply_verify_v1.mjs
```

Script:

```text
scripts/audits/english_master_index_stamped_special_bulk_post_apply_verify_v1.mjs
```

Generated reports:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_bulk_post_apply_verify_v1.json
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_bulk_post_apply_verify_v1.md
```

## Current Result

The bulk package has not been applied yet, so the correct result is:

```text
verification_status: not_applied
apply_detected: false
expected_parent_rows: 78
present_parent_rows: 0
expected_identity_rows: 78
present_identity_rows: 0
expected_child_rows: 79
present_child_rows: 0
forbidden_stamped_child_rows: 0
```

Report fingerprint:

```text
b9939c614c0456806574279898897b82f3375d21030730a2501e28337ce171fc
```

## Post-Apply Pass Condition

After the explicit real apply is approved and executed, rerun the verifier. It must report:

```text
verification_status: passed
expected_parent_rows: 78
present_parent_rows: 78
expected_identity_rows: 78
present_identity_rows: 78
expected_child_rows: 79
present_child_rows: 79
verified_child_rows: 79
forbidden_stamped_child_rows: 0
```

One target parent appears twice because that parent intentionally carries two child printings. Child target IDs are unique.

## Safety

```text
audit_only: true
db_reads_performed: true
db_writes_performed: false
durable_db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
global_apply_performed: false
```

## Verification Commands

Executed:

```powershell
node --check scripts\audits\english_master_index_stamped_special_bulk_post_apply_verify_v1.mjs
node scripts\audits\english_master_index_stamped_special_bulk_post_apply_verify_v1.mjs
git status --short -- supabase\migrations
```

Pending in this turn after checkpoint creation:

```powershell
node --test tests\contracts\contract_scope_v1.test.mjs
git diff --check
git status --short -- supabase\migrations
Get-Process node -ErrorAction SilentlyContinue
```
