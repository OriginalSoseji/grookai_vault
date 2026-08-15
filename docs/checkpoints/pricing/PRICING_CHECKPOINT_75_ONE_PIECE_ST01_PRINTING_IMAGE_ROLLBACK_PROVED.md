# Pricing Checkpoint 75: One Piece ST-01 Printing And Image Rollback Proved

## Current Truth

The corrected ST-01 printing and parent-image-pointer payload has passed a
production rollback-only canary and a separate fresh read-only verifier.

- Parent pointer updates in the transaction: `17`
- Normal child-printing inserts in the transaction: `14`
- Exact TCGPlayer printing-mapping inserts in the transaction: `14`
- Foil child writes: `0`
- Child image-pointer writes: `0`
- Durable rows after rollback: `0`
- Independent findings: `0`
- One Piece release status: `hidden`

No durable database mutation occurred in this gate.

## Frozen Authority

- Branch: `agent/one-piece-ingestion-readiness-v1`
- Canary producer SHA: `d2c27323e0cf88320e26f0979fa1ddc9823a4429`
- Plan fingerprint:
  `52d48812803ede0db3a536f0a08346a12aa1461cef128ab5b55a0224f089e13f`
- Mutation payload fingerprint:
  `1916b0279e007648b55244543a25530b631d4f69a0b4ad74333fb84ee87cb1ec`
- Rollback proof:
  `5981125e7746b174cef093274b70c1fbb301ddaf6b732eef40b3728fd489eddb`
- Independent proof:
  `683812fc19d5d10aabdfe0b641058025e0aa4071f6b1cbd839eb56d8f9e85482`

## Context And Problem

Checkpoint 74 froze the original `17 / 14 / 14` plan but had not executed it.
The first rollback attempt failed before changing a row because the plan used
the provenance label `official_one_piece_card_game` in the constrained
`card_prints.image_source` delivery field. Production permits `identity` for a
self-hosted `image_path`; official Bandai provenance belongs in evidence and
`image_note`.

The second attempt produced the exact planned transaction state but the audit
incorrectly required zero PostgreSQL HOT updates. PostgreSQL reports HOT
updates as a subset of total updates, and the count may vary with page state.
That attempt reported `17` total updates and `4` HOT updates, rolled back, and
proved a byte-identical before/after baseline.

## Decision

The contract was repaired without changing identity or row scope:

- all 17 self-hosted parent pointers use `image_source=identity`;
- official source provenance remains explicit in evidence and `image_note`;
- the canary preflights live source/status constraints before mutation;
- PostgreSQL queries execute sequentially on a client;
- `card_prints` attribution still requires exactly 17 updates, zero inserts,
  and zero deletes;
- HOT updates may range from 0 through the 17 total updates;
- child and mapping tables still require exactly 14 inserts each and no other
  writes; and
- the mutation payload fingerprint remained unchanged through the HOT-policy
  repair.

## Final Transaction Proof

The passing canary read back all proposed rows inside the transaction:

- `card_prints`: `0` inserts, `17` updates, `0` deletes, `2` HOT updates;
- `card_printings`: `14` inserts, `0` updates, `0` deletes;
- `external_printing_mappings`: `14` inserts, `0` updates, `0` deletes.

Every parent row matched its proposed `identity` source, exact self-hosted
path, `exact` status, evidence note, and data-quality flag transition. Every
normal child and mapping matched its deterministic ID and exact source lane.
The three foil parents produced no child row.

The transaction rolled back unconditionally. The saved before and after files
are byte-identical. A separate process then opened a fresh read-only production
transaction and independently reproduced the zero-residue baseline.

## Risk And Alternatives Rejected

Rejected alternatives:

- widening the image-source database constraint for one provider label;
- storing an official provenance label as a self-hosted delivery source;
- forcing an exact HOT-update count that depends on PostgreSQL storage state;
- treating HOT rows as extra updates;
- accepting transaction readback without rollback and independent proof;
- translating the three source-foil rows to `holo`; and
- copying parent artwork into finish-specific child image fields.

## Invariants

- The 17 existing parent identities remain unchanged.
- The three foil products remain blocked and unwritten.
- Child image fields remain null.
- One Piece remains hidden to anonymous, authenticated, and service release
  checks.
- No DON!!, sealed, Storage, pricing, publication, Vault, Pokemon, Japanese,
  or MTG write is in scope.
- No update, delete, merge, or upsert authority exists for child or mapping
  rows.
- A durable apply must use complete-row compare-and-set predicates for every
  parent and exact collision-free IDs for every insert.

## Validation

- Final rollback canary: passed.
- Independent post-rollback verifier: passed.
- Artifact reconciliation mismatches: `0`.
- Focused printing/image contracts: passed.
- Full One Piece contracts after repairs: `164 / 164` passed.
- Full repository shipchecks: passed on each frozen producer.
- Flutter tests: `614 / 614` passed.
- Web typecheck, lint, and strict production build: passed.
- Flutter analysis and release secret guard: passed.

## Artifact Integrity

- Final mutation plan SHA-256:
  `6140bed1b25f38caf84f3114fadad0e212568d8c41f9a87415a6f06e4d5097a4`
- Canary summary SHA-256:
  `d2b2a8020b280111c75b71f33eb0667723ff29ae2023f5e0a17992f7d7d0b659`
- Canary hash-manifest SHA-256:
  `0a36f056ed6931ebf5d2b1787fbda96d3a6ea8dec7eb3e6dc8477e8b58c79ec6`
- Independent summary SHA-256:
  `5640a4ecac6d7a5b68eda46a3878b17250e0c9b054ab8cbc425e1c07ed851de5`
- Independent hash-manifest SHA-256:
  `d58828bfa575e724839909597b35d68603cf5bf55c41624d77133845730be6d5`

## Artifacts

- Final frozen plan:
  `docs/audits/pricing/one_piece_st01_printing_image_mutation_plan_v1/hot_update_policy_frozen_plan_v1/`
- Passing rollback canary:
  `docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_hot_policy_v1/`
- Independent verifier:
  `docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/independent_post_rollback_hot_policy_v1/`
- Preserved blocked source-vocabulary attempt:
  `docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_v1/`
- Preserved blocked HOT-attribution attempt:
  `docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_identity_source_v1/`

## Exact Next Gate

Build and freeze a guarded hidden durable apply for the exact final payload.
It may update the 17 parent pointer rows and insert the 14 normal child and 14
printing-mapping rows only after a fresh zero-collision preflight. It must
commit only after exact transaction readback and write attribution, then pass
an independent post-apply readback.

Do not create the three foil children, write child image pointers, alter One
Piece visibility, publish pricing, promote DON!! or sealed products, or mutate
Vault data in that gate.
