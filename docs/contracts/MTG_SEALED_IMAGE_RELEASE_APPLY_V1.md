# MTG Sealed Image Release Apply V1

## Purpose

This contract governs the single-transaction promotion of the frozen MTG sealed
image evidence payload into the private append-only image release schema.

The first execution gate is rollback-only. It exercises the complete production
write and freeze path, reads every row back exactly, and then rolls back. A
durable apply requires a separate exact authority bound to its producer commit,
source fingerprints, release-plan fingerprint, and execution fingerprint.

## Frozen Payload

- 2,182 image evidence rows
- 2,141 byte-verified Storage object records
- 2,149 exact variant image assertions
- 1 draft image release
- 2,149 image release members
- 33 evidence-only exclusions
- 8,622 total inserted rows

## Transaction Order

1. Repeat the production authority, source-lineage, collision, RLS, grant,
   visibility, and cross-game preflight.
2. Acquire the named transaction advisory lock.
3. Insert evidence, objects, assertions, the draft release, and members with no
   upsert or conflict handler.
4. Invoke `sealed_product_freeze_image_release_v1` with the exact manifest and
   reviewer identity.
5. Compare all planned columns through typed PostgreSQL JSON readback.
6. Recompute and compare the database manifest.
7. Verify all 33 exclusions have evidence but no assertion or release member.
8. Verify transaction write attribution names only the five permitted tables.
9. Roll back unconditionally in rollback-canary mode.
10. Reconnect read-only and prove zero residue and exact protected boundaries.

## Boundaries

The rollback canary permits transient rows only inside its uncommitted database
transaction. It authorizes no durable database writes.

Neither rollback nor durable evidence promotion may:

- call `sealed_product_set_active_image_release_v1`;
- write, delete, or read Storage objects;
- alter pricing or price release pointers;
- change sealed or catalog visibility;
- write Vault or canonical card data;
- deploy the signer or activate a client;
- mutate One Piece or another game;
- update or delete append-only evidence data.

The sole update in a later durable apply is the governed draft-to-frozen release
transition performed by `sealed_product_freeze_image_release_v1`.

## Rollback Acceptance

- Fresh and transaction-local preflights pass.
- All 8,622 rows insert and compare exactly inside the transaction.
- PostgreSQL computes the planned release manifest.
- The release reaches `frozen` inside the transaction.
- The image pointer remains absent.
- Write attribution contains exactly 8,622 inserts and one governed release
  update across the five named tables.
- The transaction reports `committed=false` and `rolled_back=true`.
- Independent read-only verification finds zero rows in all six image tables,
  no image pointer, and no protected data or security drift.

## Durable Apply Gate

Durable promotion is prohibited until the rollback canary passes and emits an
exact authority string. That later authority permits only the same 8,622 inserts
and governed release freeze. Pointer activation remains a separate gate.

The durable operator supports a read-only `--plan-only` mode and a single
`--apply` mode. Apply requires the exact clean producer commit, source plan
fingerprint, execution fingerprint, and full authority string through
`MTG_SEALED_IMAGE_RELEASE_APPLY_APPROVAL`. After commit it opens an independent
read-only connection, repeats exact payload and manifest readback, verifies all
protected boundaries, and classifies the complete identical release as a
zero-additional-row idempotent result.
