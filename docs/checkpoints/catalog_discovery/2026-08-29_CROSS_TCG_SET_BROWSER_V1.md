# Cross-TCG Set Browser V1

## Result

The signed-in set browser now treats Pokemon, One Piece, and Magic as distinct
catalogs. One Piece and MTG set reads are game-scoped, set-detail reads are
game-and-set scoped, product filters are TCG-specific, and no non-Pokemon page
uses Pokemon era language.

- One Piece sets: 61/61 with nonblank cover art.
- One Piece exact package covers: 55, including OP16, OP17, and all 36 starter
  decks.
- One Piece exact representative-card fallbacks: 6.
- MTG sets: 946/946 with nonblank self-hosted covers.
- MTG exact package covers: 70.
- MTG exact representative-card fallbacks: 876.
- MTG deck-classified releases: 96, with 70 exact package covers and 26
  representative-card fallbacks where no unambiguous live package source was
  available.
- MTG direct public cover URLs: 946/946; per-card proxy URLs: 0.
- Invalid or external cover authorities: 0.
- Database readback mismatches: 0.
- Final exact-build signed-in browser checks: 17/17 passed.
- Targeted contracts: 26/26 passed.
- Production Next.js build: passed.

## Context

The previous `/sets` implementation loaded every visible set across every game,
then called the card-count RPC for all set codes, and only then filtered to the
selected game. One Piece card-count resolution alone took roughly 2.7 seconds.
Set links carried only a set code, card reads also keyed on set code alone, and
the UI hardcoded Pokemon era concepts for every game. Neither One Piece nor MTG
had set cover pointers.

## Decision

- Scope set metadata by game before pagination or aggregation.
- Use fast catalog metadata for the browse page; exact dynamic counts remain a
  detail concern.
- Carry `game` through list links, detail routes, pagination, and exact set-id
  resolution.
- Use a reusable versioned browse configuration for game vocabulary, release
  groups, and product lanes.
- Use exact self-hosted package art where package identity is proven.
- Use exact self-hosted representative-card art where package art is absent.
- Copy MTG representative cover bytes from the governed private card-image bucket
  into the public content-addressed set-cover namespace. Canonical card image
  pointers and access rules remain unchanged.
- Never use catalog insertion time as a release date.
- Eager-load the first six visible covers; retain lazy loading afterward.

The governing contract is
`docs/contracts/CROSS_TCG_SET_BROWSER_V1.md`.

## Data Apply

The initial apply covered 1,007 set rows:

- 61 One Piece rows.
- 946 MTG rows.
- 55 content-addressed package objects created in the public
  `external-card-images/set-covers/one_piece/...` namespace.
- 1,007 pointer readbacks.
- 0 reconciliation mismatches.

Plan fingerprint:
`da3274a3125680866108a8335e1e9d05bc16b28ff57d52cec97b62da26d4e8c7`.

The final One Piece pointer refinement replaced six unnecessary card-proxy URLs
with their existing public self-hosted `external-card-images` URLs. It changed
no image bytes and created no new objects.

Refinement fingerprint:
`4eb9047e7fcbf92101d18ad50612d267bbd40c6649f8db1f5add564cfe2e8d53`.

The MTG delivery refinement copied the existing representative image bytes into
946 unique public `external-card-images/set-covers/mtg/...` objects and replaced
only the corresponding set cover pointers. It applied and independently read
back all 946 rows with zero reconciliation mismatches.

MTG refinement fingerprint:
`309eebcd14bb99ba1536bda695645b0eeb44d23eb3be188c7f6dceb1d4552605`.

The MTG deck-package refinement then ranked exact TCGPlayer products, preflighted
their image bytes, copied 70 package images into the public content-addressed
set-cover namespace, and changed only those 70 set cover pointers. One stale
overview-package image for Forgotten Realms Commander was replaced by the exact
Draconic Rage package from the same source group. The apply created 70 objects,
read back 70 pointers, and recorded zero reconciliation mismatches.

MTG deck-package plan fingerprint:
`aa2295235cecaeee37458f780a016e3a59a7416982b6a8688466efccba04f485`.

The same repair also:

- changed set-detail totals to count exact game-scoped set IDs;
- replaced broad MTG `t*`/`p*` product inference with authoritative Scryfall set
  type plus narrow name fallbacks;
- proved `TMP`, `THS`, `TSP`, `PCY`, `PLS`, and `POR` remain in the correct MTG
  browse lane.

## Runtime Proof

The final smoke used a temporary confirmed account, then deleted it after the
run. It proved:

- all 36 initially rendered One Piece covers load on a 390 x 844 viewport;
- zero One Piece set covers use the per-card proxy;
- no mobile horizontal overflow;
- MTG uses Magic vocabulary and never renders `Browse by era`;
- current MTG releases sort before unknown-date sets;
- `The Hobbit` is the first current MTG set in the verified catalog order;
- OP17 opens from the set browser and renders card rows.
- ten anonymously fetched MTG set-cover samples return HTTP 200 image responses.
- all 70 MTG package-cover URLs return HTTP 200 image responses with nonempty
  image bodies;
- the signed-in production MTG deck filter renders Commander 2015 with its exact
  self-hosted package image;
- the signed-in production One Piece deck filter still renders ST-30 with its
  exact self-hosted package image;
- neither production route renders Pokemon `Browse by era` language.

Ready timings from the local production build:

- One Piece list after sign-in: 983 ms.
- MTG list: 553 ms.
- ST30 filtered deck result: 527 ms.
- OP17 detail: 1,280 ms.

## Artifact Hashes

- Initial apply plan:
  `00afd2bd467633cce5802d78fe4df506911054bd7a438c8b40a619fffb9e50c1`.
- Initial apply result:
  `f864604647c26dd86221f4e8189001110c44bfa57f0a844b223e5860d9e107f1`.
- One Piece refinement plan:
  `00728b151170fed109505ba35de454b3871dd4cb16e4f03e2457bc8ecaf61234`.
- One Piece refinement result:
  `4b722aaace3f38b782fbd8686cfb2f348bcb3c360d38e49c8461cf7528116be2`.
- Final browser summary:
  `7997bed8f73388cc9eaa78dadea07a51bc26958320acae15e28834a2ff314610`.
- Final V1.1 browser summary:
  `4e1e4779193f5b36c2a895fbeffd77b050518abb40529302ad377a95154b8a46`.
- Final exact-build V1.2 browser summary:
  `19d4f5dbd65681b4af1561a663f652c33ca3ac04df16874716007e1e8d0e02c0`.
- MTG refinement dry-run plan:
  `2ac032c5a2a92bb51d08e62880d27c9d023c405d08aaefaa426de86a2be07399`.
- MTG refinement apply plan:
  `b31a5092edfd3fa10442ff3b50cfc4abfa52e8ea1b557da1bafb109de019036b`.
- MTG refinement apply result:
  `ac249bbe2b6f8c4b80cc42bb608d3c8ece9f1fc4aa2307d7642f3d11139bcb01`.
- MTG deck-package authoritative dry-run plan:
  `4448b0254e09766eb0dcf23a6638dcd6ddbe16dac21ce2eee44d69199c181a48`.
- MTG deck-package apply plan:
  `6e3feb28488ccc456047a2ed15e9919bf68dd679f1977ae43abcb32192c2c3ad`.
- MTG deck-package apply result:
  `1acb5d9224fcb89f54af4a95920deaf463d6d4312d44cf02b033b86cedf491ba`.

## Invariants

- Canonical identity columns were not changed.
- No release-control, pricing, publication, Vault, or user collection rows were
  changed.
- Non-Pokemon signed-in visibility remains fail-closed.
- A set tile may use package art or a representative card, but it must never be
  blank.
- Public set covers must not depend on the per-card application image proxy.
- Future TCGs must define their own grouping and product vocabulary before app
  visibility.
- Set and card reads must retain game identity through every route and query.

## Next Gate

Merge the package-source policy and permanent audit artifacts. The remaining 26
MTG deck releases may receive exact package art later when an unambiguous source
is available; their self-hosted representative covers are valid production
fallbacks and do not block this release. Future TCG adapters must adopt
`CROSS_TCG_SET_BROWSER_V1` before activation.
