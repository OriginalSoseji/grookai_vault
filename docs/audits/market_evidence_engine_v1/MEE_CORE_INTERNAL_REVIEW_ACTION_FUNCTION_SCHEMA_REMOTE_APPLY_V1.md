# MEE Core Internal Review Action Function Schema Remote Apply V1

Applied: 2026-06-26

Approval:

`MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

## Scope

Executed the approved service-role-only review action function migration against linked Supabase project `ycdxbpibncqcchqiihfz` only:

```bash
supabase db query --linked -f supabase/migrations/20260625100000_market_evidence_review_action_function_v1.sql
```

Approved migration hash:

`99132c3c9f7f17715acfe8e67b26f1b5cd9811d69734a21ffb7ecf795a76de3b`

Verified local file hash before apply:

`99132C3C9F7F17715ACFE8E67B26F1B5CD9811D69734A21FFB7ECF795A76DE3B`

Marked only migration version `20260625100000` as applied:

```bash
supabase migration repair --status applied 20260625100000 --linked --yes
```

## Apply Proof

The migration returned the expected proof row:

```json
{
  "proposed_function_count": 1,
  "service_role_only": true,
  "optimistic_locking": true,
  "inserts_one_action_event_when_invoked": true,
  "updates_one_disposition_when_invoked": true,
  "invoked_by_this_migration": false,
  "public_price_publication": false,
  "app_visible_pricing": false,
  "public_price_rollup": false,
  "market_truth": false
}
```

## Readback

Function and migration history:

```json
{
  "function_count": 1,
  "migration_version": "20260625100000"
}
```

Routine grants:

```json
[
  { "grantee": "postgres", "privilege_type": "EXECUTE" },
  { "grantee": "service_role", "privilege_type": "EXECUTE" }
]
```

No `anon`, `authenticated`, or `PUBLIC` routine grants were returned.

## No-Op Proof

The approved no-op readback did not invoke the function:

```json
{
  "function_count": 1,
  "action_event_rows_before_noop": 0,
  "disposition_public_flag_rows": 0,
  "function_invoked": false,
  "disposition_updates": false,
  "action_event_inserts": false
}
```

## Boundary Readback

```json
{
  "action_event_rows": 0,
  "disposition_public_flag_rows": 0,
  "pricing_observations_count": 0,
  "public_pricing_view_references": 0
}
```

## Explicit Non-Actions

- No evidence backfill.
- No provider calls.
- No source fetches.
- No function invocation.
- No action event inserts.
- No disposition updates.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No public price rollups.
- No identity-table writes.
- No vault writes.
- No image/storage writes.
- No deletes.
- No upserts.
- No merges.
- No `db push`.
- No global apply.
