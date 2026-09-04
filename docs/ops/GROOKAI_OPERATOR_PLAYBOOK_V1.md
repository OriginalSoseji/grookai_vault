# Grookai Operator Playbook V1

**Status:** Active

**Purpose:** This is the first operational reference for Grookai work. It
reduces reliance on chat history and prevents repeated setup, wrong-account
conclusions, stale-state decisions, and avoidable founder handoffs.

Read this before asking the founder for access, repeating a setup step, or
declaring that an account, app, device, database object, worker, or deployment
does not exist.

## Living Document Rule

Update this playbook whenever a change introduces or materially changes any of
the following:

- a recurring operational procedure;
- an account, console, browser profile, or authentication route;
- a workstation, remote host, connected-device, build, or deployment workflow;
- a scheduled worker, ingestion lane, pricing lane, or monitoring process;
- a production-write boundary, approval boundary, rollback path, or release
  gate;
- an authoritative status artifact, contract, checkpoint, runbook, or command.

The playbook update belongs in the same commit as the process change whenever
practical. Preserve detailed domain instructions in their dedicated document
and add or update the concise pointer here. New operational knowledge must not
exist only in chat, an unindexed audit, or one person's memory.

## 1. Source-Of-Truth Order

Use evidence in this order:

1. Fresh direct readback from the actual system being discussed.
2. Current machine-readable status or audit artifact.
3. Current domain checkpoint and governing contract.
4. Repository implementation and configuration.
5. Historical checkpoints and chat context.

Historical checkpoints preserve what was true at a point in time. They do not
override a newer direct readback. When direct evidence changes current truth,
update the current status artifact and add a new checkpoint; do not rewrite an
immutable historical record.

## 2. First Five Minutes Of Any Task

1. Confirm the intended repository and worktree.
2. Run `git status --short`, `git branch --show-current`, and
   `git rev-parse HEAD`.
3. Read this playbook, `docs/GROOKAI_RULEBOOK.md`, and the relevant domain
   checkpoint/index.
4. Inspect existing automation, artifacts, browser sessions, devices, and
   remote access before requesting setup.
5. State the exact boundary: read-only, dry-run, local write, production write,
   deployment, or external submission.
6. Define the direct readback that will prove completion before changing
   anything.

Do not use a dirty worktree blindly. Preserve unrelated user changes and use an
isolated worktree when the active checkout belongs to another workstream.

## 3. Access And Environment Map

### Windows repository work

- Inspect all worktrees with `git worktree list` before assuming the current
  folder is the correct branch.
- Never discard unrelated changes to make a branch clean.
- Record the commit that actually produced a build, run, or audit. A later
  documentation commit is not its provenance.

### Chrome and external consoles

- Use the Chrome window/profile labeled `Work` when a task depends on an
  existing Grookai signed-in session.
- Verify the displayed organization, app, package, and environment before
  drawing conclusions or editing anything.
- A signup page can mean the wrong Google profile is active. It is not proof
  that no developer account exists.
- Prefer account switching and direct readback over creating any new account,
  app, project, or listing.

### Google Play Console

Verify all four identifiers before working:

- developer account: `Grookai`;
- account type: organization;
- app: `Grookai Vault`;
- package: `com.grookai.vault`.

Current machine-readable truth lives at:

- `docs/audits/store_release_readiness_v1/external_console_status.json`

Prepared Android metadata and data-safety answers live at:

- `docs/release/google_play_android_1_0.json`
- `docs/release/google_play_data_safety_android_1_0.md`

Prepared media and hashes live at:

- `docs/audits/store_release_readiness_v1/store_media_manifest_v1.json`
- `artifacts/store/google_play/`

Never create a second Play app because the existing app is hidden by the wrong
profile. Do not accept IARC or other legal terms, send a draft for review, or
publish without explicit authorization for that action.

Current August 17 readback:

- Content ratings is actioned after the submitted IARC request.
- Advertising ID and photo/video permission declarations remain under
  `Need attention`.
- Store listing media remains a separate release gate.

### Collector chat safety

The active product contract is:

- `docs/contracts/CHAT_SAFETY_CONTRACT_V1.md`

Normal web and Flutter message paths apply `CHAT_SAFETY_POLICY_V1`, while
`trust_blocks` and `trust_reports` preserve the existing database-backed block
and report boundaries. Founder report review is available at
`/founder/trust-safety`.

Do not claim bypass-proof database moderation yet. Strict migration preflight is
blocked by the unrelated pending local-only migration
`20260816160000_mtg_tcgplayer_market_publication_v1.sql`. Resolve that ledger
state first, then use a separately approved forward-only database enforcement
gate. Never delete or rewrite existing messages while adding moderation.

### App Store Connect and Mac

The automation contract and commands are in:

- `docs/app_store_connect_automation.md`
- `docs/release/app_store_connect_ios_1_0.json`
- `docs/release/app_store_privacy_ios_1_0.md`

Use the existing Tailscale Mac route for Xcode, native iOS builds, simulators,
archives, and TestFlight. Discover its current address from Tailscale rather
than relying on an old IP. The known host is `cesars-macbook-pro-2`, and the
existing SSH key is `~/.ssh/grookai_mac_remote_ed25519`.

Before touching the Mac checkout:

1. inspect its branch, commit, status, and worktrees;
2. preserve a dirty primary checkout;
3. create or reuse an isolated worktree at the intended commit;
4. confirm the build number and bundle identity before archive/upload;
5. record the exact commit and artifact that were uploaded.

API key files and review credentials stay on the operator machine and outside
git. Uploading a build is not the same as attaching it to a release or
submitting it for review.

### Android devices and emulators

Start with:

```powershell
flutter devices
adb devices -l
```

Use an emulator for repeatable flows that do not require a physical device.
Use Samsung/physical Android only for hardware, signing, deep-link, camera, or
real-device acceptance evidence. The unattended locked-device harness is
documented in `docs/runbooks/ANDROID_LOCKED_ACCEPTANCE_DEBUG.md`.

Do not ask the founder to reconnect or unlock a device until checking ADB,
Flutter device discovery, emulator availability, and whether a stale process
owns the connection.

## 4. Operational Workflow Map

| Workstream | Start here | Completion evidence |
|---|---|---|
| Engineering and Supabase | `docs/GROOKAI_RULEBOOK.md` | Governing tests plus direct environment/DB readback |
| Contracts | `docs/CONTRACT_INDEX.md` | Relevant contract tests and unchanged invariants |
| Checkpoints | `docs/checkpoints/CHECKPOINT_INDEX.md` | New current-state checkpoint linked from its domain index |
| Store readiness | `docs/release/STORE_RELEASE_READINESS_V1.md` | `npm run release:store:require` and direct console readback |
| Store media | `docs/checkpoints/product/STORE_MEDIA_PREPARATION_20260817_V1.md` | Manifest hashes, dimensions, and uploaded-console readback |
| App Store automation | `docs/app_store_connect_automation.md` | Status readback for exact build/version and screenshot set |
| Release readiness | `docs/release/PRODUCTION_READINESS_GATE_V1.md` | `npm run release:completion:require` and required soak evidence |
| Pricing/MEE definition | `docs/contracts/MEE_PRICING_PLATFORM_PRODUCTION_V1_DEFINITION_OF_DONE.md` | Every frozen release gate reconciled |
| Pricing resume | `docs/system/RESUME_PRICING_V1.md` | Current pricing checkpoint and production readback |
| MTG sealed world | `docs/checkpoints/pricing/PRICING_CHECKPOINT_105_MTG_SEALED_IMAGE_COVERAGE_COMPLETED.md` | Gate A reconciled all 2,182 members; 2,149 are image-eligible, 33 are explicit gaps, and no upload or activation occurred |
| MEE nightly operations | `docs/runbooks/MEE_NIGHTLY_DROPLET_WORKER_V1.md` | Live-ops verifier plus newest run artifacts |
| TCGCSV warehouse | `docs/runbooks/TCGCSV_FULL_SOURCE_WAREHOUSE_V1.md` | Warehouse reconciliation with no public-price mutation |
| New Pokemon sets | `docs/playbooks/NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1.md` | Manifest-backed canon, mapping, and image readback |
| Migration maintenance | `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md` | Strict preflight, replay, remote readback, and clean history |
| GitHub/CI | `.github/workflows/` and the current checkpoint | Required checks green for the exact commit |
| System parity and serial integration | `docs/contracts/SYSTEM_PARITY_CRAWL_V1.md` | Immutable current-main crawl, artifact hashes, and zero unexplained candidate regressions |

Use `docs/INDEX.md` when the workstream is not listed above. Do not invent a
new procedure until checking for an existing contract, playbook, runbook,
checkpoint, or script.

### System parity and convergence prevention

Before integrating multiple deferred domains, capture current `origin/main`
with:

```powershell
npm run system:parity:baseline
npm run system:parity:test
```

Parallel read-only research and fixture generation are allowed, but production
integration remains serial: one bounded capability, one fresh-main branch, one
reviewable PR, then rebaseline. Do not combine MTG sealed, multilingual Pokemon,
sealed automation, collectible adapters, and Visual Search into one candidate.
Candidate parity runs must use the same crawler version and the recorded
baseline directory. A missing migration, route, workflow, entrypoint, database
object, policy, or previously healthy product case blocks the lane unless the
active contract permits an explicit versioned disposition; migration mutation
is never waivable.

### MTG sealed world gate

Current authority is
`docs/checkpoints/pricing/PRICING_CHECKPOINT_105_MTG_SEALED_IMAGE_COVERAGE_COMPLETED.md`.
Operate the lane only through `.github/workflows/mtg-sealed-world-runner.yml`
and `.github/workflows/mtg-sealed-visibility-boundary.yml` from an exact merged
`main` SHA supplied as `expected_sha`.

The two sealed schema migrations and the durable MTG payload are applied.
Steps 1-13 are complete and remain below as immutable operation history. Do not
replay them. The single-use `apply` authority for producer
`800d41e65fbaaaf52f1e32b5cde1ae0367e1a976` is consumed. A future mutation
requires a new contract, producer, fingerprints, rollback proof, and explicit
authority. MTG sealed visibility remains hidden.

The complete operation order is:

1. `migration_dry_run` - remote ledger and sole-pending proof, zero writes.
2. Obtain explicit authority for the exact migration SHA-256.
3. `migration_apply` - apply only the proven per-game release migration.
4. `mtg-sealed-visibility-boundary.yml` `migration_dry_run` - prove the
   sealed-specific visibility migration is the sole pending migration. This
   gate is required when MTG card-catalog visibility is already `signed_in`.
5. Obtain explicit authority for the exact sealed-visibility migration SHA-256.
6. `mtg-sealed-visibility-boundary.yml` `migration_apply` - apply the isolated
   visibility boundary and run its complete readback automatically.
7. `migration_readback` - independently verify both exact migration hashes and
   ledger row, constraint definitions, function definitions and ACLs, table
   grants, RLS/policies, preserved One Piece release data, empty MTG target,
   and hidden MTG visibility. Dispatch it from the merged producer SHA:

   ```powershell
   gh workflow run mtg-sealed-world-runner.yml --ref main `
     -f operation=migration_readback -f expected_sha=<merged-main-sha>
   ```

   Preserve the `mtg-sealed-migration_readback-<run-id>` workflow artifact;
   its `mtg-sealed-migration-readback/` directory contains `run_plan.json`,
   `migration_readback.json`, `summary.json`, `REPORT.md`, and
   `artifact_hashes.json`.
8. `plan` - freeze a fresh live payload and fingerprint after schema apply.
9. `preflight` - read-only live boundary proof.
10. `rollback_canary` - full transaction with zero committed residue.
11. Obtain separate explicit authority for the exact sealed-world payload,
    including the producer SHA, plan fingerprint, source fingerprint, and exact
    payload counts JSON.
12. `apply` - durable MTG sealed catalog/qualification/release operation. Pass
    all separately approved values; the workflow and writer both fail closed on
    drift:

    ```powershell
    gh workflow run mtg-sealed-world-runner.yml --ref <exact-producer-ref> `
      -f operation=apply -f expected_sha=<exact-producer-sha> `
      -f expected_plan_fingerprint=<approved-plan-fingerprint> `
      -f expected_source_fingerprint=<approved-source-fingerprint> `
      -f 'expected_counts_json=<approved-compact-counts-json>'
    ```
13. `readback` - independent payload, release, cross-game, and visibility
    reconciliation.

Steps 12 and 13 completed in workflow runs `33828154527` and `33829699266`.
The separate readback regenerated the exact payload, reconciled every durable
projection and the MTG pointer, and wrote zero rows. Do not dispatch `apply`
again with the checkpoint 101 values. The aggregate write-count telemetry
repair described in checkpoint 103 is complete and did not mutate production.
Merged-main readback run `33834897002` passed with zero writes. Checkpoint 105
records the subsequent complete Gate A audit while
`MTG_SEALED_PRODUCTIZATION_GATES_V1` keeps self-hosted image mutation,
governed pricing refresh, and signed-in visibility as separate future gates.

Gate A image coverage is operated only through
`.github/workflows/mtg-sealed-image-coverage-v1.yml` from an exact merged
`main` SHA. The workflow requires `SUPABASE_DB_URL`, verifies the production
project ref and canonical minimum counts, queries the active frozen MTG release
inside a read-only transaction, and performs bounded GET requests against exact
allowlisted TCGPlayer image routes. It writes GitHub artifacts only.

```powershell
gh workflow run mtg-sealed-image-coverage-v1.yml --ref main `
  -f expected_sha=<exact-merged-main-sha>
```

Preserve the `mtg-sealed-image-coverage-v1-<run-id>` artifact. Confirm
`summary.json` reports exactly 2,182 selected members, zero reconciliation
mismatches, and zero writes in every boundary. Review `exceptions.jsonl` before
freezing an eligible/excluded member set. Do not upload Storage objects, apply a
migration, write image pointers, refresh pricing, deploy clients, or activate
visibility from this workflow.

Run `33841181449` completed this operation from
`e616615883cb808ad8c870380d9d52da4a4d80bf`. It froze 2,149 eligible members
and 33 explicit exceptions with zero reconciliation mismatches and zero writes.
Permanent compressed member-level evidence is linked from checkpoint 105. Do
not rerun Gate A merely to recreate that evidence; a new audit is justified
only by a separately versioned source or release change.

Never use `--include-all`. Migration authority does not authorize the MTG
catalog payload, and a plan created before migration apply must be regenerated
before durable data work. A plan produced before an apply-authority workflow
repair is evidence only; rerun plan, preflight, and rollback canary from the
exact merged repair SHA before requesting payload authority.

## 5. Release And Store Commands

From the repository root:

```powershell
npm run release:store:media
npm run release:store:status
npm run release:store:require
npm run release:secret-guard
```

`release:store:status` may report external blockers while repository metadata
is valid. `release:store:require` is the fail-closed submission gate. Prepared
metadata, saved drafts, and local assets never satisfy external verification.

Run the full ship gate when the change affects a release candidate:

```powershell
npm run shipcheck
```

For a narrow documentation-only correction, at minimum run `git diff --check`
and any contract test that validates the changed status artifact or index.

## 6. Database And Production-Write Safety

Before any Supabase-backed work, execute the environment sanity process in
`docs/GROOKAI_RULEBOOK.md`. Confirm the project reference and canonical counts;
do not infer data loss from one empty query.

For schema work:

1. audit and classify;
2. follow `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md`;
3. run strict migration preflight;
4. prove local replay;
5. freeze exact migration IDs and payload hashes;
6. apply only the authorized set;
7. read back schema, grants/RLS, ledger, and boundary invariants.

No Studio schema edits, ad hoc production SQL, destructive cleanup, or broader
payload is implied by approval for a bounded apply.

For data ingestion, warehouse and candidate staging are not canonical truth.
Follow the governing ingestion contract before promoting identity, pricing,
images, or publication state.

## 7. GitHub, Deployments, And Builds

- Confirm which commit a failed workflow ran before repairing code.
- Inspect the failing job and exact logs; do not restart repeatedly without a
  failure classification.
- Keep generated audit evidence tied to the commit that produced it.
- A green repository build is not proof of production deployment.
- A deployment is not proof of correct rendering; smoke-test the deployed URL
  or installed build.
- A TestFlight or Play upload is not proof that all users received the build.

When preparing a release, reconcile this chain:

```text
source commit
-> build artifact
-> uploaded build
-> selected release
-> deployed/distributed version
-> device or browser readback
```

### Repository reconciliation disposition

After a repository reconciliation merge, rebuild the non-destructive branch and
worktree disposition ledger from a clean topic branch based on current
`origin/main`:

```powershell
node scripts/repository/build_postmerge_disposition_ledger.mjs --authority=origin/main --out-dir=docs/audits/repository_postmerge_disposition_20260902
node --test tests/contracts/repository_postmerge_disposition_v1.test.mjs
```

The durable outputs are:

- `docs/audits/repository_postmerge_disposition_20260902/postmerge_disposition_ledger.jsonl`
- `docs/audits/repository_postmerge_disposition_20260902/REPOSITORY_POSTMERGE_DISPOSITION_REPORT_V1.md`
- `docs/audits/repository_postmerge_disposition_20260902/artifact_hashes.json`

`origin/main` and its recorded SHA are authority. A local branch or worktree
named `main` does not become authority through its name and must be classified
from actual Git ancestry and dirty state.

This process is read-only except for its generated repository artifacts. Every
ledger row must retain `delete_authorized: false`. Its next gate may create an
owner-readable archival candidate packet from clean, main-contained sources,
but it may not delete branches, tags, worktrees, directories, PRs, artifacts,
or recovery objects.

Build that owner-review packet with:

```powershell
node scripts/repository/build_archive_candidate_packet.mjs
node --test tests/contracts/repository_archive_candidate_packet_v1.test.mjs
```

The packet deduplicates local branches, remote branches, and linked worktrees.
It excludes dirty, unreadable, detached, migration-bearing, open-PR, protected,
and automation-referenced sources. Windows scheduled-task and running-process
inventories fail closed: if either cannot be read, no otherwise eligible source
is presented as an owner-review candidate. The output remains planning evidence
only; cleanup still requires a separate exact approval after a fresh verified
recovery bundle.

Prepare that exact recovery evidence with:

```powershell
node scripts/repository/build_prearchive_recovery_plan.mjs `
  --release-tag=<unique-private-recovery-tag> `
  --publish-recovery
node --test tests/contracts/repository_prearchive_recovery_v1.test.mjs
```

The planner revalidates every candidate against current refs, worktree state,
open PRs, repository automation, scheduled tasks, running processes, and
`origin/main`. It creates a Git bundle only for candidates that still pass,
uploads the bundle and manifest to the existing private reconciliation recovery
repository, downloads both into a separate readback directory, and verifies the
hashes and downloaded Git bundle. The resulting execution plan still authorizes
no cleanup. Branch or worktree removal remains a separately approved gate tied
to the exact selection fingerprint and bundle SHA-256.

Build the separately governed cleanup packet in dry-run mode with:

```powershell
node scripts/repository/execute_archive_cleanup_v1.mjs
node --test tests/contracts/repository_archive_cleanup_executor_v1.test.mjs
```

Dry-run is the default and performs no cleanup. Never add `--execute` unless an
owner authorization artifact matches the generated selection fingerprint,
execution fingerprint, action-manifest hash, base and supplement bundle hashes,
and exact action counts. Re-run the dry-run after any authority or target drift;
do not edit the packet to preserve a stale approval.

The executor deliberately passes `--no-verify` only for its governed remote
deletion and restoration pushes because this operator worktree is sparse while
the repository pre-push hook requires a full checkout. Before that bypass, the
executor requires a tracked-clean worktree, exact authorization, recovery
verification, and a second complete live revalidation. Remote deletion remains
atomic and protected by one exact SHA lease per ref. See
`docs/contracts/REPOSITORY_ARCHIVE_CLEANUP_EXECUTION_V1.md`.

On Windows, a clean Git status does not prove that Git can delete a worktree.
Ignored Flutter and Node directories can contain junctions or symbolic links
that make `git worktree remove` unregister the worktree before filesystem
deletion fails. The governed executor must inventory every reparse point, bind
its source and preservation destination into the authorization fingerprint,
relocate it outside the target, and track the worktree before removal starts.
If a partial directory remains, preserve it and reconstruct the exact worktree.
Never use broad `git worktree prune`, `git clean`, or recursive deletion as a
repair shortcut.

## 8. External-Action Boundaries

The following actions require explicit authorization even when repository and
browser access already exist:

- submitting a store release for review;
- publishing to production or broadening audience access;
- accepting legal agreements or rating terms;
- changing account roles, permissions, billing, or credentials;
- transmitting review credentials or personal contact details;
- applying a production database migration or bounded production payload not
  already covered by an explicit approval;
- destructive cleanup or irreversible external mutation.

Drafting metadata, running read-only audits, building locally, and preparing
artifacts do not authorize those actions.

## 9. Current Store Handoff

As of the current `2026-08-17` readback:

- the existing verified Google Play organization account and Grookai Vault app
  were found;
- the package is `com.grookai.vault`;
- the last directly read setup count was `9/11`, before the rating submission;
- Content ratings is now actioned;
- Advertising ID and photo/video permission declarations need attention;
- store listing media remains open;
- descriptions are saved as drafts and have not been sent for review;
- App Store Connect listing and review credentials are not freshly verified;
- all six declared store media assets are prepared and dimension-verified.

The authoritative current detail is:

- `docs/audits/store_release_readiness_v1/external_console_status.json`
- `docs/checkpoints/product/STORE_MEDIA_PREPARATION_20260817_V1.md`

If those facts change, update the status artifact and create a new checkpoint.
Do not edit this dated handoff in place to simulate historical continuity.

## 10. Handoff Standard

Every substantial task ends with:

- branch and exact commit;
- what changed;
- tests and direct readbacks performed;
- artifacts/checkpoint paths;
- production or external state actually reached;
- explicit remaining gates;
- any action the founder truly must perform and why automation cannot perform
  it.

Do not hand back a generic request such as "configure access" or "check the
console." Name the exact screen, account, field, and missing evidence, after
proving the repository and existing sessions cannot answer it.
