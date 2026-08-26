# Universal Catalog Discovery Supervisor V1

## Purpose

Grookai must detect official TCG set and card changes before collectors report a missing release. This supervisor compares current first-party catalog authority against the production canonical database and emits governed gaps. It does not mutate catalog truth.

## Supported Authorities

- One Piece Card Game: Bandai's official English card list.
- Magic: The Gathering: Scryfall set and English paper-print catalog authority.
- English Pokemon: TCGdex English set registry and structured full-set counts.
- Japanese Pokemon: Pokemon Card Japan product/card APIs and card detail pages.

The adapter registry is extensible. A new TCG must define its authority, stable set/card keys, release semantics, count policy, and governed writer before it can be added.

## Invariants

- Every database query runs inside `begin transaction read only`.
- Discovery never writes sets, cards, printings, mappings, images, pricing, publication state, or Vault data.
- Source response URL, timestamp, byte count, and SHA-256 are preserved.
- A missing source identity is a candidate gap, not permission to insert.
- Existing source-specific canonical writers remain the only mutation authority.
- Future releases are reported separately and do not count as overdue gaps.
- Card counts compare the same domain. MTG uses English paper prints for recent sets.
- One Piece group counts exclude cross-set special prints from the target set total; those products remain owned by the set code printed on the card.
- Japanese promotional cards are discovered through recent official card pages even when no product card-list container exists.
- English Pokemon discovery compares every registered set and fetches current detail for missing and recent sets. Discovery does not authorize an English canonical write path.
- Search aliases are game-scoped. An alias in one TCG cannot reinterpret another TCG's query.
- Large warehouse collections are represented by counts in audit snapshots. Full source rows remain in the database and are not duplicated into scheduled artifacts.

## Reconciliation Status

- `exact_complete`: source and canonical counts agree.
- `missing_set`: a released official set has no unique canonical match.
- `incomplete_cards`: a canonical set exists but has fewer cards than official authority.
- `present_unverified`: the set exists but the source did not provide a comparable count.
- `source_behind`: canonical count exceeds the comparable source count and requires review.
- `future_release`: authority lists a release after the run's `as_of` date.

## Scheduled Operation

The GitHub supervisor runs every six hours and on demand. Each run creates a frozen plan, source hashes, database snapshot, complete reconciliation, actionable gap list, recent Japanese-card gaps, search-alias candidates, summary, report, and artifact hashes.

One deduplicated GitHub issue is opened or updated while actionable gaps exist. Source/parser/DB failures use a separate supervisor-failure issue. Successful no-gap runs close the active gap issue.

## Promotion Boundary

Discovery artifacts feed source-specific preflight packages. The bounded automated supervisor may execute a source writer only when the gap shape, writer, and rollback proof are already governed:

1. Re-fetch and freeze exact authority evidence.
2. Build canonical candidate payload.
3. Prove no identity collision or cross-game mutation.
4. Run source-specific contract tests.
5. Apply only the exact approved insertion/update envelope.
6. Read back counts, identities, images, and signed-in search behavior.

Discovery success alone never authorizes promotion.

Current unattended writer coverage is intentionally narrower than discovery coverage:

- MTG: fully absent, released English paper sets only.
- One Piece: fully absent, released numbered-card sets with exact official number/name and warehouse product binding only.
- Japanese Pokemon: the proven incomplete-set lane with two independent full-set authorities and exact species resolution.
- English Pokemon: full-set Master Index-admitted parent deltas through the dedicated insert-only writer. Partial Master Index sets, ambiguous aliases, missing set containers, and unresolved families remain report-only.
