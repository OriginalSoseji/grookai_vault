# Repository Reconciliation Baseline Summary

Status: Preservation gate complete; integration initialized

Date: 2026-09-02 (America/Denver)

Contract: `REPOSITORY_RECONCILIATION_SAFETY_CONTRACT_V1`

## Authority

- Preserved production authority:
  `b54ef91328c5a0093531338ca4d42f00bf601b9b`
- Integration branch: `integration/reconciled-main-v1`
- Integration worktree: `C:\grookai_vault_main_reconciled`
- Integration base: exact preserved production authority

## Preservation Result

- 293 remote heads inventoried, fetched, and pinned with zero SHA mismatches.
- 406 local branch heads pinned.
- 142 worktree heads pinned.
- 842 total project snapshot refs.
- 10 dirty worktrees captured.
- 10 of 10 dirty worktrees restored in isolated temporary worktrees.
- 35 tracked path states restored.
- 95 untracked files restored and hash-verified.
- 0 secret-pattern findings in untracked recovery content.
- Full bundle size: 2,129,477,351 bytes.
- Full bundle SHA-256:
  `72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441`.
- Eight private bundle chunks uploaded and individually verified.
- Off-machine GitHub restoration resolved all 842 pinned refs with zero
  mismatches.

## Recovery Authority

- Private recovery repository:
  `OriginalSoseji/grookai-vault-reconciliation-recovery-20260902`
- Private release: `reconciliation-20260902T054000Z`
- Verification run:
  `https://github.com/OriginalSoseji/grookai-vault-reconciliation-recovery-20260902/actions/runs/33598048695`
- Local recovery evidence:
  `C:\grookai_reconciliation_recovery_20260902T054000Z`

The private release contains the ordered bundle chunks, ref manifests, dirty
worktree recovery package, hashes, and restoration reports. No secret-bearing
recovery content was committed to the application repository.

## Initial Reconciliation Ledger

The machine ledger contains:

- 293 remote branch records;
- 406 local branch records;
- 142 worktree records;
- 841 total source records;
- 461 unique source SHAs.

Initial provisional dispositions are:

- 429 `deferred_project`;
- 201 `manual_migration_review`;
- 173 `superseded_by_main`;
- 26 `do_not_touch`;
- 8 `historical_evidence`;
- 4 `fresh_pr_required`.

These counts include separate local and remote records that may point to the same
SHA. They are an investigation ledger, not cleanup authorization.

## Important Classification Repair

The first ledger draft compared old trees directly to current `main`, which made
stale branches appear to modify migrations added later by production. That logic
was rejected before integration. The authoritative ledger compares source-side
changes against each source's merge base. Unrelated histories compare against the
empty Git tree and are marked explicitly.

## First Domain Sources

### Lot sharing and pricing

- Source: `fix/lot-sharing-pricing-main-v1`
- SHA: `91e4c043f076a71721cd95c27715c3737eba78ed`
- Source-only commits: 2
- Paths: 19 Flutter/test files
- Required action: selective fresh-main integration and Flutter tests

### MTG supervisor

- Source worktree: `C:\grookai_vault_mtg_supervisor_batch_size`
- HEAD: `5b4a95e637ffcfb214aeeeb7b2279751124ab9f4`
- Source-only commits: 0; HEAD is contained in production authority
- Dirty paths: 2
- Required action: apply the preserved two-file patch and run targeted contract
  tests

### MTG sealed

- Source: `agent/mtg-sealed-world-v1`
- SHA: `a0d1f1123eca9335d379c49d00f055c46adb87c6`
- Source-only commits: 2
- Paths: 8
- Required action: fresh-main transplant with migration-history review before any
  commit

### Launch closeout

- Source worktree: `C:\grookai_vault_launch_closeout`
- HEAD: `d6840bf89bfc056cd318f1f3a22de5e344a769bd`
- HEAD is contained in production authority
- Dirty state: 26 tracked paths and 42 untracked files
- Required action: split by domain; do not apply as one patch

### Japanese V4

- `catalog/jpn-master-index-v4` is contained in production authority.
- The closeout branch is divergent and includes migration history.
- Required action: retain as historical/manual-migration evidence unless a
  specific unique behavior is proven necessary.

### Visual Search

- PR #118 remains open, draft, and conflicting.
- Source-only commits: 38
- Paths: 152
- Required action: preserve and reconcile by capability; never merge wholesale.

## Boundary

No existing branch, worktree, ref, PR, database row, Storage object, deployment,
or production client was removed or mutated during preservation. The integration
candidate remains non-production.
