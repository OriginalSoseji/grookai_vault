# Pricing Checkpoint 39: Canary Incident Repair and Restart

## Status

Active time-gated release checkpoint.

The original 72-hour Pricing Production V1 canary window is invalid. The
source-ingestion and publication-runtime defects that invalidated it have been
repaired, reviewed, merged, deployed, and migration-verified.

The replacement activation completed and reconciled from the frozen repaired
commit. The read-only GitHub observer is active on a new 72-hour window and
its first live observation is healthy. The window has not elapsed, so no
post-canary migration or broader rollout is authorized.

## Context

Checkpoint 38 recorded a healthy initial activation at:

`2026-07-28T08:40:15.793Z`

That window did not survive its first unattended source cycle. The observer
correctly failed closed after detecting:

- a terminal operations alert
- a latest current source run in `partial_success`
- unverified source continuity
- a later empty governed current read

The original window must never be resumed or represented as a passing
72-hour canary. Its evidence remains permanent incident history.

## Incident

### Source acquisition failure

The daily TCGCSV source acquisition encountered a transient TLS transport
failure (`curl` error 35) on one source endpoint. The worker preserved a
partial source run and the observer correctly classified source health as
critical.

The repair added bounded transient retries while retaining the request
ceiling, exact source evidence, failure payloads, and fail-closed behavior.
Legacy Supabase key fallbacks were also removed from the affected branch.

Repair pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/113`

Merged pricing commit:

`9827073a491047142aa7d1aae81e21f890e5a1d9`

### Publication runtime failure

The repaired source acquisition then completed, including the endpoint that
had failed. Publication did not complete.

The assignment preparation query exceeded its runtime envelope on the
production data volume. A scheduled retry reused the same warehouse run key.
The old no-change resume path mutated the completed source row to
`skipped_no_change` and replaced its completed counters. Publication then
rejected the changed frozen source provenance.

This exposed two separate defects:

1. a successful terminal source run was not immutable on same-key resume
2. assignment preparation used a planner path that did not scale to the
   production observation and assignment tables

The failed activation key was:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-29-REPAIR2`

The failure is preserved and must not be rewritten as successful.

## Repair Decision

The source worker now treats a successful terminal run key as immutable.
Exact same-key resumes return the existing source evidence without a provider
call or database mutation.

The publication worker now:

- uses one idempotent assignment preparation function
- applies the configured statement timeout to the live database session
- avoids a separate expensive missing-assignment count
- prepares only assignments absent from the governed assignment table

The database function now:

- materializes one exact source-run/day slice
- joins through exact external mappings
- uses an idempotent `not exists` boundary
- disables the pathological nested-loop planner path locally
- preserves service-role-only execution

Runtime repair pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/115`

Frozen producing commit:

`ffb2513fd530930dbfaee714b84df2358f7eaafc`

Migration:

`20260729190000_tcgplayer_market_assignment_prepare_runtime_repair_v1.sql`

Migration SHA-256:

`12149124D3A49659186A7D8BE543C55FCFA030CDDB14C3A31A5221CFD6512FED`

## Proof Before Production

The production-scale read-only and rollback-only proofs established:

| Proof | Result |
| --- | ---: |
| Old planner path | exceeded 90 seconds |
| Equivalent hash-plan read | 3.856 seconds |
| Full rollback-only assignment preparation | 33,432 rows in 15.510 seconds |
| Reconciled rows inside rollback transaction | 33,432 |
| Rows remaining after rollback | 0 |
| Idempotent replay against prior completed source | 0 rows in 11.365 seconds |
| Targeted contracts | 45 / 45 |
| Full contract suite | 879 / 879 |

Additional gates passed:

- Node syntax checks
- runtime health check
- release-secret packaging check
- no-legacy-key guard
- `git diff --check`
- migration compile inside a rolled-back transaction

## Production Migration Readback

The runtime migration was applied after the repaired commit was deployed.

Verified production truths:

- migration ledger contains exactly one
  `20260729190000_tcgplayer_market_assignment_prepare_runtime_repair_v1`
  row
- function is `security definer`
- function `search_path` is `public`
- function-local `enable_nestloop` is `off`
- `anon` cannot execute
- `authenticated` cannot execute
- `service_role` can execute
- the materialized exact source slice and observed-day guard are present

The deployed pricing checkout and expected runtime SHA are both:

`ffb2513fd530930dbfaee714b84df2358f7eaafc`

## Replacement Activation

Replacement scheduled run key:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-29-REPAIR3`

Started at:

`2026-07-29T19:04:26Z`

Frozen plan:

`/var/lib/grookai/market-pricing/TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-29-REPAIR3/scheduled_run_plan.json`

The plan proves:

- canary/live mode
- clean tracked worktree
- producing and expected SHA
  `ffb2513fd530930dbfaee714b84df2358f7eaafc`
- request ceiling `10000`
- bounded retry delays `60` and `300` seconds
- phase timeout `120` minutes
- database timeout `20` minutes
- expected canary count `100`
- source, qualification, snapshot, and publication writes authorized
- canonical identity, Vault, and modeled-value writes denied

The one-time systemd run-key override was removed immediately after the frozen
plan was written. Future timer cycles cannot reuse the activation key.

| Field | Value |
| --- | --- |
| Source run ID | `60fcfedf-5f45-4e02-a656-65be0b9ad71d` |
| Publication run ID | `2b71bed1-1f9b-468a-8341-e3ab9e8cf472` |
| Publication set ID | `7df41f05-0afe-45b3-a1f6-2fe8ee3f2599` |
| Activation completed at | `2026-07-29T20:26:44.820Z` |
| Replacement 72-hour end | `2026-08-01T20:26:44.820Z` |
| Observer workflow merge | `6dc2ea3ab4ccacb5c45939a010caae80bcae32a9` |
| Initial observer workflow run | `30488967875` |

Replacement activation reconciliation:

| Check | Result |
| --- | ---: |
| Scheduled attempts | `1` |
| Source requests | `9,200` |
| Source products | `497,527` |
| Source price rows | `540,624` |
| Source failures | `0` |
| Assignment rows prepared | `33,432` |
| Assignment preparation time | `20.599 seconds` |
| Selected / mapped / eligible | `100 / 100 / 100` |
| Snapshots | `100` |
| Excluded / quarantined | `0 / 0` |
| Delayed / suppressed | `0 / 0` |
| Required / succeeded phases | `5 / 5` |
| Publication state | `verified` |
| Current exact / positive USD | `100 / 100` |
| Missing provenance / stale | `0 / 0` |
| Broken traces | `0` |

The exact same-key source replay completed in two seconds with:

- `resumed_existing_terminal_run = true`
- provider requests started `0`
- database row mutations `0`
- unchanged status, source marker, counts, artifact hash, producing SHA, and
  start/finish timestamps

## GitHub Actions Findings

The red GitHub Actions visible during this incident are historical evidence,
not current unresolved checks:

- the canary observer failures correctly exposed the invalid original window
- the pricing repair branch guard failure was caused by a pre-existing legacy
  key literal and is superseded by the merged exact fix
- visual-search runtime failures were superseded by later green runs
- open Binder documentation pull requests have green current checks

Current repaired pricing branch checks passed after merge. Historical failed
workflow records must not be deleted or rerun to make the history appear
green.

The canary observer was re-anchored through:

`https://github.com/OriginalSoseji/grookai_vault/pull/116`

All pull-request checks passed. The workflow is active and its first
read-only run succeeded:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30488967875`

Initial observer truth:

| Check | Result |
| --- | ---: |
| Observer status | `observing` |
| Observed duration | `0.139 / 72 hours` |
| Findings | `0` |
| Terminal alerts in replacement window | `0` |
| Source health | `healthy` |
| Source continuity | `completed_sync` |
| Exact published prices | `100` |
| Positive USD prices | `100` |
| Missing provenance | `0` |
| Stale prices | `0` |
| Broken traces | `0` |
| Authenticated parent rows | `99` |
| Anonymous execute granted | `false` |
| Anonymous runtime denied | `true` |
| Anonymous denial code | `42501` |
| Prior publication available | `true` |

## Current Truths

- The original 72-hour canary did not pass.
- No post-canary read-model package has been applied.
- The runtime repair migration is applied.
- The fixed 100-printing publication remains the only authorized canary size.
- Anonymous pricing remains denied.
- The pricing timer is active and enabled.
- The legacy pricing timer remains disabled.
- The source and publication repair is frozen at
  `ffb2513fd530930dbfaee714b84df2358f7eaafc`.
- The replacement activation is verified and reconciled.
- The replacement observer is active with zero initial findings.
- The replacement gate ends at `2026-08-01T20:26:44.820Z`.
- Checkpoint 38 is historical and superseded.

## Invariants

The following must never be broken:

- do not count time from the invalid original window
- do not hide or rewrite failed source/publication runs
- do not mutate a successful terminal source run on same-key resume
- do not represent database publication as deployed client visibility
- do not apply the post-canary migration package before 72 continuous healthy
  hours
- do not enable anonymous pricing before the licensing and display-authority
  gate
- do not merge the divergent pricing branch wholesale into `main`
- do not publish inferred, ambiguous, stale, or non-exact prices
- do not enable identity, Vault, or modeled-value writes in the pricing cycle
- do not treat historical red Actions as active failures after their producing
  commits have been superseded and current checks pass

## Observer Restart Proof

`REPAIR3` satisfied all of the following before the observer was re-enabled:

1. source run is terminal `completed` with `failed_count = 0`
2. source counts and artifact hash are nonzero and reconciled
3. publication run is terminal `verified`
4. exactly 100 active canary snapshots are current
5. pointer, publication set, source run, and canonical provenance reconcile
6. authenticated governed reads are nonempty
7. anonymous execution and runtime reads remain denied
8. same-key source replay makes no provider call and leaves the completed
   source row byte-for-byte equivalent in governed fields
9. all activation artifacts are copied into the permanent incident audit

The completed observer restart updated:

- replacement activation run ID
- replacement activation completion timestamp
- required end exactly 72 hours later
- expected commit
  `ffb2513fd530930dbfaee714b84df2358f7eaafc`
- expected count `100`
- frozen observer source SHA

The workflow binding and exact contract test were merged to `main`. The
workflow was re-enabled, dispatched once, and returned a successful
non-enforcing `observing` result.

## Exact Post-72-Hour Gate

After the replacement window has elapsed, use the first observer run at or
after the required end. Require:

- workflow conclusion `success`
- observer status `passed`
- at least 72 continuous observed hours
- every expected daily schedule slot matched within tolerance
- zero unhealthy scheduled runs
- zero terminal alerts
- source health `healthy`
- source continuity proven
- exactly 100 active exact canary prices
- 100 positive USD prices
- zero stale rows
- zero missing provenance rows
- zero broken source-to-publication traces
- authenticated governed access remains correct
- anonymous execution and runtime reads remain denied
- rollback target remains available

If any condition fails, stop. Preserve evidence and repair only the observed
failure. Do not continue to migration or rollout.

If all conditions pass:

1. freeze and hash the final observer artifact
2. perform migration-history and schema-drift preflight
3. build the production integration candidate from current `origin/main`
4. carry only reviewed Production V1 pricing changes
5. run the full contract and product-surface suites
6. apply the frozen two-migration post-canary package atomically
7. verify schema, grants, RLS, function definitions, and readback
8. deploy the integrated web and Flutter clients
9. prove all 17 supported surfaces consume the shared governed read model
10. run shadow publication and exact provenance reconciliation
11. activate signed-in full publication only after every release gate passes
12. observe seven unattended production cycles
13. produce the final Production V1 report
14. keep anonymous pricing blocked until the separate licensing gate passes

## Permanent Evidence

Incident evidence is stored under:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_incident_20260729/`

Required permanent groups:

- `observer_initial_failure/`
- `observer_diagnostic/`
- `repair2_failed_activation/`
- `repair3/`
- `repair3/same_key_resume_proof/`
- `replacement_observer_initial/`
- `github_actions_failure_inventory.json`
- root artifact hash manifest

Secrets must not appear in any permanent artifact.

## Exact Next Gate

Allow the replacement observer to run through
`2026-08-01T20:26:44.820Z`. Require the first enforcing observation at or
after that timestamp to pass every Exact Post-72-Hour Gate condition.

Do not apply the post-canary read-model package before that replacement window
passes.
