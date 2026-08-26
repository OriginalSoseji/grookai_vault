# Grookai Immutable Release Retention V1

## Purpose

Keep the worker host above its frozen free-space safety floor without deleting
runtime evidence, database data, active code, or the minimum rollback set.

## Authority

`scripts/ops/grookai_immutable_release_retention_v1.sh` is plan-only by
default. Apply mode requires root and an exclusive lock.

The only eligible paths are direct child Git checkouts under:

- `/opt/grookai/releases/backend`
- `/opt/grookai/releases/mee`
- `/opt/grookai/releases/control-plane`
- `/opt/grookai/releases/market-intelligence`

Runtime artifacts under `/var/lib/grookai`, mutable legacy checkouts, database
data, credentials, systemd units, and any other filesystem path are outside the
authority of this contract.

## Invariants

- Every active `/opt/grookai_*_current` symlink target is protected.
- Every release used as a live process working directory is protected.
- Every allowlisted release referenced by a symlink inside a protected release
  is protected transitively.
- A broken symlink from a protected release into an allowlisted release root
  fails closed before any candidate can be removed.
- Active release families retain their two newest releases.
- Inactive release families retain their newest cold rollback release.
- A candidate must be older than 24 hours and have a directory name matching
  its full commit SHA prefix.
- Git-checkout releases must have no tracked or untracked changes.
- Packaged control-plane releases must carry a valid `.release-sha` or
  `RELEASE_COMMIT_SHA` identity marker.
- Removal stops as soon as the 20 GiB free-space floor is restored.
- The script fails closed if candidates cannot restore the floor.
- No runtime evidence is archived or deleted by this action.

## Execution

Capture the plan first:

```bash
sudo bash scripts/ops/grookai_immutable_release_retention_v1.sh
```

Apply the unchanged script and settings only after the plan identifies no
active or rollback release as a candidate:

```bash
sudo bash scripts/ops/grookai_immutable_release_retention_v1.sh --apply
```

After apply, verify the active symlinks and process working directories remain
unchanged, the current release worktree is clean, free space is at least 20
GiB, and the MEE artifact-retention service passes.

## Scheduling

`deploy/scripts/install-immutable-release-retention-v1.sh` installs the exact
hash-verified script under `/usr/local/lib/grookai/ops`, runs it once, and
enables `grookai-immutable-release-retention.timer`. The timer runs daily at
`01:15 UTC`, before MEE runtime-artifact retention at `01:45 UTC`. Failures use
the production operations webhook and remain visible rather than being treated
as successful no-ops.

## Rollback

Removed release directories are reproducible Git checkouts, not evidence
stores. Recreate a removed release from its recorded commit SHA and deployment
contract if it is needed again. Runtime evidence is never reconstructed or
deleted through this policy.
