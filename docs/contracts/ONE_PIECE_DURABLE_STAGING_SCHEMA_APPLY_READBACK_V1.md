# One Piece Durable Staging Schema Apply and Readback V1

## Purpose

This gate may apply only the exact reviewed One Piece durable staging schema
and its exact migration-ledger row. It may not write One Piece payload rows or
change canonical, pricing, Vault, sealed, Storage, publication, deployment, or
app-visible state.

## Frozen Authority

- Integrated preflight fingerprint:
  `636c05c066bb51a80b02b4a84776590d3971ade109e8efa9958ddc6581e81bae`
- Migration SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Migration identity:
  `20260814120000_one_piece_canonical_import_durable_staging_v1`
- Protected schema fingerprint:
  `fe7c2af6c85d2c65752f2492177ec5e55c65891480ab368714d89f059a383411`

## Preconditions

The writer requires the frozen branch and head SHA, a clean tracked worktree,
the checked-in reproducible plan, the exact guard token, no candidate object or
migration-ledger collision, no later migration, and an unchanged protected
schema fingerprint.

## Atomic Apply

The writer opens one transaction, sets bounded lock and statement timeouts,
executes the migration body, inserts the exact ledger row, and validates before
commit:

- both tables exist with FORCE RLS and zero rows;
- the complete constraint, index, trigger, function, and policy contract;
- only service-role SELECT and INSERT table privileges;
- no external execute privilege on the immutable rejection function;
- no anonymous or authenticated table access;
- no transaction-local writes to protected domains;
- exact migration-ledger content;
- unchanged protected schema and hidden MTG status.

Any finding before commit rolls back the entire transaction.

## Fresh Proof

After commit, the writer opens a new read-only connection and repeats the full
readback. A separate verifier then opens another read-only connection and
repeats it again. Both proofs require artifact hashes and zero findings.

## Boundaries

- One Piece staging data rows: `0`
- Canonical and printing writes: `0`
- Pricing writes: `0`
- Vault writes: `0`
- Sealed-domain writes: `0`
- Storage writes: `0`
- Publication or deployment: `false`
- App visibility: `false`

Passing this gate authorizes only a later, separately fingerprinted bounded
One Piece payload staging plan. It grants no promotion or publication authority.
