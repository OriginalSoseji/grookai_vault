# Pricing Checkpoint 40: Product Surface Release Readiness

## Status

Code-ready for post-canary integration review.

Not production-complete. The replacement canary remains active through
`2026-08-01T20:26:44.820Z`, and the final deployed 17-surface proof has not
run.

## Context

Checkpoint 39 repaired and restarted the 100-row Production V1 canary at
runtime SHA:

`ffb2513fd530930dbfaee714b84df2358f7eaafc`

This checkpoint used a separate worktree and branch:

- worktree: `C:\grookai_vault_pricing_surface_readiness`
- branch: `agent/pricing-v1-surface-readiness`
- base pricing SHA: `2587bd8ca9ae626306226fd0d5f2143cb38a112a`

The active production checkout, timer, publication pointer, canary observer,
and database schema were not changed.

## Problem

The frozen Definition of Done requires all 17 pricing surfaces to consume one
governed read model and prove rendered amount, currency, source, freshness,
scope, `From` state, and provenance from the exact deployed commit.

The prior surface list named the routes but did not make ownership executable.
The audit also found:

- incomplete fail-closed validation in both client adapters
- asking values carrying market-proof semantics
- signed-in pricing missing from Explore, Compare, and the public Wall
- anonymous server payloads capable of carrying public GVVI market references
- search pricing responses capable of public caching
- Vault total and group-total proof ambiguity
- Flutter Network rendering a ranking RPC payload without the shared adapter
- visible text being collected but dropped before final reconciliation

## Decision

Keep the Production V1 architecture frozen and repair only client contract,
auth, and evidence boundaries.

Every surface is now registered in:

`backend/pricing/tcgplayer_market_product_surface_registry_v1.mjs`

The registry records:

- surface and client identity
- proof kind
- signed-in lane
- route identity
- read owners
- render owners
- auth-boundary owners
- capture selector

The policy derives its exact 17-surface requirement from that registry.

## Implemented Truths

- Web and Flutter adapters reject incomplete or invalid governed rows.
- Exact rows require exact printing identity and cannot carry `From`.
- Every accepted row requires positive USD market close, current status,
  TCGPlayer source, exact source label, fresh state, valid observation and
  publication timestamps, and provenance.
- Asking prices never claim TCGPlayer proof.
- Explore, Compare, public Wall, and public GVVI pricing are auth-gated.
- Pricing-bearing search responses are `private, no-store`.
- Flutter Network re-reads displayed values through
  `CardSurfacePricingService`; the high-value RPC only selects candidates.
- Final proof materialization preserves visible text.
- Visible amount and `From` state must match machine-readable evidence.
- Vault complete and grouped totals have distinct proof selectors.
- The Playwright collector blocks and records non-read HTTP attempts without
  sending them, and requires all nine web surfaces exactly once.

## Read-Only Production Check

At `2026-07-29T21:39:43Z`, a sanitized GET against
`v_market_price_current_v1` returned:

| Check | Result |
| --- | ---: |
| Current rows | 100 |
| Positive USD | 100 |
| TCGPlayer Market source | 100 |
| Fresh | 100 |
| Missing provenance | 0 |
| Distinct runs | 1 |
| Distinct publication sets | 1 |
| Database writes | 0 |

This check confirms current publication health only. It does not replace the
72-hour observer or authenticated-role post-migration readback.

## Migration Status

No migration was applied.

The frozen post-canary package remains exactly:

1. `20260728130000`
2. `20260728133000`

Both file hashes still match the permanent migration manifest.

The runtime repair migration `20260729190000` is already applied and verified.
It is a prerequisite, not a third pending migration.

The strict linked preflight was attempted from the isolated worktree. After
restoring only ignored Supabase link metadata, its process exceeded the
five-minute command window during replay and was stopped. It did not apply a
migration. The preflight remains a mandatory post-canary gate and must be
rerun from the clean integration candidate.

## Verification

| Verification | Result |
| --- | ---: |
| Surface contracts | 18 / 18 passed |
| Pricing migration/readback/surface contracts | 41 / 41 passed |
| Full repository contract suite | 886 / 886 passed |
| Flutter proof tests | 5 / 5 passed |
| Full Flutter tests | 312 / 312 passed |
| Full Flutter analysis | passed |
| Web TypeScript check | passed |
| Web lint | passed |
| Web production build | passed |
| Node syntax checks | passed |
| Playwright headless Chrome runtime smoke | passed |
| `git diff --check` | passed before checkpoint finalization |
| Managed runtime preflight | blocked: database pooler connection timed out |

No production browser capture was run because this candidate is not deployed.
A capture of the current site would prove the older client and cannot satisfy
the final gate.

## Current Truths

- Current production publication remains 100/100 healthy.
- Replacement canary is still active and has not reached 72 hours.
- This branch is client/readiness work only.
- The new clients are not deployed.
- The two post-canary migrations are not applied.
- Anonymous pricing remains denied.
- Signed-in full publication has not begun.
- Seven unattended full-production cycles have not begun.
- Production V1 is not complete.

## Invariants

- Do not apply the pending migrations before the replacement observer passes.
- Do not deploy from a SHA different from the recorded integration candidate.
- Do not use service-role or admin reads to bypass signed-in client policy.
- Do not attach TCGPlayer proof to asking prices.
- Do not render ranking, legacy, or raw source rows as governed prices.
- Do not accept screenshots without machine-readable and visible-text
  reconciliation.
- Do not count local or older-deployment captures toward 17/17.
- Do not enable anonymous pricing before the licensing gate.
- Do not expand Product V1 scope while release gates remain open.

## Permanent Evidence

- readiness report:
  `docs/audits/pricing/mee_pricing_platform_production_v1/surface_release_readiness/2026-07-29T21-39-43Z/REPORT.md`
- sanitized publication readback:
  `docs/audits/pricing/mee_pricing_platform_production_v1/surface_release_readiness/2026-07-29T21-39-43Z/current_publication_readback.json`
- 17-surface inventory:
  `docs/audits/pricing/mee_pricing_platform_production_v1/surface_release_readiness/2026-07-29T21-39-43Z/surface_inventory.json`
- frozen post-canary plan:
  `backend/pricing/rollout/tcgplayer_market_post_canary_release_plan_v1.json`

## Exact Next Gate

Wait for the first enforcing canary observer at or after
`2026-08-01T20:26:44.820Z`.

If it passes every Checkpoint 39 condition:

1. build a clean integration candidate from current `origin/main`
2. carry only reviewed Production V1 pricing changes
3. rerun strict linked migration preflight and the complete test matrix
4. apply exactly the two frozen migrations
5. perform schema, grant, RLS, authenticated, anonymous-denial, and Vault
   readback
6. deploy web and Flutter from the exact candidate SHA
7. capture and reconcile all 17 product surfaces

If the observer fails, stop and preserve the evidence. Do not migrate or
deploy.
