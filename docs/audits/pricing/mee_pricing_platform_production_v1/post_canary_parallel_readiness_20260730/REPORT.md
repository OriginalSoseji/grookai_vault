# Pricing Production V1 Post-Canary Parallel Readiness

## Status

`rehearsal_ready`

All work in this packet was performed in parallel with the active 72-hour
canary and respected a read-only production boundary. The packet prepares the
next release gates; it does not pass or replace the active canary.

## Active Canary Truth

- Production SHA: `456306bdb2a335286d513c1d612a97a58a1f01cc`
- Activation: `2026-07-30T18:17:48.625Z`
- Required end: `2026-08-02T18:17:48.625Z`
- Run ID: `421f40ab-2d2d-4411-a1b3-7420603c5b86`
- Publication set: `5b016262-764b-4b05-9e1e-df15971d0a7d`
- Rollback set: `1317e10a-c88f-4316-b062-bc5d62e297c9`

The production checkout, timer, observer, publication pointer, database
schema, and clients were not changed by this work.

## Parallel Work Completed

### 1. Integration inventory

The pricing branch cannot be merged wholesale into current `main`. A
read-only `git merge-tree` rehearsal found 11 content conflicts:

- `apps/web/src/components/PublicSetCardGrid.tsx`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `lib/main_vault.dart`
- `lib/screens/compare/compare_screen.dart`
- `lib/services/public/public_collector_service.dart`
- `package.json`
- `scripts/audits/jpn_pikachu_promo_first_batch_dry_run_v1.mjs`
- `scripts/audits/jpn_pikachu_promo_gap_audit_v1.mjs`
- `scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs`
- `supabase/functions/notification-dispatcher/index.ts`
- `tests/contracts/search_resolver_pricing_resilience.test.mjs`

The new inventory policy classifies pricing runtime, migrations, web,
Flutter, tests, governing documents, audit evidence, and shared
infrastructure separately. The post-canary candidate must start from current
`main` and resolve each conflict explicitly.

### 2. Migration rehearsal

A disposable isolated Supabase stack replayed all 305 migrations. The frozen
three-migration package applied and passed schema, function, grant, RLS, view,
and authenticated-empty-read checks.

This proves replayability, not production authorization. No production
migration was applied.

### 3. Coverage and exact-mapping opportunity

The read-only Production V1.2 coverage audit found:

- coverage: `95.247%`
- numerator: `31,123`
- denominator: `32,676`
- classified gap rows: `1,553`
- threshold status: `passed`

Gap causes:

- missing active source mapping: `1,392`
- variant assignment not exact child finish: `149`
- missing mapping method: `9`
- unsupported product kind: `3`

The exact-mapping planner reviewed 1,042 missing-mapping products and found:

- exact candidates: `251`
- blocked candidates: `791`
- projected covered gap rows: `404`
- database writes: `0`

These candidates remain a separate review/apply batch.

### 4. Current publication scope finding

Two rows in the active 100-row canary are outside the current V1.2 product
scope:

- Bagon, source product `83694`
- Electrike, source product `85131`

Both are from `EX Trainer Kit 1: Latias & Latios` and classify as
`deck_exclusive_special_variant`. The active canary was intentionally left
unchanged. The first post-canary full shadow must exclude both rows before
publication.

### 5. Rollback and scheduler rehearsals

Rollback dry-run:

- status: `passed`
- current rows: `100`
- restore rows: `100`
- committed: `false`
- all database write counters: `0`

Scheduled-runner dry-run:

- status: `dry_run_planned`
- expected and actual commit:
  `456306bdb2a335286d513c1d612a97a58a1f01cc`
- tracked production worktree: clean
- provider and database phases executed: `0`

### 6. Product surfaces and Founder visibility

The immutable surface checklist contains 17 required web and Flutter
surfaces. Captures remain `0/17` because deployment is intentionally blocked
during the active canary.

The prepared Founder dashboard changes:

- display remaining canary hours and window completion;
- list all three pending post-canary migrations;
- show the current two-row V1.2 scope correction as a blocked release gate;
- preserve the distinction between database publication and deployed client
  visibility.

These dashboard changes are prepared only. They are not deployed.

## Verification

- Post-canary readiness and Founder contracts: `18/18` passed
- Relevant pricing-branch contract tests: `43/43` passed
- Web TypeScript check: passed
- Node syntax checks: passed
- `git diff --check`: passed
- Production database writes: `0`
- Migration applies: `0`
- Publication activations: `0`
- Deployments: `0`

## Decision

Useful release work can continue without waiting idly, but signed-in
publication cannot proceed yet. The exact next gate remains completion of the
active 72-hour canary at or after `2026-08-02T18:17:48.625Z`.

After the canary passes, execute
`docs/runbooks/TCGPLAYER_MARKET_POST_CANARY_EXECUTION_V1.md` in order:

1. freeze an integration candidate from current `main`;
2. resolve the 11 conflicts explicitly;
3. apply and read back the three frozen migrations;
4. run a fresh V1.2 shadow that excludes Bagon and Electrike;
5. deploy and prove all 17 surfaces;
6. activate signed-in full publication;
7. observe seven unattended cycles.

Anonymous pricing remains a later licensing gate.
