# Production Live Control Plane V1

Observed: 2026-08-24T07:52:19.237Z

Overall status: **INCOMPLETE**

## Summary

- healthy: 14
- degraded: 0
- failed: 0
- stale: 0
- unmeasured: 4

## Components

| Component | Provider | Status | Reason |
| --- | --- | --- | --- |
| cross-tcg-sealed | unverified | UNMEASURED | No live provider adapter is registered yet. |
| founder-ops-dashboard | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| funko-catalog | not_merged | UNMEASURED | No live provider adapter is registered yet. |
| japanese-master-index | unverified | UNMEASURED | No live provider adapter is registered yet. |
| mee-nightly | supabase | HEALTHY | Latest MEE acquisition evidence is readable and fresh. |
| mobile-clients | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| mtg-catalog-supervisor | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| new-set-discovery | filesystem_runtime_artifact | HEALTHY | New-set discovery is fresh; 7 candidates require governed review. |
| one-piece-expansion | unverified | UNMEASURED | No live provider adapter is registered yet. |
| operations-alert-delivery | supabase | HEALTHY | Latest operations notification was enqueued and delivered within its freshness window. |
| pricing-canary-observer | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| prod-edge-probe | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| production-control-plane | digitalocean_systemd | HEALTHY | Production control-plane timer is active; this report is the current scheduled probe. |
| scanner-identity | digitalocean_systemd_http | HEALTHY | Scanner V3 and V5 services are active and both HTTP health probes succeeded. |
| supabase-core | supabase | HEALTHY | Supabase API, authentication, and database read probe succeeded. |
| tcgplayer-market-pipeline | supabase | HEALTHY | Latest production pricing run is terminal, reconciled, and fresh. |
| tcgplayer-source-sync | supabase | HEALTHY | Latest current full source sync is terminal and fresh. |
| vercel-web | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |

This report contains no credentials. It records provider IDs, run IDs, counts, timestamps, states, and public workflow URLs only.
