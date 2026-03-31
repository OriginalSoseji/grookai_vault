# EXTERNAL_DISCOVERY_STAGING_V1_FIRST_FULL_LOCAL_RUN

## Status

`LOCAL / VERIFIED / NON-CANON`

## Date

`2026-03-31`

## Context

Grookai now has all prerequisite layers for external discovery below the 40k canon gate:

- shared raw ingress in `public.raw_imports`
- deterministic JustTCG normalization / match / canon-gate logic
- non-canon external discovery staging allowed by rulebook and contract
- a dedicated staging table separate from the evidence-driven canon warehouse

This run is the first full local end-to-end execution of that pipeline for JustTCG Pokemon.

## Problem

Before this run, the architecture was lawful but not yet operationally proven end to end at full local scope.

The system needed proof that Grookai could:

- ingest the full JustTCG Pokemon raw catalog locally
- classify local raws into canon-gate buckets without touching canon
- stage only `CLEAN_CANON_CANDIDATE` rows
- preserve provenance back to `raw_imports`
- replay the staging worker without duplicate writes

## Decision

Execute the full local pipeline:

1. strict preflight attempt + local replay reset
2. full JustTCG Pokemon raw import into local `public.raw_imports`
3. full JustTCG staging dry-run
4. full JustTCG staging apply
5. replay apply
6. local SQL verification

Canon promotion remained blocked and was not attempted.

## Run Scope

- Environment: local Supabase only
- Source: JustTCG Pokemon cards
- Raw destination: `public.raw_imports`
- Staging destination: `public.external_discovery_candidates`
- Canon tables: untouched
- Mapping tables: untouched

## Commands Executed

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
supabase stop --project-id ycdxbpibncqcchqiihfz
supabase start
supabase db reset --local --yes
node --check backend\pricing\justtcg_import_cards_worker.mjs
node --check backend\pricing\justtcg_stage_clean_candidates_v1.mjs

$status = supabase status -o env
$api = ($status | Where-Object { $_ -like 'API_URL=*' })
$secret = ($status | Where-Object { $_ -like 'SECRET_KEY=*' })
$env:SUPABASE_URL = ($api -replace '^API_URL=\"?([^\"]+)\"?$', '$1')
$env:SUPABASE_SECRET_KEY = ($secret -replace '^SECRET_KEY=\"?([^\"]+)\"?$', '$1')
node backend/pricing/justtcg_import_cards_worker.mjs --apply
node backend/pricing/justtcg_import_cards_worker.mjs --apply --offset=169
node backend/pricing/justtcg_import_cards_worker.mjs --apply --set-id=nintendo-promos-pokemon

$env:SUPABASE_URL_LOCAL = ($api -replace '^API_URL=\"?([^\"]+)\"?$', '$1')
$env:SUPABASE_SECRET_KEY_LOCAL = ($secret -replace '^SECRET_KEY=\"?([^\"]+)\"?$', '$1')
node backend/pricing/justtcg_stage_clean_candidates_v1.mjs
node backend/pricing/justtcg_stage_clean_candidates_v1.mjs --apply
node backend/pricing/justtcg_stage_clean_candidates_v1.mjs --apply
```

Notes:

- `AuditLinkedSchema` was attempted first, but the linked `supabase db diff --linked` step remains flaky on the local Windows/Docker shadow-port path.
- `supabase db reset --local --yes` passed, which is the replay proof for the local migration chain.
- The first full raw import exceeded the tool timeout; because the worker is idempotent, the run was completed lawfully with `--offset=169` plus an explicit backfill of the one missing upstream set (`nintendo-promos-pokemon`).

## Verification Results

- Raw imports total:
  - `32,996`
- Distinct JustTCG sets ingested:
  - `211`
- Staging total:
  - `27,037`
- Replay apply:
  - `rows_written = 0`
  - `rows_skipped = 27,037`
  - `rows_failed = 0`
- Duplicate safety:
  - no duplicate `(source, upstream_id, raw_import_id)` rows detected
- Provenance join:
  - staging rows joined back to `raw_imports` successfully

Top staged sets from the verification query:

- `world-championship-decks-pokemon` — `2,519`
- `prize-pack-series-cards-pokemon` — `689`
- `me-ascended-heroes-pokemon` — `577`
- `miscellaneous-cards-products-pokemon` — `563`
- `deck-exclusives-pokemon` — `461`

Canon-gate distribution from the read-only source query logic:

- `CLEAN_CANON_CANDIDATE` — `27,037`
- `PRINTED_IDENTITY_REVIEW` — `2,276`
- `NON_CANDIDATE` — `3,683`

The staged total matches the clean-candidate distribution exactly.

## Current Truths

- Full JustTCG Pokemon card raws were ingested locally into `public.raw_imports`
- Full non-canon staging executed locally into `public.external_discovery_candidates`
- Canon tables remained untouched
- `external_mappings` remained untouched
- Replay safety passed
- Provenance linkage from staging back to `raw_imports` passed
- The system is now operational locally as a non-canon external discovery queue
- Canon promotion remains blocked below the 40k gate

## Invariants Confirmed

1. Raw ingress and staging remain separate from canonical truth tables.
2. Only `CLEAN_CANON_CANDIDATE` rows are staged.
3. Replay safety is enforced by `(source, upstream_id, raw_import_id)`.
4. Staged rows preserve source provenance.
5. The canon-gate classifier remains deterministic.
6. Staging remains a review boundary, not a truth boundary.

## Risks Still Open

- The linked `supabase db diff --linked` step is still flaky locally because of the recurring shadow-port/container issue.
- Full upstream import is operationally large enough that resumable batching remains important for local verification runs.
- `PRINTED_IDENTITY_REVIEW` rows are not yet persisted into a separate review lane; they remain visible only through read-only canon-gate logic today.
- No canon-promotion layer is lawful below the 40k gate, so staged rows remain intentionally non-canonical.

## Why It Matters

This checkpoint proves the external discovery staging model is no longer just architectural law.

It is now operational locally:

- raw JustTCG discovery can be ingested
- numerically clean unmatched rows can be staged safely
- provenance survives intact
- replay does not duplicate candidates

Grookai now has a working non-canon discovery queue for external-source Pokemon rows while keeping canon integrity intact.
