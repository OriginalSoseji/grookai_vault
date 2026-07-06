# MEE Core Internal Review Action Events Schema Remote Apply V1

Applied: 2026-06-26

Approval:

`MEE-CORE-INTERNAL-REVIEW-ACTION-EVENTS-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY`

## Scope

Executed the approved internal-only action events migration against linked Supabase project `ycdxbpibncqcchqiihfz` only:

```bash
supabase db query --linked -f supabase/migrations/20260625090000_market_evidence_review_action_events_v1.sql
```

Approved migration hash:

`8b56c0f2edd36aac3e47fb376a87c02ee22b31da1202848f44af83a6e9b33216`

Verified local file hash before apply:

`8B56C0F2EDD36AAC3E47FB376A87C02EE22B31DA1202848F44AF83A6E9B33216`

Marked only migration version `20260625090000` as applied:

```bash
supabase migration repair --status applied 20260625090000 --linked --yes
```

## Apply Proof

The migration returned the expected internal-only proof row:

```json
{
  "proposed_table_count": 1,
  "proposed_index_count": 4,
  "proposed_service_role_policy_count": 2,
  "append_only_from_service_api": true,
  "public_price_publication": false,
  "app_visible_pricing": false,
  "public_price_rollup": false,
  "market_truth": false,
  "internal_only": true,
  "service_role_only": true
}
```

## Readback

Table and migration history:

```json
{
  "table_count": 1,
  "column_count": 24,
  "migration_version": "20260625090000"
}
```

Indexes:

```json
{
  "index_count": 4
}
```

Policies:

```json
[
  { "policyname": "market_evidence_review_action_events_service_role_insert", "cmd": "INSERT", "roles": "{service_role}" },
  { "policyname": "market_evidence_review_action_events_service_role_select", "cmd": "SELECT", "roles": "{service_role}" }
]
```

Grants after correction:

```json
[
  { "grantee": "service_role", "privilege_type": "INSERT" },
  { "grantee": "service_role", "privilege_type": "SELECT" }
]
```

`postgres` owner privileges also exist, as expected. No `anon` or `authenticated` grants were returned.

## Boundary Readback

```json
{
  "action_event_rows": 0,
  "pricing_observations_count": 0,
  "public_pricing_view_references": 0
}
```

## Correction Performed

Initial grant readback showed `service_role` had broader table privileges than the intended candidate. A targeted corrective DCL command was run within the approved service-role select/insert scope:

```sql
revoke all on public.market_evidence_review_action_events from service_role;
grant select, insert on public.market_evidence_review_action_events to service_role;
```

Readback then confirmed `service_role` has only `INSERT` and `SELECT`.

## Explicit Non-Actions

- No evidence backfill.
- No provider calls.
- No source fetches.
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
