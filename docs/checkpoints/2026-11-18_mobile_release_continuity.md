# Mobile Release Continuity Checkpoint — 2026-11-18

## Finding

The Samsung has `com.grookai.vault` version code 550 installed with the local
Android debug certificate. The current CI release APK (version code 551) uses a
different release certificate. Android will reject that APK as an in-place
update. No uninstall or storage clear was attempted.

The Mac remains offline in Tailscale, and the iOS build path therefore cannot
produce a matching TestFlight candidate in this checkpoint.

## Changes prepared

- Added active `MOBILE_RELEASE_CONTINUITY_V1` contract.
- Raised the shared Android/iOS build baseline to `1.0.0+551` and synchronized
  the App Store Connect archive/export metadata.
- Added CI readback for APK package, marketing version, build number, source
  commit, and signing certificate fingerprint.
- Added a Windows ADB preflight that allows an update only when the package
  matches, the build number increases, and the APK signer matches the installed
  app. The preflight never installs, uninstalls, or clears app data.

## Prior candidate evidence

- Source commit: `8199a0feab42627bab8c548e32728a788390959d`.
- Android workflow run: `44355612390` (all jobs successful).
- Candidate: `com.grookai.vault`, version `1.0.0`, build `551`.
- Candidate signer SHA-256: `a1290a32711ab390f798c0898a4d0d78c97f20b2e12adb55bb2260bff9036119`.
- Installed build 550 debug signer SHA-256:
  `e9575fdd80e4bc1b4e5a80e3638c76f963ae2618db4f71f95d5a0022bc7089c2`.

These artifacts do not qualify as a paired mobile release because they use
different source revisions and the Mac/TestFlight candidate is unavailable.
