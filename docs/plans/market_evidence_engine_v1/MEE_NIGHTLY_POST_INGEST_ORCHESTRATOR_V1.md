# MEE-NIGHTLY-POST-INGEST-ORCHESTRATOR-V1

## Scope

Plan-only package for the automated nightly post-ingest workflow. This package designs the job that runs after acquisition and keeps MEE foundation work from drifting back into coverage or public pricing.

## What This Automates

- lifecycle projection for newly ingested internal evidence
- candidate cleanup classification
- append-only cleanup event seeding
- internal readbacks
- blocker-policy closeout
- derived lifecycle rollup summary refresh
- final non-public publication-gate recheck

## What This Does Not Automate

- eBay acquisition
- provider calls
- source fetches
- public pricing
- app-visible pricing
- price rollups
- identity, vault, card print, or image writes

## Orchestrator Design

The acquisition worker remains separate. The post-ingest orchestrator starts only after acquisition completes and must be able to run even on days where no provider calls are available.

Planned command:

```bash
node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --run
```

Dry-run command:

```bash
node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run
```

## Phase Guards

Each phase writes or reads its own package manifest. The next phase reads the previous manifest and stops if counts, hashes, or boundary flags do not match.

The phase guard model is:

- preflight must prove a single active post-ingest run key
- lifecycle package must prove ordered lifecycle events only
- cleanup package must prove no conflicting cleanup events exist
- readback package must prove public-boundary rows are zero
- blocker closeout must prove every blocker has a policy lane
- derived refresh must update only `mv_market_evidence_lifecycle_rollup_summary_v1`
- publication gate recheck must keep `publishable=false`, `app_visible=false`, and `market_truth=false`

## Systemd Plan

Install a separate post-ingest timer instead of overloading the acquisition timer.

- acquisition timer: `03:15`
- post-ingest timer: `03:35`
- randomized delay: 10 minutes
- timeout: 3 hours
- service user: `grookai`
- working directory: `/opt/grookai_vault_mee_nightly`
- env file: `/etc/grookai/mee-nightly.env`

## Idempotency Rules

- Use a run key derived from the acquisition run key plus `post-ingest`.
- Stop by default if target lifecycle rows or cleanup events already exist for the same source rows.
- Allow future skip-existing mode only if readbacks prove exact package identity.
- Use append-only events for cleanup decisions.
- Never mutate raw evidence.

## Plan Status

Ready as a design package. No database changes, provider calls, source fetches, function invocations, or public pricing changes are included.
