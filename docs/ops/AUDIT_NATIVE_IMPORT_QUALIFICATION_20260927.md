# Native import qualification — September 27

Latest: [durable attempt receipts](AUDIT_NATIVE_IMPORT_RECEIPTS_20260927.md).
The historical407 qualification below is preserved. Current backend candidate
has408 migrations; the unchanged Android407 client passed against that backend.
Use the new408 gateway helper, not the old407 server helper, with current source.

## Outcome

The native collection-import repair is qualified against the current production
schema and on an Android emulator using real local Auth, Edge, REST and database
services. A lost successful response can be retried without adding duplicate
copies. Reopening the same CSV now correctly recognizes saved quantities.
The normal application build407 is installed and opens successfully on the
emulator. No production schema, account, inventory or deployment was changed.

## Source and scope

Worktree `C:/grookai_vault_native_import_20260927`, branch
`fix/native-import-recovery-20260927`, base
`f44dcfeaca56d6d0cd9f446420cee238d12485e1`. Fetched main
`b86fee84fa0314dc143cd3cd6e7ce919e4fd435b` adds web/store work without native or
migration changes. All406 baseline migration hashes match. The sole added
migration is `20260926230000_atomic_vault_import_v1.sql`, unchanged SHA256
`e37a7b81a965ecad58d529523bd968ef543e283b2dca148a4f987d35d739b8c6`.
The other six pending audit migrations are excluded from this package.

The older staged candidate remains unchanged at tree
`b6c99bf1f3fdcb3d76b1ff3e8fce721c706fdc6e`. Private source freeze and final patch
record the exact current candidate. There is no commit, push or remote release.

## Verification and evidence

All paths below are relative to the private operator artifact folder
`C:/grookai_vault_operator_artifacts/native_import_qualification_20260927`.

| Check | Outcome | Evidence |
| --- | --- | --- |
| Read-only production406 baseline | Passed before and after adding the exact pending migration; normalized schema/security delta zero, 1,095 security objects; 171,021 cards, 3,400 sets, 32,903 traits | `baseline-latest.json`, `exact-pending-baseline.log` |
| Fresh407 replay | Passed empty reset and no-op local push; fixtures added only afterward | `full-407/replay-result.json` |
| Retained-data406-to-407 upgrade | Both preexisting synthetic copies and every snapshotted fixture row unchanged; resulting schema/security equals full407 | `upgrade-407/upgrade-result.json` |
| Change footprint | All10,456 existing schema objects preserved; only the import function added | `footprint-result.json` |
| Actual endpoint acceptance | Seven scenarios/eight tests passed: real auth, owner binding, metadata, response loss/retry, concurrent saves, late failure rollback and independent readback | `acceptance-1790558210666/result.json`, `endpoint-407.log` |
| Android emulator | Five copies committed; response deliberately lost; retry added zero; copy metadata read back; reopened CSV has no pending rows | `emulator-result.json`, `emulator-copy-readback.private.json`, `emulator-integration-final.private.log` |
| Normal app407 install/start | Separate local-only package installed and startup screen visually inspected | `apk-result.json`, `installed-apk.txt`, `installed-app.png` |
| Focused checks | 28 endpoint contracts, seven baseline guard tests, 11 Flutter recovery tests passed; changed-file analysis clean | `focused-contracts.log`, `preview-regressions.log`, `analyze.log` |
| Full regression suites | 760 Flutter tests; 5,572 Node contracts passed, four skipped, zero failures | `flutter-full.log`, `contracts-full.log` |

The Android run exposed a real preview defect: row keys used a different
separator from catalog match keys, so ownership was not subtracted when reopening
a CSV. The keys now share one implementation. Existing quantities are subtracted
only for an unambiguous canonical match; ambiguous printing rows stay visible.
Two regression tests cover both behaviors. Earlier failed emulator evidence and
its five saved fixture copies are preserved. The final pass uses a separate
synthetic account; it does not reset or overwrite the failed-run data.

## Local build and retained environment

APK: `grookai-native-import-407-emulator.apk`, SHA256
`a77e7801d42243a862af8cb52c4bc1da7e564abb18ab105c67ef4e9306c064c1`.
Normal `lib/main.dart`, debug, Android x64 Flutter target, versionCode407,
package `com.grookai.vault.lockedacceptance`, emulator5580. This is not the
integration-test harness APK and contains neither fixture email/password pair.
The app uses `http://10.0.2.2:57550`; public local connection defines only.
It is an emulator inspection build, not a Samsung or store release.

The gateway remains available at loopback57550, forwarding to full407 API57541
and the actual Edge handler under Deno57450. Its health URL is
`http://127.0.0.1:57550/__native_import_fixture_health`. To resume a stopped
gateway use `node scripts/tests/native_import_emulator_fixture_v1.mjs serve`
from this exact worktree. Never repeat `prepare`, `prepare-retry` or consumed
replay/upgrade commands. Fresh acceptance requires a newly bounded fixture;
the checked-in emulator test deliberately rejects a previously populated user.

Full and upgrade labs retain their volumes on internal Docker networks, with
loopback relays, zero scheduled-worker capacity and rollout flags off. Historical
labs were preserved. Docker's failed backend was restarted without deleting any
data. Android dependency downloads used an isolated build-only truststore copied
from JBR with the existing Windows inspection root; TLS verification remained on.
No system/JBR trust settings were changed. Full build logs and test credentials
remain outside the repository.

## Remaining release and audit work

1. Review/freeze the bounded native package, then run the governing exact-pending
   remote PrePush/apply gates. The baseline-only audit switch cannot authorize
   production migration. Release the RPC and authenticated Edge route before
   distributing the native client; verify production outcomes separately.
2. Qualify the same native repair on iOS and appropriate physical devices. The
   emulator result does not establish camera, hardware or store-release behavior.
3. Continue the separate slab/provider repairs and any required old-writer
   cutover. PSA access/reviewed mapping gaps remain open; this additive import
   function does not retire older installed writers or provide a global fence.
4. Close the original audit matrix, visual report, roadmap and evidence ledger
   with these outcomes, separating released, local-only and unverified coverage.

Do not reopen completed web PR524 work or count this local native qualification
as a completed production release or a completed cross-platform audit.
