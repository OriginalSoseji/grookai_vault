# Pricing Checkpoint 38: Canary Automation and Post-72-Hour Handoff

## Status

Active time-gated release checkpoint.

The authenticated TCGPlayer Market canary is healthy but has not completed its
mandatory 72-hour observation window. No post-canary migration has been
applied.

## Purpose

This checkpoint is the operational handoff for the remainder of Pricing
Production V1.

It records:

- the exact canary being observed
- the automated read-only observation path
- current production truth
- the frozen migration package
- the production branch-divergence risk
- the exact execution order after 72 hours
- fail-closed stop conditions
- required permanent evidence
- work that is safe to perform while the canary runs

This document does not authorize an early migration apply, anonymous pricing,
publication expansion, or an unattended database mutation.

## Context

The 100-printing authenticated production canary was activated on:

`2026-07-28T08:40:15.793Z`

The enforcing 72-hour gate ends on:

`2026-07-31T08:40:15.793Z`

That is:

`2026-07-31 02:40:15 MDT`

The producing canary commit is:

`c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`

The activation publication run is:

`87b13fc1-3639-47cb-843f-2f5d8b29d3b0`

The initial activation run key is:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-07-28-REPAIR1-publication`

The reviewed pricing release branch was clean at:

`9335c2afada1468ce8a34e3cc67ba4820c86433f`

## Production Visibility Work

The Founder pricing operating surface was deployed separately from the frozen
pricing release branch.

Checkpoint number 37 was reserved by that isolated Founder visibility work.
This handoff uses number 38 to avoid assigning the same sequence number to two
different pricing decisions. The separate visibility checkpoint was produced
on `pricing/founder-visibility-v1`; the production facts needed for resuming
the canary are repeated here so this release checkpoint is self-contained.

Production route:

`https://grookaivault.com/founder/pricing`

Founder visibility production merge:

`179b2aa2189daa5f41299d528a13120638e2a4f7`

GitHub pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/111`

The deployed page proves:

- the active publication contains 100 exact snapshots
- the backing current view contains 100 rows
- the currently deployed shared RPC client accepts 0 rows before the pending
  read-model completion migration
- database publication and client visibility remain distinct
- anonymous pricing remains intentionally denied

The `100 / 0` state is not a publication loss. It is the expected contract
boundary before the pending RPC migration supplies the required
`published_at` and exact backing identity fields.

## Automated Observation

A temporary, read-only GitHub Actions observer is active on `main`.

Workflow:

`.github/workflows/tcgplayer-market-canary-observation.yml`

Workflow production merge:

`3c862b815735a4eda93b65ac108fc583f1c62fc9`

GitHub pull request:

`https://github.com/OriginalSoseji/grookai_vault/pull/112`

The workflow:

- runs every six hours at minute 17
- can be dispatched manually
- checks out the exact reviewed observer source SHA
  `9335c2afada1468ce8a34e3cc67ba4820c86433f`
- uses the protected `SUPABASE_DB_URL` GitHub secret
- executes only
  `scripts/audits/tcgplayer_market_canary_observation_v1.mjs`
- uploads the complete observer evidence as a GitHub Actions artifact
- adds the summary to the workflow run summary
- adds `--require-pass` after the mandatory end timestamp
- contains no migration, publication, pipeline, or apply command
- performs no database writes

The first production workflow proof is:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30393908849`

Producing workflow SHA:

`3c862b815735a4eda93b65ac108fc583f1c62fc9`

That run completed successfully and uploaded:

`tcgplayer-market-canary-observation-30393908849`

The workflow reported a non-blocking GitHub annotation that several official
actions still target Node.js 20 and were automatically forced to Node.js 24.
The observer itself ran under the explicitly configured Node.js 22 runtime.

## Latest Verified Canary State

Latest evidence timestamp:

`2026-07-28T19:54:20.589Z`

Observed duration:

`11.235 / 72 hours`

Current evidence:

| Check | Result |
| --- | ---: |
| Observer status | `observing` |
| Exact published prices | `100` |
| Positive USD prices | `100` |
| Missing provenance | `0` |
| Stale visible prices | `0` |
| Broken traces | `0` |
| Terminal alerts | `0` |
| Authenticated RPC rows | `99` parent rows |
| Anonymous execute granted | `false` |
| Anonymous runtime denied | `true` |
| Anonymous denial code | `42501` |
| Prior publication available | `true` |
| Effective source rows | `540,037` |
| Source health | `healthy` |
| Source continuity | `verified_no_change` |

The expected scheduled slots were still zero at that timestamp because the
first daily slot after activation had not yet occurred.

## Local Observer Failure

A direct local observer attempt from the Windows release worktree timed out
while connecting to:

`db.ycdxbpibncqcchqiihfz.supabase.co:5432`

The connection timed out before the first query.

Consequences:

- database writes: `0`
- publication changes: `0`
- migration changes: `0`
- evidence was not treated as a canary result

The protected GitHub observer succeeded afterward. Future scheduled
observations therefore use GitHub Actions rather than depending on this
workstation or weakening the database contract.

## Frozen Migration Package

The authoritative manifest is:

`backend/pricing/rollout/tcgplayer_market_production_v1_migration_manifest.json`

The package contains exactly two migrations:

| Migration | SHA-256 |
| --- | --- |
| `20260728130000_tcgplayer_market_read_model_contract_completion_v1.sql` | `028c94a4b86cf2e29fcd74dba4e5111c24ce70512019db3688c6d1e5b1632681` |
| `20260728133000_vault_exact_market_pricing_targets_v1.sql` | `a66c7ae4aa3903077ad70d81bd1aeaa595f90a27ad30dd5b5604198eb7975cd7` |

Both hashes were rechecked on `2026-07-28` and matched the manifest.

The two migrations are one governed rollout package. Do not apply only the
shared read-model migration and leave the exact-Vault target behind.

Forbidden:

- `supabase db push --include-all`
- migration ID substitution
- migration history repair used to hide drift
- ad hoc remote SQL
- applying before the enforcing canary passes
- deploying the old release branch directly over current `main`

## Branch-Divergence Risk

The pricing release branch and production `main` diverged after:

`97c5657c8c5d4a160248d160bb3c08e6c53eeeaa`

At the Founder visibility production integration, the pricing branch was 68
commits ahead of that merge base while production `main` was 51 commits ahead.

Therefore:

- do not merge or deploy `pricing/mee-productization-v1` wholesale
- do not force production back to the pricing branch
- build a clean integration candidate from the then-current `origin/main`
- carry only the reviewed Production V1 pricing changes
- preserve all unrelated production work added since the merge base
- require the full repository and product-surface checks on the integrated
  production candidate

This is a release-integration problem, not permission to redesign pricing.

## Exact Post-72-Hour Execution Plan

### Gate A: Require the Final Canary Pass

Do not start migration preflight before:

`2026-07-31T08:40:15.793Z`

Use the first automated workflow run after that timestamp.

Require:

- workflow conclusion: `success`
- observer status: `passed`
- `window.elapsed = true`
- observed duration at least 72 hours
- expected daily schedule slots all present
- missing schedule slots: `0`
- unmatched run keys: `0`
- unhealthy run keys: `0`
- terminal alerts: `0`
- exact price count: `100`
- positive USD price count: `100`
- missing provenance: `0`
- stale prices: `0`
- broken traces: `0`
- source health: `healthy`
- authenticated execution remains granted
- anonymous execution remains denied
- anonymous runtime denial remains proven
- prior publication remains available for rollback
- producing canary commit remains exact

Download the final GitHub artifact and preserve:

- `run_plan.json`
- `evidence.json`
- `summary.json`
- `REPORT.md`
- `artifact_hashes.json`
- GitHub run metadata and URL

Copy the final evidence into the permanent pricing audit domain and verify all
artifact hashes before proceeding.

If the observer reports `failed`, missing slots, unhealthy runs, alerts,
stale rows, broken provenance, access drift, or count drift:

1. stop
2. preserve the failed artifact unchanged
3. do not apply either migration
4. classify whether the failure is pipeline, source, publication, access,
   provenance, scheduler, or observer infrastructure
5. do not rerun merely to replace an unfavorable result

An infrastructure-only retry is allowed only when evidence proves that no
database query completed and the failed run cannot be mistaken for a canary
result.

### Gate B: Freeze the Production Integration Candidate

Before any database apply:

1. fetch current `origin/main`
2. create a new clean production integration worktree from current
   `origin/main`
3. inventory the exact pricing runtime, web, and Flutter files required by
   Production V1
4. integrate only those reviewed files and the two frozen migrations
5. resolve conflicts in favor of current production behavior unless the
   frozen pricing contract explicitly requires the change
6. run all focused pricing contracts
7. run the complete repository contract suite
8. run web typecheck, lint, and strict production build
9. run Flutter analysis and tests
10. run release secret and runtime protection checks
11. record the exact candidate commit SHA
12. require a clean tracked worktree

Do not deploy this candidate yet. It must be ready so client deployment can
follow the database migration without an open-ended integration delay.

### Gate C: Rerun Exact Migration Preflight

From the clean frozen pricing migration checkout:

1. record branch and exact commit SHA
2. require an empty tracked worktree
3. re-hash both migration files and compare with the manifest
4. list linked migrations
5. require exactly these local-only IDs:
   - `20260728130000`
   - `20260728133000`
6. require remote-only migration IDs: `0`
7. run:

```powershell
.\scripts\migration_preflight_strict.ps1 `
  -Phase PrePush `
  -ExpectedLocalOnlyIds @(
    "20260728130000",
    "20260728133000"
  )
```

Require:

- expected and actual local-only IDs match exactly
- duplicate pending-object scan passes
- complete local migration replay passes
- no unexpected linked-schema drift
- no migration source bytes changed

If any hash, ledger, replay, or duplicate-object check fails, stop before
production apply.

### Gate D: Apply the Exact Two-Migration Package

Apply only with:

```powershell
supabase db push
```

Do not add `--include-all`.

Preserve the complete command output.

Immediately require:

- both migration IDs appear in the remote ledger
- local-only migration IDs: `0`
- remote-only migration IDs: `0`
- no third migration was applied

If one migration applies and the second fails:

1. treat it as a partial-apply incident
2. preserve the exact output and ledger state
3. do not run migration-history repair
4. do not rerun blindly
5. do not deploy clients
6. prepare a reviewed forward repair from the observed production state

### Gate E: Prove Schema and Security

Run:

```powershell
pwsh -NoProfile `
  -File .\scripts\migration_preflight_strict.ps1 `
  -Phase AuditLinkedSchema
```

Require an empty linked schema diff.

Read back and preserve:

- `get_market_pricing_read_model_v1(uuid[], uuid[])`
- `v_market_price_parent_summary_v1`
- `get_top_market_pricing_v1(integer)`
- exact-Vault target view and function definitions
- owners
- grants
- RLS/security-barrier or invoker properties where applicable

Runtime proof must show:

- authenticated shared read execution allowed
- service-role execution allowed where required
- anonymous shared read execution denied
- provenance detail remains service-role-only
- private Vault reads remain owner-scoped
- no cross-owner Vault rows
- exact-copy pricing never falls back to a parent or sibling printing
- slabs remain excluded from raw-copy totals

After the read-model migration, the Founder dashboard should reconcile the
active publication from:

`100 / 0`

to governed client-compatible rows. A count mismatch must be investigated; it
must not be hidden by UI wording.

### Gate F: Deploy the Exact Production Candidate

After schema and security proof passes:

1. push the clean production integration branch
2. open a production PR against current `main`
3. require all repository checks
4. merge through the governed production path
5. record the production merge SHA
6. require Vercel Production success for that exact SHA
7. deploy the matching Flutter build through the governed signed-in canary
   path
8. preserve deployment IDs, URLs, timestamps, and commit metadata

Do not describe clients as deployed from a preview build or local screenshot.

### Gate G: Run a Fresh Full-Source V1.2 Shadow

Do not reuse the original 100-row canary as full-rollout evidence.

Run a new full-source shadow with:

- Production V1.2 scope
- English Pokemon exact raw singles only
- exact language and finish
- TCGPlayer `marketPrice` authority
- no Grookai Value
- no row limit
- no publication activation

Require:

- fixed denominator: `32,676`
- eligible coverage at least `95%`
- deterministic exclusion and quarantine reasons
- unclassified gaps: `0`
- exact canonical mapping
- exact source provenance
- zero amount, identity, finish, language, timestamp, or scope mismatches

The last verified readiness baseline was:

- eligible rows: `31,123`
- denominator: `32,676`
- coverage: `95.247%`

Recompute it. Do not copy the old percentage into the release report.

### Gate H: Activate Full Signed-In Publication

Only after the full shadow passes:

1. activate the complete eligible signed-in publication with no row limit
2. preserve the previous publication pointer
3. reconcile selected, mapped, excluded, quarantined, eligible, snapshot, and
   publication counts
4. require all displayed amounts to use the shared governed read model
5. keep anonymous execution and anonymous display denied

Do not enable:

- anonymous pricing
- public pricing
- Japanese pricing
- slabs
- sealed pricing
- Grookai Value
- inferred finish or printing matches

### Gate I: Prove Product Surfaces

Run the frozen 17-surface source-to-render proof from the exact deployed
commit.

At minimum, verify:

- Card Detail
- search
- set grids
- Vault totals
- market history
- parent `From` pricing
- exact-printing pricing
- web authenticated surfaces
- Flutter authenticated surfaces

Require every captured amount to reconcile:

```text
source row
-> canonical mapping
-> qualification
-> publication snapshot
-> shared RPC
-> API or client model
-> rendered surface
```

Require zero mismatches for:

- amount
- currency
- scope
- card print identity
- exact printing identity
- finish
- source observation timestamp
- publication timestamp
- provenance
- Vault quantity and total

The Founder dashboard may mark web or Flutter visibility verified only from
this explicit deployed-surface evidence.

### Gate J: Operational Proof

After full signed-in activation:

1. enable the exact-commit production schedule
2. prove rollback from the preserved prior publication
3. prove provenance lookup
4. prove read latency and availability
5. observe seven unattended daily cycles
6. require no manual intervention for ordinary exact-printing singles
7. update the completion matrix and final Production V1 report

Production V1 is not complete after one successful migration or one rendered
price. Operational duration remains part of the Definition of Done.

### Gate K: Retire Temporary Canary Automation

After the final canary artifact is preserved:

1. disable or remove the temporary six-hour schedule
2. preserve the workflow file in history
3. keep the final workflow run and artifact URL in the checkpoint
4. do not leave a permanently skipping scheduled workflow consuming Actions
   runs

The temporary workflow must never be expanded into an unattended migration
apply.

## Required Permanent Artifacts

Preserve under the pricing audit domain:

- final canary workflow metadata
- final canary run plan
- final canary evidence
- final canary summary
- final canary report
- final canary artifact hashes
- migration manifest and verified hashes
- pre-apply migration ledger
- strict preflight output
- local replay output
- production `supabase db push` output
- post-apply migration ledger
- linked-schema audit
- schema definition readback
- grants and RLS readback
- authenticated runtime readback
- anonymous denial proof
- exact-Vault verifier output
- production integration commit and PR
- Vercel production deployment metadata
- Flutter deployment metadata
- fresh full-source V1.2 shadow
- coverage and gap reconciliation
- full signed-in activation output
- source-to-render 17-surface proof
- provenance proof
- rollback proof
- performance proof
- seven-cycle observation
- final completion report

Hash permanent audit artifacts according to repository convention.

## Stop Conditions

Stop immediately if:

- the final canary is not `passed`
- any scheduled slot is missing
- any terminal alert exists
- current exact count differs from expected policy
- stale, non-positive, or broken-provenance rows appear
- anonymous execution becomes available
- rollback evidence disappears
- either migration hash changes
- the linked ledger contains an unexpected local-only or remote-only ID
- strict replay fails
- duplicate pending objects are found
- `--include-all` appears in an apply plan
- a partial migration apply occurs
- post-apply linked schema diff is nonempty
- grants or RLS are wider than the frozen contract
- exact Vault pricing uses parent or sibling fallback
- production integration would remove unrelated current-main work
- fresh V1.2 coverage falls below the fixed threshold
- any source-to-render reconciliation mismatch remains

Do not convert a stop condition into a warning to keep the release moving.

## Current Truths

- Founder pricing visibility is deployed.
- The 100-row database publication is healthy.
- The shared deployed client contract currently accepts zero rows because the
  frozen read-model completion migration is pending.
- The canary has not reached 72 hours.
- Automated read-only observation is active.
- The first GitHub observer run succeeded.
- Both migration hashes match the frozen manifest.
- Neither post-canary migration has been applied.
- Full signed-in publication has not been activated.
- Anonymous pricing remains denied.
- Product-surface proof and seven unattended cycles remain pending.

## Invariants

1. The canary must complete before schema mutation.
2. The two frozen migrations move as one package.
3. Migration history stays clean; no `--include-all` or concealment repair.
4. Production integration starts from current `main`.
5. TCGPlayer `marketPrice` remains the Production V1 headline authority.
6. Exact printing, language, and finish are required for publication.
7. Parent `From` pricing never becomes an exact-copy Vault value.
8. Every displayed value remains traceable to immutable publication evidence.
9. Anonymous pricing remains closed until licensing and display authority are
   separately approved.
10. A database row, deployed client, and verified rendered surface are three
    separate truths.

## Safe Parallel Work

While the canary runs, work may continue on a separate branch for:

- Visual Search V1
- offline Fact Graph corpus audit
- search-document derivation
- hybrid retrieval prototypes
- read-only evaluation tooling
- relevance benchmark creation

That parallel work must not:

- modify the pricing release branch
- change the frozen canary
- alter the migration manifest
- change publication state
- widen pricing access
- introduce unrelated work into the post-canary production candidate

## Exact Next Gate

Wait for the first automated observer run at or after:

`2026-07-31T08:40:15.793Z`

Require the final canary artifact to pass. Then execute Gates B through E:

1. freeze the current-main integration candidate
2. rerun the exact migration preflight
3. apply the frozen two-migration package
4. prove schema, security, governed RPC, and exact-Vault behavior

Stop before full signed-in activation unless the fresh V1.2 shadow also
passes.
