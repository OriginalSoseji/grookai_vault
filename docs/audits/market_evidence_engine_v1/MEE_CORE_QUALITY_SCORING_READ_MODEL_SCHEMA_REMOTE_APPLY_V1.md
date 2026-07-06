# MEE Core Quality Scoring Read Model Schema Remote Apply V1

## Status

- Status: applied
- Migration version: `20260625110000`
- Migration file: `supabase/migrations/20260625110000_market_evidence_quality_scoring_read_model_v1.sql`
- Migration hash: `6D3A3020D74E6B114792A917D2A57FBCCA64DFCB2A2F25364148491ED6317DE7`
- Target project: `ycdxbpibncqcchqiihfz`

## Applied Object

- `public.v_market_evidence_candidate_quality_scores_v1`

## Apply Proof

The migration returned:

- `public_price_publication`: `false`
- `app_visible_pricing`: `false`
- `public_price_rollup`: `false`
- `market_truth`: `false`
- `internal_only`: `true`
- `service_role_only`: `true`

Migration history was repaired only for:

- `20260625110000 => applied`

## Readback Proof

Schema readback returned:

- `view_exists`: `true`
- `public_or_client_grant_rows`: `0`
- `service_role_select_grant_rows`: `1`
- `public_price_publication`: `false`
- `app_visible_pricing`: `false`
- `public_price_rollup`: `false`
- `market_truth`: `false`

Quality-score row readback returned:

- `candidate_quality_score_rows`: `25989`
- `quality_rollup_eligible_rows`: `0`
- `public_or_confirm_rows`: `0`

## Boundary

No evidence backfill, provider calls, source fetches, function invocation, action event inserts, disposition updates, pricing observations, `ebay_active_prices_latest` writes, public pricing views, app-visible pricing, public rollups, identity writes, vault writes, image/storage writes, deletes, upserts, merges, db push, or global apply were performed.
