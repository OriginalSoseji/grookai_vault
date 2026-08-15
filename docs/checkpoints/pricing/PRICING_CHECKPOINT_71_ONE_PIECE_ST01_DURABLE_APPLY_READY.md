# Pricing Checkpoint 71: One Piece ST-01 Durable Apply Ready

## Current Truth

The exact 17-card English ST-01 canonical parent payload is ready for a
separately authorized durable insert. A guarded writer, immutable apply plan,
fresh production read-only preflight, transaction-local attribution check,
exact durable readback, and independent post-apply verifier now exist.

No durable ST-01 set, card, identity, evidence, or mapping row was written by
this gate. The readiness runner operated in `plan` mode and records
`committed: false`.

## Frozen Producers

- Safety-code producer SHA:
  `252b2a81b1cc729d40f016b1b898b0b57d6bba14`
- Apply-plan commit SHA:
  `608fb21f52a1b0aef2819e14dd58dd531a77460f`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Promotion-plan fingerprint:
  `fad134878a6f42872e1eec22fd7680e932a0b2fc59edba1c0d9b06ada4be1446`
- Payload fingerprint:
  `2cc2e7b308796cc681c0c863f08ada835806d6cbb4596d7880f5cd25ac78cb86`
- Durable apply-plan fingerprint:
  `6c09e30e1982b24f0eccf1437269db7747e31190669671f0a753413567cf3d7a`

## Exact Authorized Shape

| Table | Inserts | Updates | Deletes |
| --- | ---: | ---: | ---: |
| `sets` | 1 | 0 | 0 |
| `card_prints` | 17 | 0 | 0 |
| `card_print_identity` | 17 | 0 | 0 |
| `card_print_identity_source_evidence` | 17 | 0 | 0 |
| `external_mappings` | 17 | 0 | 0 |

The set must remain hidden. The exact payload excludes child printings, DON!!,
sealed products, Storage, image pointers, pricing, publication, Vault data,
updates, deletes, and app visibility.

## Fresh Production Preflight

- Status: `pass`
- Fingerprint:
  `41204a27e7c487e20dbc731d848c547ed531f019483f7eb82d3f7113d984e630`
- Summary SHA-256:
  `34f65e3ce3245b8cd957d52ebcc8a2cc3bb0dd6152363a4ef203dd3ca41eccfa`
- Selected numbered cards: `17`
- Set/card/identity/evidence/mapping collisions: `0 / 0 / 0 / 0 / 0`
- One Piece release status: `hidden`
- Anon/authenticated/service visibility: `false / false / false`
- Transaction read-only: `true`
- Blocking database sessions: `0`
- Durable target rows created: `0`

## Guarded Execution Contract

- Default mode is no-write `plan`.
- Durable mode requires `--apply`, the exact clean producer SHA, and exact
  equality with `ONE_PIECE_ST01_DURABLE_APPLY_APPROVAL`.
- A run plan is written before database access.
- A new live collision preflight runs immediately before the transaction.
- The transaction inserts the exact frozen payload and accepts only the
  rollback-proved transaction-local table attribution.
- Commit occurs only after exact transaction readback and hidden visibility
  pass.
- The writer performs a fresh durable readback after commit.
- A separate read-only verifier must independently reproduce the exact rows,
  hidden visibility, fresh preflight, fingerprints, and attribution.
- Apply output is isolated from this readiness packet, so evidence cannot be
  overwritten.

## Validation

- New durable apply contracts: `8 / 8` passed.
- Full One Piece contract suite: `144 / 144` passed.
- Repository shipcheck passed on safety-code producer
  `252b2a81b1cc729d40f016b1b898b0b57d6bba14`.
- Web typecheck, lint, and strict production build: passed.
- Flutter analysis: passed.
- Flutter tests: `614 / 614` passed.
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical failures.
- Module import, Node syntax, artifact hash, and diff checks: passed.

## Artifact Integrity

- Durable apply plan SHA-256:
  `0dd66ce8eb2753a7423b163fd586f9d53ace7fe0aff54c6e0ed4967eca8de7e2`
- Durable apply-plan hash manifest SHA-256:
  `d120048ca521d3d61e38feb2898ff7548b84ec82ed4e4ab1a1638ba3182b4238`
- Final preflight hash manifest SHA-256:
  `4e6301cb4e19c405ef1b3b1dfe5ff5b1b6dc224bb59a4bf9be35fc8c259bf3c3`
- Readiness summary SHA-256:
  `eba786dc4539f071733fa6ee328d08a0247740f57abde3412da0fb13bdc08ba6`
- Readiness hash manifest SHA-256:
  `f67aca1c6ed9d9d310f69a98dd05f9d38159937a84868edad537e07c99a42c42`

## Preserved Invariants

- One Piece remains hidden from every app role.
- The 21 source rows remain immutable service-only staging evidence.
- The 18 permanent self-hosted objects remain unchanged and unreferenced by a
  new canonical image pointer.
- The DON!! card and three sealed products remain unpromoted.
- No exact printing child exists for these parents.
- No price, publication, Vault, ownership, Pokemon, Japanese, MTG, or existing
  canonical row changed.

## Artifacts

- Frozen promotion payload:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/`
- Durable apply plan:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/durable_apply_plan_v1/`
- Final fresh production preflight:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/final_apply_preflight_v1/`
- No-write durable readiness packet:
  `docs/audits/pricing/one_piece_st01_canonical_promotion_v1/durable_apply_ready_v1/`

## Exact Next Gate

Obtain the exact authorization emitted in the readiness summary. Then execute
the guarded writer once from a clean frozen SHA, preserve its execution packet,
and run the independent read-only post-apply verifier. Stop on any fresh
collision, attribution mismatch, readback mismatch, visibility change, or
authorization drift. Do not combine child printings, DON!!, sealed, Storage,
image pointers, pricing, publication, Vault, or release visibility with that
transaction.
