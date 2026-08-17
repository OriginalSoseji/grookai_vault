# Grookai Agent Entry Point

Read this file before operating in this repository.

## Required Reading

1. `docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md`
2. `docs/GROOKAI_RULEBOOK.md`
3. The current checkpoint and contract for the domain being changed.

The operator playbook is the durable map for accounts, consoles, worktrees,
devices, releases, database safety, pricing operations, and verification.

## Non-Negotiable Start Rule

Before asking the founder to repeat setup or provide access, inspect what is
already available:

- repository files, status artifacts, and current checkpoints;
- the active git branch, worktree, and remote state;
- existing signed-in browser profiles and open console tabs;
- connected Android devices and emulators;
- the configured Mac/Tailscale route for iOS work;
- existing non-secret environment-variable names and automation scripts.

A failed route, signed-out tab, wrong browser profile, missing device in one
tool, or stale checkpoint is not proof that access or setup does not exist.
Verify through a second authoritative path before asking the founder.

## Safety Boundary

- Never expose or commit secrets, review credentials, personal identifiers, or
  private keys.
- Never create a duplicate store account, app, canonical record, or remote
  resource because an existing one was not found on the first attempt.
- Never mutate production data or schema without following the governing
  migration/apply contract and its approval boundary.
- Never submit a store release, accept legal terms, publish publicly, or change
  account permissions without explicit authorization for that external action.
- Never treat a saved draft, uploaded build, prepared asset, or repository
  configuration as proof that an external console accepted it.

## Completion Rule

Finish work with direct readback, update the current status/checkpoint, run the
relevant tests, and report remaining external gates precisely. Do not make the
founder reconstruct state from chat history.
