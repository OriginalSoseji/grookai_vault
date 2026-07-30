# Pricing Checkpoint 40: Canary Runtime Scale Repair and Restart

## Status

Active time-gated release checkpoint.

The July 30 unattended source warehouse completed, but production-scale
active-ask refresh and health verification queries exposed two independent
runtime defects. Both defects are repaired, merged, deployed, and proven by a
clean replacement activation.

The valid replacement 72-hour window is now observing. It has not passed yet.
No post-canary migration or broader pricing rollout is authorized.

## Context

Checkpoint 39 restarted the canary after the July 29 source and assignment
runtime incident. Its replacement window did not survive the next unattended
production-scale cycle.

The July 30 source warehouse itself was healthy:

- 9,202 requests
- 540,633 source price rows
- zero source failures

The failure moved downstream. This distinction matters: the source retry and
assignment preparation repairs from Checkpoint 39 remain valid.

## Problem

### Active-ask refresh did not scale

The production database default statement timeout is two minutes. The
active-ask refresh inherited that default and selected a nested-loop plan over
the multi-million-row listing and assignment tables.

The initial scheduled pipeline therefore failed after the warehouse completed.

### Health proof evaluated historical scale

After the active-ask repair, the first replacement activation successfully:

- refreshed active asks
- selected 100 canary printings
- qualified 100
- wrote 100 snapshots
- activated the new publication
- reconciled every snapshot

Its outer pipeline still failed because health verification scanned all
historical publication snapshots against the 93-million-row daily source
observation table. That query was both too broad and semantically wrong for a
per-run activation decision.

## Risk

Without repair, every daily canary cycle could fail after completing a healthy
source warehouse. Retrying blindly could create additional publication sets
while leaving the outer run red, and a global health scan could become slower
as historical evidence grows.

The more serious governance risk was counting time from a partially failed
outer pipeline. A publication can be valid in the database while the release
activation remains invalid. The canary trust boundary requires all governed
phases to complete.

## Decision

### Active-ask worker

Apply the configured timeout to the database session, disable the
production-path nested-loop plan for this bounded materialization, and record
the effective session settings in artifacts.

### Health worker

Evaluate broken source-to-publication trace only for the selected publication
run. Apply and record a bounded database timeout. Historical publication
snapshots remain audit evidence but are not part of each activation's health
decision.

### Observer

Evaluate trace integrity only for the active publication pointer and require
the qualification run to match the pointer run.

### Canary clock

Discard both July 30 failed outer activations as canary windows. Start a new
72-hour clock only from the activation whose active-ask, publication, and
health phases all completed.

## Alternatives Rejected

### Increase every database timeout globally

Rejected because it would hide unbounded query plans and expand the failure
blast radius for unrelated workloads.

### Treat the intermediate publication as a valid restart

Rejected because its outer health phase failed. Database publication alone is
not a complete production activation.

### Keep the global historical trace scan

Rejected because canary health asks whether the selected run is internally
reconciled. Historical fleet-wide audits belong in a separate bounded process.

### Apply pending read-model migrations while repairing runtime

Rejected because the canary has not completed 72 continuous healthy hours.
Runtime repair does not waive the frozen release gate.

## Implemented Repairs

| Area | Pull request | Producing commit |
| --- | --- | --- |
| Active-ask runtime | `#122` | `294f1e2672162c2800113f17ff4afe9bc12ede04` |
| Run-scoped health | `#123` | `456306bdb2a335286d513c1d612a97a58a1f01cc` |
| Active-publication observer trace | `#124` | `a2267285a236e89330f3002ee567ddce991c4232` |
| Main workflow re-anchor | `#125` | `92147f8c0aa81d5ab89453a89c63f2871e86b626` |

All pull-request checks passed before merge.

The production checkout remains pinned to:

`456306bdb2a335286d513c1d612a97a58a1f01cc`

The observer source is independently pinned to:

`a2267285a236e89330f3002ee567ddce991c4232`

The observer source commit was not deployed over the production pipeline
commit.

## Replacement Activation Proof

Valid activation key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30-REPAIR2`

| Field | Value |
| --- | --- |
| Publication run ID | `421f40ab-2d2d-4411-a1b3-7420603c5b86` |
| Publication set ID | `5b016262-764b-4b05-9e1e-df15971d0a7d` |
| Activated at | `2026-07-30T18:17:48.625Z` |
| Required 72-hour end | `2026-08-02T18:17:48.625Z` |
| Source rows | `540,633` |
| Source failures | `0` |
| Selected / mapped / eligible | `100 / 100 / 100` |
| Decisions / snapshots / traced | `100 / 100 / 100` |
| Reconciliation mismatches | `0` |
| Broken traces | `0` |
| Current exact / parent | `100 / 99` |
| Required / succeeded phases | `5 / 5` |
| Health | `healthy` |

The active-ask refresh completed with a 20-minute session timeout and nested
loops disabled. The current active-ask result was zero rows, which is valid
for the available source evidence and does not alter the 100 market-close
publication rows.

## Initial Observer Proof

Workflow run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30571384711`

Result:

- workflow conclusion `success`
- observer status `observing`
- zero findings
- zero terminal alerts
- source health `healthy`
- source continuity `completed_sync`
- 100 current positive exact prices
- zero stale prices
- zero missing provenance
- zero broken traces
- authenticated read count 100
- anonymous execution and runtime denied
- rollback target available

No daily schedule slot was yet due when this first observation ran.

## Current Truths

- The July 28, July 29, and failed July 30 windows did not pass.
- The only active canary window began
  `2026-07-30T18:17:48.625Z`.
- The earliest valid completion time is
  `2026-08-02T18:17:48.625Z`.
- The production checkout and expected runtime SHA match.
- The tracked production checkout is clean.
- The pricing timer is enabled and active.
- Its next scheduled slot is `2026-07-31T08:15:00Z`.
- The stale failed service marker was cleared without launching another run.
- The fixed 100-printing canary remains the only authorized publication size.
- Anonymous pricing remains denied.
- No migration was applied during this repair.
- Post-canary migrations
  `20260728130000`, `20260728133000`, and `20260730180000`
  remain pending.
- No canonical identity, Vault, or Grookai Value write was introduced.

## Invariants

The following must never be broken:

- do not count time from any failed outer pipeline
- do not rewrite failed run history as successful
- do not represent database publication as complete release activation
- do not run global historical trace scans inside per-run health decisions
- do not deploy the observer source over the frozen production pipeline commit
- do not change code or runtime configuration during a healthy 72-hour window
- do not apply post-canary migrations before the exact time gate passes
- do not broaden beyond the fixed 100-printing signed-in canary
- do not enable anonymous pricing before licensing and display authority pass
- do not allow pricing cycles to write canonical identity, Vault, or modeled
  value state

## Residual Risk

The repaired health query completed in approximately eleven minutes on the
current production volume. It remains inside the governed 20-minute database
timeout and the eight-hour systemd phase envelope.

This duration must be observed across the daily cycles. It does not justify a
mid-window optimization while the query remains healthy. A timeout or severe
regression is a new incident and must stop the window.

## Permanent Evidence

Audit root:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_runtime_repair_20260730/`

It contains:

- `initial_scheduled_failure/`
- `repair1_failed_outer_health/`
- `replacement_activation/`
- `replacement_observer_initial/`
- `REPORT.md`
- `artifact_hashes.json`

Secrets were excluded and the permanent artifact tree was scanned before
commit.

## Exact Next Gate

Allow the timer and observer to run through:

`2026-08-02T18:17:48.625Z`

Use the first observer run at or after that timestamp. Require:

1. workflow conclusion `success`
2. observer status `passed`
3. at least 72 continuous observed hours
4. every expected daily slot matched within tolerance
5. zero unhealthy scheduled runs
6. zero terminal alerts
7. healthy completed source continuity
8. exactly 100 current exact prices
9. 100 positive USD prices
10. zero stale prices
11. zero missing provenance
12. zero broken traces
13. correct authenticated access
14. denied anonymous access
15. an available rollback publication

If any condition fails, preserve the artifacts and stop. If all pass, freeze
and hash the final observer proof, then begin the already frozen post-canary
migration and deployment sequence from current `main`.
