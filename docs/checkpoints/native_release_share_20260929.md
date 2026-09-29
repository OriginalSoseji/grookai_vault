# Native release image sharing

## Publication candidate

The user authorized pushing the update. The publication candidate is
`release/native-share-print-20260929`, based on current main `26154b8d1`.
It includes the unchanged, device-qualified P21 layout v2 source so the update
preserves the label-printing capability already installed in local build 332.
The source workstream and prior archives remain intact. Read the printer
checkpoint and contract for its existing acceptance and remaining limitations.
Fresh repository checks and a new TestFlight archive/upload are required; the
earlier 331 upload intent and offline fixture build 333 must not be reused.

The installed physical iPhone release build 332 reproduced `Unable to generate
the lot front image. Please try again.` after selecting Share lot and Save Image.
The shared export service called `RenderObject.debugNeedsPaint` at runtime.
Flutter documents that getter as debug-only and throws in release builds. The
service now evaluates that diagnostic only inside an assertion; the existing
two completed rendering frames and PNG export remain unchanged.

This also repairs the shared PNG path used by Sale and Memory. No inventory,
commerce, schema, permission, or backend behavior changes. The separate XCTest
Back-button ambiguity was corrected in the private UI harness, not product code.

## Verification

- 32 focused export, Lot pricing, and Memory tests pass on the Mac, including
  a new real PNG signature/dimensions regression. Targeted Dart analysis and
  diff checking pass. The initial Windows test attempt failed for disk space;
  it is not counted as passing.
- The physical iPhone 17 Pro ran the patched service and real Lot pricing screen
  in a separately signed release fixture (`com.cesar.grookaivault.ownedacceptance`,
  local build 333). Its entry point rejects non-release mode and initializes no
  backend. The native share sheet offered `Save 2 Images`; cancellation restored
  the enabled Share lot button, and retry produced both images again. Nothing
  was sent or saved to Photos.
- Earlier full-app read-only checks passed Objects, exact-copy Sale with the
  existing asking price, Memory, and two-item Lot navigation. Saved full-app
  outcomes remain unverified while the sandbox is unavailable.

Private screenshots, signed-source hashes, xcresults, and logs are under
`C:/grookai_vault_operator_artifacts/native_owned_copies_20260929` and its matching
Mac artifact directory. `inspect05` reproduces the old sharing failure;
`inspect06` captures the fixed native sheet; `inspect08` asserts two images,
cancel, and retry. `inspect07` is retained as a failed test setup: launching a
new runner dismissed the previous run's sheet. It is not passing evidence.

## Release boundary

This fix is local on `fix/native-release-share-20260929`, based on the qualified
331 product source. It has not been merged or delivered through TestFlight.
TestFlight 331 remains the completed prior release; do not replay its upload
intent. The signed-in phone app remains the separate label workstream's 332.
The local fixture's number 333 is not an App Store Connect build or a product
update. Preserve the label work and package a fresh normal release separately.

For regression acceptance, build
`integration_test/fixtures/object_share_release_app.dart` with `--release` in an
isolated bundle. Use the actual native share sheet and cancel; a debug-only or
mocked share-service test cannot detect this release-mode failure.
