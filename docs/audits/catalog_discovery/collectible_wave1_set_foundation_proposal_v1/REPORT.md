# Collectible Wave 1 Set Foundation Proposal V1 Checkpoint

## Context

The Yu-Gi-Oh and Gundam game foundations are already applied and hidden. This
checkpoint records the next artifact-only gate: a deterministic proposal for
source set foundations derived from the exact 46,259-row Parser Wave 1 corpus,
the exact 124-row alternative-artwork index, and frozen source set manifests.

## Decision

Preserve the proposal as review evidence only. Do not promote source set rows to
canonical authority and do not create a set migration from aggregate counts
alone.

Yu-Gi-Oh candidates map by exact, case-sensitive source set name. Shared source
codes remain separate and reviewable. Gundam candidates map by exact source set
code while source-name disagreements remain conflicts. Collector namespace
signatures are diagnostics, not canonical codes. Alternative-artwork evidence
remains unresolved at the artwork-to-printing boundary.

## Proven Result

- workflow run: `33142767700`;
- merged workflow commit: `843f73d33427d54aa98ab3248f097498f5cce2ef`;
- artifact ID: `9674581333`;
- artifact archive digest:
  `sha256:b32503f3af32564ddd42cb6e68ad2ea86282f91c62b9d70951a697a0c056fcc0`;
- 46,259 candidates reconciled exactly once;
- 46,257 candidate/set assignments and 2 candidate source gaps;
- 1,056 unique manifest set proposals and 5 manifest source gaps;
- 142 shared Yu-Gi-Oh code groups: 87 disjoint, 52 overlapping, 3
  insufficient;
- 32 preserved candidate/set conflicts;
- 124 alternative-artwork rows with all 1,679 candidate references present;
- 1,266 set-level alternative-artwork references;
- zero validation bytes, URL leaks, true production boundaries, or
  reconciliation mismatches.

## Current Truths

- The proposal architecture is implemented and merged.
- The exact live workflow completed successfully on merged `main`.
- Every upstream artifact and every proposal artifact is hash-addressed.
- Raw source manifests, source image URLs, and source bodies are not committed.
- Large row artifacts remain in GitHub Actions and expire on
  `2026-11-26T04:46:09Z`.
- Production contains only the hidden Yu-Gi-Oh and Gundam game foundations from
  the prior gate. This proposal performed no production access.

## What Must Never Be Broken

- Shared Yu-Gi-Oh source codes must never silently merge distinct source sets.
- Case drift, language-marker conflicts, and source-name conflicts must remain
  visible until a later authority resolves them.
- Alternative-artwork source IDs must never be treated as proven
  artwork-to-printing ownership.
- A proposal row must never gain canonical or write authority by inference.
- No set, card, identity, mapping, image, pricing, publication, or Vault write
  is authorized by this checkpoint.

## Exact Next Gate

Design a bounded canonical set apply proposal from the 505 `review_ready` rows
only after defining deterministic canonical set IDs/codes, collision ownership,
language policy, rollback behavior, exact database preflight, and a separately
authorized migration. The 551 review-required rows remain outside that apply
until their specific evidence classes are resolved.
