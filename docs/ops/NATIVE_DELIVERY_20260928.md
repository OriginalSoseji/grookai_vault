# Native delivery qualification — September 28, 2026

Source baseline: merged main `4d3427d52dd5c817eb3c2b77606b6b0e7ade3cca`.
Website PR527 and native-import backend PR526 are already live. This batch
qualifies native packages; it does not repeat either release or close the audit.

## Android build repair and physical proof

The profile build failed because CameraX could not resolve ListenableFuture
after integration_test selected the empty listenablefuture artifact. Add the
same explicit Guava compile dependency already used by debug to profile.
The otherwise identical profile build then passed. Release dependencies are
unchanged. Preserve both failure and successful build logs.

Samsung build409 (1.0.0, profile, existing certificate) was installed in place,
preserving the signed-in session and first-install timestamp. It is a local
phone test package, not a Play Store distribution. Read-only physical checks:

- `base set Chari`: one Charizard from Base Set.
- `Mewtwo from 30th anniversary`: four results with the set interpretation.
- `Yuka Morii Wurmple reverse holo`: one Platinum #103 reverse-holo result;
  opening it retains the requested printing, and Back retains the search.
- Focused catalog search reports Android inputType 0x80091: suggestions,
  autocorrect and automatic capitalization disabled.

Observed presentation follow-up: the single-result count says "1 cards" and
the generic refinement explanation says multiple cards still match. These
are recorded issues, not evidence that the result set is incorrect.

## iOS packaging

iOS1.0.0 build329 uses the baseline without the Android-only Gradle repair.
Archive, Runner/App symbol UUID comparison and codesign verification pass.
The App Store IPA export passes signature, production push, associated-domain,
distribution-profile and disabled-debugger checks. The initial SSH export
failed keychain access; the same export succeeds in the existing desktop
Terminal signing session. No signing settings were weakened.

Packaging is not upload, Apple processing, installation or device acceptance.
Those outcomes must be recorded separately. Do not expand tester groups or
submit a public store release as part of a packaging check.

## Evidence and remaining coverage

Authoritative checkpoint and private screenshots/logs:
`C:/grookai_vault_operator_artifacts/native_delivery_20260928/CHECKPOINT.md`.
Mac receipts: `~/grookai_operator_artifacts/native_delivery_20260928`.
Mac isolated source: `~/grookai_native_delivery_20260928`.

Remaining: source release of the Android profile repair; iOS delivery and actual
iOS workflow checks; physical-device import recovery against isolated fixtures.
Prior Android emulator import acceptance remains valid but is not physical
Android or iOS evidence. Production test writes are not authorized by this batch.
The broader audit's unverified cases remain open.
