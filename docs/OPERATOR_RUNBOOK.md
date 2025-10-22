# Operator Runbook: Price Freshness Audit (check-prices)

This runbook covers how to audit and maintain price freshness across sets using the `check-prices` Edge Function. The job computes coverage/staleness from `v_latest_print_prices` and can optionally trigger `import-prices` for stale/missing sets.

## Endpoints & Scheduling
- Function: `check-prices` (Supabase Edge)
  - URL: `<SUPABASE_URL>/functions/v1/check-prices`
  - Config: `supabase/functions/check-prices/config.toml` (primary scheduler)
    - `schedule = "0 6 * * *"` (runs daily 06:00 UTC)
- GitHub Action (manual/override): `.github/workflows/check-prices-nightly.yml`
  - Schedule: 06:15 UTC
  - Manual: “Run workflow” button with inputs

## Inputs (JSON body)
- `maxAgeDays?: number` — staleness window (default 7)
- `only?: string[]` — restrict to specific `set_code`s (optional)
- `dry_run?: boolean` — audit only; do not import (default false)
- `throttleMs?: number` — delay between imports (default 150)

## Sample payloads
- Dry run (all sets):
  `{ "maxAgeDays": 7, "dry_run": true }`
- Dry run (specific sets):
  `{ "maxAgeDays": 7, "only": ["sv6", "swsh10.5"], "dry_run": true }`
- Trigger imports for stale/missing sets:
  `{ "maxAgeDays": 7, "dry_run": false, "throttleMs": 200 }`

## cURL examples
```
# Env: SUPABASE_URL, SERVICE_ROLE_KEY
curl -sS -X POST \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"maxAgeDays":7,"dry_run":true}' \
  "${SUPABASE_URL%/}/functions/v1/check-prices" | jq .
```

## Example response (abridged)
```
{
  "ok": true,
  "cutoff": "2025-10-21T06:00:00.000Z",
  "total_sets": 312,
  "considered_sets": 312,
  "to_import": 9,
  "triggered": 9,            // omitted if dry_run=true
  "sets": [
    {
      "set_code": "sv6",
      "total_prints": 236,
      "priced_prints": 236,
      "fresh_prints": 228,
      "stale_prints": 8,
      "unpriced_prints": 0,
      "last_observed_max": "2025-10-21T05:42:08.123Z",
      "coverage_pct": 100.0,
      "fresh_pct": 96.6
    },
    { "set_code": "swsh10.5", ... }
  ]
}
```

## Where logs live
- Supabase (Scheduler runs)
  - Dashboard → Functions → `check-prices` → Logs
  - You’ll see request bodies (sizes), HTTP errors, and any `import-prices` errors.
- GitHub Actions (manual/override)
  - Repo → Actions → “Check Prices Nightly” → latest run
  - Step: “Invoke check-prices” prints a summary and the full JSON response (saved as console output).

## Secrets & prerequisites
- Supabase project secrets (Functions):
  - `SUPABASE_URL` or `PROJECT_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`/`SB_SERVICE_ROLE_KEY`)
- GitHub repository secrets (for workflow):
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting
- 401/403 on function call
  - Check Authorization headers and that `verify_jwt=false` is set in `config.toml` (we use service-role for internal PostgREST calls).
- 500 with `card_prints list` / `v_latest_print_prices`
  - Ensure the migrations creating `card_prints`, `price_observations`, `latest_prices`, and `v_latest_print_prices` are applied.
- No imports triggered in non-dry runs
  - Verify `to_import > 0`, and that `import-prices` function is deployed and has required env (service role + optional POKEMON_TCG_API_KEY).
- Rate limiting or provider errors
  - Increase `throttleMs` (e.g., 250–500). The audit itself is DB-bound; only imports hit external APIs.

## Operational notes
- Primary scheduler (Supabase) runs at 06:00 UTC; the GitHub Action runs at 06:15 UTC and can be used manually anytime.
- The audit computes freshness per print using `v_latest_print_prices` and `observed_at` vs the cutoff.
- Imports run per set if any print is unpriced or stale; they page through cards via the `import-prices` function.

