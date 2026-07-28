# Pricing Checkpoint 35: Product Surface Route Identity

## Context

The Production V1 source-to-render verifier requires one authenticated capture
for each of 17 supported web and Flutter pricing surfaces. Checkpoint 34 closed
the remaining repository wiring gaps while the 72-hour canary remained frozen.

## Problem

The verifier required each capture to contain a nonempty route or screen label,
but did not bind that value to the claimed surface. A valid price from Explore
could therefore be relabeled as Set grid or Compare evidence and still pass the
machine policy if its screenshot was not carefully reviewed.

## Risk

- One working screen could impersonate several required surfaces.
- Missing product integrations could survive a nominal `17/17` report.
- Screenshots would carry a correctness burden that deterministic evidence
  should enforce.
- Search and Explore could be counted twice without proving their distinct
  access patterns.
- An arbitrary Flutter `--route` value could weaken screen identity.

## Decision

Every pricing capture is now bound to an allowed route identity:

- Web surfaces use explicit path rules.
- Search must resolve through `/search` to `/explore` with a nonempty `q`.
- Explore must be captured at `/explore` without `q`.
- Set, Compare, private Vault, public Vault, Vault item, card detail, and market
  history each have distinct route patterns.
- Flutter capture commands use one exact canonical screen identity per
  required surface.
- Any mismatch produces `surface_route_identity_mismatch` and fails the
  source-to-render gate.

The governing table is in:

```text
docs/contracts/TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_V1.md
```

## Alternatives Rejected

- Trust the operator-provided surface label: rejected because labels are not
  evidence.
- Rely only on screenshots: rejected because screenshots are necessary review
  evidence but should not replace deterministic route validation.
- Treat Search and Explore as one capture: rejected because they are supported
  product entry paths with different routing behavior.
- Infer Flutter screen identity from arbitrary text: rejected in favor of
  canonical exact identifiers.

## Current Truths

- Route-identity policy: implemented.
- Focused pricing proof contract: `12/12` passed.
- Full Node contract suite: `869/869` passed.
- Production writes, migrations, publications, and deployments: `0`.
- The authenticated canary remains frozen.
- Production `17/17` capture proof remains pending post-canary deployment.

## Invariants

1. A valid price record cannot prove a surface it was not rendered on.
2. Every required surface appears exactly once.
3. Search proof has a nonempty query; Explore proof does not.
4. Web route patterns and Flutter screen identifiers are versioned contract
   behavior.
5. Correct route identity does not replace screenshot, render evidence,
   authentication, commit, or read-model reconciliation requirements.
6. Any route mismatch fails closed.
7. No production change occurs during the frozen canary.

## Exact Next Gate

After the canary and post-canary rollout deploy the exact clean client commit,
capture all 17 surfaces using the route identities in the contract. Require:

- `17/17` unique surfaces;
- zero route identity mismatches;
- zero amount, scope, timestamp, source, provenance, or Vault reconciliation
  mismatches;
- exact deployed commit agreement.

Stop before rollout expansion on any finding.
