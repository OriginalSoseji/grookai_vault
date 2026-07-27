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
- Reconciled conservative denominator after the official-product lanes:
  22,078 base-card slots
- Exact covered slots on the reconciled bounded denominator: 8,267
- Current bounded coverage: 37.44%
- Projected V5 working identities: 71,903
- Active release/product scopes with unresolved work: 1,295
- Zero-inventory release/product containers remaining: 575
- Official zero-inventory products processed from preserved snapshots: 455
- Explicit named-card slots acquired from official product contents: 191
- Direct official card-list products discovered: 15
- Official card-list products parsed: 14
- Official product card-list assertions acquired: 327
- Unique official card IDs represented by those assertions: 253
- Official product detail pages preserved and hash-verified: 17
- Current product records represented by those pages: 30
- Future product records explicitly excluded as of the census date: 10
- Product-specific Official JP card-search collections recovered: 6
  - Official collection IDs: 724, 725, 726, 734, 735, and 878
  - Complete official card records acquired: 136
  - Release-wide collection ID 882 excluded from product assignment
- Exact Official JP embedded card-image IDs recovered: 3
  - Two add net identities; one overlaps earlier official evidence
- Exact official identities integrated into the read-only V5 overlay: 412
  - 45 new identities absent from V4
  - 253 exact-image upgrades to existing V4 candidates
  - 114 duplicate candidate clusters collapsed under exact official IDs
  - 248 source-isolated V4 candidate rows superseded
  - 334 identities newly covered by V5
  - 78 identities already master-admissible and not counted twice
- Completed official product scopes retired from the active queue: 19
- Completed canonical release scopes retired from the active queue: 10
- Base identities with complete promotion evidence: 174
- Base identities retained with promotion blockers: 238
  - 45 missing collector-facing English names
  - 197 unresolved family relationships; blocker categories may overlap

The 191 product-content assertions remain source evidence rather than
name-only coverage. The direct card-list lane supplied 253 exact official
card IDs. A repaired numeric Official JP product-search lane added the `SB`
release: 24 numbered identities plus nine governed unnumbered basic-energy
IDs, eight of which overlap the first lane. The product-detail lane then
recovered six product-specific official search collections and 136 complete
records. Four overlap earlier official evidence, producing a cumulative union
of 410 exact official identities. Three embedded official card-image IDs add
two more net identities, producing a 412-identity union. The release-wide
`SV2a` search collection was not assigned to its two accessory products.
These identities are
reconciled against V4 by official image/card ID rather than title. The
coverage numerator excludes 78 identities that were already master-admissible.
Base-index coverage and production-promotion readiness remain separate
measurements.

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
