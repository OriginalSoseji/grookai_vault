# P0 Search and Card Detail High-Fidelity Checkpoint V1

## Context

The Release Convergence checkpoint approved Search and Card Detail as the first high-dependency journeys for explicit high-fidelity treatment. Their shared presentation rules will later propagate into Vault, Sets, Dex, Compare, Pulse, and Wall.

## Problem

Search exposed strong capability through several competing densities and repeated diagnostic presentations. Card Detail placed oversized identity and explanatory content ahead of the primary collection workflow. Dark-mode pricing labels and shared badges also contained contrast defects exposed by the new fixtures.

## Risk

A broad rewrite could change canonical grouping, exact-printing behavior, pricing authority, image truth, or ownership mutations. A purely cosmetic pass could also hide the variant details collectors need to distinguish cards.

## Decision

Implement one evidence-backed result disclosure, a responsive collector result row, a quieter Search hierarchy, and an artwork-led Card Detail hierarchy where the existing Vault action precedes optional narrative and provenance.

## Implementation

- Branch: `release/8-week-convergence-v1`
- Evidence-producing commit: `831492d12bfbbc930600784adc3e202977fe1164`
- Audit: `docs/audits/release_convergence_v1/P0_SEARCH_CARD_DETAIL_HIGH_FIDELITY_V1.md`
- Screenshots: `apps/web/tests/parity/__screenshots__/canonical-samsung/p0-*.png`

## Current Truths

- Search grid, list, and detail modes use one evidence disclosure.
- Exact set, number, rarity, finish, pricing, and Vault action remain visible in the canonical result hierarchy.
- Search empty results use the shared product-state contract.
- Card Detail renders its existing collection workflow before optional version context and evidence.
- Mobile Card Detail uses a smaller artwork stage than tablet and desktop.
- Card Detail sections no longer rely on decorative section cards or radial backgrounds.
- Dark-mode pricing and shared badge contrast passes the Samsung accessibility suite.

## Invariants

- Search resolution and ranking are not presentation concerns.
- Search-to-Vault must continue through the existing exact-version Card Detail workflow.
- Image-truth labels must remain honest when exact artwork is missing.
- Grookai IDs and provenance remain available even when not shown by default.
- Exact variant context must remain visible whenever a card is shown.
- Collection writes continue through the existing guarded server actions only.

## Verification

- Full contract suite: `1,487/1,487` pass.
- Samsung parity and accessibility suite: `35/35` pass.
- New P0 screenshot baselines: `4/4` pass.
- Existing native-canon goldens: unchanged.
- Next production build: pass.
- Full pre-commit shipcheck: pass.
- Flutter tests: `565/565` pass.
- Runtime critical failures: `0`.

## What Must Never Be Broken

- Canonical identity, exact printing, price authority, ownership, privacy, and image-truth boundaries.
- Visible finish and variant context.
- Fixed five-item mobile navigation.
- Honest degraded and missing-image states.
- Existing customer data and mutation paths.

## Explicit Next Gate

Apply the approved identity, action, and evidence hierarchy to Vault and exact-copy surfaces. Produce deterministic mobile and desktop fixtures for loaded, empty, private, partial-error, duplicate-copy, and offline states. Stop before changing ownership semantics or applying any deployment.
