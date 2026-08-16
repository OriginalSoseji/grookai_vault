# Pricing Checkpoint 79: One Piece Complete Numbered Canon Applied

## Context

The English One Piece source warehouse and durable staging layer contained
6,547 current numbered products. ST-01 had already established the hidden
canonical foundation with 17 parent cards and 14 normal child printings.

## Decision

Promote only source rows explicitly classified as English and backed by the
official English One Piece number/name authority. Preserve each TCGPlayer
product as a product-specific hidden parent identity. Keep all client
visibility, child-printing expansion, images, pricing, DON, and sealed domains
closed.

## Language Repair

The first read-only preflight found 22 products in the promotion-card source
group whose durable staging rows were explicitly Japanese. The original plan
incorrectly normalized them to English. No canonical writes had occurred.

The corrected plan accounts for every current numbered source product:

- 6,525 English source products
- 6,508 authority-eligible English products
- 17 existing ST-01 parents retained without mutation
- 6,491 new English parents promoted
- 17 official-catalog gaps held
- 22 non-English products held

## Applied Rows

- 58 new hidden `sets`
- 6,491 `card_prints`
- 6,491 active `card_print_identity` rows
- 6,491 `card_print_identity_source_evidence` rows
- 6,491 exact TCGPlayer `external_mappings`
- 26,022 total insert-only rows
- 0 updates
- 0 deletes

Including the existing ST-01 proof, production now contains:

- 59 One Piece sets
- 6,508 One Piece parent cards
- 6,508 active identities
- 6,508 source-evidence rows
- 6,508 exact external mappings
- 14 existing ST-01 child printings and 14 printing mappings

## Proof Chain

- Promotion-plan fingerprint:
  `5c39be2b0798a30d0c17c5e9ad46ad095bf8adaa956b68010975f26b72f937f6`
- Payload fingerprint:
  `481c1fe823ff988301675e38024e4cb52985d7b783f77b0bfadd38c1eafb3fbf`
- Read-only preflight fingerprint:
  `24d000d22f88f22804844a30581a7963ada2441cc3db5396d06575a008445736`
- Rollback-canary fingerprint:
  `a21f02d3140889bb96fdf9bcefb8e6e67352bdb031eb1553e1859730496ae245`
- Durable apply-plan fingerprint:
  `06481bf852288a61e92d3ba1e1d66bcb315ffa5885060c4dd731f9559c8f22e9`
- Final readback fingerprint:
  `d8b50f75aeca335b1afc78aac76ffe4b7ce71753f1372f01f31e8f918861dd73`

The five-family rollback canary covered OP booster, ST starter, EB extra
booster, PRB premium booster, and promotion-card rows. It proved exact
`5 / 5 / 5 / 5 / 5` writes, mandatory rollback, and zero residue.

The durable writer then proved exact in-transaction readback and a fresh
post-commit readback. A separately committed read-only verifier reproduced the
same payload hashes and global counts.

## Current Truths

- One Piece remains `hidden` for anon, authenticated, and service-role request
  visibility checks.
- The 39 held products have zero canonical external mappings.
- New parent rows have zero image pointers.
- New parent rows have zero child printings.
- Existing ST-01 child printings and image work remain unchanged.
- No DON, sealed, Storage, pricing, publication, or Vault writes occurred.
- No public or app-facing One Piece read path was enabled.

## Invariants

- Do not relabel explicit Japanese products as English.
- Do not collapse product-specific parent identities before exact printing
  evidence supports that decision.
- Do not infer child printings, finishes, or image pointers from parent rows.
- Do not expose One Piece through clients while the release control is hidden.
- Do not mix numbered, DON, and sealed promotion policies.
- Do not mutate the 17 existing ST-01 parents or 14 proven children through a
  bulk follow-up.

## Evidence

- `docs/audits/pricing/one_piece_complete_numbered_canonical_promotion_v1/frozen_plan_v1/`
- `docs/audits/pricing/one_piece_complete_numbered_canonical_preflight_v1/`
- `docs/audits/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1/`
- `docs/audits/pricing/one_piece_complete_numbered_canonical_apply_v1/frozen_apply_plan_v1/`
- `docs/audits/pricing/one_piece_complete_numbered_canonical_apply_v1/durable_apply_v1/`
- `docs/audits/pricing/one_piece_complete_numbered_canonical_apply_v1/independent_post_apply_v1/`

## Explicit Next Gate

Build the DON domain from durable staging as a separate hidden, insert-only
plan with its own authority, collision preflight, rollback canary, apply, and
independent readback. Sealed follows as another separate gate. Images, exact
child printings, pricing, client reads, and release activation remain later
gates.
