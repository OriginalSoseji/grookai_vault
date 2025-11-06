## 2025-11-06
- Staging probe on default branch; REST + anon aligned.
- Staging health: RPC 200, VIEW 200. Prod also 200/200.
- Wired one-shot task to refresh secrets and capture scan report.

# Changelog

- feat(wall): Public Wall MVP (backend + read API). Adds seller profiles, listings, listing photos with RLS; wall_feed_v view; wall_feed Edge Function; VS Code task to fetch sample feed. (2025-11-03)

- chore(compat): add v_set_print_counts view and optional card_catalog shim; update diagnostics to fallback chain; add schema scanner + VS Code task. (2025-11-03)

- feat(pricing): finalize v2; remove legacy PC constraints; add smoke tests ($(Get-Date -Format o))

- docs(pricing): Global 'Prices as of' appears in Search (all envs). On Detail, global chip shows only in dev/stage for QA; prod shows only the per-card 'Updated â€¦' row.
- chore(pricing): imports auto-enqueue MV refresh and run worker once (service-role)

 - chore(bulletproofing): P1 grants for pricing_health_v, replace broad selects in hot paths, add Edge fetch timeouts; perf indexes for price & wall; diagnostics bundle task.

 - chore(P2): wall_feed_v adds thumb_url fallback; Edge external fetches use retry+backoff; pricing_alerts_v surfaced in dev diagnostics UI.


## CHECKLIST â€” Next Commit (Nov 2, 2025)
- [ ] Confirm anon access strategy for `pricing_health_v` (grant or RPC) and update `lib/services/pricing_health_service.dart` accordingly.
- [ ] Replace `.select('*')` in `lib/features/dev/diagnostics/pricing_probe_page.dart:58` and `lib/services/vault_service.dart:91` with explicit projections.
- [ ] Add fetch timeouts to `import-prices`, `system_health`, `prices_status` Edge Functions.
- [ ] Run diagnostics bundle and stash outputs under `scripts/diagnostics/output/`.
- [ ] Validate indices for price lookups and `wall_feed_v` paths; add if missing.

