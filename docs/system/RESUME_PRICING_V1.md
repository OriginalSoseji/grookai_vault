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
- `docs/checkpoints/pricing/PRICING_CHECKPOINT_41_CANARY_OBSERVATION_AND_SOURCE_CONTINUITY_REPAIR.md`
- `docs/audits/pricing/mee_pricing_platform_production_v1/canary_observation_end_to_end_repair_20260731/REPORT.md`

Checkpoints 38 through 40 are historical pre-incident context. Checkpoint 41
supersedes their canary timestamps.

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
  `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-31-REPAIR3`
- publication run ID:
  `0c23045d-8141-4b9c-ba41-2f8c44522921`
- publication set ID:
  `78bbabbb-3968-4ad1-81db-00d4417cfcc4`
- activation:
  `2026-07-31T10:34:15.670Z`
- required 72-hour end:
  `2026-08-03T10:34:15.670Z`
- production commit:
  `416c4691d1c1d6be8a1461c148deebe627e813f8`
- observer policy source:
  `416c4691d1c1d6be8a1461c148deebe627e813f8`
- observer workflow:
  `72df4539e8698ed37276502b7a605f37c864ec26`

Final wrapper proof run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30626600755`

Current observer truth:

- status `observing`
- 100 current exact prices
- 100 positive USD prices
- zero stale rows
- zero missing provenance
- zero broken traces
- source health `healthy`
- source continuity `verified_no_change`
- zero terminal alerts
- observer policy V2 with zero pending, missing, unhealthy, extra, or duplicate
  run keys
- authenticated reads available
- anonymous reads denied
- zero findings

The timer is enabled and active. The next daily slot is
`2026-08-01T08:15:00Z`. The remaining expected slots are August 1, 2, and 3
at 08:15 UTC.

## Incident History

Do not count time from any earlier window.

- The July 28 canary window failed its first unattended source cycle.
- The July 29 replacement exposed source-resume and assignment-preparation
  runtime defects.
- The initial July 30 run completed its source warehouse but timed out during
  active-ask refresh.
- July 30 `REPAIR1` published and reconciled 100 rows but its outer health
  phase timed out.
- July 30 `REPAIR2` completed its activation but the July 31 unattended cycle
  invalidated that window.
- The July 31 observer first raised a false missing-slot alarm while source
  acquisition was still running.
- The real July 31 cycle then failed because the canary's Alolan Ninetales
  `Normal` subtype disappeared from the current TCGPlayer feed.
- The old retry classifier repeated that deterministic error three times after
  mistaking stack location `errors:538:14` for HTTP 538.
- Only July 31 `REPAIR3`, using canary V2, starts the active window.

Failed runs are permanent evidence. They must not be rewritten or treated as
passing activations.

## Current Proof

The valid replacement activation proved:

- read-only current-source continuity for all 100 exact canary identities
- verified reuse of the completed 540,870-row July 31 source warehouse
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

Observer policy V2 separately proves the scheduled source trigger and its
exact publication completion. Source triggers have a 90-minute tolerance and
on-time pipelines have a 480-minute completion grace. Pending work remains
`observing` until the grace expires.

## Pending Database Work

No migration was applied during the July 31 repair.

These post-canary migrations remain blocked:

- `20260728130000`
- `20260728133000`
- `20260730180000`

Do not apply any of them before the exact 72-hour observer gate passes.

## Invariants

- do not count a failed outer pipeline as canary time
- do not use publication start as scheduler-trigger evidence
- do not fail an on-time pipeline before completion grace expires
- do not retry deterministic canary-definition drift
- do not silently substitute a missing canary source identity
- do not modify the frozen production commit during a healthy window
- do not broaden beyond the fixed 100-printing canary
- do not apply post-canary migrations early
- do not enable anonymous pricing
- do not write canonical identity, Vault, or Grookai Value from the pipeline
- do not represent database publication as deployed client visibility
- do not publish inferred, ambiguous, stale, or non-exact prices

## Exact Next Gate

Wait through the nominal end `2026-08-03T10:34:15.670Z`.

If the August 3 slot is still running, allow its bounded 480-minute completion
grace. The workflow keeps observing and requires a terminal pass only after
that grace expires.

Use the first observer run at or after that timestamp. It must prove:

1. workflow conclusion `success`
2. observer status `passed`
3. at least 72 continuous hours
4. every expected daily source trigger matched its exact key within tolerance
5. every exact publication completed within grace
6. zero missing, duplicate, extra, or unhealthy scheduled run keys
7. zero terminal alerts
8. healthy completed source continuity
9. exactly 100 current exact positive-USD prices
10. zero stale prices
11. zero missing provenance
12. zero broken traces
13. authenticated access remains correct
14. anonymous access remains denied
15. a rollback target remains available

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
`docs/checkpoints/pricing/PRICING_CHECKPOINT_41_CANARY_OBSERVATION_AND_SOURCE_CONTINUITY_REPAIR.md`
and `docs/system/RESUME_PRICING_V1.md`. The only valid active canary began at
`2026-07-31T10:34:15.670Z` from production commit
`416c4691d1c1d6be8a1461c148deebe627e813f8` and cannot pass before
`2026-08-03T10:34:15.670Z` plus any bounded final-slot completion grace. Do not
count earlier failed windows, change the frozen production runtime, apply
pending migrations, broaden publication, or enable anonymous pricing. Inspect
the terminal policy V2 observer artifact and follow the fail-closed gate in
Checkpoint 41.
```
