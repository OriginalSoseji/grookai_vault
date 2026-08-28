# Collectible Wave 1 Game Foundations V1

## Objective

Create the minimum hidden production foundations required to reconcile the
existing Yu-Gi-Oh and Gundam Wave 1 candidate corpus against canonical truth.

This gate does not promote any candidate into the catalog.

## Exact Durable Scope

The migration may insert exactly:

- two `games` rows:
  - `yugioh` / `Yu-Gi-Oh!` / `yu-gi-oh`;
  - `gundam` / `Gundam Card Game` / `gundam-card-game`;
- two `catalog_game_release_controls` rows, both `hidden` and versioned
  `COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1`;
- one migration-ledger row when the reviewed migration is later applied through
  the governed migration path.

The deterministic UUID prefixes encode the established source abbreviations:
`YGO` for Yu-Gi-Oh and `GCG` for Gundam Card Game.

## Forbidden Scope

This gate must not write or change:

- sets, cards, identities, printings, external mappings, or sealed products;
- Storage objects, image pointers, prices, publication rows, or Vault rows;
- identity-domain constraints;
- existing game or release-control rows;
- release visibility for any request role.

No Yu-Gi-Oh or Gundam row may become visible to anonymous, authenticated, or
service-role request semantics during or after this foundation gate.

## Collision Policy

The migration fails closed when a target code, UUID, slug, release state,
release version, or evidence object conflicts with the exact seed. Exact
already-present seed rows are tolerated only for migration replay safety.

## Required Proof Before Durable Apply

1. Freeze the exact repository SHA, branch, migration bytes, and four-row scope.
2. Capture a fresh read-only production baseline.
3. Prove the candidate migration and all four target rows are absent.
4. Execute the migration body inside an outer rollback-only transaction.
5. Prove exactly two transient games and two transient hidden controls exist.
6. Prove both games remain hidden for `anon`, `authenticated`, and
   `service_role` request semantics.
7. Prove all protected table counts are unchanged except the two authorized
   transient game rows and two authorized transient controls.
8. Roll back and independently prove the complete baseline was restored.
9. Hash every permanent proof artifact.

## Next Gate

After reviewed rollback proof and a separate durable apply/readback, rerun all
46,259 Wave 1 candidates read-only. The expected change is from
`blocked_missing_game_foundation` to set/card-level decisions. No candidate may
be written until that new reconciliation is reviewed and separately governed.
