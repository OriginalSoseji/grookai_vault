# Pricing Checkpoint 33: Product Surface Proof Readiness

> Implementation-readiness amendment: a later source audit found that web Set
> grids, Flutter Compare, and Flutter Network did not yet preserve complete
> proof-bearing pricing through render. Checkpoint 34 records and verifies the
> correction. The production `17/17` gate was never marked passed.

## Context

The shared TCGPlayer Market read model already powers repository code for web
and Flutter. The exact clients and final read-model migrations remain
undeployed while the authenticated 100-printing canary is frozen.

## Problem

Component tests and source inspection prove implementation wiring, but they do
not prove that a deployed authenticated client rendered the same exact value
returned by production. A visible dollar amount or screenshot alone also
cannot establish printing scope, source timestamps, or provenance.

## Risk

- A stale client could render an older pricing contract.
- A parent summary could be mistaken for an exact printing.
- A screenshot could show the right amount for the wrong printing.
- Web and Flutter could disagree while backend health remains green.
- Vault sums could be compared to one price instead of copy-level evidence.
- Completion could be claimed from repository tests without production
  source-to-render proof.

## Decision

Production surface completion is governed by:

```text
docs/contracts/TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_V1.md
```

The verifier requires exactly 17 authenticated web and Flutter captures.
Every ordinary price reconciles card identity, printing scope, amount, source,
observation time, publication time, and provenance to the production RPC.
Vault group and complete totals reconcile separately to exact-copy production
readback.

Web components expose nonvisual `data-pricing-*` evidence. Flutter shared
pricing widgets expose stable accessibility identifiers. Screenshots and
machine-readable render evidence are both mandatory and hashed.

## Alternatives Rejected

- Screenshot-only review: rejected because visible text lacks identity and
  provenance.
- Local widget tests as production proof: rejected because they do not prove
  the deployed commit or production data path.
- One representative surface: rejected because the goal explicitly requires
  every supported surface to consume and render the shared model.
- Treating Vault totals as one read-model row: rejected because totals must
  reconcile from exact owned-copy prices and coverage.
- Adding client-side pricing policy for verification: rejected because the
  shared database interface remains the only pricing authority.

## Current Truths

- Product-surface proof policy and read-only verifier: implemented.
- Required surfaces: `17`.
- Proof kinds: `price_record`, `vault_group_total`, `vault_total`.
- Web render evidence attributes: implemented.
- Flutter semantics evidence identifiers: implemented.
- Exact-Vault sampled group evidence: implemented.
- Full Node contract suite: `866/866` passed.
- Web TypeScript, lint, and strict production build: passed.
- Full Flutter analysis: passed with no issues.
- Full Flutter test suite: `310/310` passed.
- Release secret guard: passed.
- Runtime preflight: passed with no critical failures and only registered
  deferred debt.
- Production writes: `0`.
- Final production captures: pending post-canary deployment.

The implementation-readiness evidence is preserved at:

```text
docs/audits/pricing/mee_pricing_platform_production_v1/product_surface_proof_readiness/2026-07-28T15-16-32-768Z/
```

## Invariants

1. The capture commit must equal the exact deployed commit.
2. Every required surface appears exactly once.
3. Captures must come from production in the authenticated lane.
4. Screenshot and machine-readable evidence are both required and hashed.
5. Ordinary prices reconcile to exactly one read-model row.
6. Exact printing identity, amount, timestamps, source, and provenance must
   match.
7. Vault totals reconcile from exact raw-copy evidence; parent summaries,
   unresolved printings, and slabs cannot enter them.
8. The verifier runs in a read-only authenticated database transaction.
9. Local or predeployment captures cannot satisfy the production gate.
10. Any mismatch stops rollout expansion.

## Exact Next Gate

Finish the 72-hour canary. Apply and verify the two frozen migrations, deploy
the exact clean rollout commit, run the fresh V1.2 shadow and signed-in
activation gates, then capture and reconcile all 17 surfaces with:

```powershell
npm run pricing:market:surfaces:verify -- `
  --capture-manifest=<capture_manifest.json> `
  --vault-readback=<exact-vault-summary.json> `
  --expected-commit-sha=<deployed-sha> `
  --deployed-commit-sha=<deployed-sha> `
  --require-pass
```

Do not mark the all-surface production requirement passed before the resulting
hashed report is `17/17` with zero findings.
