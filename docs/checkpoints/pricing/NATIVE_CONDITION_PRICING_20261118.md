# Native exact condition reference candidate — November 18, 2026

The web release is live through PR946, main
`17f0f81aaa986968a870a9dfa1f316e2e739dacf`, Vercel deployment
`dpl_4TnKmiejAE3GWVGGu6AMvZF4kKYq`. Its hosted Add to Vault acceptance
switched Dragons Exalted #117 Normal NM 2.51 to LP 1.16; Reverse DMG was
unavailable. Preserve the original web release/intake worktrees and their receipts.
This checkpoint supersedes their source-candidate status for web only.

## Native source

Isolated worktree `C:/grookai_native_condition_20261118`, branch
`codex/native-condition-pricing-20261118`, starts at main
`66d09f62997b127ca331bc7689f864f1f576f090` (PR948). The dirty original
`C:/grookai_vault` is preserved. The first full checkout exhausted disk space
and Git removed it; a compressed worktree initially excluded audit archives,
then restored the complete tracked checkout before managed checks. No unrelated
worktree, archive or user data was deleted.

The shared Flutter reference panel follows the actual Add to Vault review
(including scanned/manual entry) and active raw-copy Vendor Mode condition and
printing controls. It uses the deployed signed-in reader with the existing SDK
session. Prices remain attributed to TCGplayer via TCGTracking, with provider
date and the visible unverified USD assumption. Unknown selections do not fetch;
missing values stay unavailable. Loading, retries, mismatched/late responses and
failed condition/printing saves clear or restore the corresponding reference.
Graded entries omit this panel. The workspace's existing active-instance reader
continues to exclude archived copies.

The transport is limited to the canonical HTTPS origin for profile/release and
loopback for debug. Redirects are disabled, responses are bounded to 32 KiB,
requests to 25 seconds, account changes discard in-flight responses, and native
retains no price cache. All mapping, freshness and pricing decisions remain in
the shared backend. Existing headline market values, asking prices, variance
math, acquisition costs and Vault totals retain their original authority.

No migrations, source imports, scheduled jobs, canonical mapping changes,
production inventory writes, website deployment or store submission belong to
this native change. Do not reuse the consumed private-intake acknowledgement.

## Verification and replay

Private receipts/logs/screenshots are under
`artifacts/native_condition_pricing_v1/20261118/` in the isolated worktree.

- Verified-TLS, startup-read-only database sanity passed: canonical project
  `ycdxbpibncqcchqiihfz`, 173,837 card prints, 3,420 sets, 47,409 traits and
  323 compatibility Vault projection rows. This is an environment check, not
  evidence of new inventory or condition-price coverage.
- Seven transport/parser tests cover exact authenticated requests, unchanged
  numeric precision, missing values, invalid/mismatched DTOs, account changes,
  untrusted routes, debug/production isolation and failed/bounded responses.
- Actual Add review switches NM 2.51 to LP 1.16 to missing DMG without saving.
  Workspace controls switch pending condition/printing references and return to
  the previous control/reference on failed writes, leaving asking prices intact.
  Late/cancelled results and retry are independently covered.
- The focused four-file suite passes 33 tests including two updated dark/light
  review goldens. Existing 320px/200% text, keyboard and inventory-action tests
  pass. Both Windows goldens were visually inspected.
- The Android integration fixture runs on the existing
  `grookai_refinement_qa_20261028` AVD, explicit device `emulator-5582`, isolated
  `com.grookai.vault.lockedacceptance` debug identity. The package was absent
  before its first install; the founder's physical Samsung/app are untouched.
  A loopback HTTP fixture, synthetic session and synthetic printing verify six
  exact GETs: NM/LP/DMG in dark and light. No inventory is created. Device
  screenshots and the fixture receipt are preserved by the dedicated driver.
  The initial fixture failed because assertions in a socket callback conflicted
  with the test binding; assertions now validate captured metadata after the
  callback. A successful rerun initially overwrote screenshot report data; the
  driver/report preservation was corrected and rerun for exported screenshots.
  The final Android run passes with all six exported PNGs and six exact local
  GETs. The fixture APK is preserved privately with SHA-256
  `0b329e29182652f5839c4ec97b22b939271bb744c677ed6d71827ee52ef0f800`.
  Final Flutter analysis reports no issues. The task-started emulator was stopped
  after acceptance; its saved state and all pre-existing devices remain intact.

Replay focused checks:

```powershell
flutter analyze --no-pub
flutter test --no-pub --concurrency=1 test/condition_price_service_test.dart test/condition_price_panel_test.dart test/vendor_mode_workspace_test.dart test/intake/vault_add_review_sheet_test.dart
```

For Android, first inspect ADB/AVD state and the exact isolated package/signature.
Use an emulator, never replace the founder's installed application for this
fixture. With the existing AVD on port 5582:

```powershell
$env:GROOKAI_LOCKED_ACCEPTANCE='true'
flutter drive --debug -d emulator-5582 --driver=test_driver/native_condition_pricing_driver.dart --target=integration_test/native_condition_pricing_local_test.dart
Remove-Item Env:\GROOKAI_LOCKED_ACCEPTANCE
```

Normal managed commit/push hooks remain mandatory and run the full shipcheck;
their terminal receipts determine success. Local native image worker bounds
`VIPS_CONCURRENCY=1` and `UV_THREADPOOL_SIZE=1` carry forward the qualified
Windows setting from the web release, without changing tests or runtime config.
The ignored qualification runner reads existing owner configuration in memory,
redacts credentials and makes production compile-time DB routing read-only.
It never starts a development server against production.

## Release boundary

### Live Android follow-up and cancel recovery

PR950's original source `f637f09af61b56189cf30611faf96fc2a976eed5` passed
all 19 hosted checks and both normal full managed hooks. The owner then
requested the next step and unlocked the Samsung for device verification.
The existing build548 APK matches the preserved vendor-review release hash,
its source lineage is retained, and public feature flags are unchanged.
QA549 was installed in place with the same certificate, package, UID,
first-install time and Developer Options. The existing signed-in session
successfully loaded actual production references for Dragons Exalted #117
Normal: NM2.51 and LP1.16, without saving a copy.

Closing review exposed a pre-existing Search card-drawer bug: its local busy
props did not refresh on the cancellation return path, leaving "Adding..."
and disabled actions after the parent operation had finished. The follow-up
refreshes the still-mounted drawer before that early return. Successful-save
behavior and ownership writes are unchanged. The original QA549 and separately
CI-signed production549 artifacts are preserved; they remain superseded
qualification evidence until the cancel fix passes the normal checks and a
higher same-signer device build verifies cancellation, reopening and switching.

Current device/build/CI receipts and screenshots remain in the private
`release-preparation/` directory beneath this checkpoint's artifact root.
Do not replay the consumed QA549 installation intent or publish its superseded
production artifact. No store submission, source intake or mapping apply is
authorized by this preparation.

This is a native source candidate. Local synthetic Android acceptance does not
establish authenticated production-native acceptance, an iOS build, a store
upload, TestFlight/Play distribution or a public application release. Those
require the normal exact-source signed build and separately authorized release
flow. Read final managed-check and Git receipts before resuming; do not replay
the completed web promotion or private source import.
