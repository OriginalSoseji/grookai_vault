# MEE and TCG Canary Operational Closeout - 2026-08-10 V1

## Status

`OPERATIONAL_RECOVERY_COMPLETE`

This checkpoint closes the August 10 TCGPlayer canary-observer and Market Evidence Engine runtime recovery. It does not authorize public MEE pricing, modeled values, canonical identity mutation, Vault mutation, or deletion of evidence.

## Context

The TCGPlayer production canary was producing healthy daily evidence, but GitHub observation runs could fail after the governed observation window because later healthy producer runs were incorrectly counted as unexpected. Separately, the MEE reference and eBay workers had stopped making reliable progress because historical artifact scans could time out, the droplet had insufficient free disk space, the eBay worker remained pinned to a stale frozen plan, and a new incomplete cycle required manual config edits to resume.

The founder requested a complete checkpoint, a manual audit/run of TCGPlayer, eBay, reference evidence, and the canary, and permission to use emulators for any remaining application testing so physical-device availability would not block backend completion.

## Problem

1. The canary observer treated healthy producer runs after the closed evidence window as failures.
2. Reference evidence existed, but runtime artifact discovery and mutable-checkout storage made the writer unreliable.
3. eBay acquisition could resume only when configuration named the exact frozen incomplete plan.
4. Historical artifacts and obsolete code releases consumed enough disk to stop safe scheduled execution.
5. Old GitHub failures no longer represented current runtime behavior, but there was no consolidated proof distinguishing historical failures from repaired state.

## Risk

- Restarting the TCGPlayer canary would discard already valid duration evidence and delay release without improving confidence.
- Re-fetching reference or eBay evidence unnecessarily would consume provider quota and could duplicate warehouse work.
- Deleting historical artifacts to recover disk would destroy audit evidence.
- Resuming timers before proving idempotency and cursor handling could replay completed work or start from the wrong plan.
- Treating MEE evidence as public pricing would cross an unapproved publication boundary.

## Decision

- Freeze the canary evidence window at its governed end and ignore later healthy producer runs for the closed-window cardinality check.
- Preserve and externalize MEE artifacts under `/var/lib/grookai/mee/audits`.
- Archive old large July row manifests with verified `tar.zst`, per-file hashes, archive hashes, and source-removal verification instead of deleting their evidence.
- Deploy immutable MEE release `573dd8fc80e441c163c2f9f862289d73efd9a108` with automatic exact frozen-plan recovery for incomplete cycles.
- Complete the existing 8,400-request eBay cycle exactly once, then prove a fresh English-only plan without provider calls.
- Use the existing successful canary duration evidence; do not start another 72-hour clock.
- Restore timers only after reference idempotency, eBay readback, disk headroom, and deployment provenance were verified.

## Alternatives Rejected

- **Restart the 72-hour canary:** rejected because Aug 5-7 closed-window evidence is complete and the failure was in observation-window accounting, not production behavior.
- **Re-run all reference providers:** rejected because the exact Aug 10 artifacts were recoverable and the writer/readback proved complete warehouse coverage.
- **Start a new eBay cycle immediately:** rejected because the incomplete 8,400-request cycle had to be closed first.
- **Delete old evidence:** rejected; evidence was archived and hashed.
- **Publish MEE rollups:** rejected; all recovered candidate and rollup data remains internal and review-only.

## Code and Deployment

- MEE recovery branch: `fix/mee-runtime-recovery-20260810`
- Active MEE release: `573dd8fc80e441c163c2f9f862289d73efd9a108`
- Active path: `/opt/grookai_mee_current -> /opt/grookai/releases/mee/573dd8fc80`
- Immediate rollback: `/opt/grookai/releases/mee/ab07d3505c`
- Auto-resume configuration: `MEE_NIGHTLY_FROZEN_DRY_RUN_IF_INCOMPLETE=auto`
- Canary observer repair: `d8035f50e3754027eb1693aac4d28b894fde9749`
- Canary workflow repin: `6c12ba420751eb4cca36ca53a1801ef140a3b783`
- App/release handoff checkpoint commit: `b3d6019c3`

The MEE worker now searches the governed artifact root for the exact preserved plan whose request manifest and request count match the incomplete cursor. It fails closed when no exact plan exists. Default behavior remains unchanged outside the explicit `auto` configuration.

## TCGPlayer Production and Canary Proof

- Production timer: `grookai-tcgplayer-market-pipeline.timer`
- Timer state at checkpoint: `enabled`, `active`
- Latest service result: `success`, exit `0`
- Latest run: `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-10`
- Producer SHA: `6b729441bf8944048885ade5d9905e23166d9d46`
- Status/final classification: `completed` / `success`
- Attempts: `1`
- Boundaries: source sync, qualification/snapshot writes, and governed publication activation allowed; canonical identity, Vault, and modeled-value writes denied.
- Scheduled summary: `/var/lib/grookai/market-pricing/TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-10/scheduled_summary.json`
- Scheduled summary SHA-256: `ab0d11be12e63e5166d47fc29f7d2a57290cdbff4ed6533014447ecc58235681`

The repaired read-only canary replay covered `127.902` hours and found the required Aug 5, Aug 6, and Aug 7 producer slots with zero missing, unhealthy, duplicate, or alerting runs. Exact positive, governed-RPC, and authenticated readback were `99`; provenance, stale, and broken counts were `0`; anonymous access remained denied with PostgreSQL `42501`.

- Passing GitHub observation: run `31405863278`
- Workflow artifact ID: `9069599559`
- Workflow artifact name: `tcgplayer-market-canary-observation-31405863278`
- Result: `success`

This is sufficient to close the canary. No additional 72-hour wait is required.

## Reference Warehouse Proof

The exact Aug 10 source/normalization artifacts were relocated to the governed audit root with collision and hash verification. The real writer inserted the previously missing rows and completed without findings.

- Real writer artifact: `/var/lib/grookai/mee/audits/mee_reference_warehouse_delta_writer_v1_2026-08-10T16-05-44-354Z.json`
- Artifact SHA-256: `6557afb826468637b56e6adbda455a549ec0e417468935215fad031cfb2cb739`
- Rows inserted during recovery:
  - PokemonTCG.io candidate: `1,780`
  - PokemonTCG.io normalized: `1,780`
  - TCGCSV candidate: `16,728`
  - TCGCSV normalized: `16,728`
  - Total inserts: `37,016`
- Findings: `0`

A subsequent read-only no-op proof found:

- PokemonTCG.io projected/existing: `4,556 / 4,556`
- TCGCSV projected/existing: `16,728 / 16,728`
- Missing candidate rows: `0`
- Missing normalized rows: `0`
- Provider calls: `false`
- DB writes: `false`
- No-op artifact: `/var/lib/grookai/mee/audits/mee_reference_warehouse_delta_writer_v1_2026-08-10T17-49-18-477Z.json`
- No-op artifact SHA-256: `7d162bcf5f626666c51cbc5d685c20ff3a741757380eae952390fdfaac0bbbff`

The operational ledger now records `MEE-REFERENCE-MANUAL-RECOVERY-2026-08-10` as `succeeded`, with failed count `0`, linked to the real writer artifact.

## eBay Acquisition Proof

### Recovery 3 - 4,000 Request Batch

- Run key: `MEE-MANUAL-2026-08-10-RECOVERY3`
- Provider requests: `4,000 / 4,000` successful
- Provider errors: `0`
- Fetched observations: `114,050`
- Unique listings: `102,585`
- Current-run warehouse observations and price events: `110,898` each
- Raw-single events: `95,324`
- Slab events: `7,981`
- Excluded/ambiguous events: `7,593`
- Review-only candidates: `103,305`
- Strict internal rollups: `2,239`
- Review-ready: `1,608`
- Needs more evidence: `631`
- Failed inserts/collisions/findings: `0`
- State SHA-256: `4cb0915dd45db627258f1ece597a7b17003debb3f614882008e4a24c6d903bc4`
- Wrapper: `/var/lib/grookai/mee/audits/mee_nightly_droplet_worker_v1_2026-08-10T16-17-44-428Z.json`
- Wrapper SHA-256: `10002a3dd5c62b32516d1ee84735b2b798a561f647d6963fdc04f8cf4510efa3`

### Recovery 4 - Exact Tail and Cycle Close

- Run key: `MEE-MANUAL-2026-08-10-RECOVERY4`
- Frozen plan cursor: `8,000 -> 8,400`
- Selected/provider requests: `400 / 400` successful
- Cycle complete: `true`
- Provider errors: `0`
- Fetched observations: `3,389`
- Deduplicated warehouse observations and price events: `3,388` each
- Raw-single events: `2,850`
- Slab events: `139`
- Excluded/ambiguous events: `399`
- Review-only candidates: `2,989`
- Strict internal rollups: `157`
- Review-ready: `74`
- Needs more evidence: `83`
- All 10 core ingest phases: exit `0`
- Failed inserts/collisions/findings/warnings: `0`
- Remote row readback: exact
- State: `/var/lib/grookai/mee/audits/mee_nightly_pipeline_v2_state_MEE-MANUAL-2026-08-10-RECOVERY4.json`
- State SHA-256: `1d40a23082d51d725e7ca5e88d6aec2d539f69e46aba0f6cf53a3bcd299d6302`
- Run readback: `/var/lib/grookai/mee/audits/mee_12c_market_listing_nightly_ingest_readback_2026-08-10T17-41-28-677Z.json`
- Run readback SHA-256: `2bb478e40e5cfe663e807ee944c7b34174e495c6cb3b0eb5f47411686485450e`
- Wrapper: `/var/lib/grookai/mee/audits/mee_nightly_droplet_worker_v1_2026-08-10T17-36-15-334Z.json`
- Wrapper SHA-256: `232c696793013f5d42c7dcbc51e769baa9312107d8c53857d44f3457b6157e76`

All candidate and rollup rows remain review-only/internal-only. `app_visible`, `publishable`, and `market_truth` remain false. No `pricing_observations`, public pricing view, canonical identity, image, or Vault boundary was crossed.

## Fresh Cycle Proof

The deployed release generated a new read-only English acquisition plan after the old cursor closed:

- Artifact: `/var/lib/grookai/mee/audits/mee_11d_market_listing_acquisition_dry_run_plan_2026-08-10T17-50-38-863Z.json`
- Artifact SHA-256: `ef28b350bfd8ad1d80400aeb802651d6c8f3b2bca2fdb77113eb23e895ab027b`
- Package fingerprint: `11b1196ce0debcd4864c2151aac8e4a1b718e8e7f5e572e479f42298dca5d54e`
- Request manifest: `c9292565916391544b289da8b48771a561f1527c2ed3310f2eb184386ab010e0`
- Selected targets: `6,000`
- Planned requests: `7,302`
- Planned days at 4,000/day: `2`
- New-release unqueried targets: `232`
- Other unqueried targets: `5,768`
- Canonical identity references inspected: `9,506` unique values, `0` Japanese identity values
- Coverage lanes include raw singles, slabs, sealed, exact variant/finish, and set-shelf discovery.
- Provider calls: `false`
- DB writes: `false`

## Storage and Retention

- Large historical July row-manifest directories were converted to verified archives under `/var/lib/grookai/mee/archive/legacy_mutable_checkout`.
- Each archive retains an archive manifest, per-file SHA-256 manifest, compressed archive, and archive SHA-256.
- Archive store size at checkpoint: approximately `4.7 GB`.
- Obsolete immutable code releases were removed only after path/current/rollback verification.
- Retained releases: `573dd8fc80` and `ab07d3505c`.
- Free disk improved from approximately `16 GB` to `32 GB` (`73%` used).
- Database data and audit evidence were not deleted.

## Scheduler State

At checkpoint creation:

- `grookai-tcgplayer-market-pipeline.timer`: enabled and active; next run Aug 11 at `08:15 UTC`.
- `grookai-mee-reference-refresh.timer`: enabled and active; next run Aug 11 at approximately `02:46 UTC`.
- `grookai-mee-nightly.timer`: enabled and active; next run Aug 11 at approximately `03:18 UTC`.
- Both MEE services use `WorkingDirectory=/opt/grookai_mee_current`.

The next unattended cycles are routine operational confirmation. They do not restart or extend the completed TCGPlayer 72-hour canary.

## GitHub Readback

Current relevant runs are green:

- Canary observation `31405863278`: success.
- MEE auto-resume runtime protection `31412901976`: success.
- English acquisition-domain drift/runtime gates `31407458482` and `31407458427`: success.
- MEE external-artifact runtime protection `31406875960` and `31406402959`: success.
- MEE recovery drift/runtime gates `31405344803` and `31405344742`: success.
- Latest production edge probe `31415473987`: success.

Earlier canary failures are historical results from the repaired window-accounting defect. They are not evidence of a current producer failure.

## Tests and Verification

- Canary observer contract suite: `17/17` passed.
- MEE recovery-focused suites: `48/48`, `9/9`, `3/3`, and `11/11` passed during the repair sequence.
- Auto-resume focused tests: `10/10` passed.
- Combined targeted auto-resume/runtime tests: `23/23` passed.
- Node syntax checks: passed.
- `git diff --check`: passed before deployment.
- GitHub contract runtime and drift workflows listed above: passed.

The repository-wide local shipcheck reached Flutter and exposed one existing application failure in `test/binders/binder_release_feature_flags_test.dart` (`production release exposes only activated Binder phases`). The exact test also fails serially. It is unrelated to MEE, canary, TCGPlayer, reference, or eBay runtime behavior and is not treated as a failure of this backend recovery.

## Application and Device Boundary

- The latest release-journey checkpoint is preserved at commit `b3d6019c3` on `release/final-candidate-proof-v1`.
- Android build 23 state-matrix and iOS TestFlight build 289 high-risk journeys were previously captured.
- Remaining non-hardware-specific UI verification may use Android/iOS emulators so physical devices do not block progress.
- Hardware-only behavior still requires real-device evidence when that behavior is itself the acceptance criterion.

## Current Truths

1. TCGPlayer production pricing is scheduled, running, and canary-proven.
2. The governed TCGPlayer canary is closed; another 72-hour observation is not required.
3. Reference warehouse evidence is complete for the recovered Aug 10 manifests and is idempotent on replay.
4. The incomplete 8,400-request eBay cycle is complete and reconciled.
5. A fresh English-only eBay plan is ready for normal scheduled execution.
6. The MEE scheduler can resolve exact incomplete plans without manual config edits.
7. MEE evidence and rollups remain internal and do not publish app-visible pricing.
8. TCGPlayer, MEE reference, and MEE nightly timers are enabled and active.
9. Current GitHub failures do not exist for this workstream; the relevant repaired workflows pass.
10. Disk capacity is adequate for the next governed cycles, with historical evidence preserved.

## Invariants

- Never mutate canonical identity, Vault ownership, images, or modeled values from MEE ingestion.
- Never expose MEE candidate or rollup rows as public pricing without a separately approved publication contract.
- Never treat a failed historical observer run as current producer failure without checking the frozen evidence window and live producer state.
- Never resume an incomplete acquisition cycle from a plan whose manifest and request count do not exactly match its cursor.
- Never destroy audit evidence to recover disk; archive and hash it first.
- Keep the active release immutable and retain an immediate verified rollback.
- Preserve exact source, language, finish, and printing boundaries for governed TCGPlayer publication.

## What Remains

### Routine operations

- Observe the Aug 11 MEE reference and nightly timer outcomes and alert only on a real failed phase, reconciliation mismatch, cursor mismatch, or boundary violation.
- Observe the Aug 11 TCGPlayer producer run as normal operations; it is not another canary gate.
- Continue disk monitoring and archive old completed artifact packages under the governed retention policy before free space reaches the worker threshold.

### Separate product work

- Repair the unrelated Binder release-feature-flag test before claiming a fully green repository-wide Flutter suite.
- Complete remaining app release-journey work from the release checkpoint, using emulators where hardware is not required.
- Do not publish MEE pricing until its independent qualification/publication gate is approved and proven.

## Exact Next Gate

The next MEE gate is **one ordinary unattended-cycle readback**, not a new 72-hour canary. Verify that the restored timers run from release `573dd8fc80`, that a fresh plan or exact incomplete-plan resume is selected correctly, that reference delta remains idempotent, and that all internal/public boundaries remain unchanged. A failure should trigger phase-specific repair; a success is ongoing operations evidence rather than a new launch blocker.
