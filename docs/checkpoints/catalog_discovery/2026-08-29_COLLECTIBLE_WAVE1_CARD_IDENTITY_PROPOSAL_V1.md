# Collectible Wave 1 Card Identity Proposal V1

## Context

Production contains hidden Yu-Gi-Oh and Gundam game foundations and exactly 505
reviewed hidden set foundations. Parser Wave 1 already supplied source-owned
printing candidates, but those candidates had no authority to create canonical
cards, child printings, variants, images, prices, or application visibility.

The production One Piece and Magic set browser was smoke-tested before this
gate. Both game list routes returned HTTP 200 with game-specific vocabulary,
the targeted route/publication contract suite passed 20/20, and a fresh live
publication gate reconciled 1,007 selected sets with zero blockers and zero
writes. Interactive browser automation was unavailable, so this was an HTTP,
contract, live-data, and image-probe smoke proof rather than a claimed visual
browser pass.

## Problem

Source feeds expose printing rows, not Grookai parent-card truth. Multiple
rarities may describe one parent identity, source set codes have different
ownership rules by game, and Yu-Gi-Oh alternative-artwork rows cannot yet prove
which image belongs to which printing. Writing source rows directly would
create duplicate parents and false variant or artwork authority.

## Risk

- Treating rarity as a finish would invent child printings.
- Matching Gundam or Yu-Gi-Oh through the wrong set key would misfile cards.
- Selecting a preferred name at a conflicting collector number would silently
  overwrite source disagreement.
- Assigning alternative artwork before row-level ownership is proven would
  create false image identity.
- Partial production readback could allow drifted set or game foundations to
  authorize a proposal.

## Decision

Build one immutable, artifact-only parent identity proposal from frozen inputs:

- Parser Wave 1 run `33118951166`, exactly 46,259 candidates;
- alternative-artwork run `33132457407`, exactly 124 source-card rows;
- the exact applied 505-set payload, 500 Yu-Gi-Oh and 5 Gundam sets.

Yu-Gi-Oh matches sets by exact source set name. Gundam matches by exact source
set code. Parent grain is game, approved canonical set ID, printed collector
number, printed name, and language `en`. Rarity remains source printing
evidence only. Identity conflicts and unresolved alternative artwork remain
explicit review rows.

The worker compares every persisted field of all 505 production set rows and
the complete game-foundation tuples before building the proposal. Its only
production transaction is repeatable-read, read-only, and rollback-ended.

## Alternatives Rejected

- Using the newest parser snapshot mid-gate was rejected because it contains
  43 additional rows and would invalidate the frozen proposal tuple.
- Creating one parent per rarity was rejected because rarity is printing
  evidence, not parent identity.
- Inferring child finishes or variants was rejected because no finish authority
  exists in this gate.
- Applying all 46,259 rows was rejected because 13,098 candidates do not belong
  to the 505 applied set foundations.
- Resolving alternative artwork from source-card aggregates was rejected
  because artwork-to-printing ownership remains unproven.

## Production Proof

- pull request: `318`;
- merged producer SHA: `d568c746f15ab506992dde19c7e2db01cd2c93a7`;
- workflow run: `33239106476`;
- artifact ID: `9710816572`;
- proposal fingerprint:
  `968e0329fc021a8f5602c3f253876671127a11ba33749ce79baaaae21c01157f`;
- source candidates reconciled: `46,259 / 46,259`;
- candidates inside approved sets: `33,161`;
- explicit set-scope exclusions: `13,098`;
- proposed parent identities: `27,835`;
- proposal-ready parents: `26,719`;
- review-required parents: `1,116`;
- identity-conflict parents: `18` across `9` collector-number coordinates;
- unresolved-alternative-artwork parents: `1,098`;
- candidate reconciliation mismatches: `0`;
- production selected sets verified: `505`;
- existing target-set cards: `0`;
- database findings: `0`;
- remote artifact hash mismatches: `0`;
- contract tests: `59 / 59` passed;
- database writes: `0`.

Compact permanent evidence is preserved at
`docs/audits/catalog_discovery/collectible_wave1_card_identity_proposal_v1/`.
The complete large proposal remains in the immutable workflow artifact and is
bound by the remote hash manifest and proposal fingerprint.

## Overnight Source Status

Two additional no-write source jobs completed successfully from SHA
`026f56d34a3a92247e4a9dbc7e18905b5c6a05b0`:

- adapter probe run `33238111432`: 10 healthy sources and 6 preserved source
  failures; no bodies, images, database rows, or canonical state persisted;
- parser run `33238112330`: 46,302 validated candidates, zero validation
  failures, 44,486 Yu-Gi-Oh and 1,816 Gundam rows.

The 43 rows added since the frozen 46,259-row corpus are next-delta candidates.
They were not substituted into this proposal.

## Current Truths

1. A deterministic parent proposal now exists for every frozen candidate that
   belongs to the applied hidden set foundations.
2. Production still contains zero cards in those 505 sets.
3. Yu-Gi-Oh and Gundam remain hidden and unavailable to app request roles.
4. No child printing, variant, finish, image, price, search, publication, or
   Vault authority was created.
5. Review-required rows remain evidence, not blockers for proposal-ready rows
   and not permission to guess.
6. The latest source delta is known and isolated from the frozen proof.

## Invariants

- Parent identity must remain separate from source printing evidence.
- Rarity cannot be converted into finish without a later governed contract.
- Alternative artwork cannot be assigned until image-to-printing ownership is
  source-addressable and proven.
- Missing sets cannot be inferred or created inside a card gate.
- Hidden release controls cannot change in an identity gate.
- Any durable write requires deterministic IDs, GV-IDs, migration history,
  rollback proof, exact row counts, and separate authorization.

## Exact Next Gate

Build a deterministic parent-card apply proposal for only the 26,719
proposal-ready rows. Define stable parent UUIDs, GV-IDs, identity domains, and
source evidence records; reconcile collisions against current production; and
generate a migration candidate plus an executable-disabled rollback contract.

Then run one exact-SHA production transaction that applies the proposed rows
transiently and always rolls back. Prove exact transient rows, exact rollback
absence, unchanged hidden controls, unchanged protected domains, and zero
migration-ledger change.

Stop before durable apply. The 1,116 review-required parents, 13,098 candidates
outside applied sets, 43-row parser delta, child printings, images, prices, and
application visibility remain separate later gates.
