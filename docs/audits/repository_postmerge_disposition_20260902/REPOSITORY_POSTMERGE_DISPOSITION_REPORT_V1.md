# Repository Post-Merge Disposition Report V1

Status: COMPLETE - NON-DESTRUCTIVE CLASSIFICATION ONLY

Date: 2026-09-02 (America/Denver)

## Authority

- Current authority: `origin/main`
- Authority SHA: `026f4d63fe6bd3c344b0ff74b57a05239a8c529e`
- Recovery repository: `OriginalSoseji/grookai-vault-reconciliation-recovery-20260902`
- Recovery release: `reconciliation-20260902T054000Z`
- Recovery bundle SHA-256: `72620b82363074027bc6a62d826329c46f5bb1fdc9bb7ffac3a385c5a311f441`

## Inventory

| Source kind | Count |
| --- | ---: |
| local_branch | 409 |
| remote_branch | 297 |
| worktree | 143 |

- Unique source SHAs: `465`
- Open pull requests: `2`
- Dirty or unreadable worktrees: `10`
- Preserved dirty-worktree path set unchanged: `true`

## Dispositions

| Disposition | Count |
| --- | ---: |
| accepted_reconciliation_restore_point | 2 |
| active_disposition_report | 3 |
| contained_historical_evidence | 8 |
| contained_in_main | 173 |
| open_pr_human_calibration_gate | 3 |
| open_pr_migration_gate | 3 |
| patch_equivalent_to_main | 247 |
| preserved_deferred_project | 220 |
| preserved_dirty_or_unreadable | 24 |
| preserved_migration_review | 160 |
| protected_authority | 1 |
| reconciled_source_evidence | 5 |

Every row has `delete_authorized: false`. Archive recommendations are planning
metadata only and do not authorize deleting a branch, tag, worktree, directory,
artifact, pull request, or recovery object.

## Open Pull Requests

- #219 `agent/mtg-sealed-world-v1`: Build governed MTG sealed world (open)
- #118 `agent/visual-search-lab-runtime-fix`: Build governed Unified Collector Search V2 (draft)

## Local Main Is Not Authority

The production authority is the recorded `origin/main` ref and SHA. A local
branch or worktree named `main` is classified from its actual ancestry, dirty
state, and changed domains; its name cannot override production authority.

- `local_branch:main` at `2f128ea80d028daff32f5cfc7ce9124d3f0d13eb` - diverged - `patch_equivalent_to_main`
- `worktree:C:/grookai_vault_mtg_catalog_lockfix` at `2f128ea80d028daff32f5cfc7ce9124d3f0d13eb` - diverged - `patch_equivalent_to_main`

## Dirty Or Unreadable Worktrees

- `C:/grookai_vault_binder_activation` - branch `codex/collaborative-binders-activation-v1` - 1 status records
- `C:/grookai_vault_binder_production_main` - branch `catalog/jpn-master-index-v5-official-global-catalog` - 1 status records
- `C:/grookai_vault_catalog_discovery_v1` - branch `detached` - 5 status records
- `C:/grookai_vault_collaborative_binders` - branch `codex/collaborative-binders-v1` - 1 status records
- `C:/grookai_vault_launch_closeout` - branch `agent/app-launch-closeout-v1` - 63 status records
- `C:/grookai_vault_launch_convergence_v2` - branch `release/app-candidate-309` - 1 status records
- `C:/grookai_vault_mobile_web_parity` - branch `codex/mobile-web-native-parity-v1` - 1 status records
- `C:/grookai_vault_mtg_supervisor_batch_size` - branch `fix/mtg-catalog-supervisor-batch-size-v1` - 2 status records
- `C:/grookai_vault_pulse_wall_vault` - branch `codex/dex-ux-adoption-v1` - 1 status records
- `C:/grookai_vault_release_main` - branch `codex/e2-notification-pr1` - 1 status records

These worktrees remain untouched. Their original preservation snapshots and the
off-machine recovery bundle remain the restoration authority.

## Decisions

1. Keep `origin/main`, both reconciliation tags, the private recovery release, and
   `integration/reconciled-main-v1` as named restore points.
2. Keep dirty, unreadable, detached-unmerged, migration-bearing, and open-PR
   sources unchanged.
3. Treat contained or patch-equivalent clean branches only as future archive
   candidates. No deletion is approved by this report.
4. Keep PR #118 deferred behind the Visual Search human-calibration gate.
5. Keep PR #219 deferred behind the unapplied MTG sealed migration gate.
6. Do not remove worktrees until a separate owner-approved archival execution
   proves every selected source is clean, contained, restorable, and absent from
   active automation.

## Next Gate

Create an owner-readable archival candidate packet from only clean,
main-contained sources. That packet may propose branch/worktree cleanup but must
not execute deletion. Active work, dirty worktrees, migration history, detached
recovery points, open PRs, and named reconciliation restore points remain out of
scope.
