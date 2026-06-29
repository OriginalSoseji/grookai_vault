# MEE Core Overnight Schema Readiness Plan V1

Status: overnight plan only

Date: 2026-06-26

## Objective

Prepare the Market Evidence Engine core lifecycle schema for a clean apply decision without doing acquisition, public pricing, or DB writes overnight.

The goal is to wake up with:

- a local migration candidate ready for review,
- a rollback-only dry-run proof,
- contract tests,
- schema gap readback,
- an exact approval prompt for the next real step.

## Why This Is The Right Overnight Step

The current blocker is not evidence coverage. The blocker is that Grookai does not yet have a provider-agnostic lifecycle spine.

Existing warehouses preserve evidence, but the lifecycle is still inferred from lane-specific tables:

- reference evidence lives in `market_reference_*`,
- active listing evidence lives in `market_listing_*`,
- rollup gates live in lane-specific rollup tables,
- no shared lifecycle event ledger exists,
- no shared current-state view exists.

Before more acquisition or pricing work, we need the core lifecycle schema candidate.

## Overnight Scope

Allowed:

- create a local Supabase migration candidate only,
- keep it service-role-only,
- include rollback/dry-run SQL proof,
- add tests,
- generate readback/audit docs,
- compute hashes/fingerprints,
- produce next approval prompt.

Not allowed:

- no remote migration apply,
- no DB writes,
- no provider calls,
- no eBay acquisition,
- no source fetches,
- no evidence backfill,
- no `pricing_observations` writes,
- no `ebay_active_prices_latest` writes,
- no public pricing views,
- no app-visible pricing,
- no identity-table writes,
- no vault writes,
- no image/storage writes,
- no deletes,
- no merges,
- no global apply.

## Planned Work

### Step 1: Promote Dry-Run Plan Into A Local Migration Candidate

Create a local migration candidate based on:

`docs/sql/mee_core_schema_gap_audit_v1_dry_run_migration_plan.sql`

Candidate target:

`supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql`

The migration candidate should contain:

- `market_evidence_observations`
- `market_evidence_lifecycle_events`
- `v_market_evidence_lifecycle_current_v1`
- indexes for source lookup, card lookup, lifecycle state lookup, and rollup lineage lookup
- RLS enablement
- service-role-only policies

### Step 2: Add Contract Tests

Add tests proving:

- all ten lifecycle states exist,
- stage order is enforced,
- unknown lifecycle states are rejected by SQL text constraints,
- RLS is enabled,
- service-role-only policies exist,
- no public pricing view is created or changed,
- no `pricing_observations` writes exist,
- no `ebay_active_prices_latest` writes exist.

### Step 3: Run Local SQL Dry-Run

Run the candidate in a rollback transaction against the linked DB only after confirming it ends in `rollback;` for dry-run validation.

Expected output:

- proposed table count: 2
- proposed view count: 1
- proposed service-role policies: 2
- public pricing writes: false
- app-visible writes: false

### Step 4: Produce Readback Package

Create a readback report under:

`docs/audits/market_evidence_engine_v1/`

The report should include:

- schema candidate hash,
- dry-run proof hash,
- existing-object comparison,
- proposed-object list,
- boundary proof,
- next approval prompt.

## Expected Morning Result

By morning, this should be ready for one of two decisions:

1. Approve local migration candidate only.
2. Revise schema candidate before remote apply.

It should not leave any remote DB changes behind.

## Exact Approval Prompt For This Overnight Plan

Use this if you want the overnight readiness work to proceed:

`Approve real MEE-CORE-LIFECYCLE-SCHEMA-READINESS-V1 run only. Scope: create a local Supabase migration candidate for provider-agnostic Market Evidence Engine lifecycle state and transition history, plus rollback-only dry-run SQL proof, contract tests, and readback/audit artifacts only. Include market_evidence_observations, market_evidence_lifecycle_events, v_market_evidence_lifecycle_current_v1, indexes, RLS enablement, and service-role-only policies. No remote migration apply. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No merges. No global apply. Produce final audit report before stopping.`

## Next Morning Approval Prompt If Clean

Only if the readiness package is clean, the next real remote-apply prompt should be:

`Approve real MEE-CORE-LIFECYCLE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: <hash>. Scope: execute supabase/migrations/20260625060000_market_evidence_core_lifecycle_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, creating provider-agnostic internal Market Evidence Engine lifecycle objects: market_evidence_observations, market_evidence_lifecycle_events, v_market_evidence_lifecycle_current_v1, supporting indexes, RLS enablement, and service-role-only policies. Then mark only migration version 20260625060000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image/storage writes. No deletes. No merges. No db push. No global apply.`
