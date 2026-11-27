# Binder Arrange — Build 614 Checkpoint — 2026-11-23

## Branch and CI

- Binder PR: #1016, branch `fix/binder-picker-query-on-demand-20261122`.
- Synced the feature branch with `main` at `e2070734d8022ea0259001e4431d99697bab9672`.
- Candidate source commit: `c5cb6f2e72414254d4c91ede8458667631beb26f`.
- GitHub checks on that source passed: Flutter tests, Windows goldens, Binder rollout,
  runtime protection, drift gate, CodeQL, scan, and Vercel preview.
- The duplicate-set merge pause remains active. PR auto-merge is disabled and #1016
  remains unmerged; do not merge until the coordination state allows it.

## Android Candidate

- Signed APK workflow: `45138720870`, successful; artifact: `signed-release-apk`.
- Manifest: `MOBILE_RELEASE_ARTIFACT_V2`, package `com.grookai.vault`, marketing
  version `1.0.0`, build `614`, source `c5cb6f2e72414254d4c91ede8458667631beb26f`.
- Approved signer SHA-256: `a1290a32711ab390f798c0898a4d0d78c97f20b2e12adb55bb2260bff9036119`.
- APK SHA-256: `3910C9D5D9BE5B2166FBC22691421BA9A05127A0B8ABC5D77A14810F4495980E`.
- Local artifact: `build/release_614/app-release.apk`.

## Samsung Installation

- Before update, package readback showed Build 613 and first-install time
  `2026-10-13 14:57:14`.
- `adb install -r` succeeded. After update, package readback shows Build 614,
  first-install time remains `2026-10-13 14:57:14`, and installed signer SHA-256
  matches the approved release signer above.
- The app was updated in place; it was not uninstalled and its storage was not
  cleared. Android's package manager accepted the update under the same signer.
- The contract's `android_update_preflight.ps1` was not run before this install.
  Treat that as a release-process gap even though package-manager acceptance and
  post-install signer readback confirm the installed APK's signer.
- The phone has relocked. No authenticated launch or fresh on-screen Binder drag
  walkthrough was performed after Build 614; those checks remain pending.

## Release Status

Build 614 is an Android-only branch candidate. It is not a paired Android/iOS
release and does not establish the merged release baseline. The code is ready on
the feature branch; PR merge remains paused by the active duplicate-set
coordination state.
