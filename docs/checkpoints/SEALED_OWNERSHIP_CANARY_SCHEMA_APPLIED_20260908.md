# Sealed Ownership Canary Schema Applied

Date: 2026-09-08. Status: production schema applied and independently verified;
ownership remains disabled. This is not an activated product canary.

## Authority And Execution

The founder explicitly approved the named schema-only migration after the
confirmation question linked its frozen scope. That single-use authority has
now been consumed. Do not rerun the production apply or remove its marker.

- Execution commit: `539fa592d5784d62833b6ee6df6ddb0d30c00366`.
- Execution branch: `feature/sealed-account-canary-boundary`.
- Migration: `20260908193000_sealed_ownership_account_canary_v1.sql`.
- SQL SHA-256: `2d03425ceafa92a760f3c4fae15183eeba460aaee3c3f56769bd96e1ac426b7f`.
- Plan fingerprint: `80c1095bc7444896d54dd4b0cbc27c66e36ff86a51c35d8b2dce4a89f0bb2554`.
- Production project: `ycdxbpibncqcchqiihfz`.
- Apply interval: 21:15:57 to 21:16:07 UTC, September 8.

Exactly the approved schema and one migration-ledger row were committed in one
bounded transaction. The new account-grant and variant tables are empty, with
forced RLS and bounded service-only grants. The canary switch defaults false;
the existing broad switch was not changed. No enrollment or activation occurred.

## Proof

- Fresh strict preflight matched exactly one pending migration; all 393 replayed.
- Eight focused source/executor guard tests passed.
- Fresh baseline matched all 392 prior migration IDs, functions and security.
- Precommit verification and two independent readbacks passed, including exact
  ledger statements, function definitions, ACLs, policies and protected hashes.
- Final full replay comparison passed all 393 migrations and 891 security
  objects; exact function differences and reconciled schema SQL were empty.
- Storage policies matched exactly. No source-reconciliation exception widened.
- Both `enabled` and `canary_enabled` are false.
- Zero enrolled owners, allowed variants, sealed copies or sealed request rows.
- All 3,401 existing owned copies, three dispositions and 26 owner allocator
  rows remained unchanged, as did protected release pointers and controls.
- Canonical sanity: 170,404 cards, 3,397 sets and 32,903 traits.

The executor's `production_data_writes: 0` refers to business data; the authorized
schema changes and one migration-ledger insertion did occur. A readback command's
`committed: false` means that read-only command did not commit another transaction,
not that the preceding apply was rolled back.

## Local Test-Harness Finding

`tests/integration/sealed_owned_instances_v1.mjs` reapplies the original ownership
and read-model migrations before its tests. Consequently, running it AFTER a
full 393-migration replay restores two old local function definitions. Its 35
rollback tests passed, but the later exact comparison correctly caught this
local baseline contamination. Production continued to match the approved SQL.

No production repair or second apply was performed. A standalone strict PrePush
replayed all 393 migrations without that legacy test afterward. Final full
schema/security/Storage parity then passed at 21:20:08 UTC. Both failed comparison
receipts are retained. Before future fixture/UI work, repair the local harness
ordering or ensure a final full replay occurs after its legacy checks; never
normalize away these actual function differences.

The isolated worktree now retains the exact new migration and its database55430
is on the clean 393-migration baseline. Populated local54330 was not touched.
Do not remove the canary migration to return to a stale 392-migration baseline.

## Artifacts

Root:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_account_canary_schema_preparation/`.

- `APPROVAL_20260908.md`: bounded approval transcription.
- `production_execution_started.json`: preserve permanently; do not reuse.
- `2026-09-08T21-14-57-937Z/`: fresh preflight and protected baseline.
- `2026-09-08T21-15-57-358Z--apply/`: committed apply and independent verification.
- `2026-09-08T21-16-38-398Z--readback/`: second independent readback.
- `2026-09-08T21-19-58-969Z_footprint/`: final full parity and disabled-state proof.
- `approved_strict_prepush.log`, `approved_post_apply_strict.log` and
  `approved_contract_tests.log`: retained test logs.

Earlier preparation artifacts are historical and intentionally remain unchanged.
The committed migration source is unchanged; this checkpoint is post-execution
documentation. No GitHub push, Vercel deployment or mobile build was performed.

## Next Gates

1. Fix local replay/fixture ordering before more UI tests; preserve final schema
   parity instead of letting older tests replace the new account policy.
2. Finish browser file-picker, print/PDF, confirmed bulk removal and native iOS
   lifecycle/share/print acceptance using isolated fixtures, not founder inventory.
3. Reconcile the applied migration source through normal repository review;
   older main/worktrees must not run a schema apply with the old migration set.
4. Freeze a separate owner/variant/expiry/limit activation scope, then perform
   the bounded real-owner canary and readback. No global activation is authorized.
5. Broad release requires lifecycle acceptance and monitoring. This schema-only
   approval authorizes no inventory, Storage, pricing, publication or client work.

## Harness Repair And UI Follow-Up

The next-step harness repair keeps the historical idempotency checks, but strips
their transaction wrappers, executes them twice inside one rollback-only
transaction, and asserts all current public function definitions afterward.
Lifecycle fixtures therefore run against the latest policy, not legacy functions.
Six source contracts and 36 SQL lifecycle checks passed. The local concurrency
and Auth/Storage fixture run also passed; its evidence is under
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-08T21-39-02-380Z_fixtures/`.

Chrome extension control again returned `Debugger unattached`. The separate
native Windows Computer Use route was available, but stopped while restoring
the test browser because it could not determine the browser URL confidently
enough to enforce policy. No restriction was bypassed or browser setting changed.
No browser upload/print/bulk-removal acceptance was completed.
Mac SSH confirmed a booted iPhone 17 Pro simulator; no iOS build or test ran.

The owned local3157 harness was stopped and its generated Next.js declaration
change restored. Cleanup replays the current 393-migration isolated baseline
using the repaired runner, under
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-08T21-42-23-337Z_replay/`.
Check that directory's final summary for completion; do not use synthetic fixture
data as founder inventory. Production received no writes in this follow-up.

## Native iOS Follow-Up (22:10-22:37 UTC)

Built a separate simulator app against disposable local API55429/database55430.
The Mac baseline was detached `5d823163eea470c31213de6f457e4e8124db0163`, with
the exact two Flutter deltas from `539fa592d5784d62833b6ee6df6ddb0d30c00366`
overlaid. No other lib/ios/pubspec differences exist between those revisions.
This is a local debug build numbered 316, NOT a production/TestFlight release.
The original Mac worktree and existing simulator were preserved.

Evidence root:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_ios_enabled_acceptance/`.
Raw Xcode result bundles remain on the Mac under
`~/grookai_sealed_ios_acceptance_probe_20260908/`; logs and selected PNGs were
copied to the evidence root. `local_ui_readback.json` records the final local
copy IDs, photo paths, notes, archive states and dispositions.

Observed acceptance:

- Synthetic email/password sign-in reached authenticated Pulse and Vault.
- Vault displayed all 22 initial sealed copies and the separate unpriced total.
- Asking price USD 19.95 saved and appeared on the Vault row.
- Private notes saved and survived reopening the dialog.
- Adding one copy increased the active total to 23 after refresh.
- Sale with USD 24.50 and synthetic counterparty appeared in history.
- Trade with the synthetic received-item description appeared in history.
- Confirmed removal named exactly two copies and reduced active count to 19.
- Independent local database readback matched 19 active copies, 24 total rows
  including prior fixture history, and three disposition rows.
- Native copy share sheet contained exact product identity and GVVI URL; no
  recipient was selected and no message was sent.
- Native print preview visibly rendered one page with identity, copy ID and QR;
  no physical print job was sent.
- Native image picker uploaded a synthetic screenshot to local Storage and the
  copy page visibly rendered that image as its front photo.

Retain failed probes too. Login required an accessibility-type-independent
password lookup and avoiding a redundant submit after keyboard Done. The
simulator's Flutter accessibility frames lagged after dialog/selection layout
changes; screenshot-verified coordinates completed sale and bulk tests. A fresh
Xcode DerivedData directory was needed to remove stale test-runner ambiguity.
The inspect-only bulk probe's success does NOT prove removal; `bulk_final.log`
and its confirmation/removal screenshots plus database readback do.

Remaining UI work: browser upload/print/confirmed removal, native lot sharing,
wall section membership and wall disappearance verification, back-photo upload,
and mixed priced/unpriced totals against an appropriate local price fixture.
Selection wording also needs repair: the shared Vault toolbar says
`1 selected / 0 shown` for sealed-only selection because the shown count is
card-only. Do not mark the entire product acceptance complete from these probes.

The dedicated simulator `EE43E7A7-34C1-4B8B-9429-CDB3C4E05E37` was shut down,
the loopback-only SSH tunnel was closed, and final fixture cleanup runs under
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-08T22-37-07-277Z_replay/`.
Final cleanup passed all 393 migrations and 36 SQL checks. Independent local
readback found zero users and zero owned copies. The native harness configured
only the local Supabase API; no production database writes or activation occurred. No commit,
push, Vercel deploy, TestFlight upload or real-owner enrollment occurred.

## Web And Native Follow-Up (23:11 UTC Onward)

Evidence: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_remaining_ios_acceptance/README.md`.
Base HEAD remains `539fa592d5784d62833b6ee6df6ddb0d30c00366` on
`feature/sealed-account-canary-boundary`; no commit or push. Existing dirty work
is preserved. `lib/main_vault.dart` now reports the combined selected count
without presenting card-only visible counts as all inventory. The card-only
bulk button says Select cards and is disabled for a sealed-only collection.
Its new source contract plus targeted lot/service tests pass 33/33; targeted
Flutter analyze reports no issues. The isolated Mac simulator was rebuilt with
this exact main_vault.dart overlay and local-only defines, still debug build316.

Verified web UI: front/back upload and signed-image rendering after reload;
private notes readback; exact-GVVI QR print render; both lot PNG downloads;
canceled bulk removal without mutation; confirmed two-copy removal with reload;
one USD12.34 priced copy plus 19 unpriced; Wall section membership readback;
removal from Wall and Vault while retaining exact-copy history. Headless print()
was intercepted; the PDF uses the actual print CSS, not an OS printer test.
Final independent local DB readback found 19 active, four archived (including
original fixture history), zero Wall rows and no priced copies after removing
the one priced copy. The local price/image release is synthetic test evidence,
not production pricing or proof of source image authenticity.

Native selection wording and mixed total passed; see initial.log and
lot_mixed.log, including identifier `vault_owned_total_v1_1_19_12.34`.
Do not claim all native acceptance complete. Final native lot selection still
failed the two-selected assertion; earlier inspect-only passes prove no export.
Native Wall membership/disappearance lacks reliable visual confirmation.
Native back-picker/save was exercised, but Replace back existed before the test;
separate persisted-image rendering still needs proof. Diagnose stale Flutter
accessibility geometry versus actual interaction behavior before changing code.

Remaining gate: finish those three native checks on the isolated simulator,
retain exact readback and screenshots, then review the separate bounded
account-canary activation plan. Do not reapply the consumed schema migration,
ship local defines, enroll a real owner or enable production from this evidence.
No production data, flags, deployments or TestFlight builds changed here.

Owned local3157 server/children and reverse tunnel were stopped; only dedicated
simulator EE43E7A7-34C1-4B8B-9429-CDB3C4E05E37 was shut down. Generated Next
route declaration restored. Final cleanup replay:
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-08T23-36-26-946Z_replay/`.
Cleanup completed: 393 migrations replayed, 36 SQL checks passed, independent
readback found zero users and zero owned copies. Local3157 listeners and owned
reverse tunnels both verified zero. Final git diff check passed.

## Native Completion (September 8, 2026, 18:31 MDT)

The three remaining native acceptance gates are now confirmed, superseding the
open-gate notes above. Evidence and exact setup:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_native_completion/README.md`.
No production write, activation, owner enrollment, commit, push, deployment or
TestFlight upload occurred. Base HEAD remains `539fa592d5784d62833b6ee6df6ddb0d30c00366`.
Existing dirty work is preserved; this is an uncommitted local repair overlay.

- Native lot: two exact sealed copies selected; asking prices USD20 each and
  bundle USD40 reached Price Lot. Native Save Image generated front and back
  PNGs and the iOS share sheet offered Save 2 Images. Both actual PNG files were
  retrieved and visually inspected. Synthetic front photos were prepared through
  local authenticated Storage/RPCs, not represented as real product photography.
  No recipient or physical printer was selected.
- Back photo: initial NULL back pointer changed through the native picker to a
  unique revision; reopening visibly rendered Back photo. Exact signed-object
  readback returned 265,911 PNG bytes with a recorded SHA-256. The revision was
  still preserved after archival. The final reopen test alone is not upload
  proof; use phase2 upload, phase3 rendering and back_photo_readback.json together.
- Wall: checked membership survived reopening; selecting the named section
  showed the exact copy. Confirmed one-copy removal changed its section count
  from 1 to 0 and removed it from both Wall and refreshed Vault. Independent
  readback found 21 active copies (22 before), zero Wall/section copies, exactly
  one remove request and retained archived history. The second selected lot
  copy remained active. Removal is shown as archived in history by contract;
  only sale/trade operations create disposition rows.

Confirmed client repairs: exact-copy checkbox accessibility labels; no card-only
Wall total or empty-card message presented as an all-collectibles result; sealed
changes refresh parent Wall section counts; long seller handles fit the generated
back image without overflow. The original overflow PNG and failed targeting
probes are retained, not relabeled as successful acceptance.

Verification: final Xcode run 3/3 passed, 75 targeted Flutter tests including
goldens passed, targeted analysis passed, replay-boundary contracts 2/2 passed,
and git diff check passed. Only the dedicated simulator was shut down; the owned
loopback tunnel was stopped. Mandatory isolated cleanup replay is recorded at
`C:/grookai_vault_operator_artifacts/sealed_ownership/2026-09-09T00-33-15-699Z_replay/`.
Cleanup completed successfully: 393 migrations, 36 SQL checks, independent
readback of zero users and zero owned copies, dedicated simulator Shutdown,
and zero owned reverse tunnels. The packet contains cleanup_receipt.json and
exact Mac/Windows overlay hash parity in source_provenance.json.

Next separate gate: reconcile and commit reviewed client changes, prepare a
fresh bounded account-canary plan with exact owner/variant scope, then follow
its activation and release authority. Do not reapply the consumed schema
migration or ship the local-only simulator build316. Production remains off;
this evidence closes native acceptance, not production rollout.

## Account Plan Preparation (September 8, 2026 MDT)

The completed native fixes, replay-harness repair and acceptance checkpoint are
being preserved with the new read-only account-plan producer. This follow-up
does not repeat the consumed schema apply or enable production additions.

Fresh read-only discovery confirmed 393 migration IDs, the canonical counts
above, both controls false, zero grants/variant grants/copies/requests and
forced-RLS service-only grant tables. One unambiguous active founder has an
existing owner allocator. No personal identifier is recorded in git.

The two proposed released, priced, image-backed variants are Pokemon's
151 Binder Collection and MTG's 10th Edition - Booster Box. Selection is the
first eligible alphabetic variant in each governed 100-row page, not a claim
that either product belongs in the founder's inventory. The canary must never
create synthetic founder holdings to satisfy a test.

The preparation caught and corrected planner-only assumptions: historical
8-digit migration IDs must participate in parity, the Pokemon pricing RPC
takes a game argument, image paths have a two-character hash directory, and
price observation dates must remain date-only rather than timezone-shifted
JavaScript dates. Failed discovery is retained; production was not repaired
or mutated to make preparation pass.

Verification: 50 targeted Node contracts pass (41 new planner checks plus nine
existing policy/photo/replay checks), seven focused Flutter tests pass, analysis
of all four changed client files reports no issues, syntax checks and diff checks
pass. The earlier native 3/3, Flutter 75/75 and full 393-migration/36-check cleanup
evidence remains authoritative and unchanged.

The full commit hook initially lacked its database environment; the retry uses
only disposable local55430 with read-only session defaults. It caught one old
bulk-selection source assertion for `Select all`, now updated to require the
more accurate `Select cards` and the sealed-only disabled guard. Full hook
results are retained externally; no hook was disabled or production credential
passed into the test suite.

External evidence root:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_account_activation_preparation/`.
`discovery/` is the initial diagnostic; `discovery_v2/` corrects selection/parity;
`contracts.log` retains the targeted results. After this producer is committed
with a clean tree, run:

```powershell
node scripts/schema/sealed_ownership_account_canary_plan_v1.mjs --out-dir=C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_account_activation_preparation/frozen
```

`frozen/activation_plan.json` is the source of the exact execution SHA, owner,
variants, 24-hour UTC window and 25-copy lifetime budget. `preflight.json` and
`ARTIFACT_HASHES.json` must reconcile. Check the actual files and the external
completion receipt; this instruction alone is not proof the plan was emitted.
Do not amend code merely to record the resulting SHA inside that same commit.

Remaining release work: implement/test the fingerprint-bound activation and
rollback transaction, deploy production-configured repairs, then run the
authorized account-only canary with actual owned inventory and exact readback.
No broad release, global flag, fake sale/trade, automatic inventory creation,
push, deployment or TestFlight upload is part of this preparation. Keep the
private plan outside git and refresh its evidence if its window expires.
