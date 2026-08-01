# Xcode Cloud Mac Handoff 2026-07-31 V1

## Status

Ready for Mac-only verification and repair on
`release/xcode-cloud-mac-handoff-v1`.

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
- No new Xcode Cloud defect is asserted by this checkpoint. The Mac and Apple
  consoles are the authority for any newer failure.

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

On the Mac, inspect the latest Xcode Cloud or App Store Connect failure first.
Classify it as repository bootstrap, dependency resolution, compilation,
signing, archive, export, or distribution. Preserve the evidence, then repair
only that class on `release/xcode-cloud-mac-handoff-v1`.
