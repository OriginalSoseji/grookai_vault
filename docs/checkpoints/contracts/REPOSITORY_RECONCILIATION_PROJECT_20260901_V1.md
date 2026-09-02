# REPOSITORY_RECONCILIATION_PROJECT_20260901_V1

Status: INITIATED

Date: 2026-09-01 (America/Denver)

Contract: `REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1`

Project: Safe repository reconciliation and clean-main consolidation

Production authority at initiation:
`fa3b6e25c5be0d3ab8261749df20b37e73bc027e`

Documentation branch: `docs/repository-reconciliation-safety-v1`

## Context

Grookai Vault reached production-preparation work with a large number of parallel
branches and worktrees created across catalog, pricing, search, mobile, security,
operations, images, and release-readiness projects. Much of that work is already
in production authority, some remains unique, some is deferred, and some exists
only as uncommitted local state.

The founder requested a safe consolidation into a new main candidate while
preserving the current tree and every historical source. The founder explicitly
did not authorize deleting branches or worktrees.

## Why This Project Was Started

This project was started to prepare Grookai Vault for production without allowing
years of parallel work to remain an unmanaged source of release risk. The goal is
not to make the repository look smaller. The goal is to know, with recoverable
evidence, which implementation is authoritative, which unfinished work still
matters, where every accepted change moved, and how to recover anything that is
not moved.

The founder chose reconciliation into a second clean-main candidate so the
current production tree remains available as an immediate fallback. Existing
branches and worktrees are intentionally retained until a later cleanup project
can prove they are recoverable and no longer operationally required.

## Problem

The current repository shape makes it difficult to answer basic release questions
reliably:

- Which branch contains unique production-required behavior?
- Which work is already present or superseded on `origin/main`?
- Which dirty worktrees contain source changes versus generated noise?
- Which PRs can be transplanted safely and which must be rebuilt on fresh main?
- Can any source be removed later without losing code or operational evidence?

Merging branches indiscriminately would not solve this problem. It could reapply
stale migrations, regress newer behavior, duplicate implementation, or bury
unresolved work inside an unreviewable diff.

## Risk

The primary risk is irreversible information loss or production regression during
cleanup. Specific risks are:

- uncommitted work being lost;
- stale local `main` being treated as production authority;
- old branch behavior overwriting current production behavior;
- migration history being reordered or reintroduced;
- sensitive untracked files being committed accidentally;
- an oversized integration diff passing without domain-level proof;
- branches being deleted before unique work is traced to a destination.

## Decision

Use a preservation-first, fresh-main reconciliation process governed by
`REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1`.

The project will:

1. preserve and verify all Git and dirty-worktree state;
2. create `integration/reconciled-main-v1` from a fresh `origin/main`;
3. reconcile one domain wave at a time;
4. transplant only unique, accepted behavior;
5. record every source and destination in a ledger;
6. keep the candidate non-production until a final review gate;
7. retain every existing branch and worktree throughout this project.

## Alternatives Rejected

### Merge all open and unmerged branches

Rejected because branch age and merge state do not prove that all branch changes
remain correct against current production.

### Reset the local branch named `main`

Rejected because the local `main` worktree has unique commits and is not the
current production authority. It must be preserved and reconciled before any
future reset or cleanup.

### Delete branches already reported as merged

Rejected because Git ancestry alone does not prove that dirty worktree state,
operational evidence, or post-merge commits are disposable.

### Build one giant reconciliation PR

Rejected because a cross-domain diff would be difficult to review, test, roll
back, and attribute to original sources.

### Use stale branches as merge bases

Rejected because the integration candidate must inherit current production
behavior before source changes are evaluated.

### Clean generated files immediately

Rejected because generated-looking files can still contain unique evidence. They
must be classified and recoverable first.

## Initiation Baseline

The following was measured before the documentation worktree was added:

- Production authority: `origin/main`
- Production SHA: `fa3b6e25c5be0d3ab8261749df20b37e73bc027e`
- Real remote branch heads: 292
- Existing local worktrees: 141
- Dirty existing worktrees: 10
- Open PRs: 2
- Remote branch heads directly contained in `main`: 59
- Unchanged branch heads associated with merged or squash-merged PRs: 150
- Unmerged branches with no PR: 54
- Branches associated with closed-unmerged PRs: 13
- Branches changed after an earlier merged PR: 13
- Open-PR branches: 2

The documentation worktree created for this contract is the 142nd registered
worktree. It uses sparse checkout and introduces no production or application
change.

## Dirty Worktree Baseline

The ten dirty worktrees at initiation are:

| Worktree | Reported changes | Initial classification |
|---|---:|---|
| `C:/grookai_vault_launch_closeout` | 63 | Substantive; preserve and split by domain |
| `C:/grookai_vault_catalog_discovery_v1` | 5 | Untracked audit evidence; preserve before classification |
| `C:/grookai_vault_mtg_supervisor_batch_size` | 2 | Substantive MTG supervisor repair |
| `C:/grookai_vault_binder_activation` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_binder_production_main` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_collaborative_binders` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_launch_convergence_v2` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_mobile_web_parity` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_pulse_wall_vault` | 1 | Investigate; generated/noise suspected |
| `C:/grookai_vault_release_main` | 1 | Investigate; generated/noise suspected |

No dirty worktree has been reset, cleaned, stashed, or removed.

## Open PR Baseline

### PR #118 - Unified Collector Search V2

- Branch: `agent/visual-search-lab-runtime-fix`
- State: draft, conflicting
- Size: 152 files, 214,889 additions, 18 deletions
- Decision: do not merge wholesale; preserve it and reconstruct unique Visual
  Search behavior on fresh main in its own wave.

### PR #219 - Governed MTG sealed world

- Branch: `agent/mtg-sealed-world-v1`
- State: Git-mergeable but blocked by current PR requirements
- Size: 8 files, 1,851 additions, 0 deletions
- Decision: candidate for a bounded fresh-main transplant after earlier dependency
  waves pass.

## Other Known High-Value Sources

### Current primary worktree

`C:/grookai_vault` is on `fix/lot-sharing-pricing-main-v1` and was clean at audit
time. It contains two commits not in the production authority and changes 19
Flutter files. This is the first planned reconciliation wave.

### Stale local `main`

The local `main` branch is checked out at
`C:/grookai_vault_mtg_catalog_lockfix`. At audit time it was behind
`origin/main` by 165 commits and ahead by 3 commits. It must not be reset. Its
unique commits require preservation and comparison even though related vendor
behavior appears integrated or superseded on production authority.

### Launch closeout

`C:/grookai_vault_launch_closeout` contains the largest uncommitted state and must
be preserved before its changes are split by actual domain ownership.

### MTG supervisor

`C:/grookai_vault_mtg_supervisor_batch_size` contains a narrow uncommitted repair
that belongs in the MTG supervisor wave.

## Current Truths

- `origin/main` at the recorded SHA is the only code authority for the project
  base.
- Existing branch/worktree quantity is an operational problem, not evidence that
  historical work is disposable.
- Merged status does not authorize deletion.
- Dirty state is not contained in a Git bundle and requires separate recovery
  artifacts.
- PR #118 is too stale and conflicting to merge wholesale safely.
- PR #219 is bounded enough to evaluate as a fresh-main transplant.
- GitHub currently does not automatically delete head branches after merge.
- No repository cleanup or deletion has been authorized.

## Invariants

- Preserve every project-start branch, worktree, ref, and dirty state.
- Do not mutate production systems.
- Do not apply migrations.
- Do not deploy clients or services.
- Do not force push or commit directly to `main`.
- Do not merge stale branches wholesale.
- Do not commit secrets from untracked recovery content.
- Do not begin a later wave while the current wave has unexplained test failures.
- Do not call reconciliation complete without a complete source-to-destination
  ledger and verified rollback path.

## Work Completed At This Checkpoint

- Repository branch, worktree, dirty-state, and PR baseline inspected.
- Production authority SHA fixed and recorded.
- High-risk and high-value source lanes identified.
- A dedicated sparse documentation worktree created from production authority.
- `REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1` authored and indexed.

No application code, database, Storage object, deployment, branch history, or
existing worktree state was changed by this checkpoint.

## Explicit Next Gate

The next gate is preservation proof, not feature integration:

1. write an immutable inventory artifact for all refs and worktrees;
2. query, fetch, and pin every remote branch head to its exact inventoried SHA
   without pruning;
3. create and SHA-256 hash a full Git bundle outside repo worktrees;
4. verify the bundle and resolve every remote, local, and detached source SHA in a
   temporary clone;
5. snapshot every dirty worktree's tracked, staged, and untracked state;
6. restore every applicable tracked, staged, and untracked state for every dirty
   worktree in isolated temporary locations;
7. create the initial reconciliation ledger;
8. only then create `integration/reconciled-main-v1` from a freshly fetched
   `origin/main` and begin the lot-sharing/pricing wave.

Stop before deleting or modifying any existing source branch or worktree. Stop
before any database, Storage, deployment, or direct-main action.

## Completion Boundary

This project is not complete merely because a clean branch exists. Completion
requires every source to have a disposition and recovery path, every accepted
change to have destination evidence, every selected wave to pass its tests, and
the final candidate to be reviewable and reversible without deleting historical
work.
