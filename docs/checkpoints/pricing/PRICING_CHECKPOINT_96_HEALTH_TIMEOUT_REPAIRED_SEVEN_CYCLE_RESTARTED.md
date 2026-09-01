# Pricing Checkpoint 96: Health Timeout Repaired And Seven-Cycle Gate Restarted

## Status

`PRODUCTION HEALTHY - NEW 0/7 UNATTENDED WINDOW FROZEN`

## Context

The original full-rollout observer had reported four healthy production
cycles. That evidence could not be extended to seven after the production
runtime changed and the scheduled pipeline stopped completing cleanly:

- the August 31 scheduled lane was interrupted by access and runtime repairs;
- the September 1 publication completed and activated successfully, but the
  post-publication health query exceeded its 120-second read timeout;
- the deployed runtime no longer matched the observer's original frozen SHA.

The prior `4/7` result remains useful historical evidence, but it is not a
valid operational-completion window. It must not be combined with cycles from
the repaired runtime.

## Root Cause

The health worker scanned `public.v_market_price_current_v1` across the full
active publication. That view performs work appropriate for bounded client
reads, but it was not an efficient aggregate source for a whole-publication
health check. Production contained more than 164,000 active exact prices, and
the aggregate timed out after 120 seconds even though publication had already
completed correctly.

## Repair

The health worker now aggregates through the indexed publication pointer and
its exact active publication set, run, snapshots, decisions, and truth-review
quarantine. It preserves the same reconciliation, provenance, freshness,
source-continuity, and policy checks without scanning the broad client view.

The full-rollout observer now:

- uses the same indexed publication path;
- remains read-only;
- resolves the first scheduled activation deterministically from the exact
  deployed runtime SHA and frozen window start;
- fails closed when the first matching run is missing, unhealthy, or from a
  different commit;
- records the requested and resolved activation identity in its artifacts.

## Production Deployment Proof

- Runtime commit: `b93aa87de5f2acb83d17369e85de0ab3b94ac414`
- Runtime PR: `#372`
- Immutable release: `/opt/grookai/releases/backend/b93aa87de5`
- Active pointer: `/opt/grookai_pricing_current`
- Previous rollback release: `/opt/grookai/releases/backend/fe1503108`
- Pointer switched: `2026-09-01T20:13:30.190Z`
- Expected-SHA environment readback: exact runtime commit
- Timer: active and enabled
- Next scheduled cycle: `2026-09-02T08:15:00Z`
- Systemd verification: `TCGPLAYER_MARKET_OPS_READY`

The prior environment file is preserved at:

`/etc/grookai/tcgplayer-market-pricing.env.pre-b93aa87de5`

No canonical, Vault, approval, or modeled-value data was changed by the
deployment. The September 1 publication data was not regenerated.

## Live Readback

The exact deployed runtime completed a read-only production health probe in
approximately four seconds:

- status: `healthy`
- exact current prices: `164151`
- parent prices: `105027`
- positive USD prices: `164151`
- snapshots traced: `164151/164151`
- broken traces: `0`
- failed publication phases: `0`
- source rows: `547893`
- source continuity: `completed_sync`
- findings: none

The scheduler also produced a `dry_run_planned` deployment proof under `/tmp`.
It performed no provider acquisition, database write, or publication change.

## Verification

- Pricing publication contracts: `40/40` passed on the production host.
- Observer plus publication contracts: `49/49` passed locally.
- Runtime observer implementation PR: `#373`.
- Frozen observer source SHA:
  `01e669d08f18579cb35e5b96d70780c11baea198`.
- CodeQL, runtime protection, Vercel, legacy-key guard, and Binder guards
  passed for both repairs.

## New Frozen Window

- Discovery/window start: `2026-09-01T20:13:30.190Z`
- Runtime SHA: `b93aa87de5f2acb83d17369e85de0ab3b94ac414`
- Activation resolution: first exact-runtime scheduled production run
- Required scheduled slots: September 2 through September 8 at `08:15 UTC`
- Schedule tolerance: `90 minutes`
- Required end: `2026-09-08T09:45:00Z`
- Final observer deadline: `2026-09-09T11:15:00Z`
- Observer schedule: daily at `11:15 UTC`

The September 2 run is both the first activation proof from the repaired
runtime and cycle one. The gate requires seven distinct unattended daily runs.
No prior-runtime cycle counts toward this window.

## Invariants

- TCGPlayer `marketPrice` remains the Production V1 market close.
- Production V1 remains exact English Pokemon raw printings only.
- Signed-in clients use the governed shared pricing read model.
- Anonymous pricing remains denied pending licensing and display authority.
- The observer has read-only database access and cannot activate publication.
- A successful publication does not hide a failed health phase.
- Runtime, coverage, performance, and observer evidence retain independent
  immutable SHA pins.
- Seven elapsed days do not pass the gate; seven reconciled healthy cycles do.

## What Remains

1. Observe the September 2 first cycle and automatic activation resolution.
2. Continue daily through the September 8 seventh cycle without runtime drift,
   terminal alerts, missing slots, stale prices, or reconciliation failures.
3. Require the observer to report `passed` at `7/7`.
4. Issue the final signed-in Pricing Production V1 completion report.
5. Keep anonymous/public pricing blocked until licensing authority is proven.

The broader app release still has separate journey, cross-platform,
distribution, and final release-candidate soak gates. This checkpoint closes
the pricing incident repair and automation gap; it does not claim the entire
application is production-ready.

## Exact Next Gate

Allow the September 2 authoritative timer cycle to run. The scheduled
read-only observer must resolve that run from runtime
`b93aa87de5f2acb83d17369e85de0ab3b94ac414`, report one healthy matched slot,
and upload reconciled evidence without manual activation-ID editing.
