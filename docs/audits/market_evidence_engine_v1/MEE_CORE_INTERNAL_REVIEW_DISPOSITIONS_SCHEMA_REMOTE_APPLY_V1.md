# MEE Core Internal Review Dispositions Schema Remote Apply V1

Status: applied to linked Supabase project `ycdxbpibncqcchqiihfz`

## Approval

`MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

## Migration

- File: `supabase/migrations/20260625080000_market_evidence_review_dispositions_v1.sql`
- Approved hash: `E175C56D372A5AAF50464535A344562198C596A98A5273398AD001B1BF3339BD`
- Local hash verified before apply: `E175C56D372A5AAF50464535A344562198C596A98A5273398AD001B1BF3339BD`

## Commands

```bash
supabase db query --linked -f supabase/migrations/20260625080000_market_evidence_review_dispositions_v1.sql
supabase migration repair --status applied 20260625080000 --linked --yes
```

## Apply Result

The migration returned the expected boundary row:

```json
{
  "package_id": "MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1",
  "proposed_table_count": 1,
  "proposed_index_count": 4,
  "proposed_service_role_policy_count": 1,
  "public_price_publication": false,
  "app_visible_pricing": false,
  "public_price_rollup": false,
  "market_truth": false,
  "internal_only": true,
  "service_role_only": true
}
```

## Readback

- `market_evidence_review_dispositions` table count: `1`
- column count: `24`
- index count: `5` including the primary-key index plus 4 supporting indexes
- service-role policy count: `1`
- migration history version `20260625080000`: applied
- `pricing_observations` rows: `0`
- `v_card_pricing_ui_v1` references to `market_evidence_review_dispositions`: `0`
- `anon` grants: none
- `authenticated` grants: none

Flag proof:

```json
{
  "disposition_rows": 0,
  "publication_gate_candidate_rows": 0,
  "direct_publish_rows": 0,
  "publishable_rows": 0,
  "app_visible_rows": 0,
  "market_truth_rows": 0
}
```

## Grant Note

The public boundary is clean: no `anon`, `authenticated`, or `public` grants are present on the table.

`information_schema.role_table_grants` reports broad `service_role` privileges. That is consistent with the service-role internal-access model used for these warehouse objects. No unapproved grant correction was performed.

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
- The table is empty and ready for a separately approved disposition seed/backfill plan.
