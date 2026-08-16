# Pricing Checkpoint 57: One Piece Migration History Integrated

## Current Truth

The completed sealed-domain branch was merged into the One Piece readiness
branch so local migration history now contains the exact production-applied
`20260814060000_cross_tcg_sealed_product_domain_v1.sql` migration. The merged
migration and its reviewed candidate are byte-identical at SHA-256
`f588987c10cdb80f641d6da8ca0f4892afdb6b0d7175fe6e2c0cdc2c6be972d0`.

The One Piece production read-only preflight was rerun from the integrated
producer commit and passed with zero findings and zero database writes.

## Authoritative Proof

- Integrated producer commit:
  `13052afa3b412ad7a653346cd8c18ee76c2140b6`
- Integrated preflight fingerprint:
  `636c05c066bb51a80b02b4a84776590d3971ade109e8efa9958ddc6581e81bae`
- Protected schema fingerprint:
  `fe7c2af6c85d2c65752f2492177ec5e55c65891480ab368714d89f059a383411`
- Local latest migration: `20260814060000`
- Reserved One Piece version/name rows: `0 / 0`
- Active One Piece source products: `7,261`
- MTG cards at readback: `10,351`
- MTG release status: `hidden`
- Sealed-domain rows: `0`
- Artifact hash mismatches: `0`

## Invariants

- The earlier preflight remains historical evidence, but the schema apply must
  bind only to the integrated preflight fingerprint above.
- The proposed One Piece migration must be exactly
  `20260814120000_one_piece_canonical_import_durable_staging_v1.sql`.
- The exact candidate bytes may be promoted; no regenerated SQL is permitted.
- Schema apply and One Piece payload staging remain separate gates.
- No One Piece staging rows, canonical rows, pricing rows, Vault rows, sealed
  rows, Storage objects, or app-visible rows are authorized by the next gate.
- Concurrent MTG growth remains external and must stay hidden.

## Artifact

`docs/audits/pricing/one_piece_canonical_import_durable_staging_preflight_v1/2026-08-14T07-12-41-222Z_production_read_only/`

## Exact Next Gate

Promote the exact One Piece migration candidate into the reserved migration
path, then generate and test a separately fingerprinted schema-only apply and
fresh independent readback plan bound to the integrated preflight. Stop before
staging One Piece payload rows.
