# Pricing Checkpoint 70: One Piece ST-01 Promotion Rollback Proved

## Current Truth

The canonical parent payload for the 17 officially numbered English ST-01
cards is frozen, collision-free, and proven executable in production through a
rollback-only transaction. The transaction created the exact expected set,
parent, identity, source-evidence, and TCGPlayer mapping rows, kept One Piece
hidden from every app role, and rolled all simulated rows back.

No One Piece set, card, identity, evidence, mapping, printing, pointer,
pricing, publication, sealed, or Vault row from this payload is durable.

## Frozen Producers

- Safety-code producer SHA:
  `e2be227c8d305f0854eb8497dd82038e5fc14c99`
- Frozen-plan commit SHA:
  `c5d3b4ad75fcc225e3cfe23d9f36cde22cbd756e`
- Branch:
  `agent/one-piece-ingestion-readiness-v1`
- Plan fingerprint:
  `fad134878a6f42872e1eec22fd7680e932a0b2fc59edba1c0d9b06ada4be1446`
- Payload fingerprint:
  `2cc2e7b308796cc681c0c863f08ada835806d6cbb4596d7880f5cd25ac78cb86`

## Exact Payload

- Hidden ST-01 set rows: `1`
- Canonical parent `card_prints`: `17`
- Active `card_print_identity`: `17`
- `card_print_identity_source_evidence`: `17`
- Exact TCGPlayer `external_mappings`: `17`
- Public child `card_printings`: `0`
- DON!! rows: `0`
- Sealed rows: `0`

Each card is bound to:

- its exact durable staging row and payload hash;
- its official English ST-01 number and name;
- identity domain `one_piece_eng_print`;
- one deterministic canonical parent and identity ID;
- its exact TCGPlayer product ID;
- its independently verified self-hosted image path and SHA-256 as evidence.

The self-hosted image path is evidence only. No `image_url`, alternate image
pointer, or Storage mutation is authorized by this payload.

## Production Preflight

- Status: `pass`
- Fingerprint:
  `a1ec0e958d746a8b39bf69accffc8558a6abc9799a5ed7197c6a1c149696887c`
- Summary SHA-256:
  `75f14897571700f57fd9454bc1bebd0a54bb692f3407ee1900230fc743e6c60b`
- Staged rows reconciled: `17 / 17`
- Canonical collisions: `0`
- Blocking database sessions: `0`
- Foundation game/release/migration rows: `1 / 1 / 1`
- Existing One Piece sets/cards before canary: `0 / 0`
- Anon/authenticated/service visibility: `false / false / false`
- Read-only transaction: `true`
- Database writes: `0`

## Rollback-Only Canary

Inside the transaction, exact readback and transaction-local attribution were:

| Table | Inserts | Updates | Deletes |
| --- | ---: | ---: | ---: |
| `sets` | 1 | 0 | 0 |
| `card_prints` | 17 | 0 | 0 |
| `card_print_identity` | 17 | 0 | 0 |
| `card_print_identity_source_evidence` | 17 | 0 | 0 |
| `external_mappings` | 17 | 0 | 0 |

No other public table had an attributable write. The transaction had no
commit path and was rolled back.

Rollback-canary summary SHA-256:
`d6fdcd97ffe87ba41b1f88d02e2643330a6929733448f05b38c2c0a9a8013135`.

## Zero-Residue Proof

- Target set collisions after rollback: `0`
- Target card collisions after rollback: `0`
- Target identity collisions after rollback: `0`
- Target evidence collisions after rollback: `0`
- Target mapping collisions after rollback: `0`
- Separate post-rollback read-only fingerprint:
  `a1ec0e958d746a8b39bf69accffc8558a6abc9799a5ed7197c6a1c149696887c`
- Separate post-rollback summary SHA-256:
  `eca1577dfbed43a392d0e0509fcc7b0d11505c14e46e00eb66c5f8563d9cca28`
- Durable canonical rows from this gate: `0`

The independent post-rollback read-only pass reproduced the original
preflight fingerprint exactly.

## Tests

- Full One Piece contract suite: `136 / 136` passed before the live gate.
- New ST-01 promotion contract tests: `8 / 8` passed.
- Node syntax checks: passed.
- Artifact hash reconciliation: passed.
- `git diff --check`: passed.

## Preserved Boundaries

- One Piece remains hidden for anon, authenticated, and service requests.
- The DON!! card remains staged and unpromoted.
- All three sealed candidates remain staged and unpromoted.
- The 18 permanent Storage objects remain immutable.
- No image pointer references those objects through a new canonical row.
- No exact printing child exists for these parents.
- No pricing or publication authority was created.
- No Vault or ownership data changed.
- No Pokemon, Japanese, MTG, or existing canonical row changed.

## Artifacts

- Frozen plan:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/`
- Production read-only preflight:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/production_preflight_v1/`
- Rollback-only canary:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/production_rollback_canary_v1/`
- Separate post-rollback read-only proof:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/post_rollback_read_only_v1/`

## Exact Next Gate

Build a guarded insert-only durable writer pinned to plan fingerprint
`fad134878a6f42872e1eec22fd7680e932a0b2fc59edba1c0d9b06ada4be1446`
and preflight fingerprint
`a1ec0e958d746a8b39bf69accffc8558a6abc9799a5ed7197c6a1c149696887c`.
Require separate explicit authorization before committing exactly one hidden
ST-01 set, 17 parent cards, 17 active identities, 17 source-evidence rows, and
17 TCGPlayer mappings. Keep child printings, DON!!, sealed products, Storage,
image pointers, pricing, publication, Vault writes, and app visibility outside
that authorization.
