# Pricing Checkpoint 69: One Piece Canonical Foundation Applied and Verified

## Current Truth

The exact One Piece canonical foundation migration is now durably applied in
production. One Piece has a deterministic game row, a hidden release-control
row, and a permitted English One Piece identity domain. The migration history,
transaction-local attribution, fresh writer readback, and independent read-only
verification all reconcile.

No One Piece set, card, identity, printing, mapping, sealed, pricing,
publication, image-pointer, or Vault row was created by this gate. One Piece is
not visible to app roles.

## Authorization

The founder explicitly approved only:

- migration SHA-256:
  `a072e55f5bf3362aefcf1056b37e93a4e861b64ffeb529e0fd554d046586fbba`;
- apply-plan fingerprint:
  `7a4458002aa0f30133b875e784ee4050b4209605797701aae92ef6e994842aec`;
- one migration-ledger row;
- one game row;
- one hidden release-control row;
- one identity-domain constraint replacement;
- zero card, set, printing, mapping, sealed, Storage, pointer, pricing,
  publication, and Vault writes.

## Durable Apply Result

- Apply producer SHA:
  `8a74925370b0a3ae453992573a5e5dfeeb933e6a`
- Status: `foundation_applied_hidden_and_readback_passed`
- Execution summary SHA-256:
  `f2fad0398968fa09a5cba22197508a2eb7cbb62d2b4e0ac9f68f62cc2257391f`
- Committed: `true`
- Migration ledger rows: `1`
- Game rows inserted: `1`
- Hidden release-control rows inserted: `1`
- Identity-domain constraint replacements: `1`
- Artifact hash mismatches: `0`

The command was interrupted after the database work had completed. The writer
had already written its passing summary and post-apply readback. The execution
was not rerun. Existing artifacts and production state were reconciled first,
preventing a duplicate apply.

## Transaction Attribution

The transaction-local `pg_stat_xact_user_tables` proof reported exactly:

- `games`: `1` insert, `0` update/delete/hot-update;
- `catalog_game_release_controls`: `1` insert,
  `0` update/delete/hot-update;
- every other public table: `0` attributable writes.

The migration-ledger insert occurred in `supabase_migrations` and matched the
exact frozen migration statement inventory.

## Fresh Writer Readback

- One Piece game rows: `1`
- One Piece release-control rows: `1`
- Release status/version:
  `hidden / ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1`
- Visibility for anon/authenticated/service:
  `false / false / false`
- One Piece set/card/identity/printing rows: `0 / 0 / 0 / 0`
- One Piece sealed-family rows: `0`
- Staged numbered/DON/sealed rows preserved: `17 / 1 / 3`
- Readback transaction read-only: `true`

## Independent Verification

- Verifier producer SHA:
  `8a74925370b0a3ae453992573a5e5dfeeb933e6a`
- Status: `foundation_post_apply_independently_verified`
- Independent summary SHA-256:
  `a045fb5bb624262a5a432f5a47ec74f397d652191946a9d766c8dd6bc2b8fa89`
- Findings: `0`
- Artifact hash mismatches: `0`
- Fresh read-only connection: `true`
- Migration ledger/game/release rows: `1 / 1 / 1`
- Hidden visibility preserved: `true`
- Canonical card rows: `0`

## Tests

- Full One Piece contract suite: `128 / 128` passed
- Node syntax checks: passed
- `git diff --check`: passed

## Preserved Boundaries

- The 17 numbered ST-01 cards remain staged and unpromoted.
- The DON!! card remains staged and unpromoted.
- The three sealed candidates remain staged and unpromoted.
- The 18 permanent self-hosted images remain immutable and are not yet pointed
  to by canonical One Piece rows.
- One Piece remains hidden from anon, authenticated, and service catalog reads.
- No Pokemon, Japanese, MTG, pricing, publication, Vault, or existing pointer
  row changed in this apply.

## Invariants

- The One Piece release-control row must remain `hidden` until a separately
  governed release gate.
- Canonical promotion does not authorize public visibility.
- The `one_piece_eng_print` identity domain may be used only for supported
  English One Piece print identities.
- Numbered cards, DON!!, and sealed products remain separate apply lanes.
- Storage existence still does not authorize canonical identity or pointer
  assignment.
- Migration `20260814150000` must never be reapplied or rewritten.

## Artifacts

- Durable apply:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/production_apply_v1/`
- Independent post-apply verification:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/independent_post_apply_v1/`
- Frozen plan and preflight evidence:
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/foundation_apply_plan_v1/`
  and
  `docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/fresh_production_preflight_final_v1/`

## Exact Next Gate

Build a frozen canonical parent payload for only the 17 officially numbered
English ST01-001 through ST01-017 cards. Bind each row to its durable staged
source evidence and exact self-hosted image hash. Run a read-only collision
preflight and rollback-only canonical canary before any durable card write.
Keep the DON!! card, all sealed products, image-pointer updates, pricing,
publication, Vault writes, and game visibility out of that gate.
