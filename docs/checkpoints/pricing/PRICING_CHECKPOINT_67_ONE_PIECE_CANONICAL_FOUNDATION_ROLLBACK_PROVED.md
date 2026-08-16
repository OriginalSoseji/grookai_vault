# Pricing Checkpoint 67: One Piece Canonical Foundation Rollback Proved

## Context

The One Piece ST-01 source warehouse, durable service-only staging, identity
review, English image readiness, and permanent Storage upload were already
complete. Canonical promotion remained blocked because production had no One
Piece game row and the canonical identity-domain constraint did not yet permit
an English One Piece print domain.

This gate designed and tested only that prerequisite foundation. It did not
promote any ST-01 card, DON!! card, sealed product, image pointer, price, Vault
item, or public catalog row.

## Problem

Production contained the generic cross-TCG visibility boundary but lacked:

- the deterministic hidden `one_piece` game row;
- a hidden `catalog_game_release_controls` row for One Piece;
- `one_piece_eng_print` in
  `card_print_identity_identity_domain_check`.

Creating canonical rows without these prerequisites would either fail the
identity constraint or risk bypassing the fail-closed game-release boundary.

## Risk

The foundation migration changes a shared canonical constraint. An unsafe
apply could reject existing identities, expose a new game prematurely, alter
migration lineage, or mutate unrelated Pokemon, Japanese, MTG, sealed, pricing,
publication, image-pointer, or Vault data.

## Decision

Create one narrow migration and prove it in four stages:

1. a read-only production preflight;
2. exact migration execution inside an always-rolled-back transaction;
3. fresh read-only verification immediately after rollback;
4. a separately frozen independent read-only verifier.

The foundation game and release-control rows are inserted in the same
transaction and the release status is `hidden`. The migration creates no card,
printing, set, mapping, sealed, pricing, publication, image-pointer, or Vault
row.

## Alternatives Rejected

- Creating ST-01 cards before the game foundation was rejected because the
  identity domain and visibility prerequisites were not present.
- Reusing an existing identity domain was rejected because it would corrupt
  cross-TCG canonical semantics.
- Creating the game without a hidden release-control row was rejected because
  visibility must fail closed from the first durable transaction.
- Applying the migration immediately after static review was rejected because
  the shared constraint needed transaction-local and independent production
  proof first.
- Treating a Storage upload as canonical authority was rejected because object
  existence does not establish card identity or publication authority.

## Migration Candidate

- Version: `20260814150000`
- Name: `one_piece_canonical_catalog_foundation_v1`
- SHA-256:
  `a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba`
- Deterministic game ID:
  `4f504300-0000-4000-8000-000000000001`
- Game code/name/slug:
  `one_piece / One Piece Card Game / one-piece`
- Release status/version:
  `hidden / ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1`
- New identity domain: `one_piece_eng_print`
- Durable migration status: **not applied**

## Read-Only Preflight

- Producer SHA: `37d5a72a597e716fa308da2736b215f810633bdd`
- Evidence commit: `d00a3b7128e008991509dada80fbc709da39669d`
- Preflight fingerprint:
  `c3dc1ab6bdc2d6d1c434cddbc4c6a47fd447d65d396c1eec6feaf2bfb9978a1b`
- Findings: `0`
- Latest production migration: `20260814120000`
- Candidate/later migration rows: `0 / 0`
- One Piece game/release rows: `0 / 0`
- Staged source rows: `21` (`17` numbered, `1` DON!!, `3` sealed)
- ST-01 canonical set rows: `0`
- GV-ID/TCGPlayer/mapping collisions: `0 / 0 / 0`
- Database writes: `0`

## Rollback-Only Execution

- Frozen executor SHA:
  `6238188779763f996787c867aff4c7fb487cc0ba`
- Successful proof artifact commit:
  `b2bead5ce9ba5185d7fe6c2279461e9e67836ae5`
- Execution summary SHA-256:
  `5ce5f0b841ab3639ec9c2d8c17ad9bf8d0f6bbe5dfdaaf66a06a63f0190b1637`
- Rollback proof:
  `c055c08d0231ad99b7958afc5e915b5bb9841a5169628d8523f5c3fa29472fe1`
- Migration statements planned/executed: `9 / 9`
- Transaction-local game/release rows: `1 / 1`
- Transaction-local release visibility for anon/authenticated/service: `false / false / false`
- Transaction-local One Piece sets/cards/identities/printings: `0 / 0 / 0 / 0`
- Applied-state findings/protected-count findings: `0 / 0`
- Rollback attempted/succeeded: `true / true`
- Fresh post-rollback transaction read-only: `true`
- Durable game/release/migration rows after rollback: `0 / 0 / 0`

The first execution attempt encountered `ECONNRESET` after the fresh baseline
but before any migration statement executed. It recorded `0 / 9` statements
and no transaction start. A separately executed read-only preflight immediately
proved the original production state unchanged. The failed attempt and its
post-failure proof are preserved; they were not overwritten.

## Independent Zero-Residue Verification

- Frozen verifier SHA:
  `0a6039552c040a8cb2cda964ab034482ce9a3d88`
- Independent proof:
  `42fa494f412c03395a39bc3bd63b8ab9956fcdff4e8263f61ccea734c720eec5`
- Status: `rollback_independently_verified_zero_residue`
- Findings: `0`
- Artifact hash mismatches: `0`
- Latest production migration: `20260814120000`
- Candidate migration rows: `0`
- One Piece game/release rows: `0 / 0`
- ST-01 canonical set rows: `0`
- Staged source rows preserved: `21`
- Original five-domain constraint restored exactly: `true`
- Independent database writes: `0`

## Tests

- Node syntax checks: passed
- Foundation, rollback, and independent-verifier targeted tests: passed
- Full One Piece contract suite: `121 / 121` passed
- `git diff --check`: passed

## Current Truths

- All 21 ST-01 source rows remain durable only in service-only evidence staging.
- All 18 approved ST-01 card/DON image objects remain durably self-hosted and
  independently verified.
- Production has no One Piece canonical game, set, card, identity, printing,
  external mapping, or release-control row.
- The foundation migration is byte-frozen and production-tested under rollback.
- One Piece remains unavailable to anon, authenticated, and service catalog
  visibility because no durable foundation or catalog promotion exists.
- No sealed product, pricing publication, image pointer, or Vault mutation was
  made by this gate.

## Invariants

- The game row and hidden release-control row must become durable atomically.
- One Piece must remain `hidden` until a separately governed release gate.
- Existing identity domains must remain intact when `one_piece_eng_print` is
  added.
- The foundation migration may not create any set, card, identity, printing,
  mapping, sealed, pricing, publication, pointer, or Vault row.
- ST-01 numbered cards, DON!!, and sealed products remain separate promotion
  lanes.
- Storage evidence does not authorize canonical identity or pointer writes.
- Migration history must stay clean and linear.

## What Must Never Be Broken

- Do not expose One Piece by changing the foundation release status.
- Do not promote cards under a Pokemon, Japanese, or MTG identity domain.
- Do not combine foundation apply with canonical card promotion.
- Do not infer sealed or DON!! identities from the 17 numbered-card payload.
- Do not overwrite the 18 content-addressed Storage objects.
- Do not mutate Pokemon, Japanese, MTG, pricing, publication, Vault, or existing
  image-pointer data as part of this foundation.

## Artifacts

- Production read-only preflight:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_preflight_v1/production_read_only_v1/`
- Failed connection attempt and post-failure read-only proof:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/production_rollback_v1/`
  and
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/attempt_1_post_failure_read_only/`
- Successful rollback proof:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/production_rollback_attempt_2_v1/`
- Independent verification:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_rollback_v1/independent_post_rollback_v1/`

## Explicit Next Gate

Freeze a durable foundation-apply plan and guarded writer bound to the exact
migration SHA, preflight fingerprint, rollback proof, independent proof, clean
producer SHA, expected migration parent, and hidden release contract. Run a
fresh read-only preflight immediately before apply. Durable migration apply
requires separate explicit authorization and must stop after migration-ledger,
schema, hidden visibility, and zero-canonical-row readback. Do not promote the
17 numbered ST-01 cards in the same gate.
