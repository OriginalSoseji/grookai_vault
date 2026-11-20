# Android Signing Lineage Migration Checkpoint — 2026-11-19

## Finding

The Samsung has `com.grookai.vault` build 602 signed by local Android debug
certificate `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2`.
The release workflow signs with `a1290a32711ab390f798c0898a4d0d78c97f20b2e12adb55bb2260bff9036119`.
The previous release preflight rejected build 603 because it required byte-for-byte
signer equality. No uninstall, clear-data, or installation was performed.

## Safe migration prepared

- Added `MOBILE_RELEASE_CONTINUITY_V2`, with verified signing-certificate
  lineage and the Android `installedData` capability as the only exception to
  exact signer continuity. V1 is retained as superseded history.
- Added an APK lineage probe using Android's `apksig` verifier; the update
  preflight checks package, version, approved release signer, and cryptographic
  proof from the installed signer with `installedData=true`.
- Added an opt-in CI dispatch input for a one-time debug-to-release signer
  rotation. Ordinary Android release builds do not include debug signing.
- The Samsung's old debug certificate is held only on the developer machine at
  this checkpoint; a temporary Actions secret is required to mint the one-time
  lineage and is to be deleted after the physical update readback.

## Verification

- Three mobile release continuity contract tests pass.
- A temporary APK was signed using a generated test release key and a lineage
  rooted in the Samsung's installed debug key. `apksigner verify` passed and the
  `apksig` probe confirmed the old certificate has `installedData=true`.
- The current unrotated build 603 candidate still fails preflight with “No update
  is safe,” as required.
- Samsung remains on build 602 with app data intact.

## Next

Merge the guarded workflow/preflight change, configure and use the temporary
legacy-key Actions secret for build 603, run the updated device preflight, install
in place only on a pass, verify account/collection readback, then delete the
temporary secret and record final release evidence.
