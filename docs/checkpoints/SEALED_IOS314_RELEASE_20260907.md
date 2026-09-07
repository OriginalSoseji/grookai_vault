# Sealed iOS Build 314 Release

Date: 2026-09-07. Scope: distribute the Samsung-verified search keyboard fix
through the existing internal TestFlight audience. No new app features or
catalog, pricing, Storage, visibility, or Vault mutations.

## Frozen Source And Build

- Source: `736f15c1fa866fad3616a4a55d9a46dc566ae0e5`, merged PR 437.
- App-code delta from build 313: two focus-dismissal lines in the shared sealed
  catalog search. Product filters, page reset, authentication and pricing remain
  unchanged.
- Isolated Mac checkout: `~/grookai_vault_testflight_314_sealed`.
- Bundle `com.cesar.grookaivault`, marketing version `1.0.0`, build `314`.
- Apple preflight proved 314 absent and 313 the latest uploaded build.
- Tracked checkout is clean. Previous worktrees, archives and signing keys are
  preserved. No dependency upgrade or keychain-permission change.
- Release defines match build 313 exactly, including both sealed flags set to
  true. Canonical Supabase routing and exclusion of secret defines verified.

## Verification

- Mac: 14/14 targeted sealed Flutter tests and scoped Dart analysis pass.
- Windows: four iOS/client contract checks pass, one native Ruby test skipped;
  equivalent Ruby fixture executed successfully on the Mac.
- Signed archive and strict/deep code-signature verification pass.
- Runner executable SHA-256:
  `34a286363509f21a6fd47894691193dfaf16eac488c095a64996278965b61a00`.
- Runner UUID `33803764-703A-3756-865D-A13AB093401D` and App framework UUID
  `0C7143A3-0BF4-994A-4C4F-F3020F50E0C9` each match their archived dSYM.
- Separate same-source simulator build/install/launch passes. Retained screenshot
  shows the normal signed-out screen, not a blank startup. This is not a claim
  of signed-in sealed acceptance on iPhone.
- Actual Samsung acceptance remains in `SEALED_SAMSUNG_ACCEPTANCE_20260907.md`.

## Apple Readback

Upload completed successfully (exit 0). Apple readback confirms:

- Build ID `5295abc3-2622-465f-8228-c9aae9bd4ecb`, processing state `VALID`.
- Internal state `IN_BETA_TESTING`, `autoNotifyEnabled=true`.
- Actual build membership is the existing internal Friends and Family group
  only; external groups were not attached or activated.
- Build-specific testing notes written and read back exactly at
  `2026-09-07T17:37:55Z`.
- No App Store version attachment/submission or audience expansion.

This proves internal availability, not notification delivery to every tester or
installation on a physical phone.

## Physical iPhone

Later same-day physical readback and acceptance supersede the lock limitation
below: see `SEALED_IOS314_PHYSICAL_ACCEPTANCE_20260907.md`. Build 314 is installed;
bounded signed-in Pokemon and MTG sealed checks are now recorded there, with
harness failures and remaining limitations preserved.

CoreDevice accepted a TestFlight launch request, but the isolated Xcode probe
then explicitly reported the iPhone locked. The owned test process was stopped,
exit 143 read back, and process absence verified. No unlock or authentication
dialog was automated; no TestFlight installation on the physical phone is claimed.
Do not treat a launch acknowledgement as proof of a usable unlocked screen.

## Evidence And Remaining Work

Operator root:
`C:/grookai_vault_operator_artifacts/pokemon_sealed/20260907_ios314/`.
Archive, simulator, Apple readback and device-probe evidence are retained there;
operator scripts contain no credentials. The archive stays on the Mac at
`build/ios/archive/GrookaiVault-1.0.0-314.xcarchive` inside the isolated checkout.

1. Internal TestFlight distribution is complete. Keep source/archived artifact
   provenance bound to the release SHA above, not a later documentation commit.
2. Physical iPhone installation readback and bounded signed-in sealed browse
   are complete in `SEALED_IOS314_PHYSICAL_ACCEPTANCE_20260907.md`. Do not repeat
   installation. Resume its controlled scroll-position reproduction and
   instrumented performance follow-ups instead.
3. Preserve source-image and stale-price exclusions. Source maintenance,
   ownership, licensing and general app performance remain separate gates in
   `SEALED_CLIENT_CLOSEOUT_20260907.md` and
   `POKEMON_SEALED_FRESHNESS_PROOF_20260907.md`.
4. Image-background isolation remains explicitly deferred. No public store
   submission, catalog regeneration or data cleanup belongs to this step.
