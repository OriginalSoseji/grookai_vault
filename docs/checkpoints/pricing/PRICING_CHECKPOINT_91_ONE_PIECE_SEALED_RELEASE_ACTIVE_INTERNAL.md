# Pricing Checkpoint 91: One Piece Sealed Release Active Internally

## Result

The One Piece sealed pricing lane is complete through internal release
activation.

- 390 canonical current English sealed variants
- 374 durable source-backed qualification decisions
- 332 `qualified_exact` release members
- 58 excluded variants: 4 stale, 38 missing market price, 16 missing source
  observation
- 1 frozen immutable release
- 1 active internal release pointer
- 0 anonymous or authenticated rows while One Piece remains hidden

## Schema Hardening

Migration `20260816030000_sealed_product_release_qualification_binding_v1.sql`
was applied and independently verified from commit
`1002f0218b9ffacef84273a1e98a984ea0aafdb1`.

- Migration SHA-256:
  `ab6a6b0ba759e86dde6a812998164e6bed1aa71f847768f975cd788273f0a1c1`
- Every release member now references an exact matching qualification,
  variant, source mapping, and literal `qualified_exact` status.
- The signed-in read RPC requires an active frozen release and still respects
  the game release control.
- Anonymous execution remains denied.

## Release Proof

- Release ID: `152e4fd2-be0d-5d1b-a68f-88e46822d84a`
- Release plan fingerprint:
  `03a7ab9dee1f0bd35dc2db6e838341b174baa90302a240ee2026a41b003b2e5d`
- Manifest fingerprint:
  `b0047c787e0d02b1679133307bdd906b64a11bbb20e53f4a94f7130f798659ad`
- Fresh preflight fingerprint:
  `c3110065efbef8dd56f917cb740e77de84b7472dd201d3a50f8957478836a37c`
- Full 332-member rollback canary: passed with zero residue
- Durable release/member/pointer writes: 1 / 332 / 1
- Independent member and lineage readback: 332 / 332 exact

A rollback-only signed-in simulation returned 100 current USD One Piece sealed
market prices, then restored the hidden control and verified zero visible rows.

## Catalog Blocker

The card catalog itself is not ready for activation:

- 6,730 canonical One Piece parent cards
- 6,730 active identities and exact TCGPlayer parent mappings
- 0 parent image pointers
- 14 child printings and printing mappings

All 6,730 mapped products have unique exact TCGPlayer image references. The
next automated gate self-hosts and hash-verifies those images, then applies
image pointers through a separate rollback-proven transaction. Catalog
visibility remains hidden until image and client-readiness evidence passes.

## Permanent Evidence

- `docs/audits/pricing/sealed_product_release_qualification_binding_v1/`
- `docs/audits/pricing/one_piece_sealed_pricing_release_v1/`

## Next Gate

Run the One Piece card-image source plan, 25-image transient Storage canary,
resumable 6,730-image upload/readback, independent Storage verification, and
rollback-proven exact card-image pointer apply. Do not activate the catalog
merely because Storage succeeds.
