# MTG Sealed World V1

## Purpose

MTG Sealed World V1 turns exact TCGPlayer Magic product rows into a governed,
game-scoped sealed catalog and current price release. It is separate from MTG
single-card identity and publication.

## Source Authority

- Game/category: TCGPlayer category `1`, Magic: The Gathering.
- Product identity: exact TCGPlayer product ID and source payload.
- Family identity: exact TCGPlayer group ID and group name.
- Package form: deterministic sealed-product classifier evidence.
- Price: latest single `normal`, USD TCGPlayer `marketPrice` observation.
- Freshness: seven days inclusive from the latest completed current-full sync.

TCGPlayer source identity is preserved. Grookai does not invent a product,
edition, wave, language, content count, material, or price.

## V1 Scope

- Current active English MTG sealed products only.
- Products with an explicit non-English marker are held.
- Ambiguous products, accessories, repacks, individual cards, and rows without
  a supported package form are not promoted.
- A missing, ambiguous, stale, non-USD, inactive, or null-market price never
  enters the active release.

## Durable Boundaries

- Append-only inserts into the sealed-product domain.
- One active sealed release pointer per game.
- Existing One Piece rows and its active release are immutable boundaries.
- No card, Storage, image-pointer, Vault, or market-publication-table writes.
- No catalog or sealed release-control mutation during the sealed payload apply.
- Anonymous access remains denied.
- Authenticated access remains empty while the MTG sealed release is hidden,
  independently of the MTG card-catalog release status.

## Apply Sequence

1. Apply `SEALED_PRODUCT_PER_GAME_RELEASE_V2` only when it is the sole pending
   migration.
2. Freeze one exact live plan and its SHA-256 fingerprint.
3. Pass live read-only preflight.
4. Insert the full plan inside a rollback canary and prove zero residue.
5. Rebuild and compare the exact plan inside the durable transaction.
6. Insert, freeze, and activate the MTG sealed release.
7. Commit only after exact row readback and unchanged One Piece proof.
8. Run an independent readback from the same producer SHA and fingerprint.

## Release Boundary

The sealed release pointer does not make MTG visible by itself. Signed-in MTG
card-catalog visibility is controlled by `catalog_game_release_controls`.
Sealed-product visibility is independently controlled by
`sealed_product_game_release_controls`; both gates must allow the request.
MTG sealed remains `hidden` through payload apply and is activated only after
sealed web and mobile smoke gates pass. Anonymous visibility is a separate
future decision.
