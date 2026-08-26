# Production Worker Host Release Retention V1 - 2026-08-26

## Context

The production worker host reached `88%` filesystem utilization with about
`15.6 GB` free. The governed MEE runtime-artifact retention timer correctly
failed because its frozen `20 GiB` free-space target could not be reached from
seven-day-old runtime artifacts alone.

## Problem

Old immutable deployment copies consumed about `24 GB`. Silencing the MEE
timer or lowering its target would have hidden the capacity risk. Deleting
runtime evidence would have violated the evidence-preservation boundary.

## Risk

An unconstrained release cleanup could remove active code, the only rollback
release, a process working directory, generated evidence, or a path outside
the deployment roots.

## Decision

Implement and apply `GROOKAI_IMMUTABLE_RELEASE_RETENTION_V1` at commit
`aa095d1e31a0dece1071c690011b0d8e1b6f473f`.

The action is plan-only by default and permits removal only from four
allowlisted immutable-release roots. It protects active symlink targets,
process working directories, two releases in active families, and one cold
rollback release in inactive families.

## Alternatives Rejected

- Lower the MEE free-space floor: hides capacity pressure.
- Delete or shorten retention for runtime evidence: breaks auditability.
- Remove entire release families: removes rollback capability.
- Delete dirty release checkouts: can discard generated evidence.
- Expand the host before inventorying usage: adds cost without correcting
  unbounded release accumulation.

## Preservation Proof

Two old checkouts contained generated MEE readback drift. Their changed files,
binary patches, status, commit identities, and hashes were copied out and
verified before those exact checkout changes were restored:

- `C:\secure-ops\production-backend-launch\worker-host-release-retention\mee_0ec9e877b_dirty_preservation_20260826T061016Z`
  - changed-files archive SHA-256:
    `ed0f96e4680cd725bbad19a68bf3ca0c6e18c0a991b4bb29db71af76f6ac7563`
- `C:\secure-ops\production-backend-launch\worker-host-release-retention\backend_c434101ee_dirty_preservation_20260826T061306Z`
  - changed-files archive SHA-256:
    `7b4d1383c13cdfcd0aa4beec71cb5a539fb4cd4da7eca5c5d21c48c74109f365`

## Apply Proof

- Plan artifact:
  `C:\secure-ops\production-backend-launch\worker-host-release-retention\20260826T061347Z_plan_3`
- Plan-output SHA-256:
  `2f15c90edd94736f7fbcdea44a3af8c30104fc5fc54de1831ae3ae30218669b0`
- Apply artifact:
  `C:\secure-ops\production-backend-launch\worker-host-release-retention\20260826T061535Z_apply`
- Apply-output SHA-256:
  `d32e7d1de3624767508cb11c15bf53572fd1cc99535d7f6b8c8571acef8f0a5c`
- Readback artifact:
  `C:\secure-ops\production-backend-launch\worker-host-release-retention\20260826T061609Z_readback`
- Readback-output SHA-256:
  `726b4ccb485f982e6f775cc0f022d8d03132922dc657a8025a7dbcb200fc8dcc`

Eight old releases were removed. Free space increased from `15,629,873,152`
bytes to `21,886,971,904` bytes. Filesystem utilization decreased from `88%`
to `83%`.

## Current Truths

- `/opt/grookai_mee_current` and `/opt/grookai_pricing_current` still resolve
  to backend release `4b6064a5f`.
- `/opt/grookai_control_plane_current` still resolves to control-plane release
  `e56f33fc46`.
- The active backend checkout remains tracked-clean.
- The in-progress TCGPlayer pricing pipeline remained alive throughout.
- Required active and rollback releases all passed existence readback.
- Every planned removed release passed absence readback.
- `grookai-mee-artifact-retention.service` now completes with
  `capacity_already_satisfied` and the timer remains active.
- No database, runtime evidence, credential, Storage, pricing, publication, or
  Vault row was removed by this action.

## Invariants

- Never remove an active symlink target or process working directory.
- Never remove the minimum rollback set.
- Never use immutable-release retention to delete `/var/lib/grookai` evidence.
- Never accept tracked or untracked drift in a Git checkout without preserving
  it first.
- Keep the worker host at or above the `20 GiB` free-space floor.

## Exact Next Gate

Allow the one active TCGPlayer pricing recovery to reach a terminal state.
Then execute the complete health, coverage, performance, provenance, Vault,
product-surface, canary/full-observer, and completion readback package without
starting a second pricing cycle.
