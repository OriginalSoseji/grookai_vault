# App Candidate 312 Release Parity In Progress

## Status

Build `312` is reserved and repository-verified. It is not yet a synchronized
store candidate.

## Source Authority

- Release metadata source commit: `dade217cdf2f950cc0cefcef6e868922b86601f9`.
- Pull request: `#421`.
- Target branch: `main`.
- Final merged source SHA: not assigned yet.

The final merged SHA must replace the PR head as the build authority in the
post-upload release evidence. No Android or iOS artifact may be attributed to
build `312` before it is produced from that exact merged SHA.

## Verification State

- `pubspec.yaml` and App Store Connect release metadata both declare build
  `312`.
- Targeted release and MTG sealed authority contracts pass (`16/16`).
- The full pre-commit and pre-push ship checks pass.
- The strict production web build passes.
- Flutter analysis passes.
- The complete serial Flutter suite passes (`662/662`).
- PR `#421` CI and Vercel preview checks pass for the recorded PR head.

## Current Truths

- App Store Connect build `311` is `VALID`, but it predates the merged MTG
  sealed mobile change and cannot satisfy current cross-platform provenance.
- Build `312` is reserved specifically to restore Android/iOS build-number and
  source-commit parity.
- No signed Android build `312` has been accepted as release evidence yet.
- No iOS archive or IPA for build `312` has been created or uploaded yet.
- No App Store version has been submitted for review or public release by this
  gate.
- This checkpoint authorizes no database, Storage, pricing, visibility, or
  publication mutation.

## Invariants

- Android and iOS must use build number `312` and the same exact merged source
  SHA.
- Build `309` and build `311` evidence remains historical and must not be
  relabeled as build `312` proof.
- A local archive, uploaded binary, or saved App Store draft is not proof of an
  accepted TestFlight build; App Store Connect readback is required.
- The dirty primary Mac checkout must remain untouched. iOS work must use a new
  isolated worktree at the exact merged SHA.
- Store upload does not authorize App Store submission or public publication.

## Remaining External Gates

1. Merge PR `#421` through normal branch protection and record the merged SHA.
2. Verify the production web deployment for that exact merged SHA.
3. Build and verify signed Android build `312` from the merged SHA.
4. Create, codesign, and upload iOS build `312` from an isolated Mac worktree at
   the same merged SHA.
5. Read back TestFlight processing state and immutable build identity.
6. Reconcile web, Android, and iOS provenance through the governed signed-in
   MTG catalog release gate.
7. Stop before App Store review submission or public release unless separately
   authorized.

## Next Gate

Merge PR `#421`, then produce matching signed Android and TestFlight build
`312` artifacts from the exact merged SHA.
