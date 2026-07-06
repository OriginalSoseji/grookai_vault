# MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1

## Status

Contract plan only.

No migration was created. No database writes, provider calls, scraper jobs, pricing rollups, app-visible price rows, or public price publication were executed.

## Purpose

Define the warehouse boundary for free reference evidence gathered by the Market Evidence Engine.

This checkpoint covers the reference lanes proven by the MEE-06 run:

- `tcgcsv_reference`
- `pokemontcg_io_reference`

The goal is to make reference evidence durable, replayable, and auditable without letting benchmark/reference feeds become Grookai Market Truth.

## Governing Rules

This plan is subordinate to:

- `docs/contracts/PRICING_EVIDENCE_ENGINE_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_02_WAREHOUSE_IMPLEMENTATION_PLAN_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_04A_SOURCE_REGISTRY_AND_EVIDENCE_CONTRACT_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_06C_NORMALIZED_REFERENCE_EVIDENCE_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_06D_FREE_REFERENCE_COVERAGE_GAP_V1.md`

Locked invariants:

- Reference evidence is not Market Truth.
- Reference evidence must not write `pricing_observations`.
- Reference evidence must not write `ebay_active_prices_latest`.
- Reference evidence must not write public card price summaries.
- Reference evidence must not appear as app-visible current pricing until a later reviewed rollup contract exists.
- Every source keeps `can_publish_price_directly = false`.
- Normalized reference rows are model inputs only, not public values.
- Raw reference payloads are append-only and replayable.
- Broad backfill remains disabled unless explicitly approved.

## Current Proof State

The MEE-06 proof showed that free reference lanes can cover most ordinary mapped targets without PriceCharting API dependency:

```text
target_count: 1000
covered_target_count: 993
uncovered_target_count: 7
tcgcsv_model_eligible_card_count: 993
pokemontcg_io_model_eligible_card_count: 197
combined_model_eligible_card_count: 993
```

The seven uncovered targets were not identity failures. They had upstream TCGCSV products but no TCGCSV price rows and no PokemonTCG.io mapping:

- `Pidove BW15`
- `Tropical Beach BW28` Worlds 2011 Staff
- `Tropical Beach BW28` Worlds 2011 Top 16
- `Tropical Beach BW50` Worlds 2012
- `Tropical Beach BW50` Worlds 2012 Top 32
- `Lucario BW85`
- `Eevee BW97`

## Target Architecture

```text
MEE query batch
  -> free reference acquisition run
  -> market_reference_raw_snapshots
  -> market_reference_candidates
  -> market_reference_normalized_evidence
  -> market_reference_coverage_reports
  -> future reviewed reference signal rollup
```

This path is intentionally separate from:

```text
eBay market evidence
  -> market_evidence_raw_snapshots
  -> market_evidence_normalized_listings
  -> pricing_observations
  -> accepted market pricing rollups
```

## Proposed Tables

### 1. `market_reference_acquisition_runs`

Role:

- Stores run-level provenance for a free-reference acquisition pass.
- Links source artifacts, batch artifacts, options, and summary counts.
- Does not store card-level truth.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
run_key text not null,
contract_version text not null,
source_phase text not null,
source_list text[] not null default '{}',
batch_artifact_path text,
batch_artifact_hash text,
input_artifact_paths text[] not null default '{}',
options jsonb not null default '{}'::jsonb,
summary jsonb not null default '{}'::jsonb,
started_at timestamptz,
finished_at timestamptz,
created_at timestamptz not null default now()
```

Required checks:

```sql
source_phase in (
  'MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1',
  'MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1',
  'MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1',
  'MEE-06D_FREE_REFERENCE_COVERAGE_GAP_V1'
)
```

Recommended uniqueness:

```sql
unique (run_key)
```

### 2. `market_reference_raw_snapshots`

Role:

- Append-only storage for upstream reference payloads.
- Keeps raw source evidence replayable.
- Does not classify, map, score, or publish price.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
acquisition_run_id uuid null references public.market_reference_acquisition_runs(id) on delete set null,
source text not null,
source_object_type text not null,
source_object_id text not null,
source_url text,
raw_payload jsonb not null,
observed_at timestamptz not null,
ingested_at timestamptz not null default now(),
payload_hash text not null,
created_at timestamptz not null default now()
```

Required checks:

```sql
source in ('tcgcsv_reference', 'pokemontcg_io_reference')
source_object_type in (
  'tcgcsv_group_products',
  'tcgcsv_group_prices',
  'tcgcsv_product',
  'tcgcsv_price_row',
  'pokemontcg_card'
)
```

Recommended indexes:

```sql
(source, source_object_type, source_object_id)
(source, payload_hash)
(acquisition_run_id)
(observed_at desc)
```

Recommended uniqueness:

```sql
unique (source, source_object_type, source_object_id, payload_hash)
```

### 3. `market_reference_candidates`

Role:

- Stores card-level reference candidate evidence envelopes.
- Mirrors the MEE-04A candidate object contract.
- Keeps source-derived price buckets and metrics review-only.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
acquisition_run_id uuid null references public.market_reference_acquisition_runs(id) on delete set null,
raw_snapshot_id uuid null references public.market_reference_raw_snapshots(id) on delete set null,
card_print_id uuid not null references public.card_prints(id) on delete cascade,
gv_id text not null,
source text not null,
source_type text not null default 'reference',
source_url text,
raw_title text,
raw_price numeric,
currency text,
condition_hint text,
finish_hint text,
observed_at timestamptz not null,
match_confidence_hint text not null default 'unreviewed',
exclusion_flags text[] not null default '{}',
needs_review boolean not null default true,
can_publish_price_directly boolean not null default false,
raw_payload jsonb not null default '{}'::jsonb,
candidate_hash text not null,
created_at timestamptz not null default now()
```

Required checks:

```sql
source in ('tcgcsv_reference', 'pokemontcg_io_reference')
source_type = 'reference'
needs_review = true
can_publish_price_directly = false
```

Recommended indexes:

```sql
(card_print_id, source, observed_at desc)
(source, candidate_hash)
(acquisition_run_id)
(raw_snapshot_id)
```

Recommended uniqueness:

```sql
unique (source, candidate_hash)
```

Candidate hash input:

```text
source
card_print_id
source_object_id or source_url
raw_title
raw_price
currency
condition_hint
finish_hint
observed_at
raw_payload metric key
```

### 4. `market_reference_normalized_evidence`

Role:

- Stores deterministic normalized projections from candidate rows.
- Preserves model eligibility, metric quarantine, and quality flags.
- Does not produce public pricing.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
candidate_id uuid not null references public.market_reference_candidates(id) on delete cascade,
card_print_id uuid not null references public.card_prints(id) on delete cascade,
source text not null,
normalizer_version text not null,
metric_key text,
metric_family text,
normalized_price numeric,
normalized_currency text,
model_disposition text not null,
model_eligible boolean not null default false,
evidence_quality_score numeric,
weight_hint numeric,
quality_flags text[] not null default '{}',
group_reference_median numeric,
normalized_payload jsonb not null default '{}'::jsonb,
normalized_at timestamptz not null default now()
```

Required checks:

```sql
source in ('tcgcsv_reference', 'pokemontcg_io_reference')
model_disposition in (
  'reference_model_candidate',
  'quarantined_metric',
  'quarantined_price_outlier',
  'blocked_candidate'
)
```

Recommended indexes:

```sql
(candidate_id)
(card_print_id, source, model_eligible)
(normalizer_version)
(model_disposition)
```

Recommended uniqueness:

```sql
unique (candidate_id, normalizer_version)
```

### 5. `market_reference_coverage_reports`

Role:

- Stores bounded coverage audits for free reference lanes.
- Explains which cards have model-eligible reference evidence and which still need acquisition.
- Does not store public prices.

Proposed columns:

```sql
id uuid primary key default gen_random_uuid(),
report_key text not null,
contract_version text not null,
batch_artifact_path text,
tcgcsv_artifact_path text,
pokemontcg_io_artifact_path text,
target_count integer not null default 0,
covered_target_count integer not null default 0,
uncovered_target_count integer not null default 0,
source_summary jsonb not null default '{}'::jsonb,
counts jsonb not null default '{}'::jsonb,
samples jsonb not null default '{}'::jsonb,
artifact_path text,
report_hash text not null,
generated_at timestamptz not null,
created_at timestamptz not null default now()
```

Recommended uniqueness:

```sql
unique (report_key)
```

## Future Deferred Table

`market_reference_signal_rollups` is intentionally deferred.

That table should only be introduced after a separate reviewed contract defines:

- model quorum
- source weighting
- currency handling
- finish and condition policy
- stale evidence windows
- outlier policy
- app display language
- rollback behavior

Until that contract exists, reference evidence remains stored evidence only.

## RLS And Access

Initial migration should make all tables service-role only:

- backend service role can insert and select
- public anon cannot select
- authenticated users cannot select directly
- app UI reads no reference warehouse tables directly

Any public exposure must go through a later reviewed RPC or materialized read model.

## Migration Boundary

The first migration for this contract should be separate and explicit:

```text
supabase/migrations/<timestamp>_market_reference_warehouse_v1.sql
```

It should only create:

- `market_reference_acquisition_runs`
- `market_reference_raw_snapshots`
- `market_reference_candidates`
- `market_reference_normalized_evidence`
- `market_reference_coverage_reports`
- indexes
- checks
- RLS/service-role policies
- read-only audit views

It must not:

- alter `pricing_observations`
- write `pricing_observations`
- alter `ebay_active_prices_latest`
- write latest price tables
- write price summaries
- create public app-facing pricing views
- modify card identity tables
- modify vault tables
- modify image metadata

## Backfill Boundary

First backfill should be artifact-sourced only.

Allowed inputs:

- MEE-04C batch artifacts
- MEE-06A PokemonTCG.io reference acquisition artifacts
- MEE-06B TCGCSV reference acquisition artifacts
- MEE-06C normalized reference artifacts
- MEE-06D coverage gap artifacts

Backfill must be idempotent by hashes and unique keys.

Backfill must not call providers.

Backfill must not compute public prices.

## Verification Gates

Before any migration apply:

- generate dry-run SQL
- fingerprint the SQL
- prove no existing migration is modified
- prove no `pricing_observations` write exists
- prove no `ebay_active_prices_latest` write exists
- prove no app-facing price view is created

After migration apply, before backfill:

- verify tables exist
- verify RLS is enabled
- verify anon/authenticated direct reads are denied
- verify service role can write bounded test rows in a rollback-safe transaction

After artifact backfill:

- row counts match source artifacts
- candidate rows keep `can_publish_price_directly = false`
- candidate rows keep `needs_review = true`
- normalized rows preserve `model_disposition`
- coverage report stores the same target counts as the local proof
- app public pricing remains unchanged

## Next Step

Proceed to `MEE-07B`: draft migration SQL only.

`MEE-07B` should produce a dry-run SQL file, plan hash, and fingerprint for explicit approval. It should not apply the migration.
