# Production Live Control Plane V1

Observed: 2026-08-24T19:13:08.145Z

Overall status: **INCOMPLETE**

## Summary

- healthy: 11
- degraded: 0
- failed: 0
- stale: 0
- unmeasured: 7

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
| new-set-discovery | filesystem_runtime_artifact | UNMEASURED | No new-set discovery report is available. |
| one-piece-expansion | unverified | UNMEASURED | No live provider adapter is registered yet. |
| operations-alert-delivery | supabase | HEALTHY | Latest operations notification was enqueued and delivered within its freshness window. |
| pricing-canary-observer | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| prod-edge-probe | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| production-control-plane | digitalocean_systemd | UNMEASURED | Runtime-local control-plane probes are disabled for this collector execution. |
| scanner-identity | digitalocean_systemd_http | UNMEASURED | Runtime-local scanner probes are disabled for this collector execution. |
| supabase-core | supabase | HEALTHY | Supabase API, authentication, and database read probe succeeded. |
| tcgplayer-market-pipeline | supabase | HEALTHY | Latest production pricing run is terminal, reconciled, and fresh. |
| tcgplayer-source-sync | supabase | HEALTHY | Latest current full source sync is terminal and fresh. |
| vercel-web | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |

This report contains no credentials. It records provider IDs, run IDs, counts, timestamps, states, and public workflow URLs only.
