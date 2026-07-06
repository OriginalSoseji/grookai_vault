# MEE-CANDIDATE-CLEANUP-EVENT-SEED-APPLY-V1

Mode: apply only

Generated: 2026-06-27

## Scope

Applied the `MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1` chunked seed package against linked Supabase project `ycdxbpibncqcchqiihfz`.

Inserted append-only rows into:

`public.market_listing_candidate_cleanup_events`

No provider calls. No source fetches. No function invocation. No public pricing.

## Preflight

```json
{
  "target_candidate_rows": 52630,
  "distinct_target_candidate_rows": 52630,
  "existing_cleanup_event_rows_for_targets": 0
}
```

## Apply

Executed the 11 SQL chunks in numeric order inside one transaction.

## Readback

```json
{
  "cleanup_event_rows": 52630,
  "distinct_candidate_ids": 52630,
  "public_boundary_leak_rows": 0
}
```

## Boundary

No writes were made to:

- `pricing_observations`
- `ebay_active_prices_latest`
- public pricing views
- app-visible pricing surfaces
- identity tables
- `card_prints` or `card_printings`
- vault tables
- image/storage tables

No deletes, upserts, merges, migrations, or global apply were performed.

## Artifacts

- Apply readback: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-APPLY-V1/apply_readback.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-EVENT-SEED-APPLY-V1/report.json`

