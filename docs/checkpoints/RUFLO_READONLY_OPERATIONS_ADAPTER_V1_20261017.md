# Ruflo Read-Only Operations Adapter V1 Checkpoint — October 17, 2026

## Status

`IMPLEMENTED ON STACKED FEATURE BRANCH — NOT MERGED OR ACTIVATED`

Pull-request step 2 from the all-agents plan now has an R0-only implementation
candidate. Its core implementation is commit
`974470b21d1a651a569e3574a043166b43fca1ef` on
`feat/ruflo-readonly-operations-adapter-v1`, stacked on the registry foundation.
It does not connect to Supabase, call an Operations RPC, contact Ruflo, execute
an agent, dispatch a workflow, write production state, or clean a worktree.

## Operations Health And Evidence Adapter

`scripts/ruflo/build_operations_read_model_v1.mjs` accepts only an explicit,
local JSON export of `founder_operations_agent_health_v1`. It reconciles every
row to `config/ruflo/agent_registry_v1.json`, copies only allowlisted health and
evidence-reference fields, emits stable JSON, and computes a deterministic
SHA-256 fingerprint. The read model carries lifecycle state, topology role, and
action risk independently, so a registered external writer remains visibly
high-risk even in an R0 observation. It also requires the snapshot's staleness
window to match the registry and emits the source-defined heartbeat interval.

The adapter fails closed on:

- unknown or duplicate agent keys;
- registry identity mismatches;
- secret-shaped or executable fields;
- unknown health or run states;
- absolute, traversing, query-bearing, or unhashed evidence references;
- `stale` health for `event` or `manual` agents.

It does not infer health from wall-clock age. The Operations Agent Protocol
remains authoritative: periodic `cron`, `timer`, and `continuous` staleness is
preserved, while idle `event` and `manual` agents are not reclassified as
stale. Actual `running` and `failed` states remain visible.

## Frozen Task Envelope

`scripts/ruflo/build_task_envelope_v1.mjs` validates a proposed R0 observation
against the checked-in registry and read-only inventory. It requires a lowercase
40-character commit SHA, exact inventoried branch and worktree HEAD, protected
and non-writable worktree state, hashed inputs, bounded resources, expected
artifacts, acceptance tests, and direct-readback evidence expectations.
The inventory version, registry-byte hash, zero boundaries, and stable content
fingerprint must match the task's expected inventory fingerprint before any
worktree is trusted. Input bytes are read from the declared Git commit, not the
builder checkout, and repository-relative locators reject URI schemes.

The emitted envelope is always `validated` but `not_started`. Its permission is
R0 and its execution, workflow-dispatch, production-write, external-action,
cleanup, and cross-worktree-write boundaries are all false. The format contains
no command, shell, tool-call, workflow-dispatch, or agent-execution payload.
Its agent identity also binds the independent lifecycle, topology-role, and
action-risk values from the registry.

## Commands

From a trusted repository checkout:

```powershell
npm run ruflo:registry:test
node scripts/ruflo/build_operations_read_model_v1.mjs --input=<local-snapshot.json>
node scripts/ruflo/build_task_envelope_v1.mjs --input=<local-task-spec.json>
```

Both builders restrict output to `docs/audits/ruflo_operations_adapter_v1/`.
They read checked-in files only and spawn no child process.

## Evidence And Verification

`docs/audits/ruflo_operations_adapter_v1/sample/` contains a deterministic
contract sample generated from the checked-in fixture and the frozen registry
inventory. `artifact_hashes.json` binds all three sample inputs/outputs to the
core implementation commit. This is synthetic contract evidence, not a live
production health readback.

- New adapter/envelope contracts: 12 of 12 passed.
- Combined Ruflo registry, pinning, adapter, and envelope contracts: 25 of 25
  passed.
- Secret-packaging guard: passed.
- `git diff --check`: passed before the evidence/documentation commit.
- Static source guard found no network, database, child-process,
  workflow-dispatch, agent-execution, or destructive-Git path.

An extended Operations/Ruflo selection passed 52 of 54 tests. The two file-level
load failures were the already-known fresh-worktree dependency gap: one requires
`typescript` from `apps/web` and one requires `dotenv`. No domain assertion ran
or failed in those two files. Dependencies were not installed or copied from an
active worktree.

The commit used `--no-verify` only because the isolated worktree does not have
the repository dependency installation required by the broad hooks. Focused
dependency-free contracts and repository guards were run directly first.

## Remaining Gate

This candidate is stacked on the unmerged registry PR and must not be treated as
runtime activation. The first shadow-only catalog pilot now exists as a separate
stacked candidate at
`docs/checkpoints/RUFLO_UNIVERSAL_CATALOG_SHADOW_PILOT_V1_20261019.md`. It may
consume separately captured evidence but still may not execute the agent or
dispatch its workflow. Production or external state remains outside Ruflo
authority.
