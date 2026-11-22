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

## Completion Addendum — 2026-11-19

- PR #974 merged to `main` as `c1efe237d7c7c441fda03cbf812aaea771ca98db`.
- GitHub Actions run [44689267501](https://github.com/OriginalSoseji/grookai_vault/actions/runs/44689267501)
  produced Android build 603 from that source commit. Its manifest records the
  production signer and the Samsung debug signer in a verified lineage with
  `installedData=true`.
- APK SHA-256:
  `D25B2C506077411A6D8C6CF6BA416E05BD6FC631942F9613799CF9D5B60E29A8`.
- `scripts/android_update_preflight.ps1` passed on the connected Samsung. The
  candidate package is `com.grookai.vault`, version `1.0.0` (603), signed by
  `a1290a32711ab390f798c0898a4d0d78c97f20b2e12adb55bb2260bff9036119`.
- Installed with `adb install -r`; no uninstall or data clear. Device readback
  reports version code 603, original first-install date `2026-10-13`, and the
  app launched to `MainActivity`.
- After collection data loaded, Vault displayed 231 cards / 219 unique. The
  existing Pikachu Binder opened to its contents view: a 4×4 page with three
  contributed card copies and the remaining pockets empty. The Custom Binder
  creation path states that Pokémon, One Piece, and Magic can be mixed; no new
  Binder was created during verification.
- The one-time `ANDROID_LEGACY_DEBUG_KEYSTORE_BASE64` Actions secret was deleted
  after installation and confirmed absent from the repository secret list.

The Samsung is now on the merged build 603 with collection and Binder data
retained. The signing-lineage migration and device readback are complete.
