# Pricing Checkpoint 34: Product Surface Wiring Correction

## Context

Checkpoint 33 established the production source-to-render proof contract and
the shared web and Flutter evidence components. The authenticated 100-printing
canary remains frozen, so no production migration, publication, or client
deployment is allowed during this gate.

## Problem

A deeper source audit found three supported surfaces that could not satisfy the
production proof contract:

- Web Set grids did not fetch or render market pricing.
- Flutter Compare reduced the governed read-model row to an amount, source, and
  observed timestamp, then rendered ordinary text.
- Flutter Network retained the governed pricing object in its service but
  flattened the amount into ordinary supporting text.

The prior implementation-readiness report therefore overstated client wiring
readiness. It did not overstate production completion because the final
`17/17` source-to-render gate remained pending.

## Risk

- A Set grid could remain unpriced while other web surfaces displayed prices.
- Compare could lose pricing scope, publication time, provenance, and `From`
  state before render.
- Network could show the right amount without machine-readable proof of the
  underlying governed row.
- A later screenshot could appear correct while failing exact source-to-render
  reconciliation.
- Declaring readiness without auditing every render path could turn a shared
  interface requirement into a documentation claim instead of an enforced
  contract.

## Decision

The supported surfaces now preserve and render the governed pricing record:

- Signed-in web Set page and pagination paths enrich each visible printing
  using exact `card_printing` identifiers.
- The selected printing controls the displayed Set-grid price.
- Anonymous Set paths do not call the authenticated pricing RPC.
- Flutter Compare stores `CardSurfacePricingData` directly and renders
  `CardSurfacePriceText`.
- Flutter Network renders `CardSurfacePriceText` separately from descriptive
  support text.
- Source contracts fail if these paths discard the governed object, switch to
  parent fallback for selected Set printings, or flatten pricing into ordinary
  text.

## Alternatives Rejected

- Keep Set grids unpriced: rejected because Sets are a required Production V1
  product surface.
- Use parent `From` pricing for a selected child printing: rejected because the
  selected printing has an exact identity and must not display sibling-derived
  value as its own.
- Keep Compare's three legacy scalar fields: rejected because they discard
  publication time, provenance, scope, and complete source evidence.
- Leave Network price inside a support string: rejected because visible text
  alone cannot satisfy machine-readable render proof.
- Change production during the canary: rejected because the frozen canary
  remains the active safety boundary.

## Current Truths

- Worktree: `C:\grookai_vault_mee_productization_v1`.
- Branch: `pricing/mee-productization-v1`.
- Parent commit at repair start:
  `1e1bdd85b4d43ebc08db5b46e0c98864f0f307e5`.
- Web Set grid exact-printing enrichment: implemented.
- Flutter Compare full pricing-record preservation: implemented.
- Flutter Network proof-bearing price render: implemented.
- Focused source-to-render contract: `11/11` passed.
- Full Node contract suite: `868/868` passed.
- Web TypeScript check: passed.
- Web lint: passed with zero warnings.
- Web strict production build: passed.
- Flutter analysis: passed with zero issues.
- Shared Flutter pricing proof tests: `3/3` passed.
- Full Flutter test suite: `310/310` passed.
- `git diff --check`: passed.
- Production writes, migrations, publications, and deployments: `0`.
- Final authenticated production captures: still pending post-canary.

Implementation evidence:

```text
docs/audits/pricing/mee_pricing_platform_production_v1/product_surface_wiring_correction/2026-07-28T15-38-14-688Z/REPORT.md
```

## Invariants

1. Every supported surface consumes the shared governed pricing interface.
2. Exact child-printing surfaces query and render exact child identity.
3. Parent summaries visibly retain `From` semantics when multiple printings
   exist.
4. Price, scope, observation time, publication time, provenance, source, and
   identity survive through render evidence.
5. Anonymous routes do not gain authenticated pricing access during the
   signed-in rollout lane.
6. Visible dollar text without machine-readable evidence cannot satisfy a
   surface proof.
7. The frozen production canary receives no changes before its 72-hour gate
   passes.
8. Repository readiness does not mark the production `17/17` requirement
   complete.

## Exact Next Gate

Keep observing the frozen 72-hour canary through
`2026-07-31T08:40:15.793Z`. After it passes:

1. Apply and verify only the two frozen pricing migrations.
2. Deploy the exact clean rollout commit.
3. Run fresh shadow, coverage, security, and performance gates.
4. Capture all 17 signed-in web and Flutter surfaces.
5. Reconcile every capture to production read-model and exact Vault evidence.

Stop rollout expansion on any source-to-render mismatch.
