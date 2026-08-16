# Pricing Checkpoint 88: One Piece Sealed Qualification Rollback Proven

## Context

Checkpoint 87 identified 374 One Piece sealed variants with real TCGPlayer
price observations and 16 variants without any source price observation. The
production qualification, release, release-member, and release-pointer tables
were empty.

## Problem

The 374 observed pricing decisions needed a database-shaped, immutable payload
and a live insertion proof before any durable qualification write. The proof
had to preserve source-row provenance, exercise every currently populated
decision class, and demonstrate zero residue. Missing-observation products
could not be forced into the table because its contract requires a real source
price row identity.

## Decision

Build the exact qualification rows offline and assign deterministic IDs from
the source mapping, source price row identity, observation date, and contract
version. Keep all 16 missing-observation products in a separate hold list.

Run a fresh production read-only preflight across all 374 planned rows. Then
insert one representative `qualified_exact`, `blocked_stale`, and
`blocked_missing_price` row in a single transaction, read them back exactly,
attribute the transaction writes, roll the transaction back, and independently
verify zero residue.

## Producer And Fingerprints

- Offline plan producer commit:
  `0102cf5a7a7031be52b1804db7728a920b4c6cb1`
- Rollback canary producer commit:
  `9bfba3b135142c4c2c8c06be19e21f7469186117`
- Source audit fingerprint:
  `a22c8ea9d2a84ab63ac9c90d558a5749cf0f402ae79f947aeb6ac752a20db5ae`
- Source qualification artifact SHA-256:
  `dda99124915753128c54b075f7a281b487456d72ba9e6cc67e8e71df125c597a`
- Frozen plan fingerprint:
  `d849465b7c9b7c10e736546a1c0298630a103464f4b64dcc12af02b913080f3f`
- Frozen payload fingerprint:
  `be884db80e24e0dfd7963234e4187994456ed439cb2c0cfe149101e92c29287e`
- Rollback sample fingerprint:
  `7d3e04655dc13e7ef4de2f880b68b05fa4ed6f70781c87c0e7740c5606068a54`

## Frozen Payload

- Qualification rows: 374
- `qualified_exact`: 332
- `blocked_stale`: 4
- `blocked_missing_price`: 38
- Missing-observation holds outside the database payload: 16
- Planned updates/deletes: 0 / 0
- Planned release/member/pointer/publication writes: 0 / 0 / 0 / 0
- Offline-plan database connections/writes: 0 / 0

Every persisted row has a real source mapping, source price row identity,
observation date, currency, source payload fingerprint, decision reason, and
publication authority set to false.

## Fresh Production Preflight

- Expected rows: 374
- Matched canonical variants: 374
- Matched exact reviewed mappings: 374
- Matched source price observations: 374
- ID collisions: 0
- Database unique-key collisions: 0
- Existing qualification rows: 0
- Existing releases/members/pointer rows: 0 / 0 / 0
- One Piece release control: hidden

## Schema And Security Readback

- RLS enabled: true
- RLS forced: true
- Append-only trigger enabled: true
- Service-role policy present: true
- Service role has select and insert: true
- Anonymous select: false
- Authenticated select: false

## Rollback Proof

The transaction inserted exactly three rows into only
`sealed_product_pricing_lane_qualifications`:

- one `qualified_exact`
- one `blocked_stale`
- one `blocked_missing_price`

Transaction-local readback matched the planned rows exactly. Write attribution
reported three inserts, zero updates, zero deletes, and zero hot updates on the
qualification table, with no other table present. The transaction committed
false and rolled back true. Independent read-only verification found zero
target rows afterward and an unchanged protected baseline.

## Current Truths

- Production still contains zero sealed qualification rows.
- Production still contains zero sealed releases, members, and pointer rows.
- One Piece remains hidden from app clients.
- The exact 374-row qualification payload is frozen and database-compatible.
- The 16 missing-observation products remain explicit evidence gaps.
- Qualification does not authorize release or publication.
- No card, Storage, Vault, pricing-publication, or visibility data changed.

## Invariants

- TCGPlayer `market_price` remains the sole authority for this lane.
- A qualification must reference a real exact mapping and source observation.
- Missing observations never receive synthetic source identities.
- Blocked decisions remain first-class evidence and cannot enter a release.
- `publication_authority` remains false for every qualification.
- The qualification ledger remains append-only and service-only.
- Only `qualified_exact` variants may be considered by a later release gate.
- Release creation, membership, pointer activation, publication, and app
  visibility remain separate operations.

## Tests

- New qualification plan and canary contracts: 7 / 7 passed.
- Combined lineage, plan, and canary contracts: 12 / 12 passed.
- Full repository shipcheck passed for all three producer commits.
- Flutter tests: 614 / 614 passed in each full hook.
- Artifact hash mismatches: 0.

## Permanent Artifacts

- `docs/audits/pricing/one_piece_sealed_pricing_qualification_plan_v1/frozen_plan_v1/`
- `docs/audits/pricing/one_piece_sealed_pricing_qualification_rollback_canary_v1/production_rollback_v1/`

## Exact Next Gate

Freeze an insert-only durable apply plan for exactly the 374 qualification
rows, bound to the plan and payload fingerprints above and to a fresh
zero-collision production preflight. The future writer must perform one atomic
insert-only transaction, exact transaction-local readback, exact write
attribution, and independent post-commit readback.

Do not include the 16 missing-observation holds. Do not create a sealed release,
release members, a release pointer, publication rows, or app visibility in that
gate.
