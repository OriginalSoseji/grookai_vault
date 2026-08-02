# Canary Source-Gap REPAIR5 Audit

## Scope

This audit preserves the production evidence for the bounded source-gap
repair, the recovery activation that exposed a live artifact wiring defect,
the corrected replacement activation, and the first read-only observer run.

No migration was applied. No canonical identity, Vault, modeled-value, or
anonymous-access boundary changed.

## Producing Commits

| Purpose | Commit |
| --- | --- |
| Bounded source-gap policy | `08bfddc15f4f19777ea1ed588f84bbd908ea770b` |
| Live coverage-result repair and REPAIR5 runtime | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Main observer workflow pin | `3aaf580f3ea40babe55854a833ac535c59ca417c` |

## REPAIR4 Recovery

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-02-REPAIR4` performed a fresh
current-source acquisition and restored all 100 prices. TCGPlayer product
`168245`, subtype `Holofoil`, was present again, proving the earlier absence
was a transient upstream feed condition rather than a missing canonical card
or mapping.

REPAIR4 completed healthy, but its publication artifacts did not include the
source-coverage fields or `canary_source_outcomes.jsonl`. The publication was
valid for current product availability but was not accepted as the observer
anchor.

## REPAIR5 Activation

REPAIR5 reused the fresh completed source and skipped source ingestion.

| Field | Result |
| --- | --- |
| Run key | `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-02-REPAIR5` |
| Runtime commit | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Source sync run | `6b0a7d21-9023-4ff3-ada3-512f23005899` |
| Source rows | `541472` |
| Expected / resolved / source missing | `100 / 100 / 0` |
| Decisions / snapshots / traced | `100 / 100 / 100` |
| Reconciliation mismatches | `0` |
| Coverage outcomes | `100 resolved` |
| Publication run ID | `01610cfc-df72-412f-bc21-a526044d35bc` |
| Publication set ID | `f7996805-24f3-4da4-9ea7-00acb59fc16a` |
| Activated at | `2026-08-02T22:29:17.856Z` |
| Health | `healthy`, no findings |
| Current exact / parent prices | `100 / 99` |
| Broken traces | `0` |
| Canonical / Vault writes | `false / false` |

The publication artifact hashes were recomputed on the production host and
matched `publication_artifact_hashes.json` exactly.

## Initial Observer

GitHub Actions run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30770886697`

Artifact ID: `8840490633`

The read-only V3 observer reported:

- status `observing`
- observed duration `0.318 / 72` hours
- exact and positive USD prices `100 / 100`
- authenticated read count `100`
- anonymous runtime denied with `42501`
- missing provenance `0`
- stale prices `0`
- broken traces `0`
- terminal alerts `0`
- source health `healthy`
- rollback target available
- findings `0`

## Window

- start: `2026-08-02T22:29:17.856Z`
- nominal 72-hour end: `2026-08-05T22:29:17.856Z`
- expected unattended source slots: August 3, 4, and 5 at `08:15 UTC`
- observer cadence: every six hours at minute 17
- final-slot publication completion grace: 480 minutes

The window is active and has not passed.

## Artifact Layout

- `repair4_recovery/`: recovery pipeline, publication, reconciliation, and
  health evidence
- `repair5_activation/`: distinct pipeline and publication plans, pipeline
  state, coverage outcomes, publication reconciliation, hashes, and health
  evidence
- `observer_run_30770886697/`: first V3 observer plan, evidence, summary,
  report, and hashes

Secrets are excluded.

`ARTIFACT_HASHES.sha256` covers every preserved source artifact in the audit
subdirectories.

## Operational Risks

- the production host is at 97 percent disk utilization with approximately
  4.6 GB free
- the source ingest artifact is approximately 749 MB per full cycle
- the current health query takes approximately 11 minutes on production data

Do not delete this audit evidence. Define and prove a retention policy before
the remaining disk margin becomes an outage risk.
