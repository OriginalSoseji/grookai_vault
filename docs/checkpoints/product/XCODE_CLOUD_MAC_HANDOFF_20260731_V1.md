# Xcode Cloud Mac Handoff 2026-07-31 V1

## Status

Local runtime repair proven. Build 276 remains removed from both external
groups; one replacement TestFlight canary is the next gate.

The handoff branch starts from `origin/main` commit
`06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`. It contains no pricing-warehouse
or uncommitted Windows worktree changes.

## Current Truth

- The Xcode Cloud bootstrap, Flutter toolchain, release configuration,
  versioned SDK cache, no-codesign configuration, and SwiftPM lock repairs are
  already merged into `main`.
- `ios/ci_scripts/ci_post_clone.sh` pins Flutter `3.44.7`, verifies the SDK,
  resolves locked Dart and CocoaPods dependencies, and generates Release iOS
  configuration without performing code signing.
- The checked-in project and workspace SwiftPM resolutions, shared Runner
  scheme, and dependency contract are present.
- `tests/contracts/xcode_cloud_bootstrap_v1.test.mjs` governs the repository
  bootstrap inputs.
- Xcode Cloud Build 257 proved archive and export from the merged dependency
  state. Build 258 proved internal TestFlight distribution after the workflow
  distribution setting was changed to `TestFlight (Internal Testing Only)`.
- Xcode Cloud Build 275 succeeded from `main` commit
  `06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`.
- Before the distribution repair, the workflow archive action used
  `buildDistributionAudience: INTERNAL_ONLY` and Build 275 could not be
  assigned to the two external TestFlight groups.
- The governed repair plan is recorded under
  `docs/audits/xcode_cloud_testflight_external_release_20260731/`.
- The workflow archive audience was changed to `APP_STORE_ELIGIBLE` and verified
  by API readback.
- Exactly one controlled build was started. Build 276 succeeded from frozen
  `main` commit `06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`.
- Build 276 processed as `VALID` and `APP_STORE_ELIGIBLE`, with
  `usesNonExemptEncryption: false`.
- The existing TestFlight localization was carried forward from the last
  approved external build.
- Beta App Review approved Build 276, and its external state is
  `IN_BETA_TESTING`.
- Build 276 was initially assigned to both external groups. The internal group
  retained all-build access.
- No public App Store release, bundle identity, signing owner, or capability
  change occurred.
- Runtime smoke testing then proved Build 276 did not render Flutter. The build
  was removed from both external groups, restoring Build 23 as their latest
  assignment.
- Inspection of the Build 276 App Store export proved the expected Supabase URL
  and publishable key were absent from the AOT binary and no dotenv file was
  bundled.
- `lib/main.dart` therefore threw before `runApp()`. Xcode Cloud had archived a
  package successfully without proving runtime configuration.
- The repair invokes `scripts/write_ios_xcode_secrets.rb` from
  `ci_post_clone.sh`, consumes workflow process environment values, fails closed
  before archive when required values are absent, and renders a visible startup
  failure state as a final defense.
- A clean Mac worktree at repair commit
  `9496af3ab965cde75d32965aef9fd6f1eed1486f` passed six targeted contracts,
  Flutter analysis, process-environment writer verification, simulator compile
  and startup, and a no-codesign release device compile.
- The simulator reached Flutter's first post-frame callback at 471 ms and the
  login route at 1.017 seconds. Backend requests returned HTTP 200.
- The repaired release AOT binary contains the exact expected Supabase URL and
  publishable key. Only SHA-256 fingerprints are retained in audit artifacts.

## Repository Inputs

- `ios/ci_scripts/ci_post_clone.sh`
- `ios/Runner.xcworkspace`
- `ios/Runner.xcodeproj/project.pbxproj`
- `ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme`
- `ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`
- `ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved`
- `ios/Podfile.lock`
- `pubspec.lock`
- `tests/contracts/xcode_cloud_bootstrap_v1.test.mjs`

## Mac Continuation

1. Fetch `origin` and check out `release/xcode-cloud-mac-handoff-v1`.
2. Confirm the worktree is clean and HEAD matches the remote branch.
3. Run `flutter --version` and use Flutter `3.44.7` for repository parity.
4. Run `flutter pub get --enforce-lockfile`.
5. Run `node --test tests/contracts/xcode_cloud_bootstrap_v1.test.mjs`.
6. Open `ios/Runner.xcworkspace`, not the `.xcodeproj` file.
7. Confirm the Runner scheme, signing team, bundle identifier, capabilities,
   and current App Store Connect workflow configuration.
8. Inspect the latest Xcode Cloud run and preserve the build number, action ID,
   failing phase, and complete relevant log before editing.
9. Reproduce locally when possible. Make only the narrow repository repair on
   this branch; keep Apple-account or workflow-console settings out of Git.
10. Run the Xcode Cloud contract and the relevant local archive/build check,
    then commit and push the repair to this same branch.
11. Open a pull request to `main` only after the Mac evidence identifies the
    failure and the branch contains a reviewable repair.

## Invariants

- Do not commit certificates, provisioning profiles, API keys, Apple session
  data, environment secrets, or Xcode derived data.
- Do not regenerate dependency locks unless the observed failure requires it.
- Do not change the Flutter version without a separate compatibility decision.
- Do not mix pricing, Supabase, visual-search, or unrelated release work into
  this branch.
- Xcode Cloud and App Store Connect evidence is required before claiming an
  Apple-side issue fixed.
- A successful local build is supporting evidence, not a substitute for a
  successful Xcode Cloud archive and intended TestFlight distribution.

## Stop And Escalate

Stop before changing bundle identity, signing ownership, production
capabilities, distribution audience, or App Store Connect application records.
Those changes affect product identity or release authority and require an
explicit decision.

## Exact Next Gate

Create exactly one replacement App Store-eligible TestFlight canary from the
proven repair commit. Verify the shipped AOT binary contains the expected
configuration, then install and smoke-test it on a physical device before any
external group assignment. Separately decide whether the workflow should
become manual-only or path-filtered.
