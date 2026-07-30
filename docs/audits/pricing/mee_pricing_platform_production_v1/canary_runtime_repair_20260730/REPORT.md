# TCGPlayer Market Canary Runtime Repair - 2026-07-30

## Result

The production-scale active-ask refresh and health verification defects are
repaired. A new 100-printing canary activation completed from the frozen
production commit and the first read-only observer run returned `observing`
with no findings.

This report does not claim that the 72-hour canary passed. The valid
replacement observation window began at `2026-07-30T18:17:48.625Z` and ends
at `2026-08-02T18:17:48.625Z`.

## Incident Sequence

### Initial scheduled failure

Run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30`

The source warehouse completed with:

- 9,202 source requests
- 540,633 source price rows
- 0 failed source rows

The active-ask refresh then exceeded the production database's two-minute
default statement timeout. The failed run is preserved under
`initial_scheduled_failure/`.

### First repair activation

Run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30-REPAIR1`

The repaired active-ask refresh completed, and the 100-printing publication
completed and reconciled. The outer pipeline still failed because the health
worker used a global source-to-publication trace query and inherited a
two-minute query timeout.

This activation is incident evidence only. It does not start a valid canary
window. Its outer pipeline artifacts are preserved under
`repair1_failed_outer_health/`.

### Valid replacement activation

Run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30-REPAIR2`

Frozen production commit:

`456306bdb2a335286d513c1d612a97a58a1f01cc`

The source warehouse was not re-downloaded. The replacement activation reused
the completed source evidence and ran the repaired downstream phases.

| Phase | Started | Finished | Result |
| --- | --- | --- | --- |
| Active-ask refresh | `18:06:00Z` | `18:09:02Z` | completed |
| Publication | `18:09:02Z` | `18:17:56Z` | completed |
| Health | `18:17:56Z` | `18:28:56Z` | healthy |

Reconciliation:

| Check | Result |
| --- | ---: |
| Selected | 100 |
| Mapped | 100 |
| Eligible | 100 |
| Decisions | 100 |
| Snapshots | 100 |
| Traced snapshots | 100 |
| Excluded | 0 |
| Quarantined | 0 |
| Delayed | 0 |
| Suppressed | 0 |
| Reconciliation mismatches | 0 |

Production identifiers:

- publication run ID:
  `421f40ab-2d2d-4411-a1b3-7420603c5b86`
- publication set ID:
  `5b016262-764b-4b05-9e1e-df15971d0a7d`
- activation timestamp:
  `2026-07-30T18:17:48.625Z`
- source run:
  `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-30-warehouse`
- source price rows: 540,633
- source failures: 0

The active-ask materialization legitimately produced zero current rows for
the source evidence available at the time. Zero active asks is valid and is
kept separate from the 100 TCGPlayer market-close publication rows.

## Repairs

### Active-ask refresh

Pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/122`

Merged pricing commit:

`294f1e2672162c2800113f17ff4afe9bc12ede04`

The worker now applies the configured database statement timeout to its own
session, disables the production-scale nested-loop planner path, and records
the effective session settings in its artifact.

### Run-scoped health verification

Pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/123`

Frozen production commit:

`456306bdb2a335286d513c1d612a97a58a1f01cc`

The health worker now scopes broken-trace verification to the selected
publication run, applies a bounded database timeout to its session, and
records that setting. It no longer scans every historical publication
snapshot when deciding whether one activation is healthy.

### Observer current-publication trace

Pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/124`

Frozen observer source commit:

`a2267285a236e89330f3002ee567ddce991c4232`

The observer now checks broken traces only for the active publication pointer
and requires the qualification run to match the pointer run.

### Observer re-anchor

Pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/125`

Merged `main` commit:

`92147f8c0aa81d5ab89453a89c63f2871e86b626`

The workflow is pinned to the valid replacement activation, the frozen
production commit, the frozen observer source, and the new exact 72-hour
window.

## Initial Observer Proof

GitHub Actions run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30571384711`

| Check | Result |
| --- | ---: |
| Workflow conclusion | success |
| Observer status | `observing` |
| Observed hours | 0.375 |
| Exact current prices | 100 |
| Positive USD prices | 100 |
| Missing provenance | 0 |
| Stale prices | 0 |
| Broken traces | 0 |
| Source health | healthy |
| Source continuity | completed_sync |
| Terminal alerts in window | 0 |
| Authenticated read rows | 100 |
| Anonymous execution | denied |
| Anonymous runtime | denied, `42501` |
| Findings | 0 |

The empty expected-schedule-slot list is correct for this first observation
because no daily `08:15 UTC` slot had occurred after the replacement
activation.

## Runtime State

After the replacement proof:

- production checkout is pinned to
  `456306bdb2a335286d513c1d612a97a58a1f01cc`
- the configured expected production commit matches that SHA
- the pricing timer is enabled and active
- the next scheduled cycle is `2026-07-31T08:15:00Z`
- the stale failed service marker was reset without starting another cycle
- the production checkout has no tracked changes

The health proof took approximately eleven minutes on the production data
volume. It passed inside the governed 20-minute database timeout. This is a
residual performance risk to observe, not a reason to modify the frozen
canary while it remains healthy.

## Database Boundary

No migration was applied during this repair.

The post-canary migrations remain pending:

- `20260728130000`
- `20260728133000`
- `20260730180000`

No canonical identity, Vault, Grookai Value, approval, or anonymous-publication
boundary was changed.

## Exact Next Gate

Allow the observer and daily pricing timer to run without code or
configuration changes through `2026-08-02T18:17:48.625Z`.

The first observer run at or after that timestamp must return `passed` with:

- all expected daily slots matched
- zero unhealthy scheduled runs
- zero terminal alerts
- exactly 100 current exact prices
- 100 positive USD prices
- zero stale prices
- zero missing provenance
- zero broken traces
- healthy completed source continuity
- authenticated access retained
- anonymous access denied
- a rollback publication still available

If any check fails, preserve the evidence and stop. Do not apply the
post-canary migration package.
