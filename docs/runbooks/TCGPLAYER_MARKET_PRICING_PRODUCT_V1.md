# TCGPlayer Market Pricing Product V1 Runbook

## Preconditions

- Branch contains the applied migration history and the V1 pricing migration.
- `SUPABASE_DB_URL` or `DATABASE_URL` points to the intended environment.
- The tracked working tree is clean for apply mode.
- The exact commit SHA is deployable by web and Flutter clients.
- TCGCSV category `3` is available.

## Local Verification

```powershell
node --check scripts/workers/tcgplayer_market_publication_worker_v1.mjs
node --check scripts/workers/tcgplayer_market_pipeline_v1.mjs
node --check scripts/workers/tcgplayer_market_health_v1.mjs
node --test tests/contracts/tcgplayer_market_publication_v1.test.mjs
npm --prefix apps/web run typecheck
flutter analyze
flutter test
```

Compile the migration in an isolated local database before remote apply.

## Publication Dry Run

This reads the current warehouse and writes artifacts only:

```powershell
npm run pricing:market:publish:dry-run
```

Inspect:

- `summary.json`
- `qualification_decisions.jsonl`
- `reconciliation.json`
- `artifact_hashes.json`

The dry run must show zero canonical-identity and vault writes.

## Full Pipeline Apply

After the migration is applied and remote schema/security readback passes:

```powershell
npm run pricing:market:pipeline:apply
```

Apply mode performs:

1. current TCGCSV warehouse sync
2. deterministic qualification/publication
3. health and reconciliation

The pipeline refuses to start from a dirty tracked worktree.

## Resume

Reuse the run key shown in the failed or interrupted artifact:

```powershell
node scripts/workers/tcgplayer_market_pipeline_v1.mjs --apply --resume-run-key=<run-key>
```

Completed phases are not repeated. Resume is refused if the current commit SHA
or mode differs from the frozen run plan.

## Health Check

```powershell
npm run pricing:market:health
```

Critical findings require stopping publication rollout. Do not bypass:

- stale or failed current source sync
- eligible/snapshot mismatch
- broken provenance trace
- unexpectedly empty current read model

## Canary Readback

For a bounded set of exact printings, confirm:

- the source observation is from TCGCSV category `3`
- the canonical parent mapping count is exactly one
- the exact finish mapping count is exactly one
- language identity is `pokemon_eng_standard`
- market close equals source `market_price`
- supporting values did not alter the close
- eBay active ask is separate
- the client RPC returns the same value
- `get_market_price_trace_v1` closes the provenance chain

## Rollout

Keep RPC execution authenticated-only during the signed-in canary.

Public anonymous access requires a later migration changing only the approved
read RPC grants. Do not grant raw tables or internal views.

## Failure Handling

- Mapping ambiguity: quarantine and repair canonical/external mapping.
- Finish ambiguity: quarantine; do not infer special edition equivalence.
- Stale source: rerun current warehouse sync.
- Source sync failure: preserve artifacts and retry with the same run key.
- Reconciliation mismatch: rollback publication transaction and stop.
- Client mismatch: stop rollout and trace the `provenance_id`.
