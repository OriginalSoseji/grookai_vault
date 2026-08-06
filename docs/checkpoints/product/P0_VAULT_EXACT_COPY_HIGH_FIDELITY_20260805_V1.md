# P0 Vault and Exact-Copy High-Fidelity Checkpoint V1

## Context

Search and Card Detail established the approved release hierarchy: visible collector identity and actions first, diagnostic evidence disclosed, stable card geometry, and shared degraded states. Vault and exact-copy surfaces were the next dependency gate.

## Problem

Grouped Vault cards mixed family-level ownership with exact-copy details. A family with multiple finishes could look like one exact version, while exact-copy pages repeated identity across nested cards and promoted internal IDs alongside collector facts. Empty and failure states also used separate visual treatments and exposed raw backend error text.

## Risk

A presentation repair could accidentally alter copy ownership, finish assignment, pricing totals, Wall visibility, public privacy, message eligibility, or image-source authority. Hiding too much could also reintroduce variant ambiguity.

## Decision

Make family versus exact-copy identity explicit. Show finish and condition at the primary hierarchy, label mixed or unassigned finish truth honestly, place provenance under evidence disclosure, share one exact-copy hero across owner and public routes, and govern Vault failure states through `ProductState`.

## Implementation

- Branch: `release/8-week-convergence-v1`
- Evidence-producing commit: `cb7af9fb094ed49d4c184457d26ec3d900b8db81`
- Audit: `docs/audits/release_convergence_v1/P0_VAULT_EXACT_COPY_HIGH_FIDELITY_V1.md`
- Screenshots: `apps/web/tests/parity/__screenshots__/canonical-samsung/p0-vault-*.png`

## Current Truths

- A Vault family states whether it has one exact finish, mixed finishes, raw and graded copies, or unresolved finish assignment.
- Each expanded exact-copy row shows condition, finish or slab identity, intent, and visibility.
- Owner and public exact-copy pages use the same primary identity hierarchy.
- Card artwork remains 5:7 and uncropped.
- Exact-copy provenance is available without dominating collector-facing information.
- Empty, error, private, partial, duplicate, offline, and exact-copy scenarios are deterministic and testable.
- Raw backend failure text is not shown on the Vault surface.

## Invariants

- Card families are not exact copies.
- A family with mixed or unresolved copy finish cannot claim one exact finish.
- Finish, condition, grader, grade, and certificate values come only from existing exact-copy read models.
- Exact-copy writes continue through existing instance-scoped actions.
- Public routes may expose only already-discoverable copies.
- Uploaded and hosted image authority remains unchanged.
- Price totals and provenance remain governed by existing pricing contracts.

## Verification

- Full contract suite: `1,489/1,489` pass.
- Full browser parity and accessibility suite: `50/50` pass.
- New Vault screenshots: `4/4` pass.
- Existing native-canon screenshots: unchanged.
- Web typecheck, lint, and strict production build: pass.
- Flutter analysis: no issues.
- Flutter tests: `565/565` pass.
- Runtime preflight: not run because this isolated worktree has no `SUPABASE_DB_URL`; the commit-hook stop and bounded `--no-verify` exception are recorded in the audit.

## What Must Never Be Broken

- Canonical identity, exact printing, finish truth, owner scope, privacy, pricing, and image-truth boundaries.
- Visible variant context wherever a card or exact copy is shown.
- Fixed five-item mobile navigation and unobstructed primary actions.
- Existing vault instance IDs, mutation paths, and preserved history.
- Honest mixed, unresolved, missing-image, private, and degraded states.

## Explicit Next Gate

Apply the approved identity, action, evidence, and degraded-state grammar to Pulse, Wall, and Collector Profile. Define separate event and collection-display grammars and add private, blocked, deleted, empty, loading, and partial-error fixtures. Preserve relationship, message, visibility, and exact-copy boundaries. Stop before deployment and before desktop-shell redesign.
