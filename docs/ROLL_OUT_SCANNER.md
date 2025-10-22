## Roll Out Scanner (P1c) — 10-step checklist

1. Verify Supabase Edge `scan_resolve` deployed and reachable.
2. Run embeddings backfill (`tools/embeddings/backfill.ts`), tail logs.
3. Set Edge envs per `configs/staging_flags.json`.
4. Enable `GV_FEATURE_SCANNER` for beta users only (staged .env or remote flag).
5. Run QA matrix (5 cases from `tools/qa/`).
6. Query `v_scan_daily` and `v_scan_failures` (SQL templates in `supabase/sql/observability/`).
7. Check mean confidence ≥ 0.90 and fail rate < 5%.
8. Expand to 50% of accounts.
9. Monitor 24h; ensure no regressions (latency/confidence/used_lazy%).
10. Flip to 100% and keep monitoring.

