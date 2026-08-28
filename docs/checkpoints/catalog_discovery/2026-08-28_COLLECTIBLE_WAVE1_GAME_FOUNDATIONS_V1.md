# Collectible Wave 1 Game Foundations V1

## Context

The immutable Wave 1 parser contains `46,259` Yu-Gi-Oh and Gundam printing
candidates. Before this gate, production had no canonical game foundation for
either domain, so every candidate stopped at `blocked_missing_game_foundation`.

## Problem

Candidate reconciliation could not distinguish missing sets or cards from a
missing game root. Creating sets or cards under another game would corrupt
canonical ownership, while releasing either unfinished catalog would expose
partial data to app users.

## Risk

The foundation migration touched shared `games` metadata and the service-owned
catalog release boundary. A wrong UUID, alias, release state, or evidence object
could misroute future rows or make an unfinished catalog visible.

## Decision

Create only two deterministic game rows and two exact hidden release controls:

- `gundam` / `Gundam Card Game` / `gundam-card-game`;
- `yugioh` / `Yu-Gi-Oh!` / `yu-gi-oh`;
- both controls remain `hidden` under
  `COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1`.

No identity domain was added. No set, card, identity, printing, mapping, sealed,
Storage, image, pricing, publication, or Vault row was authorized.

## Alternatives Rejected

- Inferring game foundations inside reconciliation was rejected because source
  candidates do not own canonical game identity.
- Creating sets or cards in the same migration was rejected because it would
  combine independent identity gates.
- Releasing the empty games to signed-in users was rejected because canonical
  existence does not authorize app visibility.
- Adding Yu-Gi-Oh or Gundam identity domains now was rejected because no card
  identity payload has been reviewed yet.

## Rollback Proof

- Producer commit: `a45742a156b5192449483b76df476a2a1f27ea12`.
- Migration SHA-256:
  `155dbe28f33ea0f44f7f5dd240e5f962fa487cabc7be1809b20ec803d7272e23`.
- Run-plan fingerprint:
  `832173f4ec0378b14ea52ccb56da95cd78ded2f80fd16f2707894a8effad9edf`.
- Statements executed transiently: `6`.
- Transient rows: `2` games and `2` hidden controls.
- Visibility for `anon`, `authenticated`, and `service_role`: denied for both
  games.
- Protected counts checked: `13`.
- Identity-domain changes: `0`.
- Migration-ledger changes: `0`.
- Rollback succeeded and the independent post-rollback snapshot was
  byte-identical to the baseline.
- Durable writes during the canary: `0`.

## Reviewed Apply

- PR: `https://github.com/OriginalSoseji/grookai_vault/pull/286`.
- Reviewed merge commit: `06ce213cda46e58244102d744a4835358fcc09eb`.
- Final Codex review: no major issues.
- CI, CodeQL, drift gates, runtime protection, secret guard, and Vercel: passed.
- Supabase CLI preflight offered exactly one migration.
- Applied migration: `20260828024500_collectible_wave1_game_foundations_v1`.
- Post-apply CLI dry-run: remote database up to date, zero pending migrations.

## Durable Readback

- Migration ledger rows for the version: exactly `1` with `8` recorded
  statements.
- `games`: exactly `2` authorized inserts.
- `catalog_game_release_controls`: exactly `2` authorized hidden inserts.
- Existing rows updated or deleted: `0`.
- New-game sets/cards/identities/printings: all `0`.
- Other protected table counts: unchanged from rollback baseline.
- Identity-domain constraint: unchanged.
- Release-control RLS and ACL: unchanged and service-owned.
- Both games remain hidden for anonymous, authenticated, and service-role
  request semantics.

## Post-Foundation Reconciliation

- Workflow:
  `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33137460263`.
- Default-branch SHA: `06ce213cda46e58244102d744a4835358fcc09eb`.
- Artifact ID: `9672587771`.
- Candidate source SHA-256:
  `30396cddfaff99e8f5ca1b11cc09942e88e99e6d8b586454e5fa67268bc3bb9f`.
- Selected/reconciled/bucket total: `46,259 / 46,259 / 46,259`.
- Decisions: `46,259 new_candidate`.
- Game-foundation blockers: `0`.
- Exact, ambiguous, and conflicting decisions: all `0`.
- Production database access: read-only transaction ending in rollback.
- Database, Storage, image, pricing, publication, and Vault writes: `0`.

The `new_candidate` result is expected: production now has both game roots but
still has zero Yu-Gi-Oh/Gundam sets and cards.

## Current Truths

1. Production migration history is reconciled through `20260828024500`.
2. Yu-Gi-Oh and Gundam now have deterministic canonical game ownership.
3. Both catalogs remain completely hidden from app request roles.
4. All `46,259` Wave 1 rows are reachable and no longer blocked at the game
   layer.
5. All candidates currently stop at missing canonical sets.
6. The current reconciliation still reports the old aggregate 124-card
   alternative-artwork limitation because its workflow consumes the original
   parser artifact. The separate row-addressability proof already identifies
   `288` stable image IDs and `1,679` printing-candidate references, but does not
   resolve artwork-to-printing ownership.

## Invariants

- Candidate evidence never becomes canonical authority by itself.
- Hidden game foundations do not authorize client visibility.
- Set ownership must be established before card identity creation.
- No identity domain is added until its exact card payload requires it.
- Alternative artwork remains unresolved until a source-backed printing owner
  is proven.
- No set/card apply may include images, prices, publication, or Vault writes.

## What Must Never Be Broken

- Do not place Yu-Gi-Oh or Gundam rows under Pokemon, MTG, or One Piece.
- Do not change either hidden control as part of set/card ingestion.
- Do not treat all `46,259` printing candidates as unique parent cards.
- Do not discard rarity, set, language, or alternative-artwork evidence while
  grouping candidate identities.
- Do not expose partial catalogs merely because canonical rows exist.

## Exact Next Gate

Build a deterministic, artifact-only Wave 1 set-foundation proposal from the
frozen parser set manifests and all candidate set coordinates. Reconcile aliases,
codes, names, languages, product-vs-set distinctions, and source completeness.

The next gate must produce reviewed set candidates and collision reports only.
It must not write sets or cards. It must also consume or explicitly join the
separate Yu-Gi-Oh alternative-artwork row-addressability artifact so the stale
aggregate limitation is not mistaken for unresolved row identity.
