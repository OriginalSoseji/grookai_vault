# Release Convergence Visual Boundary Checkpoint V1

## Context

Grookai entered the 8-week completion phase with extensive working capability but inconsistent visual hierarchy, incomplete state coverage, and broken transitions between existing product pillars. The governing release rule is to build no new islands.

## Problem

Mobile web did not use the same dock presentation as the app-canon fixture, Search lacked a visible direct path into the existing Vault action, shared failure/private states were inconsistent, and canonical card art used mixed `3 / 4` and `5 / 7` frames.

## Risk

A broad visual rewrite would invent product decisions without approved high-fidelity direction. A narrow code-only repair without evidence would leave the release unable to prove consistency across mobile, desktop, Flutter, loading, error, and private states.

## Decision

Complete only the governed functional bridges and token-level visual consistency. Preserve existing interactions and data contracts. Record every surface requiring compositional redesign in a prioritized inventory instead of redesigning it implicitly.

## Alternatives Rejected

- Cherry-picking the old `agent/web-app-aesthetic-parity` branch: rejected because it is 158 commits behind current main and encodes an unapproved desktop-shell direction.
- Rebuilding the desktop and mobile shell from scratch: rejected as a new visual language.
- Adding a Search-specific Vault mutation: rejected because the exact-version Card Detail workflow already exists.
- Converting all `3 / 4` frames mechanically: rejected because scanner viewports, warehouse evidence, and collector-uploaded photos are not canonical card art.
- Removing all legacy gradients mechanically: rejected because the remaining occurrences require surface-level intent review.

## Implementation Boundary

- Worktree: `C:\grookai_vault_release_convergence`
- Branch: `release/8-week-convergence-v1`
- Source baseline: `3c7c5eff3b4a15aef395c8546771167c85aa9970`
- Evidence-producing implementation commit: `6258f020ff0da6ef06d1874816af0ccec3ab5608`
- Original dirty pricing worktree was not modified.
- No database or remote infrastructure access.
- No deployment, push, merge, feature activation, or production mutation.

## Current Truths

- Production and fixture mobile docks share one presentation component.
- Search grid, list, and details results expose the existing exact-version Vault workflow.
- Root errors, not-found, Binder errors, and private-state evidence use one shared component.
- Canonical card-art aspect drift in the deterministic collector audit is zero.
- Public implementation-copy findings in the audited entry surfaces are zero.
- Radius findings above the approved `26px` ceiling are zero.
- The six canonical native screenshots remain pixel-stable.
- Forty legacy radial-gradient diagnostics remain for design review.
- High-fidelity design approval is incomplete for the broader surface catalog.

## Invariants

- The native app remains visual canon until explicitly superseded.
- Pulse, Wall, Scan, Vault, and Search remain the five mobile dock items.
- Search-to-Vault must use the existing exact-version workflow.
- Exact variant context must remain visible whenever a card is shown.
- Shared states must never imply a mutation occurred when it did not.
- Private and secret routes must not leak context into global chrome.
- User media and operational evidence must not be normalized as canonical card art.

## Evidence

- `docs/audits/release_convergence_v1/RELEASE_VISUAL_COMPLETION_REPORT_V1.md`
- `docs/audits/release_convergence_v1/PRIORITIZED_HIGH_FIDELITY_REDESIGN_INVENTORY_V1.md`
- `docs/audits/release_convergence_v1/baseline/current_state_inventory_v1.json`
- `docs/audits/release_convergence_v1/baseline/current_state_inventory_v1.md`
- `docs/audits/release_convergence_v1/screenshots/`
- `apps/web/tests/parity/__screenshots__/canonical-samsung/`

## Verification

- Web typecheck: pass.
- Web lint: pass.
- Next.js 16.2.12 production build: pass.
- Node contracts: `20/20` pass.
- Release-convergence Playwright: `4/4` pass.
- Canonical visual/a11y/geometry suite: `23/23` pass.
- Targeted Flutter analysis: pass.
- Diff check: pass.
- Full repository shipcheck: pass.
- Full contracts: `1,485/1,485` pass.
- Full Flutter tests: `565/565` pass.
- Runtime preflight: zero critical failures; known deferred debt remains explicitly reported.

## What Must Never Be Broken

- Canonical identity, pricing, ownership, privacy, Binder, and image-truth boundaries.
- Existing customer data and mutation paths.
- Five-item dock order and route suppression.
- Exact printing selection before adding ambiguous cards.
- Honest missing/fallback/representative image behavior.

## Explicit Next Gate

Owner/design approval of the P0 redesign inventory. After approval, produce and review high-fidelity Search/Card Detail and Vault/exact-copy journey designs before implementing broad composition changes.
