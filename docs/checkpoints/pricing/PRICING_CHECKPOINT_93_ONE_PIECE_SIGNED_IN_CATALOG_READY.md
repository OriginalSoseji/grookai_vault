# Pricing Checkpoint 93: One Piece Signed-In Catalog Ready

## Result

The complete One Piece catalog passed a rollback-only signed-in visibility
simulation with zero residue.

- 1 game
- 60 sets
- 6,730 parent cards
- 6,730 active identities
- 6,730 exact TCGPlayer parent mappings
- 14 exact child printings currently modeled
- 6,553 exact self-hosted images
- 177 explicit image coverage gaps
- 332 active frozen sealed-price release members

The durable release control remains `hidden`.

## Visibility Proof

Inside one transaction, the probe temporarily simulated `signed_in` and proved:

- anonymous game/set/card visibility: `0/0/0`
- authenticated game/set/card visibility: `1/60/6730`
- print-identity search result: `1`
- legacy search result: `1`
- direct card result: `1`
- signed-in sealed pricing rows returned: `100`
- anonymous sealed-pricing RPC execution: denied

The transaction rolled back. Release, One Piece catalog, and non-One Piece
fingerprints were unchanged.

## Client Boundary Repair

The web card and set loaders now use the request-scoped Supabase client. They no
longer use a secret-key fallback that could bypass RLS. Web and Flutter set
browsing expose an explicit game selector with Pokemon as the default, and card
metadata is game-aware. Related-print discovery is constrained to the selected
card's `game_id`.

The production catalog must not be activated until this client repair is
deployed. The current production web card route was proven to expose hidden card
metadata when its service-key loader was used; keeping the durable One Piece
release hidden prevents that defect from becoming a catalog release.

## Evidence

- Readiness producer commit:
  `85bbcb6c72c95627869c7619a19c438a53f0cfcc`
- Client-boundary commit:
  `0c1d7128d6c6367eb757e867a8811f5c6e58e2a8`
- Related-print game-scope commit:
  `a7ff1a9cc`
- Readiness audit:
  `docs/audits/pricing/one_piece_signed_in_catalog_readiness_v1/2026-08-16T04-01-29-608Z/`

## Deferred Scope

Parent identity, search, card browsing, images, and sealed pricing are ready.
Exact child-printing expansion beyond the 14 proven ST-01 rows remains a
separate post-release catalog-enrichment lane. Parent rows must not be presented
as proof that every finish or printing has been modeled.

## Next Gate

Deploy the request-scoped client boundary from a frozen SHA, prove anonymous
hidden-card metadata is no longer exposed, deploy the matching mobile client,
then execute one guarded durable `hidden` to `signed_in` release-control update
with independent readback and rollback tooling.
