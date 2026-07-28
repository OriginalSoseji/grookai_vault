# MEE Pricing Platform Production V1 Definition of Done

**Status: FROZEN**

**Effective date: 2026-07-28**

This document is the immutable release definition for MEE Pricing Platform
Production V1. Clarifications may improve evidence or implementation safety,
but no change may alter V1 scope, pricing authority, product semantics,
exclusions, or completion standards.

Any such change creates Production V1.1 or Production V2.

## 1. Product Contract

The following rules do not change during Production V1:

1. Production V1 covers English Pokémon raw single cards.
2. Every published value resolves to one exact canonical card, language,
   printing, and finish.
3. TCGPlayer `marketPrice` is the sole Production V1 market close.
4. Production V1 has no Grookai Value, blended value, inferred value, or
   supporting-price substitution.
5. A parent card with multiple eligible printings may expose only an explicit
   `From` amount equal to the minimum current eligible exact-printing market
   close.
6. Exact holdings and selected printings never inherit parent or sibling
   pricing.
7. All product clients consume one governed, versioned pricing read interface.
8. Current-price operation has priority over historical backfill; historical
   completion cannot block or alter current publication.
9. Every unsupported or unresolved source row receives a deterministic
   exclusion or quarantine reason.
10. Signed-in collectors receive Production V1 before anonymous users.
11. Anonymous access remains closed until source licensing, attribution,
    public-display authority, and public security gates are documented as
    passed.
12. Production completion requires proven operation over time, not merely
    working code.

## 2. Operational Release Gates

Production V1 is releasable only when every applicable gate passes:

1. The authenticated 100-printing canary completes an uninterrupted,
   reconciled 72-hour observation window.
2. The frozen production migrations apply in their manifest order with zero
   schema, function, view, grant, RLS, or migration-ledger drift.
3. Authenticated pricing access works and anonymous access remains denied
   during the signed-in rollout lane.
4. A fresh full-scope shadow publication reconciles source, mapping,
   qualification, snapshot, and read-model counts.
5. Exact mapping coverage is at least 95 percent under the fixed Production V1
   denominator.
6. Every denominator gap has one deterministic reason.
7. All 17 required web and Flutter pricing surfaces pass same-commit,
   authenticated source-to-render verification.
8. Every displayed price resolves to one immutable publication snapshot,
   qualification decision, exact mapping, source row, and source artifact.
9. Full eligible signed-in publication activates atomically.
10. Seven consecutive unattended daily production cycles complete after
    allowed retries with no unexplained reconciliation, freshness, printing,
    provenance, performance, or alert failure.
11. Rollback to the prior complete publication generation remains verified and
    available.
12. Pricing checkpoints and the final production report reconcile every gate.
13. Anonymous reads remain disabled unless the separate public licensing,
    attribution, display, security, rollback, and notification gates pass.

Passing one endpoint, one client, one publication run, or one manual review
does not satisfy this release definition.

## 3. Post-V1 Backlog

The following are explicitly outside Production V1:

- Japanese pricing
- non-English pricing
- slabs and graded-card pricing
- sealed products
- code cards
- special variants without exact V1 authority
- Grookai Value
- sold-history weighting
- proprietary valuation models
- inferred or blended valuation
- other TCGs

These ideas are not rejected. They belong to a separately versioned release
and cannot enter the Production V1 release branch.

## Change Control

Allowed during the Production V1 feature freeze:

- defect correction required by this contract
- rollout-gate implementation
- deployment and migration execution already required by this contract
- verification and audit hardening
- operational reliability work
- security correction
- documentation that clarifies, but does not change, frozen semantics

Not allowed:

- new product features
- UX expansion unrelated to a release defect
- architectural redesign
- schema expansion unrelated to a frozen release gate
- additional data categories or valuation methods
- weakening or redefining an acceptance criterion

The authoritative change test is:

> Does this change make an existing Production V1 release requirement more
> provably true without changing what Production V1 means?

If not, it belongs in V1.1 or later.
