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
node --check scripts/audits/tcgplayer_market_vault_production_readback_v1.mjs
node --test tests/contracts/tcgplayer_market_publication_v1.test.mjs
node --test tests/contracts/tcgplayer_market_vault_production_readback_v1.test.mjs
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

After three shadow cycles and exact 100-printing verification pass, begin the
authenticated canary with:

```text
TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN=1
TCGPLAYER_MARKET_SCHEDULE_MODE=canary
TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION=backend/pricing/canaries/tcgplayer_market_canary_100_v1.json
TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT=
TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA=<exact-deployed-40-character-sha>
```

Then perform the guarded canary schedule replacement:

```bash
sudo ACTIVATE_TIMER=1 \
  bash deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh
bash deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh --canary
```

Activation disables the standalone `grookai-tcgcsv-warehouse.timer` because
the combined pipeline now owns current acquisition and publication. It does not
disable historical backfill or the separately governed internal MEE worker.

Canary scheduling always resolves the verified definition exactly. First-N
publication limits, substituted IDs, and unverified definitions fail closed.

Only after the authenticated canary and full eligible signed-in gates pass may
the environment move to:

```text
TCGPLAYER_MARKET_SCHEDULE_MODE=production
TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION=
TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT=
TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA=<exact-deployed-40-character-sha>
TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1
```

Re-run the installer and verify with `--production` after that explicit gate.

`GROOKAI_OPERATIONS_WEBHOOK_URL` and
`GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN` are mandatory for activation and
must remain in `/etc/grookai/tcgplayer-market-pricing.env`, never in Git.
The webhook records an append-only service-only receipt, enqueues an
`operations_alert` for active founder recipients, and invokes the existing
push dispatcher by exact notification ID. Critical operations alerts bypass
card-notification preferences, quiet hours, watch mutes, and daily card push
budgets.

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

Run the service-only, read-only GV-ID diagnostic for any exact printing:

```powershell
npm run pricing:market:provenance -- `
  --printing-gv-id=<exact-printing-gv-id> `
  --require-available `
  --out-root=artifacts/market_pricing_product_v1/provenance_lookup
```

The artifact must reconcile canonical identity, the shared read-model row,
market close, immutable snapshot, qualification decision, source mapping,
variant assignment, source observation, source artifact, and both artifact and
row hashes. It performs no writes and does not expose the service-only trace to
product clients.

An exact historical provenance identifier can be inspected with:

```powershell
npm run pricing:market:provenance -- `
  --provenance-id=<provenance-uuid> `
  --out-root=artifacts/market_pricing_product_v1/provenance_lookup
```

The command reports `requested_provenance_is_not_current` when the immutable
trace is valid but no longer backs the current publication.

## 72-Hour Canary Observation

Run the read-only observation evaluator with the exact activation evidence:

```powershell
npm run pricing:market:canary:observe -- `
  --window-start=<activation-timestamp> `
  --activation-run-id=<activation-publication-run-id> `
  --expected-commit-sha=<frozen-producing-sha>
```

Before 72 hours elapse, the expected result is `observing`. At or after the
required end time, require a passing result:

```powershell
npm run pricing:market:canary:observe -- `
  --window-start=<activation-timestamp> `
  --activation-run-id=<activation-publication-run-id> `
  --expected-commit-sha=<frozen-producing-sha> `
  --require-pass
```

The evaluator reads production state but performs no database writes,
publication activation, rollback, or grant changes. Preserve its run plan,
evidence, summary, report, and artifact hashes with the canary checkpoint.

## Coverage Gate

Run the fixed-denominator coverage audit against the latest reconciled full
shadow run:

```powershell
npm run pricing:market:coverage
```

To enforce the Production V1 threshold:

```powershell
npm run pricing:market:coverage -- --require-pass
```

The report must not remove missing mappings from the denominator. Use
`coverage_gaps.jsonl` and the per-set report to prioritize exact canonical and
finish-mapping repairs. Scope exclusions are written separately with their
deterministic V1/V1.1 boundary reasons.

## Read Performance Gate

Run the production shared-read benchmark:

```powershell
npm run pricing:market:performance
```

To require the Product V1 p95 target:

```powershell
npm run pricing:market:performance -- --require-pass
```

The audit is read-only. It measures the exact PostgREST RPC used by web and
Flutter for detail and representative batch requests, then executes the same
function under the database `authenticated` role. Preserve the run plan,
sample IDs, raw measurements, execution plans, summary, report, and hashes.

The representative parent and printing batches default to `200` IDs and may
be configured only from `50` through `500`. Do not benchmark the entire
current publication as one product request.

The scheduled activation pipeline refreshes the exact active-ask materialized
snapshot before publication:

```powershell
npm run pricing:market:active-ask:refresh -- --apply
```

Do not run this command from a dirty tracked worktree. Shadow and dry-run
pipelines read and validate the existing snapshot but do not refresh it.

## Full Eligible Signed-In Rollout

Do not begin this section until the 72-hour canary observer passes with
`--require-pass`. Keep anonymous RPC execution denied.

1. Freeze the exact clean commit intended to produce all full-eligible
   evidence and record its 40-character SHA. Confirm the migration rollout
   manifest still matches the pending files:

```text
backend/pricing/rollout/tcgplayer_market_production_v1_migration_manifest.json
```

From PowerShell, rerun the tested strict preflight for the exact pending set:

```powershell
.\scripts\migration_preflight_strict.ps1 `
  -Phase PrePush `
  -ExpectedLocalOnlyIds @("20260728130000", "20260728133000")
```

Require exactly those two local-only IDs, zero remote-only IDs, a passing
duplicate-object scan, and a passing full local reset. Stop on any mismatch.
Do not use `--include-all`.

Apply only the reviewed migration history:

```powershell
supabase db push
```

Immediately require an empty linked schema diff:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 `
  -Phase AuditLinkedSchema
```

Read back the new schema, grants, RLS, authenticated behavior, and anonymous
denial before deploying clients or activating full publication. Both migration
IDs must now appear in both ledger columns with no remaining local-only or
remote-only IDs.

2. Deploy that same exact clean commit to every pricing runtime and supported
   client surface.
3. Run a fresh full-source V1.2 shadow from that commit:

```powershell
node scripts/workers/tcgplayer_market_pipeline_v1.mjs `
  --mode=shadow `
  --run-key=TCGPLAYER-MARKET-FULL-SHADOW-<timestamp>
```

4. Require corrected coverage against the resulting publication run:

```powershell
npm run pricing:market:coverage -- `
  --run-key=TCGPLAYER-MARKET-FULL-SHADOW-<timestamp>-publication `
  --require-coverage-pass
```

The fresh shadow artifact must report V1.2 policy, at least `95%` coverage,
and zero unclassified gap rows. `--require-coverage-pass` deliberately checks
the candidate shadow denominator without pretending the older current
publication has changed. Preserve this threshold proof.

5. Activate the complete eligible scope. Production mode refuses row limits
   and canary definitions:

```powershell
node scripts/workers/tcgplayer_market_pipeline_v1.mjs `
  --mode=production `
  --skip-ingest `
  --run-key=TCGPLAYER-MARKET-FULL-ACTIVATION-<timestamp>
```

6. Immediately run health, fresh V1.2 coverage, bounded performance,
   provenance lookup, exact-Vault production readback, and rollback dry-run.
   Every gate must pass before the production schedule is enabled.

```powershell
npm run pricing:market:coverage -- `
  --run-key=TCGPLAYER-MARKET-FULL-SHADOW-<timestamp>-publication `
  --require-pass
```

This post-activation replay must also report
`current_publication_scope_status: passed`.

Require the exact-Vault schema, ACL/RLS, owner scope, exact-printing rows, and
copy-level total to reconcile from the deployed commit:

```powershell
npm run pricing:market:vault:verify -- `
  --expected-commit-sha=<exact-deployed-40-character-sha> `
  --require-pass
```

The verifier is read-only. It must prove authenticated owner isolation,
anonymous SQLSTATE `42501`, zero cross-owner rows, zero parent-scope pricing,
and agreement between the governed pricing RPC and the independent current
exact-printing view. It writes no customer identifiers to its artifacts.

### Authenticated Product Surface Proof

After the exact client commit is deployed, capture every surface listed in
`docs/contracts/TCGPLAYER_MARKET_PRODUCT_SURFACE_PROOF_V1.md`. Do not reuse
captures from an older deployment.

For each web surface, sign in, navigate to a card from the current eligible
publication, save a screenshot, then run
`scripts/audits/tcgplayer_market_web_surface_capture_v1.js` unchanged as a
browser DevTools Snippet. Select the matching surface ID. Save the downloaded
`.render.json` beside a screenshot named with the same capture ID.

For each Flutter surface, connect the production test device with ADB, open
the signed-in screen, and run:

```powershell
node scripts/audits/tcgplayer_market_flutter_surface_capture_v1.mjs `
  --surface-id=<required-flutter-surface-id> `
  --route=<screen-or-route-identity> `
  --out-dir=<surface-capture-directory>
```

When more than one price is visible, add
`--match=<card-print-id-or-printing-id>` to select exactly one semantics node.
The command preserves the screenshot, UI Automator tree, and normalized render
evidence.

Build the exact capture manifest:

```powershell
npm run pricing:market:surfaces:manifest -- `
  --capture-dir=<surface-capture-directory> `
  --deployed-commit-sha=<exact-deployed-40-character-sha> `
  --require-complete
```

Then reconcile every capture against the production RPC and the exact-Vault
readback:

```powershell
npm run pricing:market:surfaces:verify -- `
  --capture-manifest=<surface-capture-directory>/capture_manifest.json `
  --vault-readback=<exact-vault-audit-directory>/summary.json `
  --expected-commit-sha=<exact-deployed-40-character-sha> `
  --deployed-commit-sha=<exact-deployed-40-character-sha> `
  --require-pass
```

The verifier must report all `17/17` surfaces passed with zero findings. It
hashes screenshots and render evidence and performs only an authenticated
read-only production RPC call. A screenshot-only review, a local component
test, or a capture from a different commit cannot satisfy this gate.

7. Configure the exact deployed commit and full-scope schedule:

```text
TCGPLAYER_MARKET_SCHEDULE_ALLOW_RUN=1
TCGPLAYER_MARKET_SCHEDULE_MODE=production
TCGPLAYER_MARKET_SCHEDULE_PUBLICATION_LIMIT=
TCGPLAYER_MARKET_SCHEDULE_CANARY_DEFINITION=
TCGPLAYER_MARKET_SCHEDULE_EXPECTED_COMMIT_SHA=<exact-deployed-40-character-sha>
TCGPLAYER_MARKET_REPLACEMENT_VERIFIED=1
```

8. Activate and verify the production timer:

```bash
sudo ACTIVATE_TIMER=1 \
  bash deploy/scripts/install-tcgplayer-market-pipeline-systemd.sh
bash deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh --production
```

The installer and scheduled runner both refuse a commit mismatch, dirty
tracked checkout, production publication limit, or production canary
definition.

## Seven-Cycle Full Rollout Gate

Run the read-only observer after activation and after each expected daily
`08:15 UTC` production cycle:

```powershell
npm run pricing:market:full-rollout:observe -- `
  --window-start=<full-activation-completed-at> `
  --activation-run-id=<full-activation-publication-run-id> `
  --expected-commit-sha=<exact-deployed-40-character-sha> `
  --coverage-summary=<fresh-v1.2-coverage-directory>/summary.json `
  --performance-summary=<fresh-performance-directory>/summary.json
```

Before seven cycles complete, the expected result is `observing`. After the
seventh cycle, rerun with `--require-pass`. A pass requires:

- one exact full activation and seven healthy full-scope scheduled runs
- identical V1.2 policy and producing commit
- complete top-level, decision, snapshot, and trace reconciliation
- current pointer and count agreement with the latest healthy run
- zero stale, missing-provenance, broken-trace, or invalid-policy rows
- healthy current source continuity
- authenticated read success and anonymous denial
- prior-generation rollback availability
- fresh passing V1.2 coverage and bounded p95 performance
- zero terminal pipeline alerts

The observer reads production state and copies the governed coverage and
performance summaries into a hashed audit package. It performs no writes,
publication activation, grant changes, rollback, or deployment.

## Public Rollout

Keep RPC execution authenticated-only during the signed-in canary.

Public anonymous access requires a later migration changing only the approved
read RPC grants. Do not grant raw tables or internal views. Do not perform the
grant until signed-in full rollout, seven unattended cycles, licensing,
attribution, and public display authority all pass.

## Guarded Publication Rollback

Rollback is an incident response action. It restores the exact prior complete
publication generation; it does not regenerate prices or mutate snapshots.

Take the current and previous publication-set IDs from the latest health or
canary observation artifact. First run the read-only precondition check:

```powershell
npm run pricing:market:rollback:dry-run -- `
  --expected-current-publication-set-id=<current-publication-set-id> `
  --expected-restore-publication-set-id=<previous-publication-set-id> `
  --out-root=artifacts/market_pricing_product_v1/publication_rollback
```

Require:

- `status: passed`
- `committed: false`
- both publication snapshot counts reconcile with their expected counts
- current state is `published`
- restore state is `superseded`

Apply only from the exact clean commit that passed the dry run:

```powershell
npm run pricing:market:rollback:apply -- `
  --expected-current-publication-set-id=<current-publication-set-id> `
  --expected-restore-publication-set-id=<previous-publication-set-id> `
  --reason="<incident-id and factual rollback reason>" `
  --expected-commit-sha=<exact-40-character-clean-commit-sha> `
  --confirmation=TCGPLAYER_MARKET_PUBLICATION_ROLLBACK_V1 `
  --out-root=artifacts/market_pricing_product_v1/publication_rollback
```

The command performs the database rollback function and all postcondition
readback inside one serializable transaction. It commits only when the restored
pointer, publication/run states, snapshot count, reason, and two publication
events reconcile. Preserve the run plan, precondition and postcondition
readbacks, event rows, summary, and hashes.

After apply:

```powershell
npm run pricing:market:health
```

Stop the affected rollout. Do not start a replacement publication until the
incident is understood and a new dry run reconciles.

## Acquisition And Artifact Failures

For a partial download, malformed artifact, hash mismatch, provider outage, or
retry exhaustion:

1. Preserve the original pipeline run key and its artifacts.
2. Confirm the current publication remains healthy:

```powershell
npm run pricing:market:health
```

3. Do not activate staged or unreconciled rows.
4. After source transport recovers, resume the same frozen run:

```powershell
node scripts/workers/tcgplayer_market_pipeline_v1.mjs --apply --resume-run-key=<run-key>
```

The pipeline must reuse a previously verified artifact or restart the failed
acquisition phase under the same run plan. A malformed or hash-mismatched
artifact remains quarantined and must not be renamed or substituted.

For a same-date replacement artifact, use its distinct artifact hash and a new
run key. Never rewrite the prior artifact identity or prior qualification
decisions.

## Mapping And Duplicate Resolution

Mapping or duplicate-product failures remain quarantined. Do not edit
qualification decisions or publication snapshots.

Use the read-only coverage and exact-mapping planner:

```powershell
npm run pricing:market:coverage
node scripts/audits/tcgplayer_market_exact_mapping_plan_v1.mjs `
  --source-run-id=<verified-source-sync-run-id> `
  --coverage-gaps=<coverage-audit-directory>/coverage_gaps.jsonl `
  --out-root=artifacts/market_pricing_product_v1/exact_mapping_plan
```

Only collision-free exact candidates may enter the bounded canon-maintenance
apply command. Ambiguous set authority, multiple matching source products,
missing printed number, target ownership, and special-print evidence remain
blocked with their deterministic reason.

## API Or Client Failure

If the database health check passes but a product surface disagrees:

1. Stop rollout expansion.
2. Preserve the failing detail or batch API payload and printing GV-ID.
3. Verify detail/batch parity through the shared RPC.
4. Resolve the payload `provenance_id` through
   `get_market_price_trace_v1` using service-role access.
5. Compare the rendered amount to the API `market_close`, snapshot
   `market_price`, qualification decision, source observation, and artifact
   hash.

Do not work around an API failure with a direct warehouse read, client-side
freshness logic, a parent fallback, or a supporting price field.

## Operations Webhook Failure

On the production host inspect the exact failed units:

```bash
sudo systemctl status grookai-tcgplayer-market-pipeline.service
sudo systemctl status grookai-operations-webhook@grookai-tcgplayer-market-pipeline.service.service
sudo journalctl -u grookai-tcgplayer-market-pipeline.service --since today
sudo journalctl -u grookai-operations-webhook@grookai-tcgplayer-market-pipeline.service.service --since today
```

Preserve the corresponding receipt under
`/var/lib/grookai/operations-notifications`. Restore the configured generic
webhook route in `/etc/grookai/tcgplayer-market-pricing.env`, then verify the
systemd package again:

```bash
bash deploy/scripts/verify-tcgplayer-market-pipeline-systemd.sh --canary
```

Do not suppress or bypass the `OnFailure` unit to make a scheduled cycle look
healthy.

## Historical Worker Coordination

Current-price publication owns the daily `08:15 UTC` window. Historical
backfill remains a separate run identity, runs at lower priority, and must
yield while the current-price pipeline is active. Historical completion cannot
block current publication and historical rows cannot modify current
qualification, publication pointers, or freshness semantics.

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
