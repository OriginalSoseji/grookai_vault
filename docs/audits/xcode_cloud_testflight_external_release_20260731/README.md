# Xcode Cloud TestFlight External Release Audit

## Objective

Produce one App Store-eligible Xcode Cloud build from the frozen `main` commit
and make it available to the existing internal and external TestFlight groups.

## Root Cause

Xcode Cloud Build 275 succeeded, but the workflow archive action was configured
with `buildDistributionAudience: INTERNAL_ONLY`. The binary is therefore valid
for internal testing but ineligible for the two external TestFlight groups.

## Governed Operation

1. Preserve the before-state and exact release plan.
2. Change only the archive action audience to `APP_STORE_ELIGIBLE`.
3. Read the workflow back and verify the exact setting.
4. Start exactly one build from `main` commit
   `06f83b8542cf8fb7dbbc17180eefad5eaf4e5ac0`.
5. Wait for Xcode Cloud and App Store Connect processing.
6. Assign the valid build to the existing TestFlight groups.
7. If Apple requires Beta App Review, record that gate and do not represent the
   build as externally available until review succeeds.

## Boundaries

- TestFlight only.
- No public App Store release.
- No bundle ID, signing owner, capability, or application identity changes.
- No second build if the controlled build fails.
- No secrets in audit artifacts.

## Status

Pre-run plan recorded. Apple-side mutation has not yet occurred.
