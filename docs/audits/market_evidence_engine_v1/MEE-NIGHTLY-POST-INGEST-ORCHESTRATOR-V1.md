# MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1

## Result

Plan-plus-worker package created.

This package designs the automated post-ingest workflow that runs after acquisition. It deliberately excludes acquisition, provider calls, source fetches, public pricing, app-visible pricing, price rollups, identity writes, vault writes, and image/storage writes.

## Why This Exists

The MEE foundation is now broad enough that nightly acquisition cannot be the only automation point. After evidence is stored, Grookai needs a deterministic post-ingest path for lifecycle projection, candidate cleanup classification, cleanup event seeding, internal readbacks, blocker-policy closeout, and final publication-gate recheck.

## Planned Phases

1. preflight lock and context
2. acquisition completion readback
3. lifecycle projection plan
4. lifecycle projection apply gate
5. candidate cleanup classification
6. cleanup event seed gate
7. internal readbacks
8. blocker-policy closeout
9. publication-gate recheck
10. final report

## Boundary Proof

- DB writes: false for this package
- provider calls: false
- source fetches: false
- function invocation: false
- public pricing: false
- app-visible pricing: false
- public price rollups: false
- identity/card/vault/image writes: false
- migrations: false
- global apply: false

## Artifacts

- `docs/contracts/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md`
- `docs/runbooks/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md`
- `docs/plans/market_evidence_engine_v1/MEE_NIGHTLY_POST_INGEST_ORCHESTRATOR_V1.md`
- `docs/plans/market_evidence_engine_v1/mee_nightly_post_ingest_orchestrator_v1_script_plan.sh`
- `scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs`
- `docs/sql/mee_nightly_post_ingest_orchestrator_v1_preflight.sql`
- `docs/sql/mee_nightly_post_ingest_orchestrator_v1_readback.sql`
- `deploy/systemd/grookai-mee-post-ingest.service.candidate`
- `deploy/systemd/grookai-mee-post-ingest.timer.candidate`
- `docs/audits/market_evidence_engine_v1/MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1/manifest.json`
- `docs/audits/market_evidence_engine_v1/MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1/report.json`
- `tests/contracts/mee_nightly_post_ingest_orchestrator_v1.test.mjs`

## Verification

- `node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run`
- `node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run --execute-readbacks`
- `node --test tests/contracts/mee_nightly_post_ingest_orchestrator_v1.test.mjs`

The readback path completed with no findings and no writes.

## Next Real Step

Install the post-ingest systemd candidate on the droplet after confirming the repo path and env file. Keep `MEE_POST_INGEST_ALLOW_INTERNAL_WRITES=0` until the first unattended readback-only overnight run is clean.
