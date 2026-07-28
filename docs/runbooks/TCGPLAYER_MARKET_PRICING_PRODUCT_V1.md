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

Run the complete local integration smoke:

```powershell
supabase db reset --local --yes
node scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs
```

The smoke must prove publication, idempotent resume, a replacement generation,
atomic rollback, append-only enforcement, authenticated shared reads, and
service-only provenance.

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

## Scheduled Operations

The safe default produces an operations plan without writes:

```powershell
npm run pricing:market:schedule:dry-run
```

Production scheduling uses:

- `grookai-tcgplayer-market-pipeline.timer`
- `grookai-tcgplayer-market-pipeline.service`
- `grookai-operations-webhook@.service`

The timer is fixed at `08:15 UTC`. The scheduled runner holds a PostgreSQL
advisory lock for the full run, preserves one run key across retries, and writes
one durable attempt record per invocation. Only source/transport failures are
retried. Health, reconciliation, and publication-invariant failures stop
immediately and notify operations.

Install the units without activation while shadow proof is pending:

```bash
sudo bash deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh
```

After three shadow cycles pass, set the dedicated environment file to:

```text
TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN=1
TCGPLAYER_MARKET_SCHEDULE_MODE=production
TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1
```

Then perform the guarded schedule replacement:

```bash
sudo ACTIVATE_TIMER=1 \
  bash deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh
bash deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh --production
```

Activation disables the standalone `grookai-tcgcsv-warehouse.timer` because
the combined pipeline now owns current acquisition and publication. It does not
disable historical backfill or the separately governed internal MEE worker.

`GROOKAI_OPERATIONS_WEBHOOK_URL` is mandatory for activation and must remain in
`/etc/grookai/tcgplayer-market-pricing.env`, never in Git.

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
- Source or transport failure: preserve artifacts and retry with the same run
  key up to the configured ceiling.
- Retry exhaustion: stop, preserve `scheduled_attempts.jsonl`, and verify the
  webhook delivery receipt under `/var/lib/grookai/operations-notifications`.
- Reconciliation mismatch: rollback publication transaction and stop.
- Client mismatch: stop rollout and trace the `provenance_id`.
