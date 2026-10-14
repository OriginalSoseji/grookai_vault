# Pricing Checkpoint 134: 30th Celebration Classic Collection Mapping Batch

## Status

`28 EXACT MAPPINGS APPLIED AND INDEPENDENTLY VERIFIED - PRICING SHADOW QUEUED`

## Continuous Agent Proof

The first hosted execution of `tcgplayer-pricing-completion-v1` completed
successfully in GitHub Actions run `38581939115`. It passed its contracts,
measured production, heartbeated the operations control plane, and retained the
full evidence artifact for 90 days.

The production measurement remained incomplete by design:

- selected observations: 208,577
- published observations: 165,769
- unpublished observations: 42,808
- identity-mapping backlog observations: 30,814
- identity-mapping source products: 28,540
- planner-visible Pokemon products: 734

The agent correctly reported `expand_reviewed_pokemon_set_authority` instead of
treating the backlog as a crash or selecting an unreviewed identity.

## Next Reviewed Group

TCGPlayer group `24837`, `ME: 30th Celebration Classic Collection`, is bound to
canonical set `30c-classic` under reviewed group/set authority.

Fresh verified-TLS production readback found:

- 30 current TCGPlayer products;
- 30 canonical parents;
- 30 existing non-provisional Holo children with printing GV-IDs and retained
  provenance;
- 28 exact normalized name-and-coordinate matches;
- 0 existing active TCGPlayer mappings for the group; and
- one current Holofoil price lane for every product.

The earlier September 17 report that this set had zero children is historical.
September 18 bounded repairs added and verified all 30 Holo children. Their
preserved source bytes and manifests remain the printing authority for this
mapping package.

## Held Aliases

Two products do not enter the exact batch:

- product `716158`, `Genesect EX (Team Plasma)`, versus canonical `Genesect EX`;
- product `716198`, `Gengar (Prime)`, versus canonical `Gengar`.

Their coordinates and set membership are strong leads, but the mapping policy
intentionally preserves trailing labels. Each requires a separate explicit alias
review. The planner must not weaken global name normalization to admit them.

## Package Rehearsal

The new authority builder consumes the frozen September Classic Collection
printing authority plus the current TCGCSV group snapshot. It validates the live
parents, one Holo child per parent, source products, coordinates, absence of
mapping collisions, source hashes, and review projection before creating mapping
authority.

The rehearsal passed with:

- 28 selected candidates;
- 28 reviewed parents and Holo printings;
- two bounded packages: 25 and 3 rows;
- 28 projected missing-price observations; and
- zero database, publication, or customer-state writes.

The clean package was regenerated from merged commit
`4fd184658e802aa9875800672c6cea32476a1d84`. Both canonical maintenance dry runs
passed with verified rollback, zero writes, and zero active publication overlap.

## Production Mapping Apply

The approved bounded applies completed through the canonical maintenance
launcher:

- batch 1 maintenance run `2ddb9afa-8dab-4846-ba73-2bee69c32387` committed and
  read back 25 inserts;
- batch 2 maintenance run `3451e9fc-9005-4dd7-b68f-feffbcb42781` committed and
  read back 3 inserts; and
- both runs reported certain commits, zero repair updates, zero publication
  writes, and zero customer-state writes.

A separate repeatable-read production probe then found all 30 source products,
30 canonical parents, 30 Holo children, 28 active source mappings, 28 unique
exact matches, and the same two unmapped aliases. This independently reconciles
the committed write set.

## Pricing Publication Gate

GitHub Actions shadow run `38586974614` is queued at exact merged commit
`4fd184658e802aa9875800672c6cea32476a1d84`. It follows the in-progress
McDonald's shadow run `38575692018` under the workflow's non-cancelling pricing
concurrency group. The queued run will measure both mapping batches together.

Do not claim these prices are live until that combined shadow reaches verified
reconciliation, a production publication is run against its exact shadow key,
and an independent price readback succeeds.
