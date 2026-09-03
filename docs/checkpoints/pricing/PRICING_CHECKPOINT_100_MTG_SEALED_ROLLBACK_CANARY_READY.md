# Pricing Checkpoint 100: MTG Sealed Rollback Canary Ready

## Status

`ROLLBACK PROVEN - APPLY AUTHORITY BINDING REPAIR REQUIRED - APPLY BLOCKED`

## Context

The separate MTG sealed visibility boundary is durably applied and independently
verified. PR `#401` merged the cast-insensitive readback normalization and this
workstream then ran every remaining non-durable gate from exact
`main@51db4e1e5eb26ed31f006df38fa5d28eda2ef69d`.

No MTG sealed payload, Storage object, pricing publication, Vault row, catalog
release-control row, or visibility activation was committed during these gates.

## Problem

The previously recorded 2,904-variant MTG sealed plan predated the final
visibility boundary and could not be reused as durable apply authority. The
current warehouse, pricing observations, schema, target emptiness, One Piece
boundary, and hidden-visibility behavior all needed fresh proof from one exact
producer before a payload apply could be considered.

## Risk

- Applying stale source evidence could publish incorrect or outdated pricing
  qualifications.
- A cross-game writer defect could mutate the existing One Piece sealed world.
- A partially committed MTG write could leave families, mappings,
  qualifications, releases, or pointers out of reconciliation.
- A catalog-visible MTG game could expose sealed rows unless the independent
  sealed visibility gate remained hidden.
- Treating a rollback canary as durable authority would bypass the required
  exact payload approval.

## Decision

- Freeze the complete MTG sealed plan from one exact merged producer SHA.
- Require the read-only preflight to reproduce the same plan and source
  fingerprints with an empty MTG target and unchanged One Piece hashes.
- Exercise the complete write graph in one transaction and roll it back.
- Require exact in-transaction row projections, a valid frozen release and
  pointer, hidden-RPC zero rows, unchanged One Piece hashes, and zero post-
  rollback MTG residue.
- Stop before durable apply and request authority tied to the exact producer,
  plan fingerprint, source fingerprint, and row counts.

## Alternatives Rejected

- Reuse the prior plan without regeneration: schema and source state had moved.
- Test only a subset of tables: this would not prove complete release and
  pointer behavior.
- Activate visibility during the canary: release visibility is a later,
  independent decision.
- Apply first and repair afterward: production writes require prior rollback and
  cross-game proof.

## Independent Migration Readback

GitHub run `33800216028` ran only `migration_readback` from exact producer SHA
`51db4e1e5eb26ed31f006df38fa5d28eda2ef69d`.

It passed all checks:

- migration file hashes and ledger;
- columns, constraints, and index;
- function definitions, volatility, search paths, and ACLs;
- RLS, policies, and table privileges;
- release, pointer, game, and visibility data boundaries;
- MTG catalog `signed_in` with MTG sealed `hidden`;
- zero MTG sealed releases, pointers, and RPC rows;
- `database_writes: 0`.

Key immutable artifact hashes:

- `migration_readback.json`:
  `0b815f5a259c72dd8f1f61cc43cd8dbc60aa4bb13be22b4964c4a710c7be7fb7`
- `summary.json`:
  `991f0691978a319ccefd58a9934928de696636414a3f72e8931cfa141ecebc8f`

## Frozen Plan

GitHub run `33800372924` produced:

- plan fingerprint:
  `8f76f3f90db6476d856e464f63f43dbb82b3ea4d4fced21ff0771e4292da0b67`;
- source fingerprint:
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`;
- source rows inspected: `117,484`;
- candidate price products: `2,923`;
- latest price rows: `2,795`.

Planned payload counts:

| Entity | Count |
| --- | ---: |
| Candidates | 2,904 |
| Families | 237 |
| Variants | 2,904 |
| Reviews | 2,904 |
| Mappings | 2,904 |
| Evidence rows | 14,070 |
| Qualifications | 2,779 |
| Qualification holds | 144 |
| Frozen releases | 1 |
| Release members | 2,182 |

Qualification outcomes:

| Status | Count |
| --- | ---: |
| `qualified_exact` | 2,182 |
| `blocked_missing_price` | 480 |
| `blocked_stale` | 117 |

The compressed plan artifact SHA-256 is
`9569add4f5fa9568a10b00e7329cea9fe9b571540c10cbd4aa0dca189b525d02`.

## Read-Only Preflight

GitHub run `33800790117` reproduced both fingerprints exactly and passed with
`database_writes: 0`.

It proved:

- required schema and game-scoped visibility function exist;
- the MTG target is empty across all nine payload tables plus pointer;
- MTG sealed visibility is `hidden`;
- the One Piece sealed boundary is captured independently and unchanged;
- no authenticated MTG sealed exposure exists before a later release decision.

The preflight summary SHA-256 is
`6a04e7537af48906349c3c1dea02585b853cc56dd5f8ed056968847ad6be6d18`.

## Full Rollback Canary

GitHub run `33801445146` reproduced the same fingerprints, reran preflight, and
executed the full payload writer inside a transaction that was rolled back.

In-transaction proof:

- every projected family, variant, candidate, review, mapping, evidence,
  qualification, release, and member count matched exactly;
- the MTG frozen release had `2,182` expected members;
- the game-scoped MTG pointer referenced that release and no previous release;
- the hidden governed RPC returned zero rows;
- One Piece before/after counts and SHA-256 boundaries were identical.

Post-rollback proof:

- every MTG target table and pointer returned to count `0`;
- the MTG empty-boundary SHA-256 remained
  `fc248235be52833d33b5df0b5b4033028815c92e5b32b9900719e95b33960714`;
- One Piece remained unchanged with boundary SHA-256
  `83e84e94755dce0dbecf5f02be2c25fa4c9ef2517c98dbe8f95225de5000be03`;
- `database_writes_committed: 0`.

The canary summary SHA-256 is
`cc662e2425e2c92ba31090d9dfbf3d89257ddc3f8af0a54928f52b0fb81a6ad3`.

## Current Truths

- The sealed schema and independent visibility boundary are applied and valid.
- MTG sealed visibility is hidden.
- The MTG sealed target remains completely empty.
- The fresh payload has a stable plan and source fingerprint across plan,
  preflight, and rollback-canary runs.
- The complete payload write graph has been proven transactionally with zero
  committed residue.
- One Piece sealed data and pointer remain unchanged.
- Durable MTG sealed payload apply has not been authorized or executed.
- The proof runs exposed that the workflow recomputed its own apply fingerprint
  without comparing it to separately approved plan, source, and count values.
  The current PR repairs that boundary; the recorded plan is now evidence only
  and must be regenerated from the merged repair SHA.
- Storage, image pointers, pricing publication, Vault writes, and visibility
  activation remain outside this gate.

## Invariants

- Durable apply must accept and compare separately approved producer, plan
  fingerprint, source fingerprint, and exact counts; live recomputation cannot
  authorize itself.
- Any source or plan fingerprint drift invalidates this apply candidate.
- MTG sealed remains hidden after payload apply until a separate release gate.
- One Piece must reconcile to its pre-apply hashes.
- Apply must be followed by an independent readback from a separately selected
  readback operation.
- No payload authority implies Storage, card, pricing-publication, Vault, or
  visibility authority.

## What Must Never Be Broken

- Game isolation and exact source lineage.
- Immutable frozen release membership.
- Service-only write ownership and signed-in read boundaries.
- Hidden-before-release behavior.
- Exact failure attribution and rollback of only the authorized execution.
- Zero mutation of One Piece and unrelated catalog domains.

## Permanent Evidence

- Independent migration readback:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33800216028`
- Fresh plan:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33800372924`
- Read-only preflight:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33800790117`
- Full rollback canary:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33801445146`

## Explicit Next Gate

Merge the apply-authority binding repair and rerun `plan`, `preflight`, and
`rollback_canary` from that exact merged SHA. The workflow must prove that an
`apply` operation cannot begin unless separately supplied plan, source, and
exact-count values match the live plan.

The following values remain immutable evidence for the pre-repair proof but are
not apply authority:

- producer SHA:
  `51db4e1e5eb26ed31f006df38fa5d28eda2ef69d`;
- plan fingerprint:
  `8f76f3f90db6476d856e464f63f43dbb82b3ea4d4fced21ff0771e4292da0b67`;
- source fingerprint:
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`;
- exact payload counts recorded above.

After the repaired workflow produces stable replacement fingerprints and counts,
record them in a new checkpoint and obtain separate exact production authority.
That later authority may permit only the planned MTG sealed family, variant,
candidate, review, mapping, evidence, qualification, release, member, and MTG
pointer rows. It must explicitly exclude Storage, image pointers, card catalog,
pricing publication, Vault writes, One Piece mutation, visibility activation,
updates, deletes, cleanup, and rows outside the frozen payload. After apply, run
an independent readback and stop with MTG sealed still hidden.
