# MEE Core Lifecycle Schema Readiness V1

Generated: 2026-06-26

Mode: local migration candidate plus rollback-only dry-run proof

## Scope Approved

`MEE-CORE-LIFECYCLE-SCHEMA-READINESS-V1`

Approved scope was limited to:

- create a local Supabase migration candidate,
- create/keep rollback-only dry-run SQL proof,
- add contract tests,
- produce readback/audit artifacts,
- no remote migration apply,
- no evidence backfill,
- no provider calls,
- no source fetches,
- no pricing writes,
- no public pricing,
- no app-visible pricing.

## Local Migration Candidate

Created:

`supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql`

Migration hash:

`24328318BF5C49B170852844623CDB3B4F87BFFED9C7F1C29971F343749126E9`

The local candidate proposes:

- `public.market_evidence_observations`
- `public.market_evidence_lifecycle_events`
- `public.v_market_evidence_lifecycle_current_v1`
- 5 supporting indexes
- RLS enablement on both tables
- 2 service-role-only policies

## Rollback-Only Dry-Run SQL

Artifact:

`docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql`

Dry-run SQL hash:

`259680AB8F013CED74640F73FDC76877C249045C37F4D0DEC257023DF6BD6667`

Executed with:

`supabase db query --file docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql --linked`

Dry-run output summary:

- package: `MEE_CORE_SCHEMA_GAP_AUDIT_V1_DRY_RUN_MIGRATION_PLAN`
- proposed tables: 2
- proposed views: 1
- proposed indexes: 5
- proposed service-role policies: 2
- rollback only: true
- writes `pricing_observations`: false
- writes `ebay_active_prices_latest`: false
- creates public pricing view: false
- creates app-visible pricing: false
- writes identity tables: false
- writes vault tables: false
- writes image/storage tables: false

## Rollback Readback Proof

After the rollback-only dry-run, linked DB readback showed:

| Object | Exists After Rollback |
| --- | --- |
| `market_evidence_observations` | false |
| `market_evidence_lifecycle_events` | false |
| `v_market_evidence_lifecycle_current_v1` | false |

This confirms the dry-run left no persistent lifecycle objects behind.

## Tests

Updated:

`tests/contracts/mee_core_schema_gap_audit_v1.test.mjs`

Test hash:

`A869B90D02C8D253C915857297E3FA4F59CBCD157F78DB107AB2B76E1BBC087A`

Verification command:

`node --test tests/contracts/market_evidence_engine_core_v1.test.mjs tests/contracts/mee_core_schema_gap_audit_v1.test.mjs`

Result:

- tests: 2
- pass: 2
- fail: 0

## Boundary Proof

Performed:

- local migration candidate file creation
- rollback-only linked DB dry-run
- linked DB post-rollback existence readback
- contract tests

Not performed:

- no remote migration apply
- no evidence backfill
- no provider calls
- no source fetches
- no `pricing_observations` writes
- no `ebay_active_prices_latest` writes
- no public pricing view changes
- no app-visible pricing
- no public price rollups
- no identity-table writes
- no vault writes
- no image/storage writes
- no deletes
- no merges
- no global apply

## Recommendation

The readiness package is clean.

The next step should be a targeted remote schema apply only if you want the lifecycle spine to exist in production. Do not backfill evidence into it yet. The follow-up after schema apply should be a tiny lifecycle projection plan, not acquisition.

## Next Approval Prompt

`Approve real MEE-CORE-LIFECYCLE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: 24328318BF5C49B170852844623CDB3B4F87BFFED9C7F1C29971F343749126E9. Scope: execute supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, creating provider-agnostic internal Market Evidence Engine lifecycle objects: market_evidence_observations, market_evidence_lifecycle_events, v_market_evidence_lifecycle_current_v1, supporting indexes, RLS enablement, and service-role-only policies. Then mark only migration version 20260625060000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No merges. No db push. No global apply.`
