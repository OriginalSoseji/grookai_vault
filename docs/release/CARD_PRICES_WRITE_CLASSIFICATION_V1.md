# CARD_PRICES_WRITE_CLASSIFICATION_V1

Date: 2026-03-04
Scope: PROD_HARDENING_V1_STEP3_AUDIT_P2 (audit-only)

## Repo Usage Summary

- Flutter client usage (`lib/`):
  - No `card_prices` references found.
  - No `.insert/.update/.upsert` usage found.
- Edge function usage (`supabase/functions/`):
  - No `card_prices` references found.
  - No `.insert/.update/.upsert` usage found.
- Backend worker usage (`backend/`):
  - `backend/infra/system_health_worker.mjs:19` reads `card_prices` via `.select('id').limit(1)`.
  - `backend/pricing/import_prices_worker.mjs:26` reads `card_prices` via `.select('*').limit(1)`.
  - No backend `.insert/.update/.upsert` usage found.
- SQL references:
  - `supabase/migrations/20251213153627_baseline_views.sql:19` uses `FROM public.card_prices cp` in a view definition.
  - `docs/legacy_migrations_v0/20251117004358_remote_schema.sql:1555` contains legacy `FROM public.card_prices` text.
  - `docs/audits/AUDIT_PRICING_L3_V1.md:98` contains audit SQL excerpt with `FROM public.card_prices`.
  - No direct SQL write statements to `card_prices` found in repo search.

Evidence log: `docs/release/logs/STEP3_AUDIT_P2_usage.log`

## DB Policy Posture Summary

- Policies on `public.card_prices`:
  - `card_prices_read` (`SELECT`, roles `{public}`)
  - `read all` (`SELECT`, roles `{public}`)
  - `update via function` (`UPDATE`, roles `{public}`)
  - `write via function` (`INSERT`, roles `{public}`)
- Grants for `anon` and `authenticated` include `INSERT` and `UPDATE` (plus broad table privileges).

Evidence log: `docs/release/logs/STEP3_AUDIT_P2_db_truth.log`

## Ownership Column Audit

- `public.card_prices` columns:
  - `id, card_print_id, source, currency, low, mid, high, market, last_updated`
- No ownership columns found (`user_id`, `requester_user_id`, or equivalent).

Evidence log: `docs/release/logs/STEP3_AUDIT_P2_db_truth.log`

## Final Classification

CASE A — Pure system-managed (no client writes anywhere)

Reasoning:
- No client write paths found in Flutter.
- No Edge write paths found.
- Backend references are read-only probes.
- Table shape has no user ownership model, consistent with system/reference pricing data.
- Current DB posture still allows broad public write capability, but this is not exercised by observed app code paths.

## Recommended Next Single Step (No Implementation Here)

Create a focused hardening fix migration for `public.card_prices` to remove broad public write exposure:
- Revoke `INSERT/UPDATE/DELETE` from `anon` and `authenticated`.
- Keep only required read posture.
- Remove/replace `{public}` write policies (`write via function`, `update via function`) with least-privilege service-only path if writes are still needed.
