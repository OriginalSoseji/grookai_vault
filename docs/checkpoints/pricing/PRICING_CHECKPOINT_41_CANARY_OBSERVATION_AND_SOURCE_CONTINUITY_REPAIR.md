# Pricing Checkpoint 41: Canary Observation and Source Continuity Repair

## Status

Active time-gated release checkpoint.

The July 31 unattended cycle invalidated the July 30 replacement window. The
observer first raised a false early alarm while source acquisition was still
running, and the underlying scheduled pipeline later failed for a genuine
canary-source continuity defect. Both paths are repaired, deployed, and proven
against a new exact 100-printing activation.

The replacement window is observing. It has not passed 72 hours. No
post-canary migration or broader pricing rollout is authorized.

## Context

Checkpoint 40 repaired production-scale active-ask and health queries and
started the July 30 `REPAIR2` window. The next unattended source acquisition
started on schedule at `2026-07-31T08:15:01Z` and legitimately ran for about
89 minutes.

GitHub observer run `30619343064` executed at `09:17Z`. The V1 observer looked
only for a publication run near the schedule slot. Because publication starts
after source acquisition, it treated an in-progress pipeline as a missing
pipeline.

The source warehouse then completed successfully, but publication found that
one fixed canary source identity no longer existed in the current TCGPlayer
feed.

## Problem

### Observer conflated trigger and completion

Publication start time was being used as proof of the 08:15 scheduler trigger.
That is not valid for a pipeline whose source acquisition can run for more than
an hour. The observer also declared the slot missing before its own 90-minute
trigger tolerance had expired.

### One exact source subtype disappeared

Canary V1 ordinal 7 selected Alolan Ninetales SM128 `Normal`:

`tcgplayer:168245:normal`

The July 31 current feed exposed only `Holofoil` for product `168245`. The
publication worker correctly failed closed when the frozen Normal identity
resolved zero rows.

### Retry classification read a stack location as HTTP status

The failure was deterministic canary-definition drift. The old classifier had
a bare `5xx` regular expression, so JavaScript stack location `errors:538:14`
was interpreted as HTTP 538. The scheduled runner repeated the expensive
pipeline three times before stopping.

### Final-day workflow contradicted completion grace

After policy V2 introduced an eight-hour completion grace, the GitHub wrapper
still required a pass and stopped observing after six hours beyond the nominal
window end. A slow but on-time final slot could therefore produce another
false terminal failure.

## Risk

Without repair, long healthy source acquisitions could repeatedly raise false
missing-slot incidents. A disappeared subtype could also waste source and
database work through invalid retries. Most importantly, carrying the July 30
window forward would claim continuous operation across a real failed daily
cycle.

The fixed canary must remain exact and current without turning ordinary source
continuity changes into silent substitutions. Replacement requires prior
verification, immutable evidence, and a new activation window.

## Decision

### Separate source trigger from publication completion

Observer policy V2 matches exact daily keys:

- `TCGPLAYER-MARKET-SCHEDULE-CANARY-YYYY-MM-DD-warehouse`
- `TCGPLAYER-MARKET-SCHEDULE-CANARY-YYYY-MM-DD-publication`

The source trigger must begin within 90 minutes of 08:15 UTC. An on-time source
run may remain pending for up to 480 minutes while source, active-ask,
publication, and health phases finish. Pending work is `observing`, not failed.

### Replace only the unstable verified child

Canary V2 preserves 100 unique printings and changes only ordinal 7 to the
same canonical Alolan Ninetales card's Holofoil child:

`tcgplayer:168245:holofoil`

That printing was already exact-mapped, image-verified, and shadow-verified in
the same frozen source shadow cycle used by V1. V1 remains immutable evidence.

### Preflight current source continuity before activation

Timer installation in canary mode now runs a read-only continuity check over
all exact canary printing IDs. Missing, duplicate, or identity-drifted rows
block activation before the timer is enabled.

### Make deterministic drift non-retryable

Canary source-identity absence and identity drift are classified as
`non_retryable_canary_definition_drift`. HTTP 5xx detection requires explicit
HTTP, status, response, or standard server-error context. Bare stack numbers
never authorize retry.

### Restart the clock

The July 30 window is failed history. Only the fully reconciled July 31
`REPAIR3` activation starts the replacement 72-hour window.

### Keep final-slot grace observable

The workflow does not require `status: passed` until the 480-minute completion
grace has expired. It retains another six-hour observation interval so a later
scheduled observer can record the terminal result instead of skipping it.

## Alternatives Rejected

### Ignore the early observer failure

Rejected because the same evidence-model defect would recur whenever source
acquisition outlasted the observer's publication-only assumption.

### Re-add the disappeared Normal row from historical evidence

Rejected because historical presence does not prove current source
continuity. Publication must use current exact evidence.

### Select an unverified replacement

Rejected because canary membership is a reviewed exact-printing boundary. The
Holofoil child was acceptable only because its mapping, image, source subtype,
and prior shadow proof already existed.

### Increase retries or tolerate zero-row selection

Rejected because retries cannot repair deterministic definition drift, and a
zero-row canary identity must fail closed.

### Preserve the July 30 timer

Rejected because the July 31 daily scheduled cycle failed. A 72-hour canary is
continuous operational evidence, not accumulated healthy time around failures.

## Implementation And Release

| Area | Pull request | Commit |
| --- | --- | --- |
| Source continuity, policy V2, canary V2, retry repair | `#130` | `416c4691d1c1d6be8a1461c148deebe627e813f8` |
| Main observer re-anchor | `#131` | `a0a888e2788961dd82cc952f2516cfb959312ceb` |
| Terminal completion grace | `#132` | `72df4539e8698ed37276502b7a605f37c864ec26` |

Every pull request passed its required GitHub checks before merge. The source
repair passed the complete repository shipcheck, including 892 contracts, web
typecheck/lint/build, Flutter analysis, and 310 Flutter tests. Main observer
changes independently passed the current main-branch shipcheck and 531 Flutter
tests.

## Failed Cycle Proof

| Field | Value |
| --- | --- |
| GitHub failed observer | `30619343064` |
| Failed production run key | `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-31` |
| Producing commit | `456306bdb2a335286d513c1d612a97a58a1f01cc` |
| Source trigger | `2026-07-31T08:15:01Z` |
| Source completion | `2026-07-31T09:43:45Z` |
| Source rows | `540,870` |
| Missing source identity | `tcgplayer:168245:normal` |
| Attempts | `3` |
| Recorded old classification | `retryable_source_or_transport_failure` |
| Final service state | `failed` |

The failed run did not activate a replacement publication. The prior 100-row
publication remained active until the governed V2 replacement succeeded.

## Replacement Activation Proof

Read-only continuity preflight passed before scheduling:

- expected count `100`
- candidate rows `100`
- exact source identities `100`
- missing `0`
- duplicates `0`
- identity mismatches `0`

Valid activation key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-31-REPAIR3`

| Field | Value |
| --- | --- |
| Production commit | `416c4691d1c1d6be8a1461c148deebe627e813f8` |
| Canary ID | `TCGPLAYER_MARKET_CANARY_100_V2` |
| Canary definition SHA-256 | `861b9dd97baaa0c93a6bcdd94c5f9ef903388bbc87a31923cfee3fbeb8cfc3d2` |
| Publication run ID | `0c23045d-8141-4b9c-ba41-2f8c44522921` |
| Publication set ID | `78bbabbb-3968-4ad1-81db-00d4417cfcc4` |
| Activated at | `2026-07-31T10:34:15.670Z` |
| Required 72-hour end | `2026-08-03T10:34:15.670Z` |
| Selected / eligible | `100 / 100` |
| Decisions / snapshots / traced | `100 / 100 / 100` |
| Current exact / parent | `100 / 99` |
| Required / succeeded phases | `5 / 5` |
| Reconciliation mismatches | `0` |
| Broken traces | `0` |
| Outer attempts | `1` |
| Health | `healthy` |

The source phase was `skipped_no_change` and explicitly inherited the verified
completed July 31 source run. No stale or historical subtype was synthesized.

## Observer Proof

Final workflow wrapper proof:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30626600755`

Result:

- workflow conclusion `success`
- observer policy `TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V2`
- observer status `observing`
- zero findings
- zero expected slots yet because the window starts after the July 31 slot
- 100 current exact prices
- 100 positive USD prices
- zero stale prices
- zero missing provenance
- zero broken traces
- source health `healthy`
- source continuity `verified_no_change`
- authenticated read count 100
- anonymous execution denied with `42501`
- rollback target available
- zero artifact hash mismatches

## Current Truths

- All canary windows through July 30 are failed historical evidence.
- The only active window began `2026-07-31T10:34:15.670Z`.
- The earliest nominal completion is `2026-08-03T10:34:15.670Z`.
- Expected unattended slots are August 1, 2, and 3 at 08:15 UTC.
- The production runner is pinned to `416c4691...` and uses canary V2.
- The timer is enabled and waits for the August 1 08:15 UTC slot.
- Main observer wrapper is merged at `72df4539...`.
- Anonymous pricing remains denied.
- No migration was applied during this repair.
- Post-canary migrations remain pending.
- No canonical identity, Vault, or Grookai Value write was introduced.

## Invariants

The following must never be broken:

- do not use publication start as scheduler-trigger evidence
- do not fail an on-time in-progress pipeline before completion grace expires
- do not count time across a failed unattended cycle
- do not rewrite or delete failed cycle evidence
- do not silently substitute a disappeared canary source identity
- do not retry deterministic canary-definition drift
- do not interpret bare stack line numbers as HTTP status codes
- do not enable the canary timer without exact current-source continuity proof
- do not change production code, canary membership, or runtime configuration
  during the healthy replacement window
- do not apply post-canary migrations before a terminal passing artifact
- do not broaden beyond the fixed signed-in 100-printing canary
- do not enable anonymous pricing before licensing and display authority pass
- do not allow pricing cycles to write canonical identity, Vault, or modeled
  value state

## Residual Risk

The replacement health query completed in approximately 17 minutes 54
seconds, inside its governed 20-minute statement timeout. It was actively
reading data and did not deadlock. This is close enough to the boundary that
each unattended cycle must be observed. A timeout is a new incident and
invalidates the window; it must not be papered over by increasing global
timeouts mid-window.

Canary membership can drift when a source removes a subtype. The new preflight
detects that before timer activation, but daily continuity still relies on the
publication worker failing closed if source state changes after preflight.

## Permanent Evidence

Audit root:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_observation_end_to_end_repair_20260731/`

It contains:

- failed GitHub observer artifacts from run `30619343064`
- failed scheduled-cycle summary, attempts, pipeline state, and error logs
- replacement activation summary, pipeline state, publication reconciliation,
  and health proof
- initial replacement observer artifacts from run `30625993116`
- final wrapper observer artifacts from run `30626600755`
- a report and full artifact hash manifest

Secrets are excluded.

## Exact Next Gate

Do not change the frozen runtime while the timer and observer run.

The terminal artifact must prove:

1. at least 72 continuous hours from `2026-07-31T10:34:15.670Z`
2. observer status `passed`
3. all August 1, 2, and 3 source triggers started within 90 minutes
4. each exact publication completed healthy within its 480-minute grace
5. zero missing, duplicate, extra, or unhealthy scheduled run keys
6. zero terminal alerts in the replacement window
7. healthy source continuity
8. exactly 100 current positive-USD exact prices
9. zero stale prices
10. zero missing provenance
11. zero broken traces
12. authenticated read count 100
13. anonymous access denied
14. rollback available

If a final slot is still pending at the nominal 72-hour end, allow its bounded
completion grace and use the later scheduled observer. If any condition fails,
preserve evidence and stop. If all pass, freeze and hash the terminal artifact,
then begin the already frozen post-canary migration and deployment sequence
from current `main`.
