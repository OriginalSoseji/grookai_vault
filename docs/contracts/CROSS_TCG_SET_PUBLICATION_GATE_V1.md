# Cross-TCG Set Publication Gate V1

## Purpose

Prevent a released TCG set from reaching the set browser without canonical
cards, game-specific browsing behavior, and working self-hosted media.

This gate enforces `CROSS_TCG_SET_BROWSER_V1` against released database state.
It is an operational verifier, not a catalog writer.

## Released Scope

A set is evaluated when:

1. its game has a `catalog_game_release_controls` row in `signed_in` or
   `public` state; and
2. its own `catalog_set_release_controls` row, when present, is also
   `signed_in` or `public`.

A hidden per-set control overrides a released game control. Hidden candidates
remain outside this gate until they are intentionally released.

## Blocking Invariants

Every released set must have:

- a nonempty canonical set ID, game, code, and name;
- an explicit versioned browse configuration for its game;
- a supported product lane for that game;
- at least one canonical `card_prints` row with a GV-ID;
- a public HTTPS cover in Grookai's self-hosted Storage authority;
- game/set-matched media identity for governed set-cover paths; and
- a live URL that returns an image content type.

External hotlinks, private Storage URLs, application image proxies, blank
covers, cross-game paths, broken URLs, and empty released sets block the gate.
Older public self-hosted representative paths remain eligible but receive
`legacy_cover_namespace_gap`; they are not reported as exact package or set art.

## Cover Authority

The accepted hierarchy is:

1. exact self-hosted package art;
2. exact self-hosted set art; and
3. a self-hosted representative card from the same game and set.

A deck with representative art remains eligible so collectors do not lose a
working release. It receives `deck_package_art_gap` and stays in the package-art
enrichment backlog. Representative art is never reported as exact package art.

## Game Vocabulary

The gate has explicit policies for:

- Pokemon: era and Pokemon product lanes;
- One Piece: release family and booster/deck/promo lanes; and
- Magic: release period and Magic catalog set types.

A future TCG fails closed until it has both a backend publication policy and a
matching web browse configuration. Pokemon era vocabulary may not satisfy a
One Piece, Magic, or future-game configuration.

## Automation

The gate runs inside the existing six-hour Catalog Shadow Reconciliation
workflow after discovery and candidate freezing. It:

- pins the exact Git commit;
- uses a read-only PostgreSQL transaction and read-only session option;
- probes cover URLs without changing them;
- writes immutable workflow artifacts and hashes;
- opens or updates `[Catalog Publication] Released set gate blocked` when a
  blocker appears; and
- closes that issue after a clean run.

The job fails after evidence upload when blockers exist. It does not retry with
changed code, substitute media, or dispatch a writer.

## Required Artifacts

- `run_plan.json`
- `set_results.json`
- `summary.json`
- `CROSS_TCG_SET_PUBLICATION_GATE_REPORT.md`
- `artifact_hashes.json`

Selected sets and result rows must reconcile exactly. Duplicate set IDs or
duplicate game/code identities block the gate.

## Write Boundary

The gate authorizes zero:

- database writes;
- Storage writes;
- image-pointer writes;
- publication changes;
- pricing writes; or
- Vault writes.

Catalog ingestion and self-hosting remain separate governed processes. The gate
only proves whether already released state is fit for the collector-facing set
browser.
