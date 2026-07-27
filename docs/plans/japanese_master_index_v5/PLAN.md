# Japanese Master Index V5 Coverage Engine

## Objective

Build a read-only Japanese acquisition and coverage authority that can
defensibly prove at least 98% coverage of governed Japanese base-card
identities. Japanese identities remain connected to the existing
language-agnostic Master Identity Graph.

The primary metric is:

```text
admissible Japanese base-card slots
-----------------------------------
governed expected Japanese base-card slots
```

Exact printings, images, English display names, source corroboration, and
production promotion are reported separately. Source assertions, products,
aliases, and duplicate rows never inflate the denominator.

## Frozen Starting Point

- V4 working candidates: 71,992
- V4 strict admissible identities: 28,008
- Verified identities absent from production: 5,691
- Promotion-ready identities: 5,336
- Admissible English-name holdouts: 355
- Insufficient-evidence candidates: 39,737
- Historical deferrals: 3,693
- Unresolved contradictions: 339

## Current V5 Progress

- Governed containers censused: 1,453
- Deterministic scope dispositions: 72
  - 15 contaminated TCGdex aliases excluded
  - 57 duplicate official expansion-product aliases merged
- Reconciled bounded denominator after the first official-product lanes:
  21,944 base-card slots
- Exact covered slots on the reconciled bounded denominator: 8,211
- Current bounded coverage: 37.42%
- Projected V5 working identities: 72,020
- Active release/product scopes with unresolved work: 1,306
- Zero-inventory release/product containers remaining: 579
- Official zero-inventory products processed from preserved snapshots: 455
- Explicit named-card slots acquired from official product contents: 191
- Direct official card-list products discovered: 15
- Official card-list products parsed: 14
- Official product card-list assertions acquired: 327
- Unique official card IDs represented by those assertions: 253
- Exact official identities integrated into the read-only V5 overlay: 278
  - 45 new identities absent from V4
  - 224 exact-image upgrades to existing V4 candidates
  - 9 duplicate basic-energy clusters collapsed under exact official IDs
  - 26 source-isolated V4 candidate rows superseded
- Completed official product scopes retired from the active queue: 15
- Completed canonical release scopes retired from the active queue: 3
- Base identities with complete promotion evidence: 101
- Base identities retained with promotion blockers: 177
  - 45 missing collector-facing English names
  - 136 unresolved family relationships; blocker categories may overlap

The 191 product-content assertions remain source evidence rather than
name-only coverage. The direct card-list lane supplied 253 exact official
card IDs. A repaired numeric Official JP product-search lane added the `SB`
release: 24 numbered identities plus nine governed unnumbered basic-energy
IDs, eight of which overlap the first lane. The union is therefore 278 exact
official identities. These identities are reconciled against V4 by official
image/card ID rather than title. Base-index coverage and
production-promotion readiness remain separate measurements.

## Workstreams

1. Build a complete release-container census and classify denominator quality.
2. Establish expected numbered slots and governed unnumbered identity scopes.
3. Reconcile production and V4 identities against that denominator.
4. Harvest missing containers and slots from approved reproducible sources.
5. Corroborate plausible single-source identities in bounded batches.
6. Adjudicate duplicates, aliases, malformed rows, products, and conflicts.
7. Track exact printings and image coverage separately from base identities.
8. Regenerate deterministic promotion packages after each acquisition wave.
9. Repeat gap-driven acquisition until base-identity coverage exceeds 98%.
10. Preserve every remaining exception in an explicit evidence queue.

## Gates

- 100% of governed release containers have a durable census disposition.
- Only containers with defensible bounds contribute to the coverage ratio.
- Every denominator exclusion states the missing evidence.
- Every expected slot is resolved, blocked, excluded, or queued.
- No production database, Storage, identity, family, pricing, or public-surface
  writes occur in V5.
- English and existing Japanese fingerprints remain unchanged.
- All artifacts replay with identical fingerprints.

## Promotion Boundary

V5 produces read-only evidence and deterministic packages. Any database
promotion remains a separate, explicitly approved project.
