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
- MTG sets: 946/946 with nonblank exact representative-card covers.
- Invalid or external cover authorities: 0.
- Database readback mismatches: 0.
- Final signed-in browser checks: 7/7 passed.
- Targeted contracts: 22/22 passed.
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
- Keep MTG representative art behind the signed-in canonical image boundary.
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

Ready timings from the local production build:

- One Piece list after sign-in: 988 ms.
- MTG list: 426 ms.
- OP17 detail: 1,237 ms.

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

## Invariants

- Canonical identity columns were not changed.
- No release-control, pricing, publication, Vault, or user collection rows were
  changed.
- Non-Pokemon signed-in visibility remains fail-closed.
- A set tile may use package art or a representative card, but it must never be
  blank.
- Future TCGs must define their own grouping and product vocabulary before app
  visibility.
- Set and card reads must retain game identity through every route and query.

## Next Gate

Merge and deploy this branch, then run the same signed-in One Piece/MTG smoke
against the deployed URL. Future TCG adapters must adopt
`CROSS_TCG_SET_BROWSER_V1` before activation.
