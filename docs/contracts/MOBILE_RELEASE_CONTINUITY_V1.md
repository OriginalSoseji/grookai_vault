# Mobile Release Continuity V1

Status: Superseded by MOBILE_RELEASE_CONTINUITY_V2.

## Goal

Keep Android and iOS beta candidates on one source revision and one marketing
version/build number, and prevent a device update from replacing app data when
Android signing continuity is absent.

## Paired build identity

- `pubspec.yaml` is the shared marketing-version and build-number authority.
- Android and iOS release candidates must use the same `versionName` /
  `CFBundleShortVersionString`, the same build number, and the same merged
  source commit.
- Android CI records the package ID, version, build number, source commit, and
  APK signing certificate SHA-256 in `mobile-release-manifest.json` beside the
  signed APK. Do not publish a paired release without equivalent iOS build
  provenance and App Store Connect readback.
- A manually dispatched build-number override is a candidate only. Before it
  becomes the release baseline, update `pubspec.yaml` and the App Store Connect
  metadata together, then rebuild both platforms from the same merged commit.
- Before choosing a candidate build number, read the installed version on the
  target Samsung. The candidate must be greater than that version; do not reuse
  a cached artifact or an older baseline just because its CI run succeeded.

## Android update safety

Before installing a release APK over an existing `com.grookai.vault` app:

1. Run `scripts/android_update_preflight.ps1 -ApkPath <apk>` with the device
   connected over ADB.
2. The candidate package must be `com.grookai.vault` and its version code must
   be greater than the installed version code.
3. The candidate APK signer SHA-256 must exactly match the installed package's
   signer SHA-256.
4. If any check fails, stop. Do not uninstall, clear storage, or attempt a
   downgrade to force the update. Keep the installed app data intact and
   resolve the signing/channel mismatch first.

A debug-signed development installation and the CI release-signed APK are
different Android update channels. A successful CI signature proves that the
artifact is signed; it does not prove that the artifact can update a particular
device installation.

## Release evidence

For each paired beta, retain:

- merged source commit;
- marketing version and build number for both platforms;
- signed Android APK hash and signer fingerprint;
- iOS archive/build ID and App Store Connect processing state;
- Android update-preflight output for any physical device update.

An Android-only artifact is not a paired mobile release. A successful physical
Android update must preserve the existing installation and account data.
