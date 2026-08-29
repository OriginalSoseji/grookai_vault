# Cross-TCG Set Browser V1

## Purpose

The Sets experience is game-aware. A collector selecting a game sees that game's release vocabulary, product types, artwork, routes, and cards. Pokemon terminology must never leak into One Piece, Magic: The Gathering, or a future TCG.

## Invariants

- Every list and detail read is scoped by both game and set identity.
- Set-code equality alone is not sufficient across TCGs.
- A set route preserves the selected game through initial load and pagination.
- The list query scopes to the selected game before counting or resolving media.
- Every visible set tile has media with a stable aspect ratio.
- Exact self-hosted set or package art is preferred.
- Deck releases use self-hosted package art when an exact package source exists.
- A self-hosted representative card image is the governed fallback for a release without exact cover/package art.
- External image hotlinks are not an accepted display dependency.
- Empty media panels are not an accepted state.
- Product filters and release group labels come from the versioned game configuration.
- Adding a public TCG requires an explicit browse configuration and contract tests before release.

## Game Vocabulary

### Pokemon

- Release grouping: Pokemon eras.
- Product types: main sets, special sets, promos, decks and kits, Worlds decks.

### One Piece Card Game

- Release grouping: OP booster packs, EB extra boosters, PRB premium boosters, ST starter decks, promos and DON!! cards.
- Product types: booster sets, extra and premium boosters, starter decks, promos and DON!! cards.

### Magic: The Gathering

- Release grouping: current, 2020-2024, 2010-2019, legacy, and date pending.
- Product types: expansions, supplemental sets, Commander/decks, promos, tokens and extras.

## Media Authority

1. Self-hosted exact package art for a deck or sealed release.
2. Self-hosted exact set art.
3. Self-hosted representative card art from that exact game and set.
4. A deterministic game/set fallback treatment only while an ingestion gap is actively recorded.

The fallback treatment prevents layout collapse but does not satisfy cover coverage. Production coverage reports must distinguish exact package/set art from representative-card fallback.

## Performance Contract

- Set metadata is filtered by game in PostgREST, not after downloading every game.
- The list page does not require exact card counts before the first useful render.
- Initial set detail loads at most 24 card identities.
- Secondary progress and pricing work cannot change game/set identity.
- The final list keeps stable item order and lazy-loads offscreen media.

## Future TCG Checklist

Before exposing a new game in the game selector:

1. Add the game to the public game scope.
2. Define release groups and product lanes.
3. Define deterministic classification rules.
4. Backfill self-hosted set/package art or a representative-card fallback.
5. Prove every set link carries game scope.
6. Prove list, detail, and pagination reads remain game-scoped.
7. Run desktop and mobile visual smoke tests.
8. Record cover coverage and route performance in the release checkpoint.
