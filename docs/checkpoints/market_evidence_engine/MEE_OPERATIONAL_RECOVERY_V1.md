# MEE Operational Recovery V1

## Status

`BOUNDED_500_CANARY_PASSED_TIMER_DISABLED_4000_GATE_READY`

Production repair is proven through historical recovery, a 50-call live canary, governed artifact retention, and a clean 500-call rotating canary. The timer remains disabled. A 4,000-call canary and three unattended rotating cycles remain required before operational completion.

## Context

The Market Evidence Engine had accumulated production-only hotfixes in a mutable checkout. Raw acquisition continued to succeed, but downstream projection repeatedly failed at production scale. The timer was disabled after partial failures and disk pressure.

The preserved production baseline began at deployed SHA `00206f724946ad6842f32185376886cd4c5bca10`. The repair was developed on `agent/mee-operational-recovery-v1`. The code that produced the corrected 50-call canary readback is `4c006483ace43be075a22570008b8107a662438d`. The frozen code that produced the 500-call canary is `7c7f3bb41ec0c590f091495c6ba8e55720b8af41`.

## Why It Kept Failing

The recurring failures were a chain, not one defect:

- the planner repeatedly selected batch one instead of rotating through the 8,400-request manifest;
- projections and readbacks scanned large unscoped evidence sets;
- successful provider work was not a durable resume boundary;
- retries could repeat acquisition;
- runtime artifacts accumulated inside a mutable Git checkout;
- client timeout settings did not override Supabase's 120-second session default;
- strict rollup apply used the outer pipeline run key while readback used the source acquisition run key;
- readback findings returned exit code zero, allowing a false `completed` pipeline outcome;
- the host retained about 82 GB of legacy in-checkout audit artifacts, leaving insufficient margin for larger canaries.
- equivalent acquisition plans were not totally ordered, so tied printing targets and alternate eBay query text could change the manifest hash between processes.

## Risk

Blind retries could spend provider quota twice, duplicate evidence, fill the host disk, or hide partial success. Destructive cleanup could lose valid evidence. Enabling the timer before proving rotation and resume behavior could repeat the same failure unattended.

## Decision

Repair without deleting or rewriting market evidence:

- preserve all source and derived rows;
- use additive migrations only;
- scope projections and readback to one acquisition run;
- persist append-only cursor and phase ledgers;
- refuse provider refetch after any attempt without a complete local resume record;
- resume idempotent downstream phases from external state;
- write runtime artifacts outside the release checkout;
- deploy a tracked release through an atomic symlink;
- fail closed when the critical run-scoped readback has findings;
- bind strict rollup versions to the source acquisition run;
- keep every candidate and rollup internal, non-publishable, and review-only;
- keep the timer disabled until larger canaries and unattended cycles pass.

## Alternatives Rejected

- Delete old rows and restart: valid evidence would be destroyed.
- Repeat the August 2 provider run: the raw warehouse already contained the evidence.
- Increase timeouts only: this would not repair unscoped scans, rotation, or retry safety.
- Continue patching `/opt/grookai_vault_mee_nightly`: its dirty SHA did not identify running code.
- Delete legacy artifacts during recovery: rejected in favor of allowlisted, hash-verified, restorable archives.
- Enable the timer after the 50-call gate: disk capacity and larger canaries remain unproven.

## Preserved Baseline

- Code archive: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/mee-runtime-code-baseline-20260802.tar.zst`
- Code archive SHA-256: `ff7456d7485decd37bf4ad9af9119957e6e422ae49ac03760743244de6554ba2`
- Raw deployed diff: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260802/deployed_runtime_tracked_raw.diff.zip`
- Raw diff SHA-256: `af8b296c27fa12b87bc61acdbb2076be2df0d4ee016f870123ebc27b8dd2a395`
- Production recovery artifacts: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803`
- Key artifact manifest SHA-256: `d60c287885acbe31b61f01ff6a624d3905cb2d889c3958596b87f0d3f28d5c17`
- Repository recovery readback: `docs/audits/market_evidence_engine_v1/mee_operational_recovery_v1_20260803/RECOVERY_READBACK.md`

No market evidence was deleted, truncated, remapped, approved, or published.

## Governed Retention Proof

The recovery added plan-only archival and restore tools for inactive legacy fetch and backfill-plan directories. The apply path requires an inactive timer, service, and worker set; an inactivity window; per-file hashes; a compressed archive; `zstd --test`; tar member comparison; and a final archive hash before removing only the exact allowlisted source path.

Sixteen historical backfill-plan directories from July 10 through July 25 were archived and independently verified:

- source bytes preserved: `24,041,366,244`;
- compressed archive bytes: `2,412,238,622`;
- bytes reclaimed: `21,629,127,622`;
- verified archives: `16/16`;
- partial artifacts: `0`;
- real 1.5 GB archive restore test: passed;
- free bytes after retention: `34,613,862,400`;
- margin above the 12 GiB provider floor: `21,728,960,512` bytes.

Artifacts:

- Reconciliation: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803/retention_v1/retention_reconciliation.txt`
- Reconciliation SHA-256: `fef8cddce167fc19c5eed7c04fb500296066336d908dc293de4aa4f26fe8052f`
- Hash manifest SHA-256: `a38a28d0e3a64e25f1c19f89a1fc02d8d860b0be60b10b9d86504df025fa28aa`

## Frozen Manifest Resume Proof

The existing incomplete cycle was bound to source manifest `96a150e7d99cd994fcee945147d879b0bf8398992fe8246daad3814611dc54aa`. A regenerated plan contained the same `8,400` exact query keys and payloads but differed in order because several targets had tied sort keys and alternate query text.

The planner now has total deterministic ordering, including finish, printing ID, print ID, and query-text tie breakers. Two fresh plans produced identical ordered hashes. The nightly worker also accepts a guarded `--frozen-dry-run` artifact only when its exact request count and recomputed manifest match the incomplete cursor. It rejects paths outside the governed artifact root, duplicate requests, completed cycles, and any manifest mismatch.

The 500-call canary therefore resumed the original immutable manifest slice rather than resetting or silently changing identity.

## Migration And Security Proof

Applied production migrations:

- `20260803010000_mee_operational_recovery_v1.sql`
- `20260803020000_mee_price_event_observation_index_v1.sql`
- `20260803021000_mee_price_event_readback_index_v1.sql`

Readback proved both run-scoped indexes, both price-event indexes, the cursor table, and the latest-cursor view exist. Cursor-table RLS is enabled. `anon` and `authenticated` have no select access. `service_role` has only the intended select/insert path and two matching policies.

- Schema/security readback: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803/final_schema_security_migration_readback.txt`
- SHA-256: `97b8a47151f28fcb26c4ae084e47d075b6631648a4cb6c3d08614ae8673f61c7`

## Historical Recovery Proof

Source run `MEE-11L-DAILY-BATCH-802cd59b40ea` was recovered without provider calls:

- acquisition run ID: `24eea869-8fab-2b1a-7da9-a124e18caa22`
- consumed calls already present: `4,000`
- provider errors: `0`
- observations and price events: `337,429` each
- raw singles: `293,855`
- slabs: `20,575`
- excluded or ambiguous: `22,999`
- review-only candidates: `249,624`
- strict internal rollups: `14,273`
- review-ready: `8,500`
- needs more evidence: `5,773`
- readback findings: `0`

Final historical readback SHA-256: `b60a9615976312fba38720ba67b0063a337148e5eba73397c19a9c45a7c73a1c`.

## 50-Call Canary Proof

Pipeline run key: `MEE-V2-CANARY-50-20260803T0415Z`

Source acquisition run: `MEE-11L-DAILY-BATCH-b040d39fa851`

- exactly `50/50` provider requests succeeded;
- provider attempts in phase ledger: `1 started`, `1 succeeded`, `0 failed`;
- projected listings: `10,000`;
- persisted observations and price events: `8,470` each;
- seller snapshots: `1,468`;
- review-only candidates: `7,088`;
- correctly keyed strict rollups: `435`;
- review-ready: `289`;
- needs more evidence: `146`;
- cursor advanced exactly once from `0` to `50` of `8,400`;
- final readback findings: `0`;
- public, app-visible, market-truth, canonical, vault, image, and delete boundaries: `0` writes.

The first strict apply exposed a run-key wiring defect and created `435` mis-keyed rows. They remain preserved and quarantined: all have `needs_review=true`, `publishable=false`, `app_visible=false`, and `market_truth=false`. The repaired resume reused the original provider artifact and inserted `435` correctly keyed rows without another provider call.

- Final reconciliation: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803/canary_50_final_db_reconciliation.json`
- Reconciliation SHA-256: `1dba97eca29f65ba33ecfcb652a3ee8e1d55c7eabe577dc7b00f38cb40f5b1e4`
- Corrected readback SHA-256: `dced9d8aee6e74647c7075be3bde526c3d9cd229e7aa10c3d4f60b62eb5dbabf`
- Final state SHA-256: `86fc496894c14052a065eb4d4eb754be29856b847937ccdb19e0c4960feb87aa`

## 500-Call Canary Proof

Frozen code SHA: `7c7f3bb41ec0c590f091495c6ba8e55720b8af41`

Pipeline run key: `MEE-V2-CANARY-500-20260803T051939Z`

Source acquisition run: `MEE-11L-DAILY-BATCH-d7db8afd65ff`

- exactly `500/500` provider requests succeeded with `0` provider errors;
- all `10` pipeline phases exited successfully;
- phase ledger: `9 started`, `11 succeeded`, `0 failed`;
- observed provider listings: `100,000`;
- run-owned observations and price events: `92,748` each;
- seller snapshots: `9,788`;
- review-only candidates: `75,946`;
- strict internal rollups: `3,496`;
- review-ready: `2,436`;
- needs more evidence: `1,060`;
- cursor advanced exactly once from `50` to `550` of `8,400`;
- final run-scoped readback findings: `0`;
- candidate direct-publish rows: `0`;
- public, app-visible, market-truth, canonical, vault, image, and delete boundaries: `0` writes;
- duration: `2,733` seconds (`45m 33s`).

Collision-aware apply verification includes immutable planned rows already owned by prior acquisition runs. Independent run-scoped readback includes only rows owned by this source run. Inserted plus no-op counts reconcile exactly to each apply readback; no row was deleted, reassigned, or overwritten.

Artifacts:

- Gate directory: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803/canary_500`
- Final reconciliation SHA-256: `ec4beb410ee2fbb2b31e38451ba12a9ac92b7dea395b930bce94d78ae7b001b4`
- Independent DB reconciliation SHA-256: `cebd22a5bb48bc85a1f19fc492cc776185c589febcab79547c1ae659500a6433`
- Artifact manifest SHA-256: `96be749cb8be58b8e82d306aebdf8447a7f6c7c6925a7bebb599623bde62110d`
- Hash-validation output SHA-256: `07a4e4ceae453e7ca79b12cb4aa198afe01520d0def453672082606dbddd9d19`

## Runtime State

- Current symlink: `/opt/grookai_mee_current`
- Runtime artifacts: `/var/lib/grookai/mee/audits`
- Timer: disabled and inactive
- Service: inactive
- Matching workers: `0`
- Available disk after the 500-call canary: `24,936,148,992` bytes
- Required provider-call floor: `12,884,901,888` bytes
- Current margin above floor: `12,051,247,104` bytes
- Measured 500-call artifact footprint: `945,378,228` bytes
- Conservative projected 4,000-call artifact footprint with 25% margin: `9,453,782,280` bytes
- Conservative projected free bytes after 4,000 calls: `15,482,366,712`
- Conservative projected margin above floor: `2,597,464,824` bytes
- Remaining legacy mutable checkout audit footprint after governed retention: approximately `62 GB`

The measured capacity is sufficient for one bounded 4,000-call canary under the current floor, but not for concurrent work or unattended repetition. The timer must remain disabled and retention must run again before any subsequent provider cycle if the post-run margin is inadequate.

## Invariants

- No delete, truncate, or destructive evidence rewrite.
- No canonical identity, vault, image, public pricing, or app-visible pricing writes.
- Provider work is never automatically repeated after an indeterminate attempt.
- Every downstream plan and strict version binds to the exact source acquisition run.
- Critical readback findings produce a failed exit status.
- Cursor movement is append-only and follows successful warehouse apply.
- Source-manifest drift blocks an incomplete rotating cycle.
- Disk capacity is checked before provider calls.
- Runtime artifacts remain outside release directories.
- Deployment SHA must identify the exact tracked code that ran.

## Verification

- Latest affected MEE/market-listing contract suite: `513/513` passed.
- Latest focused frozen-plan/manifest suite: `12/12` passed.
- Latest Node syntax checks: passed.
- Latest `git diff --check`: passed.
- Earlier full repository contract suite on the recovery line: `1,259/1,259` passed.
- The full repository suite was not rerun after the final manifest-order repair; the complete affected MEE suite and focused tests were rerun.
- GitHub `Contracts Runtime Protection` run `30786648456`: passed.
- GitHub `Contracts Drift Gate` run `30786648498`: passed.
- Activated-release no-provider dry run: passed.
- Historical production readback: passed with zero findings.
- 50-call production canary: passed after downstream-only repair, with zero refetch.

## What Must Never Be Broken

- Raw evidence, candidates, strict rollups, and published pricing must remain separate authorities.
- Review-only rows must never become market truth through MEE ingestion.
- A zero process exit must not hide critical reconciliation findings.
- Missing state plus a prior provider attempt must fail closed.
- Rollback must switch code without deleting additive database state.

## Exact Next Gate

1. Keep the timer disabled and confirm no MEE worker is active.
2. Freeze the exact current cursor (`550`), source manifest (`96a150e7d99cd994fcee945147d879b0bf8398992fe8246daad3814611dc54aa`), release SHA, 4,000-request slice, and disk projection before any provider call.
3. Run one bounded 4,000-call rotating canary from cursor index `550` using the frozen source plan and a unique outer run key.
4. Reconcile provider calls, retries, source rows, run-owned warehouse rows, collisions, candidates, strict rollups, cursor movement, phase ledger, artifact hashes, disk use, and all publication boundaries.
5. Stop on any provider ambiguity, duplicate cursor event, reconciliation mismatch, disk-floor breach, or boundary leak. Do not restart or refetch in the same gate.
6. If clean, perform governed retention as needed, then enable the timer for exactly three observed unattended rotating cycles.

Do not enable the timer before the 4,000-call gate and its independent reconciliation pass.
