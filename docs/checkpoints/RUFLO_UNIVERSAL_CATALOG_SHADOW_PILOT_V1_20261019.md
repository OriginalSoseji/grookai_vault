# Ruflo Universal Catalog Shadow Pilot V1 — October 19, 2026

## Status

`CYCLES 1 THROUGH 7 OBSERVED AND HELD — STACKED FEATURE BRANCH, NOT MERGED OR ACTIVATED`

The first Phase 2 Ruflo pilot now has an R0-only implementation candidate on
`feat/ruflo-universal-catalog-shadow-pilot-v1`. It remains stacked on the
corrected read-only adapter branch. The pilot did not start the discovery
worker, dispatch a GitHub workflow, call Ruflo agent execution, reconcile an
issue, or write any catalog, pricing, Storage, production, or external state.

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

Cycle 4 captured scheduled run `39464118813` and artifact `12285235118`,
completed at `2026-10-20T17:17:46.767Z`. It began on main commit
`51856a6a2f81aa9e18c9e96dbb6737e7d5067973`, four minutes before catalog
resilience PR #751 merged as main commit
`41fdd6241c70391c9f0fd2fa2588caa902d1c0ed`. It therefore correctly remains a
pre-repair held observation with the same Storm Emeralda
`source_access_denied` failure; it is not evidence for or against the merged
repair. No replacement run was dispatched.

Cycle 5 captured the first post-repair scheduled run `39502200235` and artifact
`12302776333`, completed at `2026-10-20T21:45:24.727Z`. Its source commit
`515592aed9426d5736b694b15b54dfea12dfa0c6` contains merged repair
`41fdd6241c70391c9f0fd2fa2588caa902d1c0ed`. The prior Storm Emeralda failure
did not recur, but a different Bulbapedia lane for `30th Celebration` returned
HTTP 403 without sufficient alternate evidence. The run therefore remained
`degraded_source_unavailable` and Cycle 5 correctly held fail-closed. No
replacement run was dispatched and the source policy was not weakened.

Cycle 6 captured scheduled run `39546617897` and artifact `12321089943`,
completed at `2026-10-21T04:59:35.863Z`. Its source commit
`1e1ca17aee118e6b5b08434f847ec750826cde5e` also contains the merged repair.
The same `30th Celebration` Bulbapedia lane returned HTTP 403, so the cycle
again remained `degraded_source_unavailable` and held. This repeat confirms a
remaining source-evidence gap rather than a regression to the prior Storm
Emeralda failure. No replacement run was dispatched.

Cycle 7 captured scheduled run `39595599455` and artifact `12343758487`,
completed at `2026-10-21T12:01:23.252Z`. Its source commit
`f6205f12a58275b620cec7915a2826eba3d72ad0` predates Japanese official
expansion fallback merge commit
`6f43ce2e70900ca978fd7260c6bb8434787f67f0`, so it is not post-fix evidence.
The same `30th Celebration` Bulbapedia lane returned HTTP 403 and the cycle
correctly remained `degraded_source_unavailable` and held. No replacement run
was dispatched.

## Pilot Progress

Seven recent scheduled workflow runs already concluded successfully and are
recorded as pre-pilot baseline evidence. They do not count retroactively toward
the Ruflo minimum. The pilot ledger currently records:

- observed cycles: 7;
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
envelope and its recomputed fingerprint, binds every captured evidence file to
the envelope's frozen input hashes, emits a deterministic observation
fingerprint, and maintains a distinct-run ledger. The default output directory
is the requested `cycle_XX` directory. Cycle accumulation now verifies prior
observation fingerprints and their frozen task-envelope input hashes, requires
the universal-catalog shadow identity, scheduled successful source runs, and
strictly increasing source completion times, rejects duplicate or
non-contiguous cycle numbers, and requires the caller to provide prior
observations explicitly.
Ledger validation derives qualification from
source-degradation signals and rejects
fingerprint-consistent observations whose status or qualification contradicts
those signals. It also requires verified evidence hashes and every safety
boundary explicitly set to false. The CLI binds the requested cycle and actual
output paths to the envelope task ID and declared artifacts. The builder has no
network, database, child-process, workflow-dispatch, agent-execution, or
destructive Git path.

Commands from a trusted checkout:

```powershell
npm run ruflo:registry:test
npm run ruflo:pilot:universal-catalog:build -- --evidence-dir=<local-evidence> --envelope=<frozen-envelope> --cycle=<number> --prior-observation=<checked-in-prior-observation>
```

## Verification

- New pilot contracts: 15 of 15 passed.
- Combined Ruflo registry, adapter, envelope, and pilot contracts: 37 of 37
  passed.
- Secret-packaging guard: passed before the evidence/documentation commit.
- `git diff --check`: passed before the evidence/documentation commit.
- Generated Cycle 7 inventory: 35 protected worktrees, seven dirty, zero
  unreadable, and zero execution, dispatch, write, external-action, or cleanup
  boundaries.
- The pilot worktree entered the inventory through
  `dynamic_fail_closed_discovery` with writes and cleanup disabled.

## Remaining Gate

Observe the first naturally scheduled discovery artifact whose source commit
contains main merge `6f43ce2e70900ca978fd7260c6bb8434787f67f0`. Do not dispatch a replacement
run. Degraded cycles remain held and do not advance the seven-cycle minimum.
The pilot stays R0 even after the minimum is met; any later execution request
requires a separate contract and PR.
