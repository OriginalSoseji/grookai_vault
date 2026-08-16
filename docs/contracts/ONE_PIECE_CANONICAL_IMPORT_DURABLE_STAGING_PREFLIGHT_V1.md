# One Piece Canonical Import Durable Staging Preflight V1

## Purpose

This gate proves that production can safely receive the exact offline-reviewed
One Piece durable staging schema. It is read-only and authorizes no migration
placement, DDL, staging data, canonical promotion, pricing, publication,
Storage, Vault, or app visibility.

## Frozen Inputs

- Migration candidate SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`
- Rollback candidate SHA-256:
  `60a17c8daeae7a7e306dec74178fd8b7f95368f701b41d8b5ed18447740b9bc1`
- Offline plan fingerprint:
  `75187d3758b726426aadcae8533ddb9ecd4083cb413850fd1c50dca5e4ad3d46`
- Proposed migration:
  `20260814120000_one_piece_canonical_import_durable_staging_v1`

## Required Proof

The reader must enforce a read-only session and transaction, close the
transaction before artifact writes, and prove:

- the proposed migration is later than local and production history;
- its version and name are unused;
- the two tables, function, indexes, policies, and triggers do not exist;
- required roles exist and client roles cannot create in `public`;
- relevant default ACL and candidate-object grants are captured;
- all protected canonical, Vault, pricing, MTG, and sealed relations exist;
- the sealed domain remains at zero rows after its schema-only apply;
- MTG remains hidden and its concurrent growth is external to this preflight;
- One Piece source warehouse rows exist;
- no blocking locks, long transactions, prepared transactions, or connection
  pressure exist.

## Result

`pass` permits only a new schema-apply plan bound to the preflight fingerprint.
It does not permit migration placement or execution by itself. `blocked` means
stop and preserve the evidence without any production write.
