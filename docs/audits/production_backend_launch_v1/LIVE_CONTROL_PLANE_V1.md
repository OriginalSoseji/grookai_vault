# Production Live Control Plane V1

Observed: 2026-08-24T01:16:04.456Z

Overall status: **DEGRADED**

## Summary

- healthy: 8
- degraded: 1
- failed: 0
- stale: 1
- unmeasured: 6

## Components

| Component | Provider | Status | Reason |
| --- | --- | --- | --- |
| cross-tcg-sealed | unverified | UNMEASURED | No live provider adapter is registered yet. |
| founder-ops-dashboard | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| funko-catalog | not_merged | UNMEASURED | No live provider adapter is registered yet. |
| japanese-master-index | unverified | UNMEASURED | No live provider adapter is registered yet. |
| mee-nightly | supabase | STALE | Latest MEE acquisition evidence is 2751 minutes old. |
| mobile-clients | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| mtg-catalog-supervisor | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| new-set-discovery | unverified | UNMEASURED | No live provider adapter is registered yet. |
| one-piece-expansion | unverified | UNMEASURED | No live provider adapter is registered yet. |
| pricing-canary-observer | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| prod-edge-probe | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |
| scanner-identity | digitalocean_systemd | UNMEASURED | No live provider adapter is registered yet. |
| supabase-core | supabase | HEALTHY | Supabase API, authentication, and database read probe succeeded. |
| tcgplayer-market-pipeline | supabase | DEGRADED | Latest production pricing run is running/pending. |
| tcgplayer-source-sync | supabase | HEALTHY | Latest current full source sync is terminal and fresh. |
| vercel-web | github_actions | HEALTHY | Latest workflow completed successfully within its freshness window. |

This report contains no credentials. It records provider IDs, run IDs, counts, timestamps, states, and public workflow URLs only.
