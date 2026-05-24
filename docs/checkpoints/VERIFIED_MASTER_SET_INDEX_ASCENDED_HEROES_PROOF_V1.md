# VERIFIED_MASTER_SET_INDEX_ASCENDED_HEROES_PROOF_V1

Date: 2026-05-24

## Summary

Ascended Heroes is the first Grookai set to complete the full Verified Master Set Index truth loop:

```text
external evidence
-> Verified Master Set Index
-> read-only Grookai comparison
-> maintenance-gated apply
-> post-apply verification
```

Final state:

| metric | value |
| --- | --- |
| Grookai set | `me02.5` / Ascended Heroes |
| Verified index printings | 620 |
| Grookai printings after apply | 620 |
| Comparison status | `verified_by_index` |
| Unsupported rows after apply | 0 |
| Missing rows after apply | 0 |
| Source conflicts | 0 |

## Final Finish Counts

| finish_key | count |
| --- | --- |
| `normal` | 153 |
| `holo` | 142 |
| `reverse` | 178 |
| `pokeball` | 130 |
| `cosmos` | 7 |
| `rocket_reverse` | 10 |

## Applied Changes

Applied through governed paths:

1. Supabase migration:
   - `supabase/migrations/20260524051500_add_ascended_heroes_finish_keys_v1.sql`
   - Added `cosmos` and `rocket_reverse` to `public.finish_keys`.

2. Canon maintenance runner:
   - `backend/maintenance/ascended_heroes_printing_truth_normalization_apply_v1.mjs`
   - Inserted 17 missing verified printings.
   - Deleted 412 unsupported speculative printings.
   - Required explicit maintenance mode, `--apply`, and `ASCENDED_HEROES_NORMALIZATION_CONFIRM=ASCENDED_HEROES_NORMALIZATION_V1`.

Rollback artifact:

```text
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_normalization_rollback_2026-05-24T05-23-25-612Z.json
```

## Proof Artifacts

Primary reports:

```text
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_verified_index_v1.json
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_grookai_comparison_v1.json
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_normalization_plan_v1.json
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_apply_readiness_v1.json
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_finish_matrix_v1.json
docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_parallel_coverage_v1.json
```

Post-apply comparison summary:

```json
{
  "status": "verified_by_index",
  "matched_sets": 1,
  "grookai_printing_rows": 620,
  "index_master_verified_printings": 620,
  "missing_finish_keys_for_index": [],
  "by_status": {
    "verified_by_index": 620
  }
}
```

## Migration Ledger Note

Remote migration ledger after this checkpoint:

| migration | local | remote | status |
| --- | --- | --- | --- |
| `20260523183000_printing_truth_review_sidecar_v1.sql` | present | absent | pending remote |
| `20260524051500_add_ascended_heroes_finish_keys_v1.sql` | present | present | applied |

The `20260523183000` sidecar drift is intentionally not hidden by this checkpoint. It remains a pending migration and must be resolved deliberately before future migration pushes that include all local migrations.

The `20260524051500` migration was applied through a temporary Supabase workdir that excluded `20260523183000`, after a `supabase db push --dry-run` proved only the finish-key migration would be pushed.

## Verification Commands

Commands run successfully after apply:

```powershell
node scripts\audits\verified_master_set_index_v1_run.mjs --sets ascended_heroes --fail-on-unverified-printings --expect-finish-counts reverse=178,pokeball=130,rocket_reverse=10,masterball=0

$env:ENABLE_CANON_MAINTENANCE_MODE='true'
$env:CANON_MAINTENANCE_MODE='EXPLICIT'
$env:CANON_MAINTENANCE_TASK='backend/maintenance/ascended_heroes_printing_truth_normalization_apply_v1.mjs'
node backend\maintenance\run_canon_maintenance_v1.mjs

node --test tests\contracts\verified_master_set_index_finish_profile.test.mjs
node --test tests\contracts\contract_scope_v1.test.mjs
node --test tests\contracts\canon_maintenance_boundary.test.mjs
git diff --check
npm run preflight
```

`npm run preflight` result:

```text
PASS_WITH_DEFERRED_DEBT
critical_fail_checks: 0
known_deferred_debt_checks: 10
```

## Principle Proven

This checkpoint proves the Verified Master Set Index can do more than audit drift. It can drive a controlled, evidence-backed repair of canonical printing truth while preserving guardrails, rollback evidence, and migration-ledger visibility.
