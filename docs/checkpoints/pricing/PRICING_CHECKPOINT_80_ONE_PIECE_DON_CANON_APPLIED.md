# Pricing Checkpoint 80: One Piece DON Canon Applied

## Context

The complete One Piece source manifest contains 225 DON products. The numbered
catalog was already applied and independently verified while the game remained
hidden.

## Decision

Promote only the 222 current English DON products as product-specific hidden
parents. Treat TCGPlayer product identity and structured DON classification as
exact product authority, but do not claim official visual-variant equivalence.
Keep one explicit Japanese product and two future/presale products outside the
apply.

All DON parents use the derived hidden `DON` grouping set. This grouping does
not claim that Bandai publishes a canonical set named `DON`; it exists to keep
unnumbered DON identities separate from numbered release families.

## Applied Rows

- 1 hidden `DON` set row
- 222 `card_prints`
- 222 active `card_print_identity` rows
- 222 `card_print_identity_source_evidence` rows
- 222 exact TCGPlayer `external_mappings`
- 889 total insert-only rows
- 0 updates
- 0 deletes

Production now contains:

- 60 One Piece sets/groupings
- 6,730 One Piece parents
- 6,730 active identities
- 6,730 source-evidence rows
- 6,730 exact external mappings
- 14 unchanged ST-01 child printings and printing mappings

## Holds

- 1 current explicit Japanese DON product remains outside English canon.
- 2 English future/presale DON products remain held until current-release
  evidence exists.
- No held source product received a mapping.

## Proof Chain

- Promotion-plan fingerprint:
  `3adebfb80803c147bc83bad6887418593c221f9e1cf090291819817505833bba`
- Payload fingerprint:
  `9aad9b82042c73a2220171309350fe351e1b7e0b886b825d9ecb70cf8f68a147`
- Read-only preflight fingerprint:
  `e5213391f4afa0be085b6aed365629f2a56380aadbe4632fd174683800fcee8e`
- Rollback-canary fingerprint:
  `e2bfa38a5fd1cfe817780bf6e30cb9c44e79cf4dd12c62baac7cba7ed7d10309`
- Durable apply-plan fingerprint:
  `405ad42cfe276bf3c6a37bca3d1a3c62ac6aae99cb08961140110fa1d1d3228c`
- Final durable readback fingerprint:
  `0263e91a3acf1b908d0fd92cb3ce51a7b87971610eda1af25345b1462b9752a5`

The five-row rollback canary covered base, alternate-art, gold, promo, and a
second product-specific DON identity. It proved exact writes, mandatory
rollback, and zero residue.

## Current Truths

- One Piece remains `hidden` for anon, authenticated, and service-role request
  visibility checks.
- DON rows have no child printings or image pointers.
- Source image URLs remain reference-only evidence.
- Repeated titles such as `DON!! Card` and `DON!! Card (Alternate Art)` remain
  separate product identities.
- No official visual-equivalence claim was made.
- No numbered, Storage, pricing, publication, Vault, or sealed rows were
  mutated by this gate.

## Invariants

- Do not collapse repeated DON titles by name.
- Do not treat TCGPlayer product identity as official artwork-equivalence
  authority.
- Do not promote explicit non-English or future products through the English
  current lane.
- Do not infer child printings, finishes, or image pointers.
- Do not expose One Piece while its release control remains hidden.
- Do not place sealed products in card tables.

## Evidence

- `docs/audits/pricing/one_piece_complete_don_canonical_v1/frozen_plan_v1/`
- `docs/audits/pricing/one_piece_complete_don_canonical_preflight_v1/`
- `docs/audits/pricing/one_piece_complete_don_canonical_rollback_canary_v1/`
- `docs/audits/pricing/one_piece_complete_don_canonical_apply_v1/frozen_apply_plan_v1/`
- `docs/audits/pricing/one_piece_complete_don_canonical_apply_v1/durable_apply_v1/`
- `docs/audits/pricing/one_piece_complete_don_canonical_apply_v1/independent_post_apply_v1/`

## Explicit Next Gate

Load all 403 One Piece sealed source products into the existing service-only
sealed candidate warehouse. Preserve each exact source product and its
current/future evidence without creating reviewed families, variants, source
mappings, pricing publication, release members, or client visibility.

