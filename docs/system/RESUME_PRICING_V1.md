# RESUME_PRICING_V1

## Purpose

This file restarts Production V1 pricing work without relying on chat history.
It records the current operational gate, frozen scope, active production
commit, and exact next action.

The Market Evidence Engine remains an internal evidence subsystem. It does not
authorize inferred prices or bypass the exact TCGPlayer publication contract.

## Governing Sources

Read these first:

- `docs/checkpoints/pricing/PRICING_CHECKPOINT_INDEX.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_36_PRODUCTION_V1_FEATURE_FREEZE.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_38_CANARY_AUTOMATION_AND_POST_72H_HANDOFF.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_39_CANARY_INCIDENT_REPAIR_AND_RESTART.md`
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_40_CANARY_RUNTIME_SCALE_REPAIR_AND_RESTART.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/canary_runtime_repair_20260730/REPORT.md`

Checkpoint 38 is historical pre-incident context. Checkpoints 39 and 40
supersede its canary timestamps.

## Frozen Production V1 Contract

Production V1 is:

- English Pokemon raw singles
- exact canonical printing, language, and finish
- TCGPlayer `marketPrice` as the market close
- no Grookai Value inference
- deterministic exclusion of ambiguous or unsupported rows
- one governed shared pricing read model
- signed-in publication first
- anonymous publication blocked until licensing and display authority pass

Japanese cards, slabs, sealed products, proprietary valuation, sold-history
weighting, and other TCGs are outside Production V1.

## Current Operational State

The current gate is a fixed 100-printing signed-in production canary.

Valid replacement activation:

- run key:
  `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30-REPAIR2`
- publication run ID:
  `421f40ab-2d2d-4411-a1b3-7420603c5b86`
- publication set ID:
  `5b016262-764b-4b05-9e1e-df15971d0a7d`
- activation:
  `2026-07-30T18:17:48.625Z`
- required 72-hour end:
  `2026-08-02T18:17:48.625Z`
- production commit:
  `456306bdb2a335286d513c1d612a97a58a1f01cc`
- observer source:
  `a2267285a236e89330f3002ee567ddce991c4232`

Initial observer run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30571384711`

Initial observer truth:

- status `observing`
- 100 current exact prices
- 100 positive USD prices
- zero stale rows
- zero missing provenance
- zero broken traces
- source health `healthy`
- source continuity `completed_sync`
- zero terminal alerts
- authenticated reads available
- anonymous reads denied
- zero findings

The timer is enabled and active. The next daily slot after the replacement
activation is `2026-07-31T08:15:00Z`.

## Incident History

Do not count time from any earlier window.

- The July 28 canary window failed its first unattended source cycle.
- The July 29 replacement exposed source-resume and assignment-preparation
  runtime defects.
- The initial July 30 run completed its source warehouse but timed out during
  active-ask refresh.
- July 30 `REPAIR1` published and reconciled 100 rows but its outer health
  phase timed out.
- Only July 30 `REPAIR2` completed active-ask refresh, publication, and health.

Failed runs are permanent evidence. They must not be rewritten or treated as
passing activations.

## Current Proof

The valid replacement activation proved:

- completed source warehouse with 540,633 price rows and zero source failures
- 100 selected, mapped, eligible, decided, snapshotted, and traced rows
- zero reconciliation mismatches
- zero exclusions, quarantines, delays, or suppressions
- five of five required publication phases succeeded
- current exact count 100
- current parent count 99
- zero broken source-to-publication traces
- no canonical identity or Vault writes

The active-ask refresh produced zero current rows. That is a valid result for
the available ask evidence and is separate from TCGPlayer market-close
publication.

## Pending Database Work

No migration was applied during the July 30 runtime repair.

These post-canary migrations remain blocked:

- `20260728130000`
- `20260728133000`
- `20260730180000`

Do not apply any of them before the exact 72-hour observer gate passes.

## Invariants

- do not count a failed outer pipeline as canary time
- do not modify the frozen production commit during a healthy window
- do not deploy observer-only code over the production pipeline commit
- do not broaden beyond the fixed 100-printing canary
- do not apply post-canary migrations early
- do not enable anonymous pricing
- do not write canonical identity, Vault, or Grookai Value from the pipeline
- do not represent database publication as deployed client visibility
- do not publish inferred, ambiguous, stale, or non-exact prices

## Exact Next Gate

Wait through `2026-08-02T18:17:48.625Z`.

Use the first observer run at or after that timestamp. It must prove:

1. workflow conclusion `success`
2. observer status `passed`
3. at least 72 continuous hours
4. every expected daily slot matched
5. zero unhealthy scheduled runs
6. zero terminal alerts
7. healthy completed source continuity
8. exactly 100 current exact positive-USD prices
9. zero stale prices
10. zero missing provenance
11. zero broken traces
12. authenticated access remains correct
13. anonymous access remains denied
14. a rollback target remains available

If any condition fails, preserve evidence and stop.

If all conditions pass:

1. freeze and hash the final observer artifact
2. run migration-history and schema-drift preflight
3. build the integration candidate from current `origin/main`
4. carry only reviewed Production V1 pricing changes
5. run full contract and product-surface suites
6. apply the frozen post-canary migration package atomically
7. read back schema, grants, RLS, function definitions, and governed rows
8. deploy integrated web and Flutter clients
9. prove all 17 supported surfaces use the shared read model
10. run fresh shadow publication and provenance reconciliation
11. activate full signed-in publication only after all gates pass
12. observe seven unattended full-production cycles
13. produce the final Production V1 report
14. keep anonymous pricing blocked until its separate licensing gate passes

## Resume Prompt

```md
Continue Production V1 pricing from
`docs/checkpoints/pricing/PRICING_CHECKPOINT_40_CANARY_RUNTIME_SCALE_REPAIR_AND_RESTART.md`
and `docs/system/RESUME_PRICING_V1.md`. The only valid active canary began at
`2026-07-30T18:17:48.625Z` from production commit
`456306bdb2a335286d513c1d612a97a58a1f01cc` and cannot pass before
`2026-08-02T18:17:48.625Z`. Do not count earlier failed windows, change the
frozen production runtime, apply pending migrations, broaden publication, or
enable anonymous pricing. Inspect the first observer run at or after the exact
end time and follow the fail-closed gate in Checkpoint 40.
```
