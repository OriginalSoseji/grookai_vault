# Web import recovery checkpoint — September 29

Candidate: `fix/web-import-recovery-20260929`, isolated at
`C:/gv_web_import_recovery_20260929`, now integrated with current main
`40f874a96` (409 migrations). The initial 408 proof at
`a9432e0b055e17d0c6610193c4c1d2f7275d6782` remains preserved. The seller migration
is upstream work, not a new migration introduced by this repair. Recovery stash
`3139d5269197842b31f85575921f6f73ff9b31c1` retains the pre-integration candidate.

All 50 focused checks and nine actual sandbox scenarios pass on current main.
The test now uses the existing verified 409 sandbox and awaits completion of
the deliberately dropped response before reloading; earlier failed test evidence
is retained. No product retry behavior changed during this integration.

Full authenticated website staging also passed eight checks in Chromium and
Windows WebKit: protected-route redirect, real password login returning to
import, CSV save, View Vault navigation and persisted readback after reload.
Private full-shell-latest.json binds the actual source and screenshots. This is
the full application shell against the isolated 409 database, not production or
physical Safari. The initial full-shell WebKit attempt raced input hydration;
the passing harness verifies a real form-mode transition before entering input.

Read `docs/contracts/WEB_IMPORT_RECOVERY_V1.md`. This carries the website
atomic import, same-tab recovery and catalog/owned-quantity preview fixes.
Only the preserved matching source and its focused tests were taken from the
older audit candidate; the slab migrations and other dirty worktrees are intact.

Private checkpoint, test outputs and paired browser evidence:
`C:/grookai_vault_operator_artifacts/web_import_recovery_20260929`.
Read its current results before asserting qualification or deployed status.
The integration runner intentionally preserves failed runs and synthetic data.
Do not reset populated labs or reuse historical production apply intents.

The worktree now includes the historical docs/audits and docs/sql required by
the full contract suite; those files were restored byte-for-byte from current
main and compressed locally to conserve disk. Dependencies are existing junctions. A local read-only preview
build is compilation evidence, not a production release artifact or complete
shipcheck. No native update, migration, production write or deploy occurred here.

The larger audit remains incomplete. PSA/provider and physical-device gaps,
slab admission/drain/release, and other outstanding role/workflow checks remain
tracked in the separate inventory-audit and slab-current-baseline artifacts.
