# Ruflo Universal Catalog Shadow Pilot V1 — October 19, 2026

## Status

`CYCLES 1 THROUGH 3 OBSERVED AND HELD — STACKED FEATURE BRANCH, NOT MERGED OR ACTIVATED`

The first Phase 2 Ruflo pilot now has an R0-only implementation candidate at
core commit `730be7ed0f2d9643d956e19acaf18583fa27c3a0` on
`feat/ruflo-universal-catalog-shadow-pilot-v1`. It is stacked on the corrected
read-only adapter branch. The pilot did not start the discovery worker, dispatch
a GitHub workflow, call Ruflo agent execution, reconcile an issue, or write any
catalog, pricing, Storage, production, or external state.

## Existing Evidence Readback

The operator captured the already-completed scheduled Universal Catalog
Discovery run `39334612376` and artifact `12226890562`. The checked-in fixture
contains only run metadata, the read-only run plan, summary, source failures,
and the artifact hash map. Database snapshots, source snapshots, full
reconciliation rows, and other large raw artifacts were not committed.

The source workflow concluded successfully, but its discovery result was
`degraded_source_unavailable`:

| Finding | Value |
|---|---:|
| Actionable set gaps | 7 |
| Canonical promotion candidates reported by the source | 6 |
| Recent Japanese-card gaps | 212 |
| Source failures | 1 |
| Failure class | `source_access_denied` |
| HTTP status | 403 |

The pilot therefore emitted `held`, set `promotion_eligible` and
`dispatch_eligible` to false, and selected `observe_next_scheduled_cycle` as the
only next safe step. It did not reinterpret the 403, infer data from the denied
lane, or take ownership of the active Japanese catalog worktree.

Cycle 2 captured the next naturally scheduled run `39372137263` and artifact
`12241639190`, completed at `2026-10-20T05:00:57.112Z`. It independently
reproduced the same held result: one `source_access_denied` failure for the
Storm Emeralda Bulbapedia lane, seven actionable gaps, six source-reported
promotion candidates, and 212 recent Japanese-card gaps. No replacement run
was dispatched.

Cycle 3 captured scheduled run `39417042104` and artifact `12261159875`,
completed at `2026-10-20T11:49:38.308Z`. The separately visible manual run
`39397326254` was excluded because only scheduled runs qualify. Cycle 3 was
held for the same `source_access_denied` failure and did not grant promotion,
dispatch, or execution authority.

## Pilot Progress

Seven recent scheduled workflow runs already concluded successfully and are
recorded as pre-pilot baseline evidence. They do not count retroactively toward
the Ruflo minimum. The pilot ledger currently records:

- observed cycles: 3;
- qualifying cycles: 0;
- required qualifying cycles: 7;
- readiness: `collecting`.

A cycle qualifies only when the captured workflow is scheduled, successful,
artifact hashes reconcile, the run plan proves read-only boundaries, and the
discovery summary has no degraded source lane. Meeting seven cycles will still
not create execution or promotion authority.

## Implementation

`scripts/ruflo/build_universal_catalog_shadow_pilot_v1.mjs` verifies the copied
artifact hashes, reconciles summary and failure counts, validates the R0 task
envelope, emits a deterministic observation fingerprint, and maintains a
distinct-run ledger. Cycle accumulation now verifies prior observation
fingerprints, rejects duplicate or non-contiguous cycle numbers, and requires
the caller to provide prior observations explicitly. The builder has no network, database, child-process,
workflow-dispatch, agent-execution, or destructive Git path.

Commands from a trusted checkout:

```powershell
npm run ruflo:registry:test
npm run ruflo:pilot:universal-catalog:build -- --evidence-dir=<local-evidence> --envelope=<frozen-envelope> --cycle=<number> --prior-observation=<checked-in-prior-observation>
```

## Verification

- New pilot contracts: 10 of 10 passed.
- Combined Ruflo registry, adapter, envelope, and pilot contracts: 32 of 32
  passed.
- Secret-packaging guard: passed before the evidence/documentation commit.
- `git diff --check`: passed before the evidence/documentation commit.
- Generated inventory: 27 protected worktrees, five dirty, zero unreadable,
  and zero execution, dispatch, write, external-action, or cleanup boundaries.
- The pilot worktree entered the inventory through
  `dynamic_fail_closed_discovery` with writes and cleanup disabled.

## Remaining Gate

Observe the next existing scheduled discovery artifact after its workflow
finishes. Do not dispatch a replacement run. Degraded cycles remain held and do
not advance the seven-cycle minimum. The pilot stays R0 even after the minimum
is met; any later execution request requires a separate contract and PR.
