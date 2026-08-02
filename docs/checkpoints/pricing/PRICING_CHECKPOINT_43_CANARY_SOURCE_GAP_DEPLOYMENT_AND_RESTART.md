# Pricing Checkpoint 43: Canary Source-Gap Deployment And Restart

## Status

The bounded source-gap repair is deployed. A corrected 100-printing
production canary is active and the read-only GitHub observer is running.

The new window is `observing`. It has not passed 72 hours. No post-canary
migration, full signed-in rollout, anonymous pricing, or broader publication
is authorized by this checkpoint.

## Context

Checkpoint 42 documented a real upstream condition: one frozen TCGPlayer
product/subtype disappeared from the current feed while its canonical card,
printing, source mapping, and historical observations remained valid.

The repair separated two contracts:

- the fixed 100-identity canary denominator; and
- the number of exact rows currently present in a healthy source feed.

Each frozen identity now resolves to one evidence-backed outcome:
`resolved` or `source_missing`. Up to five proven source gaps are permitted,
while substitution, mapping drift, duplicate candidates, and provenance drift
still fail closed.

## Production Deployment

The source-gap repair was reviewed and merged through PR `#166` at:

`08bfddc15f4f19777ea1ed588f84bbd908ea770b`

The production checkout was fast-forwarded to that commit. The protected
runtime environment was backed up to:

`/etc/grookai/tcgplayer-market-pricing.env.bak-20260802T202700Z`

The expected runtime SHA and bounded source-gap ceiling were recorded in the
protected environment. Targeted production syntax and contract tests passed.

## REPAIR4 Recovery And New Defect

Production run:

`TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-02-REPAIR4`

REPAIR4 downloaded a fresh TCGPlayer current feed containing `541472` price
rows. The previously absent Alolan Ninetales SM128 Holofoil source identity,
TCGPlayer product `168245`, was present again.

This proves:

- the canonical card was never missing
- the exact mapping was never missing
- the original failure was transient current-feed availability
- no sibling subtype, different product, or historical row was needed

REPAIR4 selected, published, and traced all 100 exact prices. Its health check
was healthy with zero findings.

However, its publication artifacts reported null coverage fields and omitted
`canary_source_outcomes.jsonl`. The live worker had retained the result of
`prepare_variant_assignments` while discarding the result of
`stage_candidates`, then attempted to read source coverage from the wrong
phase result.

REPAIR4 restored valid current pricing but was rejected as the new observer
anchor because its source-coverage evidence was incomplete.

## Coverage Result Repair

The narrow wiring repair was reviewed and merged through PR `#167` at:

`6b729441bf8944048885ade5d9905e23166d9d46`

The fix assigns `stageResult` to the `stage_candidates` phase and adds a
contract assertion binding coverage extraction to that phase. It changes no
schema, publication policy, canary membership, or database boundary.

Verification:

- focused production contract suite: `37/37` passed on the host
- complete local contract suite before merge: `903/903` passed
- syntax checks: passed
- GitHub required checks: passed

The production checkout and protected expected SHA were updated to the merge
commit. Environment backup:

`/etc/grookai/tcgplayer-market-pricing.env.bak-20260802T221827Z`

## Corrected REPAIR5 Activation

REPAIR5 ran under the same global flock from the clean frozen runtime commit.
It used `--skip-ingest` and reused the fresh completed REPAIR4 source, so it
did not incur another 90-minute source download.

| Field | Result |
| --- | --- |
| Run key | `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-02-REPAIR5` |
| Runtime commit | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Canary | `TCGPLAYER_MARKET_CANARY_100_V2` |
| Canary definition SHA-256 | `861b9dd97baaa0c93a6bcdd94c5f9ef903388bbc87a31923cfee3fbeb8cfc3d2` |
| Source sync run | `6b0a7d21-9023-4ff3-ada3-512f23005899` |
| Source rows | `541472` |
| Expected / resolved / missing | `100 / 100 / 0` |
| Decisions / snapshots / traced | `100 / 100 / 100` |
| Coverage outcomes | `100 resolved` |
| Coverage reconciled | `true` |
| Reconciliation mismatches | `0` |
| Publication run ID | `01610cfc-df72-412f-bc21-a526044d35bc` |
| Publication set ID | `f7996805-24f3-4da4-9ea7-00acb59fc16a` |
| Activated at | `2026-08-02T22:29:17.856Z` |
| Current exact / parent | `100 / 99` |
| Broken traces | `0` |
| Health | `healthy`, zero findings |
| Canonical / Vault writes | `false / false` |

Publication artifact hashes:

| Artifact | SHA-256 |
| --- | --- |
| publication `run_plan.json` (preserved as `publication_run_plan.json`) | `c37a9224474de09c630c4fb1aa5d6b974eaf145427c8547e24562362c1a8a00e` |
| `summary.json` | `a7457f1bf58acf2a05caa30cd203ba0b4a79656f925f14b888eb20a0d48e1d84` |
| `qualification_decisions.jsonl` | `6cfbcce61b654f4617e8fe66a9db903a1826595a81c61a02efdf0ad0cdae94f4` |
| `reconciliation.json` | `f98272f9b2c76c4b1fc5e01a6a5ac670dab7abec890646ff9542eb3b453248cf` |
| `canary_source_outcomes.jsonl` | `bb9af3483333ae747982913f2bd1330875b7ca7e6f6f1c9d5dda3f78c767e766` |

All five hashes matched recomputation on the production host.

## Observer Restart

The main-branch observer pin was reviewed and merged through PR `#168` at:

`3aaf580f3ea40babe55854a833ac535c59ca417c`

The workflow checks out the exact runtime-producing commit
`6b729441bf8944048885ade5d9905e23166d9d46` and records a maximum source-gap
count of five. It is read-only and cannot run migrations or publication.

First observer run:

`https://github.com/OriginalSoseji/grookai_vault/actions/runs/30770886697`

Result:

- workflow conclusion `success`
- observer policy `TCGPLAYER_MARKET_CANARY_OBSERVATION_POLICY_V3`
- status `observing`
- observed duration `0.318 / 72` hours
- exact and positive prices `100 / 100`
- authenticated rows `100`
- anonymous runtime denied with `42501`
- stale prices `0`
- missing provenance `0`
- broken traces `0`
- terminal alerts `0`
- source health `healthy`
- rollback target available
- findings `0`

The initial observer artifact is preserved under the permanent audit root and
its four payload hashes match `artifact_hashes.json`.

## Active Window

| Boundary | Timestamp |
| --- | --- |
| Start | `2026-08-02T22:29:17.856Z` |
| Nominal 72-hour end | `2026-08-05T22:29:17.856Z` |
| Daily source schedule | `08:15 UTC` |
| Observer schedule | minute 17 every six hours |
| Final-slot completion grace | 480 minutes |

Expected unattended source slots are August 3, 4, and 5 at `08:15 UTC`.

No time from any earlier failed canary counts.

## Current Truths

- All 100 exact canary prices are current and positive.
- The Alolan Ninetales source identity is currently present again.
- The source-gap policy remains necessary because absence may recur.
- The active observer is V3 and reconciles all 100 source outcomes.
- The production timer is active and enabled.
- The canary is observing and has not passed.
- No post-canary migration has been applied by this repair.
- Full signed-in publication remains blocked.
- Anonymous pricing remains denied.
- Production host disk utilization is 97 percent with about 4.6 GB free.
- The health query completed in approximately 11 minutes, within its
  20-minute statement timeout.

## Invariants

The following must never be broken:

- preserve the frozen 100-identity denominator
- require exactly one coverage outcome per canary ordinal
- never substitute product, subtype, finish, printing, or historical evidence
- treat `source_missing` as not observed, not nonexistent
- keep mapping and provenance drift fatal
- preserve failed windows and non-qualifying activations as history
- do not change runtime code, config, or canary membership during the window
- do not count time across a failed unattended cycle
- do not apply post-canary migrations before a terminal passing artifact
- do not enable full or anonymous publication early
- do not write canonical identity, Vault, or modeled-value state from pricing
- keep the observer read-only

## Operational Risks

The production host is at 97 percent disk utilization. A full source artifact
is approximately 749 MB. The current margin can cover the active window, but
retention must be governed before repeated cycles consume the remaining disk.
Do not delete permanent canary evidence to create space.

The health query remains expensive. A timeout during an unattended cycle is a
real incident and invalidates the window. Do not raise timeouts or change the
query during this active canary.

## Permanent Evidence

Audit root:

`docs/audits/pricing/mee_pricing_platform_production_v1/canary_source_gap_repair5_20260802/`

It contains REPAIR4 recovery evidence, REPAIR5 frozen activation and coverage
evidence, the first GitHub V3 observer artifact, and an audit report. Secrets
are excluded.

## Exact Next Gate

Do not change the frozen runtime while the timer and observer run.

At or after `2026-08-05T22:29:17.856Z`, allow the August 5 slot its bounded
480-minute completion grace if it is still running. Then require a terminal
observer artifact proving:

1. workflow conclusion `success`
2. observer status `passed`
3. at least 72 continuous hours
4. all August 3, 4, and 5 source triggers matched within 90 minutes
5. every matching publication completed healthy within grace
6. every scheduled publication contains 100 reconciled source outcomes
7. zero missing, duplicate, unmatched, extra, or unhealthy run keys
8. zero terminal alerts
9. exactly 100 current positive-USD prices, unless a bounded source gap is
   explicitly proven and all counts reconcile to the resolved total
10. zero stale prices, missing provenance, or broken traces
11. authenticated access remains granted
12. anonymous runtime access remains denied
13. a prior publication remains available for rollback
14. the producing runtime commit remains exact

If any condition fails, preserve the artifact and stop. Do not migrate or
broaden publication.

If all conditions pass:

1. download, hash, and preserve the terminal observer artifact
2. run migration-history and schema-drift preflight
3. build a clean integration candidate from current `origin/main`
4. carry only reviewed Production V1 pricing changes
5. run focused pricing, complete contract, web, Flutter, secret, and runtime
   protection suites
6. re-hash the frozen two-migration manifest and require zero ledger drift
7. apply migrations `20260728130000` and `20260728133000` as one package
8. read back schema, function definitions, grants, RLS, migration ledger, and
   governed pricing rows
9. deploy the matching integrated web and Flutter clients
10. run a fresh V1.2 shadow publication and provenance reconciliation
11. prove all 17 supported product surfaces consume the shared read model
12. activate complete eligible signed-in publication only after all gates pass
13. observe seven unattended full-production cycles
14. produce the final Production V1 report
15. keep anonymous pricing blocked until the separate licensing gate passes
