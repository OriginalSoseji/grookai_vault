## Overnight Backfill — Results (2025-10-22)

Run window:
- UTC: 10/22/2025, 05:18:12 → 10/22/2025, 10:51:13
- America/Denver: 10/21/2025, 23:18:12 → 10/22/2025, 04:51:13

Totals:
- Prints discovered: unknown
- Processed: 0
- Succeeded: 0
- Failed: 0 (0.00%)

Snapshots:
- Inserted (approx): 0
- Last observed_at: 2025-10-22T10:51:13.824Z

View check:
- public.latest_card_prices_v status: 404 (service/anon)

Coverage estimate: unknown (of Pokémon prints with pricing)

Notes:
- Throttling: ~2–3 function calls/sec; exponential backoff on 429/5xx
- Fallback: direct price_aggregate invoked for small batches if primary processed < 10

Next run:
- update_prices cron (0 */12 * * *) next UTC: 2025-10-22T12:00:00.000Z

## Overnight Cards Backfill — Results (2025-10-22)

Run window:
- UTC: 10/22/2025, 13:50:28 → 10/22/2025, 13:56:27
- America/Denver: 10/22/2025, 07:50:28 → 10/22/2025, 07:56:27

Sets:
- Discovered: 0
- Completed: 0
- Residual gaps: none

Prints:
- Expected: unknown
- Processed: 0
- Inserted: 0
- Failed: 0 (0.00%)

Images:
- With image_url: unknown (unknown of total prints)

View check:
- View: public.card_prints
- Status: 200

Coverage:
- Core fields present: unknown
- With images: unknown

Notes:
- Throttling: ~2–3 req/sec aggregate; backoff 0.5s→1.5s→4s on 429/5xx
- View sample fields missing or view unavailable — schema reload may be needed

Next run:
- check-sets cron (0 5 * * *) next UTC: 2025-10-23T05:00:00.000Z

## Overnight Cards Backfill — Results (2025-10-22)

Run window:
- UTC: 10/22/2025, 16:57:05 → 10/22/2025, 17:07:04
- America/Denver: 10/22/2025, 10:57:05 → 10/22/2025, 11:07:04

Sets:
- Discovered: 0
- Completed: 0
- Residual gaps: none

Prints:
- Expected: unknown
- Processed: 0
- Inserted: 0
- Failed: 0 (0.00%)

Images:
- With image_url: unknown (unknown of total prints)

View check:
- View: public.card_prints
- Status: 200

Coverage:
- Core fields present: unknown
- With images: unknown

Notes:
- Throttling: ~2–3 req/sec aggregate; backoff 0.5s→1.5s→4s on 429/5xx
- View sample fields missing or view unavailable — schema reload may be needed

Next run:
- check-sets cron (0 5 * * *) next UTC: 2025-10-23T05:00:00.000Z

