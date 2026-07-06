# MEE_09D_REFERENCE_SIGNAL_ROLLUP_CONTRACT_V1

## Status

Contract and schema candidate only.

No migration was created. No database writes, provider calls, source fetches, pricing observations, public pricing views, app-visible pricing, identity writes, vault writes, image writes, deletes, merges, or global apply were executed.

## Purpose

Define the first stored rollup boundary for Market Evidence Engine reference signals.

This contract intentionally does **not** publish prices. It only proposes an internal service-role table that can preserve the `MEE_09C` review status for each signal candidate.

## Governing Rules

This contract is subordinate to:

- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_09B_INTERNAL_REFERENCE_SIGNAL_READ_MODEL_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_09C_REFERENCE_SIGNAL_REVIEW_GATE_V1.md`

Locked invariants:

- Reference signal rollups are not Market Truth.
- Rollups must not write `pricing_observations`.
- Rollups must not write `ebay_active_prices_latest`.
- Rollups must not create public pricing views.
- Rollups must not affect vault totals.
- Rollups must not be app-visible in V1.
- Every row has `publishable = false`.
- Every row has `app_visible = false`.
- Every row has `market_truth = false`.
- Every row has `needs_review = true`.
- Special-lane rows remain blocked until a later lane-specific review contract exists.

## Current Proof State

`MEE_09C` classified 993 USD reference signals:

```text
reviewed_signal_count: 993
publishable_count: 0
review_ready_count: 0
review_required_count: 969
blocked_count: 24
```

Because `review_ready_count = 0`, this contract does not propose any app-facing display or public reference price.

## Proposed Internal Table

`public.market_reference_signal_rollups`

Role:

- stores internal reference signal rollup snapshots
- preserves review status and flags
- keeps low/median/high USD values for audit and review only
- does not publish or expose pricing

Key columns:

```sql
card_print_id uuid not null references public.card_prints(id) on delete cascade
gv_id text
rollup_version text not null
read_model_version text not null
review_gate_version text not null
rollup_lane text not null default 'internal_reference_signal'
review_status text not null
currency text not null default 'USD'
reference_low numeric
reference_median numeric
reference_high numeric
source_count integer not null default 0
eligible_evidence_count integer not null default 0
quarantined_evidence_count integer not null default 0
currency_excluded_evidence_count integer not null default 0
price_ratio numeric
variance_band text
review_flags text[] not null default '{}'
source_summary jsonb not null default '{}'
signal_payload jsonb not null default '{}'
needs_review boolean not null default true
publishable boolean not null default false
app_visible boolean not null default false
market_truth boolean not null default false
```

Required checks:

```sql
rollup_lane = 'internal_reference_signal'
currency = 'USD'
needs_review = true
publishable = false
app_visible = false
market_truth = false
unique (card_print_id, rollup_version)
```

## RLS

Initial table access is service-role-only.

No anon or authenticated direct access is granted.

## Candidate Artifacts

- `docs/sql/market_reference_signal_rollups_v1_guarded_dry_run.sql`
- `docs/sql/market_reference_signal_rollups_v1_migration_candidate.sql`

The dry-run SQL rolls back.

The migration-candidate SQL commits, but it is not copied into `supabase/migrations` until a future explicit approval.

## Forbidden In V1

This contract must not:

- create public views
- create app-facing RPCs
- write `pricing_observations`
- write `ebay_active_prices_latest`
- update card identity
- update vault rows
- update image rows
- delete existing pricing evidence
- mark any reference signal as publishable
- label any value as Market Truth

## Future Apply Boundary

If approved later, the first apply may only create the internal table, indexes, checks, RLS, and service-role policy.

It must not backfill rows in the same step.

A later backfill package would need its own manifest, dry-run proof, approval text, and rollback plan.

## Next Step

Run `MEE_09D_REFERENCE_SIGNAL_ROLLUP_CONTRACT_GATE_V1`.

If the gate passes, the user may decide whether to approve creating a migration file. Even then, no remote migration apply or rollup backfill should happen without a separate explicit prompt.
