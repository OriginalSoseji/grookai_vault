# MEE-CANDIDATE-CLEANUP-ACTION-MODEL-REMOTE-APPLY-V1

Mode: targeted remote schema apply

Generated: 2026-06-27

## Scope

Applied `supabase/migrations/20260625120000_market_listing_candidate_cleanup_action_model_v1.sql` against linked Supabase project `ycdxbpibncqcchqiihfz` only.

No evidence backfill. No cleanup event inserts. No provider calls. No source fetches. No function invocation. No public pricing.

## Hashes

- Migration hash: `f9bb21d9a6fcb9c7d9bc1b814fac809f070a0ab1e554db995fc878d76fc3723b`
- Package fingerprint: `011428707606f4b6e40b4702b8a1fb0cca6249170213079c0062a6b771241d8a`

## Result

Created internal-only candidate cleanup objects:

- `public.market_listing_candidate_cleanup_events`
- `public.v_market_listing_candidate_cleanup_current_v1`
- `public.v_market_listing_candidate_cleanup_card_summary_v1`

Readback:

```json
{
  "table_count": 1,
  "view_count": 2,
  "supporting_index_count": 4,
  "total_index_count": 5,
  "policy_count": 2,
  "cleanup_event_rows": 0,
  "migration_history_rows": 1
}
```

## Access

Final grants:

- `service_role`: `SELECT`, `INSERT` on `market_listing_candidate_cleanup_events`
- `service_role`: `SELECT` on `v_market_listing_candidate_cleanup_current_v1`
- `service_role`: `SELECT` on `v_market_listing_candidate_cleanup_card_summary_v1`
- `anon`, `authenticated`: no grants

The first readback exposed broader default `service_role` grants. Those were corrected immediately to match the approved access model before final readback.

## Migration History

`supabase migration repair` could not run in this shell because no `SUPABASE_ACCESS_TOKEN` was available. The migration history row was marked directly through the approved linked DB connection.

Verified row:

```json
{
  "version": "20260625120000",
  "name": "market_listing_candidate_cleanup_action_model_v1",
  "statement_count": 1
}
```

## Boundary

No rows were inserted into `market_listing_candidate_cleanup_events`.

No writes were made to:

- `pricing_observations`
- `ebay_active_prices_latest`
- public pricing views
- identity tables
- `card_prints` or `card_printings`
- vault tables
- image/storage tables

## Artifacts

- Readback JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-REMOTE-APPLY-V1/readback.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-CLEANUP-ACTION-MODEL-REMOTE-APPLY-V1/report.json`

