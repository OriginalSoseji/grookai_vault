# Pricing Checkpoint 134: 30th Celebration Classic Collection Mapping Batch

## Status

`28 EXACT CANDIDATES VERIFIED - EVIDENCE PACKAGE REHEARSED - NO WRITE YET`

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

Regenerate the plan and authority package from the clean merged commit before
dry-run or apply. Then execute each batch through the canonical maintenance
launcher, perform independent mapping readback, and route the resulting rows
through governed shadow and production pricing publication.
