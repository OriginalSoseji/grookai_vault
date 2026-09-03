# Pricing Checkpoint 97: MTG Sealed Forward Gate Ready

## Status

`READ-ONLY READY - STOPPED BEFORE PRODUCTION MIGRATION APPLY`

## Context

The reconciled repository contained a complete MTG sealed-world operator and
one unapplied per-game sealed release migration. That migration had an older
timestamp than newer production ledger rows. Applying it with
`--include-all` would have violated the locked migration guardrails.

## Risk

- An out-of-order push could bypass governed migration history.
- Combining schema authority with catalog apply authority could make a schema
  approval silently authorize more than intended.
- Reusing a stale plan after a later source refresh could write a payload that
  no longer matches its live evidence.
- The per-game migration backfills existing sealed release-control rows, so it
  must be reviewed independently from the MTG catalog payload.

## Decision

- Retimestamp only the still-unapplied migration into forward ledger order.
- Preserve the SQL behavior and record the original SQL hash.
- Prohibit `--include-all` in both dry-run and apply paths.
- Prove the remote ledger and exact sole-pending migration through a read-only
  production run.
- Freeze the MTG plan separately, with zero write authority.
- Stop before migration apply.

## Alternatives Rejected

- `supabase db push --include-all`: violates production guardrails.
- Marking the old migration applied without executing it: would falsify schema
  history.
- Merging the stale PR wholesale: unnecessary because current main already
  contained all eight behavior files.
- Applying schema and 2,904 variants in one operation: conflates two mutation
  contracts and weakens rollback attribution.

## Current Truths

- Producer: `main@515ce390f4c0c47383a5e59d7b0c65d7e778c05d`.
- Migration: `20260903130000_sealed_product_per_game_release_v2.sql`.
- Migration SHA-256:
  `630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`.
- Migration dry-run: GitHub run `33756902964`, passed.
- Frozen plan: GitHub run `33757112453`, passed.
- Plan fingerprint:
  `ed336dd1cbf442f1788a9d889d3b3d2b5a643e5f1c3b9cb39220f129542b8bae`.
- Source fingerprint:
  `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`.
- The plan contains 2,904 variants, 237 families, and 2,182 fresh exact
  release members.
- No production database or product data changed during this checkpoint.

## Invariants

- Applied migrations remain immutable.
- Production migration pushes never use `--include-all`.
- One Piece sealed rows and its active pointer remain preserved.
- MTG sealed identities stay hidden until their separate release gate.
- Stale and missing prices remain explicit holds, never fallback values.
- No card, Storage, Vault, publication, or cross-game writes are implied by
  the migration approval.
- A plan fingerprint is evidence, not durable apply authority.

## Permanent Evidence

- `docs/audits/pricing/mtg_sealed_world_v1/2026-09-03_FORWARD_GATE_REPORT.md`
- `docs/audits/pricing/mtg_sealed_world_v1/2026-09-03_ARTIFACT_HASHES.json`
- `docs/audits/pricing/mtg_sealed_world_v1/2026-09-03T12-44-04Z_migration_dry_run_33756902964/`
- `docs/audits/pricing/mtg_sealed_world_v1/2026-09-03T12-46-09Z_plan_33757112453/`

## Exact Next Gate

Apply only migration
`20260903130000_sealed_product_per_game_release_v2.sql`, using migration
SHA-256 `630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`,
then perform independent schema, function, RLS, grant, release-row, pointer,
and migration-ledger readback.

That approval must not authorize the separate 2,904-variant MTG sealed-world
apply. After schema verification, generate a fresh plan, run preflight and the
full rollback canary, and freeze the exact durable mutation contract.
