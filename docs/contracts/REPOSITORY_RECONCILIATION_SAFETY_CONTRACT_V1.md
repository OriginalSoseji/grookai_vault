# REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1

Status: ACTIVE

Effective date: 2026-09-01

Owner: Grookai Vault founder

Project: Safe repository reconciliation and clean-main consolidation

Production authority at project start: `origin/main` at
`fa3b6e25c5be0d3ab8261749df20b37e73bc027e`

## Purpose

Grookai Vault accumulated many branches and worktrees while production systems,
catalogs, pricing, search, mobile clients, and operational automation were built
in parallel. That history contains valuable implementation work and evidence,
but its size now makes it difficult to identify what is active, already merged,
superseded, unfinished, or safe to archive later.

This contract governs a one-time repository reconciliation project. Its purpose
is to produce a clean, testable integration candidate from the current
production authority without losing committed history, uncommitted work,
operational evidence, or rollback options.

The project is a preservation and reconciliation effort. It is not authorization
to delete historical work.

## Why This Contract Exists

Without a governed reconciliation process, Grookai Vault risks:

- losing uncommitted work from dirty worktrees;
- merging stale branches that overwrite newer production behavior;
- duplicating features that are already present on `main`;
- applying old migrations or generated artifacts out of order;
- producing a single oversized merge whose behavior cannot be reviewed;
- deleting a branch before its unique value and recovery path are known;
- confusing a local branch named `main` with the current remote production
  authority;
- making rollback dependent on undocumented local machine state.

The contract converts those risks into explicit invariants, artifacts, gates,
and stop conditions.

## Authority

For this project:

1. `origin/main` is the production code authority.
2. The exact project-start authority is
   `fa3b6e25c5be0d3ab8261749df20b37e73bc027e`.
3. A local branch name, worktree age, PR number, or commit date does not override
   `origin/main` authority.
4. Database, Storage, deployed-client, and runtime truth remain governed by their
   existing domain contracts. This contract grants no production-write authority.
5. The reconciliation candidate must begin from a freshly fetched and recorded
   `origin/main` SHA.

## Definitions

- **Source branch**: Any local or remote branch inspected for unique work.
- **Source worktree**: Any registered worktree, including detached worktrees.
- **Dirty worktree**: A worktree with tracked, staged, or untracked changes.
- **Recovery package**: Verified Git and filesystem evidence sufficient to
  reconstruct the state being preserved.
- **Reconciliation ledger**: The source-to-destination record proving what was
  retained, replaced, deferred, or classified.
- **Integration candidate**: The non-production branch assembled from the current
  production authority and accepted domain changes.
- **Domain wave**: A bounded group of related changes integrated and tested as one
  reviewable unit.
- **Disposition**: The recorded classification assigned to every source branch or
  worktree.
- **Cleanup gate**: A separate future approval and execution project that may
  remove branches or worktrees only after reconciliation is complete.

## Project Scope

This project includes:

1. inventorying all local branches, remote branches, worktrees, detached heads,
   open PRs, and dirty states;
2. recording exact source and authority SHAs;
3. creating and verifying a full Git recovery bundle outside the repository;
4. preserving each dirty worktree's tracked, staged, and untracked state;
5. classifying every source with a deterministic disposition;
6. creating `integration/reconciled-main-v1` from a fresh `origin/main`;
7. comparing source work against current production behavior;
8. transplanting or reimplementing only unique, still-required behavior;
9. integrating one bounded domain wave at a time;
10. running relevant tests and recording evidence after each wave;
11. maintaining a source-to-destination reconciliation ledger;
12. preparing a final reviewable PR only after all accepted waves pass their
    required gates;
13. preserving a complete rollback path throughout the project.

## Explicitly Out Of Scope

This contract does not authorize:

- deletion of any existing local branch, remote branch, worktree, tag, or ref;
- pruning a source merely because Git reports it as merged;
- `git reset --hard`, destructive checkout, destructive clean, or force push;
- stashing or rewriting a dirty worktree as a substitute for preservation;
- closing existing PRs;
- changing GitHub's automatic branch-deletion setting;
- applying database migrations;
- database, Supabase Storage, pricing, Vault, or catalog writes;
- production deployments or client releases;
- direct commits or pushes to `main`;
- production activation of the integration candidate;
- generated artifact deletion or historical evidence deletion;
- secret material entering Git history or committed recovery artifacts.

Any deletion or production mutation requires a separate contract or explicit
future gate after this project has produced complete evidence.

## Binding Safety Invariants

1. **Preserve before mutation.** No source may be changed, rebased, reset,
   removed, or superseded operationally until its recovery evidence is complete
   and verified.
2. **No existing deletion.** Every branch and worktree that existed at project
   initiation remains present throughout this contract's execution.
3. **Production authority remains untouched.** Reconciliation occurs on a new
   non-production branch. `main` changes only through a later reviewed PR gate.
4. **No wholesale stale merges.** Large or stale branches must be compared against
   current `main`; only unique, accepted behavior may be transplanted.
5. **Dirty state is first-class evidence.** Uncommitted work must be preserved
   separately from committed Git history.
6. **One domain wave at a time.** A wave must pass its tests and reconciliation
   checks before the next wave begins.
7. **No silent omission.** Every inspected source receives a recorded disposition
   and reason.
8. **No duplicate implementation.** Existing production behavior must be
   identified before equivalent source changes are introduced.
9. **Migration history is immutable.** Applied or authority-bearing migrations
   may not be edited, reordered, or replayed by this project.
10. **Secrets remain outside Git.** Recovery archives containing sensitive or
    untracked operational data remain local, access-controlled, and separately
    hashed.
11. **Generated evidence is not disposable by default.** Generated files may be
    classified as noise only after proving they do not contain unique source or
    operational evidence.
12. **Rollback remains possible.** Every accepted wave must identify its source
    commits, destination commits, tests, and reversal method.

## Required Preservation Package

Before source reconciliation begins, create all of the following:

### 1. Git history bundle

- An authoritative `git ls-remote --heads origin` inventory captured immediately
  before preservation, including every remote branch name and exact SHA.
- Every inventoried remote head fetched without pruning and pinned under a
  dedicated project snapshot ref namespace before bundle creation.
- A fail-closed comparison proving every pinned ref equals the inventoried remote
  SHA. A moved, missing, or unfetchable head stops the preservation gate until the
  discrepancy is recorded and resolved.
- A `git bundle --all` snapshot stored outside the repository worktrees.
- SHA-256 hash of the bundle.
- `git bundle verify` output.
- A temporary restore clone proving the bundle resolves every inventoried remote
  SHA, every local branch SHA, and every detached worktree SHA, including the
  project-start `origin/main` authority.

### 2. Repository inventory

- Local and remote branch names and SHAs.
- Worktree paths, branches, detached heads, and SHAs.
- Open, merged, and closed-unmerged PR relationships where available.
- Ahead/behind status relative to the project-start production authority.
- Dirty-worktree counts and file manifests.

### 3. Dirty-worktree evidence

For each dirty worktree:

- `git status --porcelain=v2` output;
- tracked working-tree diff in binary-capable patch form;
- staged diff in binary-capable patch form;
- untracked-file manifest;
- a local archive of required untracked content;
- SHA-256 hashes for all recovery artifacts;
- a secret and sensitive-data classification before anything is committed.

### 4. Restoration drill

The preservation gate passes only when a temporary location can restore:

- the Git bundle;
- every inventoried remote, local, and detached head;
- every tracked dirty patch against its recorded base;
- every staged patch where staged state exists;
- every untracked archive where untracked state exists;
- the combined recorded state of each dirty worktree without modifying its source
  worktree.

Creating files without proving restoration is not sufficient.

## Reconciliation Dispositions

Every source branch and worktree must receive exactly one primary disposition:

- `active`: Current work that remains actively owned and unfinished.
- `fresh_pr_required`: Unique work that should be moved to a fresh-main branch.
- `superseded_by_main`: Behavior is already present or replaced on production
  authority.
- `historical_evidence`: Preserved for audit, operational, or migration history.
- `generated_noise`: Reproducible generated state with no unique source value;
  this classification alone does not authorize deletion.
- `deferred_project`: Valid work outside the current production-reconciliation
  objective.
- `manual_migration_review`: Contains migration or schema history requiring a
  separate immutable-history review.
- `safe_cleanup_candidate`: Reconciled and recoverable, but still retained until
  a separate cleanup gate.
- `do_not_touch`: Protected because authority, sensitivity, uncertainty, or active
  use has not been resolved.

The ledger must record the source SHA, disposition, evidence, destination when
applicable, owner/status, and recovery path.

## Integration Candidate Rules

The intended candidate is:

- branch: `integration/reconciled-main-v1`
- worktree: `C:\grookai_vault_main_reconciled`
- base: freshly recorded `origin/main`
- visibility: non-production

The branch must not be created from a stale local `main` branch. Its base SHA and
creation timestamp must be written to the reconciliation ledger before changes
are added.

## Planned Domain Waves

The initial integration order is:

1. lot sharing and pricing repair;
2. MTG supervisor repair;
3. unique MTG sealed work from PR #219;
4. launch-closeout changes split by actual domain ownership;
5. Japanese catalog work that remains unique and lawful;
6. a fresh-main Visual Search implementation derived from, not merged wholesale
   from, PR #118;
7. remaining pricing, catalog, security, scanner, and product lanes after explicit
   reconciliation.

The order may change only when the checkpoint records why the dependency order
changed. A change in order does not weaken any safety gate.

## Per-Wave Procedure

For each domain wave:

1. identify the source branch, commits, and dirty-state evidence;
2. compare the source behavior and files against current `origin/main`;
3. identify what is already present, superseded, conflicting, and genuinely
   unique;
4. define an explicit path allowlist;
5. transplant commits selectively or reimplement the unique behavior;
6. avoid unrelated formatting, generated output, and metadata churn;
7. run syntax, contract, unit, integration, and client tests appropriate to the
   affected domain;
8. record failures without editing evidence to make the wave appear green;
9. update the ledger and wave checkpoint;
10. commit the bounded wave only after its acceptance evidence is complete.

## Stop Conditions

Stop the affected wave immediately when:

- a source cannot be reconstructed from its recovery package;
- an untracked file may contain a secret or production credential;
- a migration appears applied, reordered, duplicated, or authority-ambiguous;
- a change would require a production database or Storage write;
- the candidate would overwrite newer production behavior;
- the source's unique behavior cannot be distinguished from generated noise;
- tests reveal an unexplained regression in existing production behavior;
- the source SHA, destination SHA, or artifact hashes do not reconcile;
- a branch or worktree deletion becomes necessary;
- direct mutation of `main` would be required.

Stopping one wave does not authorize bypassing it through another branch.

## Required Permanent Artifacts

The project must preserve:

- this contract;
- the dated initiation checkpoint;
- immutable baseline inventory;
- recovery bundle metadata and hashes;
- restoration-drill report;
- dirty-worktree manifests and secret classifications;
- branch and worktree disposition ledger;
- source-to-destination reconciliation ledger;
- one checkpoint and test report per integrated domain wave;
- final candidate diff and test summary;
- PR review and CI evidence;
- final rollback instructions;
- deferred and blocked work register.

Sensitive recovery archives must be referenced by hash and secured location, not
committed when doing so would expose secrets or excessive binary data.

## Project Acceptance Criteria

Repository reconciliation is complete only when:

1. all project-start refs and dirty worktrees have verified recovery evidence;
2. every source has a disposition and reason;
3. every accepted behavior has a source-to-destination record;
4. all domain waves selected for the candidate are tested and checkpointed;
5. no unexplained behavior or migration-history loss remains;
6. the candidate is based on current production authority and reconciles cleanly;
7. the final PR is reviewable, CI-clean, and contains no unrelated generated
   churn;
8. rollback instructions have been exercised or otherwise deterministically
   proven;
9. no branch, worktree, tag, historical artifact, database row, or Storage object
   was deleted by this project.

## Future Cleanup Boundary

Finishing reconciliation does not remove anything. Cleanup is a separate project.

Before any later deletion, each candidate must have:

- a verified recovery path;
- a final source SHA;
- an accepted disposition;
- proof that unique behavior was retained or intentionally deferred;
- no active worktree or operator dependency;
- a separately approved cleanup manifest.

Until that gate exists, `safe_cleanup_candidate` means "investigated and retained,"
not "approved for deletion."

## Lock Statement

This contract is binding for the repository reconciliation project begun on
2026-09-01. It authorizes inventory, preservation, clean-candidate construction,
selective reconciliation, tests, checkpoints, and a future review PR. It does not
authorize deletion, production mutation, deployment, or direct `main` changes.
