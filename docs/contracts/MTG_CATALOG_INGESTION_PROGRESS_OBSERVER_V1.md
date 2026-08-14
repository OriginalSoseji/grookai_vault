# MTG Catalog Ingestion Progress Observer V1

## Purpose

The observer reports the state of a frozen MTG catalog ingestion execution from
its audit artifacts. It is operational visibility only. It has no authority to
control, resume, stop, repair, or mutate an ingestion run.

## Inputs

The required `--run-dir` points to an ingestion audit directory created by the
MTG canonical catalog ingestion orchestrator.

- `run_plan.json` is required and supplies the frozen selection and provenance.
- `progress.jsonl` is required and supplies append-only execution events.
- `state.json` is optional while executor initialization is incomplete.
- `failure.json` is optional and is expected only after a terminal failure.
- `summary.json` is optional and is expected only after normal completion.

The observer reads each file as a point-in-time snapshot. A final unterminated,
invalid JSONL fragment is treated as a concurrent append and ignored. Any
malformed line already terminated by a newline is a structural error.

## Reported State

The observer reports:

- frozen selected set count;
- unique completed, in-flight, deferred, remaining, retry, and failure counts;
- exact completed row totals from each completed event's frozen set plan;
- durable applied row totals for events marked `counts_toward_run_delta`;
- sets per hour and ETA derived from completed timestamps;
- latest complete event and its age;
- automatic set 1, set 25, and final gate states;
- source artifact presence, byte length, and SHA-256;
- reconciliation warnings;
- process liveness as `unknown` unless explicitly inspected.

## Process Inspection

Process inspection is disabled by default. With
`--inspect-process-liveness`, the observer may inspect the local process table
for an executor command containing both the orchestrator filename and exact run
directory. It never sends a signal, kills a process, or changes executor state.

The process result is advisory. Audit artifacts remain authoritative.

## Outputs

Without `--out-dir`, the observer emits only a concise console snapshot.

With `--out-dir`, it atomically creates:

- `snapshot.json`;
- `REPORT.md`;
- `artifact_hashes.json` containing SHA-256 hashes for both permanent outputs.

The output directory must not be the observed run directory or any descendant
of it.

## Invariants

- No database access.
- No network access.
- No Storage access.
- No release or visibility changes.
- No ingestion writes or executor control.
- No source audit artifact changes.
- Completed row counts come from frozen per-set plans, not estimates.
- Missing active-run terminal files are not failures.
- Duplicate or mismatched evidence is reported rather than silently discarded.

## Command

```powershell
node scripts/audits/mtg_catalog_ingestion_progress_observer_v1.mjs `
  --run-dir C:\path\to\active_run `
  --out-dir docs\audits\pricing\mtg_catalog_ingestion_progress_observer_v1\snapshot
```
