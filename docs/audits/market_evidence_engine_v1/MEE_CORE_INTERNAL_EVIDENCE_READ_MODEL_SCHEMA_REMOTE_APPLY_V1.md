# MEE Core Internal Evidence Read Model Schema Remote Apply V1

Status: applied to linked Supabase project `ycdxbpibncqcchqiihfz`

## Approval

`MEE-CORE-INTERNAL-EVIDENCE-READ-MODEL-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

## Migration

- File: `supabase/migrations/20260625070000_market_evidence_internal_read_model_v1.sql`
- Approved hash: `5D26257DB0C987922B942E56D7E8924901784A31FDCCDE9C21740EA0CA30D5E1`
- Local hash verified before apply: `5D26257DB0C987922B942E56D7E8924901784A31FDCCDE9C21740EA0CA30D5E1`

## Commands

```bash
supabase db query --linked -f supabase/migrations/20260625070000_market_evidence_internal_read_model_v1.sql
supabase migration repair --status applied 20260625070000 --linked --yes
supabase db query --linked -f docs/sql/mee_core_internal_evidence_read_model_v1_readback.sql
```

`supabase migration list --linked` could not run in this shell because `SUPABASE_DB_PASSWORD` is not set for the CLI login role. Migration history was verified with direct read-only SQL against `supabase_migrations.schema_migrations`.

## Apply Result

The migration returned the expected boundary row:

```json
{
  "package_id": "MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1",
  "proposed_view_count": 2,
  "public_price_publication": false,
  "app_visible_pricing": false,
  "public_price_rollup": false,
  "market_truth": false,
  "internal_only": true,
  "service_role_only": true
}
```

## Readback

- `v_market_evidence_card_signal_summary_v1`: present
- `v_market_evidence_card_review_queue_v1`: present
- migration history version `20260625070000`: applied
- public pricing view references to `market_evidence_*`: `0`
- `pricing_observations` rows: `0`
- `anon` grants on the two views: none
- `authenticated` grants on the two views: none

Signal summary:

```json
{
  "card_signal_rows": 2152,
  "publishable_rows": 0,
  "app_visible_rows": 0,
  "market_truth_rows": 0
}
```

Review lanes:

```json
[
  { "review_lane": "candidate_review", "card_count": 1536 },
  { "review_lane": "low_signal_monitor", "card_count": 380 },
  { "review_lane": "high_signal_review", "card_count": 213 },
  { "review_lane": "classification_review", "card_count": 19 },
  { "review_lane": "reference_only_review", "card_count": 4 }
]
```

## Grant Note

The public boundary is clean: no `anon`, `authenticated`, or `public` grants are present on either view.

`information_schema.role_table_grants` still reports broad owner/service-role privileges for `postgres` and `service_role`. The approved migration revoked public roles and granted `service_role` select; no additional unapproved grant correction was performed.

## Boundaries

- No evidence backfill.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes.
- No merges.
- No `db push`.
- No global apply.

## Findings

- Remote apply succeeded.
- Readback passed.
- Follow-up candidate available if we want to harden service-role grants to SELECT-only explicitly.
