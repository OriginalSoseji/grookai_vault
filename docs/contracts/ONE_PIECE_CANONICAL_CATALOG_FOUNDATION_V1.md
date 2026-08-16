# One Piece Canonical Catalog Foundation V1

## Purpose

Add the minimum shared canonical foundation required before any One Piece card
identity can be promoted.

## Durable Scope

The migration may change only:

- one exact `games` row for `one_piece`;
- one exact `catalog_game_release_controls` row with status `hidden`;
- the existing `card_print_identity_identity_domain_check` constraint, adding
  `one_piece_eng_print` while preserving every accepted existing domain;
- the constraint comment and PostgREST schema notification.

It may not create sets, cards, identities, printings, mappings, sealed products,
images, prices, publication rows, or Vault rows.

## Visibility Invariant

The game row and hidden release-control row are created in the same transaction.
The existing restrictive catalog visibility policies therefore fail closed for
anonymous, authenticated, and service-role request semantics until a separate
release gate intentionally changes the control row.

Canonical promotion, pricing publication, and Storage existence do not grant
visibility.

## Migration History

The reserved migration is
`20260814150000_one_piece_canonical_catalog_foundation_v1.sql`. It must apply
only when production history ends at `20260814120000` and the reserved version
is absent.

## Required Proof

Before durable apply:

1. A read-only production preflight must verify schema, security, migration
   lineage, staging counts, exact 17-card collision scope, and protected counts.
2. The exact migration must run inside a rollback-only transaction.
3. In-transaction readback must prove the exact game, hidden release control,
   identity constraint, and denied visibility.
4. After rollback, an independent read-only process must prove zero residue and
   unchanged protected counts.

The durable migration apply remains a separate gate after those proofs pass.
