# Ruflo Agent Registry V1 Checkpoint — October 16, 2026

## Status

`IMPLEMENTED ON FEATURE BRANCH — NOT MERGED OR ACTIVATED`

The first milestone from
`docs/plans/RUFLO_ALL_AGENTS_INTEGRATION_PLAN_20261016.md` now has a bounded
implementation candidate. It is a read-only registry, validator, inventory
builder, and contract suite. It does not call Ruflo `agent_execute`, dispatch a
workflow, query a production service, modify another worktree, or perform any
cleanup.

The current source foundation is commit
`e7d98ee2fd0abb6cda8f5c2dde9df7877b7c1d5a` on
`feat/ruflo-agent-registry-v1`. The checked-in inventory was refreshed from
that exact commit on October 21; later documentation commits do not change the
registry or inventory implementation recorded by the snapshot.

## Registry

The registry is `config/ruflo/agent_registry_v1.json`, governed by
`config/ruflo/agent_registry_v1.schema.json` and the semantic validator at
`scripts/ruflo/validate_agent_registry_v1.mjs`.

It records:

- 15 agent identities;
- four source-registered Operations Agent Protocol agents;
- eleven policy-defined backlog owners held as non-executable;
- independent lifecycle-state, topology-role, and action-risk dimensions, so a
  registered writer remains registered without losing its external-write risk;
- four checked-in host schedule lanes;
- 21 explicitly protected roots, plus fail-closed dynamic protection for every
  newly discovered worktree;
- R0-only agent permissions and zero write locks;
- false boundaries for execution, workflow dispatch, production writes,
  external actions, cleanup, and cross-worktree writes.

The validator rejects duplicate agent keys, duplicate resource-lock
declarations within one record, sensitive field names, absolute or traversing
repository locators, missing contracts, execution enablement, permissions above
R1, worktree write assignments, and write locks. Shared resource-lock keys
across agent records are valid because they identify runtime contention; the
future lease manager must enforce exclusive writer ownership.

## Read-Only Inventory

The inventory builder at `scripts/ruflo/build_readonly_inventory_v1.mjs` reads
tracked source with Git and reads registered worktree status. It does not read
secret values, enumerate arbitrary files outside registered worktrees, query
the network, or inspect production systems.

The October 21 refresh under `docs/audits/ruflo_agent_registry_v1/` records:

| Measure | Count |
|---|---:|
| Registry agents | 15 |
| Registered operations agents | 4 |
| Classified automation surfaces | 168 |
| Backend automation surfaces | 52 |
| Script workers | 46 |
| GitHub workflows | 66 |
| Host lanes | 4 |
| Discovered worktrees | 36 |
| Dirty worktrees | 5 |
| Unreadable worktrees | 0 |

All 36 discovered worktrees are recorded as protected with
`write_allowed: false` and `cleanup_authorized: false`. A worktree absent from
the explicit root list receives `dynamic_fail_closed_discovery`, not a weaker
policy.

The snapshot does not claim that a GitHub schedule, Windows task, systemd
timer, or production runtime is installed, enabled, healthy, or authorized.
Those states require direct readback from the owning system.

## Commands

From a trusted repository checkout:

```powershell
npm run ruflo:registry:validate
npm run ruflo:inventory:build
npm run ruflo:registry:test
```

The inventory command writes only to
`docs/audits/ruflo_agent_registry_v1/` unless an explicit `--out-dir` is given.
It never changes the Ruflo MCP configuration or starts an agent.

## Verification

- Registry semantic validation: passed.
- JavaScript syntax checks: passed.
- Focused registry and Ruflo integration contracts: 13 of 13 passed.
- Tracked backend/script/workflow inventory reconciliation: passed.
- Worktree fail-closed protection tests: passed.
- Artifact SHA-256 reconciliation: passed.
- `git diff --check`: passed after removing trailing blank-line warnings.

An extended 74-test Operations/Ruflo run passed 73 tests. The one catalog
publisher subprocess failure could not import `dotenv` because dependencies are
not installed in this fresh worktree; the same dependency limitation blocks the
full shipcheck before domain assertions run.

The full repository shipcheck remains unavailable in the fresh isolated
worktree until dependencies are installed; its runtime preflight currently
cannot import `dotenv`. This is an environment limitation, not a passing full
shipcheck result.

## Remaining Gate

Merge or otherwise accept the planning PR before this stacked implementation
is rebased onto `main`. The next Ruflo phase remains a separate change: a
read-only Operations health/evidence adapter and frozen task-envelope builder.
No pilot execution is authorized by this checkpoint.
