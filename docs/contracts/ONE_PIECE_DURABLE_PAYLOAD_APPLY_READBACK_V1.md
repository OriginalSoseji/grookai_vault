# One Piece Durable Payload Apply And Readback V1

## Authorized Mutation

The exact guarded writer may append one batch row and 21 source-evidence rows
to the two private immutable One Piece staging tables. It uses the
`service_role` RLS path and has one commit path after transaction-local exact
readback passes.

## Required Proof

- Exact clean producer, payload plan, and passed production preflight.
- Fresh zero-collision check under an advisory transaction lock.
- Exact source evidence before write.
- One batch and 21 rows reconciled before commit.
- Fresh read-only readback after commit.
- Separate read-only verifier bound to the execution-summary hash.
- Protected canonical, sealed, pricing, Vault, and migration-ledger counts are
  unchanged; concurrent MTG progress may only be nondecreasing and exactly
  attributable to MTG scope.

## Forbidden

No canonical promotion, sealed promotion, pricing publication, Storage, Vault,
deployment, app visibility, update, delete, truncate, cleanup, or MTG write is
authorized.
