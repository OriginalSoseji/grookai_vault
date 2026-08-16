# Pricing Checkpoint 90: One Piece Sealed Qualifications Applied And Release Gate Ready

## Context

Checkpoint 89 froze the exact 374-row qualification payload and guarded
writer. Production still contained no qualification, release, member, or
pointer rows.

## Durable Qualification Result

The exact frozen writer ran from commit
`9524fe20fa81fe48f89a38133713ab7ee7dffbfd`.

- Fresh preflight fingerprint:
  `309da7436947c1be6f62c05815762aed3b0c9aa3c57f52eb64cb52c4fa292fdb`
- Apply execution fingerprint:
  `ed43c49a857fb9a9738bada6a717fb696f64aa027fdbec455a2c50917db4d2cb`
- Exact stored-payload hash:
  `1145f3cc1ce1345e9f75819af52d2d2f08949649fddd4dcca7153b8ea5db51ac`

The transaction inserted exactly 374 append-only qualification rows:

- 332 `qualified_exact`
- 4 `blocked_stale`
- 38 `blocked_missing_price`

The 16 `blocked_missing_observation` products remain explicit artifact-level
holds because no source price row exists to reference. No synthetic source
identity was created.

## Verification

- Fresh production lineage: 374 / 374 / 374 exact
- Collision count before apply: 0
- Write attribution: one table, 374 inserts, 0 updates, 0 deletes
- Transaction payload readback: exact
- Independent post-commit readback: passed
- Release / member / pointer rows after qualification: 0 / 0 / 0
- One Piece catalog release status: `hidden`
- App visibility changes: 0

## Release Integrity Finding

The original sealed schema links release members to variants and source
mappings, but does not bind them to the exact `qualified_exact` row. The next
release cannot rely only on writer behavior for this invariant.

The release gate therefore adds a schema constraint requiring each member to
reference a qualification row with matching qualification, variant, mapping,
and literal `qualified_exact` status. It also adds a bounded signed-in RPC that
reads only the active frozen release and still respects
`catalog_game_release_controls`.

## Current Truths

- All 390 current English One Piece sealed identities remain intact.
- Exactly 332 variants have current publishable TCGPlayer `market_price`
  evidence.
- Exactly 58 variants are excluded from the release.
- Qualification evidence does not itself authorize publication.
- No release currently exists and no product is client-visible.
- Numbered cards, DON cards, child printings, Storage, Vault, and canonical
  identity were not mutated by the qualification apply.

## Invariants

- A release member must be database-bound to `qualified_exact` evidence.
- Blocked and missing-observation rows cannot enter the release.
- TCGPlayer `market_price` remains the only V1 price authority.
- Release construction is immutable; activation is an atomic pointer change.
- Anonymous access remains denied.
- Hidden game release control still denies app-facing sealed reads.
- No card, Storage, Vault, or canonical identity write belongs in this gate.

## Permanent Evidence

- `docs/audits/pricing/one_piece_sealed_pricing_qualification_apply_v1/production_read_only_preflight_v1/`
- `docs/audits/pricing/one_piece_sealed_pricing_qualification_apply_v1/durable_apply_v1/`
- `docs/audits/pricing/one_piece_sealed_pricing_qualification_apply_v1/independent_post_apply_v1/`

## Exact Next Gate

Apply and independently verify the release-to-qualification schema binding.
Then freeze, rollback-prove, durably create, freeze, and point the exact
332-member One Piece sealed release. Keep the One Piece catalog release
control hidden until the wider card catalog and client readiness gate passes.
