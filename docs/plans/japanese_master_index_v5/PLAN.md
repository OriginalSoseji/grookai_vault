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
