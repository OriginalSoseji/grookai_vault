# Synchronized Final Candidate Checkpoint V1

## Context

The prior release manifest mixed candidate identifiers from source
`82d5f8b`, while physical-iPhone Journey C had been proven only on historical
TestFlight build `288` from another source. The soak contract correctly blocked
release completion until one web, Android, and iOS candidate shared one exact
application commit.

## Decision

Freeze application source
`a8ec3d27808fd100cbb8e544032ee479e9632f24` as the synchronized final candidate.
Use verifier `e343879a5dc247958f77f37562e7f29ad8a50cfd` for candidate-scoped release
proof. Preserve all earlier device evidence as historical functional proof, but
do not use it to close candidate-scoped gates.

## Current Truths

- Web deployment `5816529955` serves `a8ec3d2` in production.
- Signed Android artifact `9034580292` contains `1.0.0 (23)` and hashes to
  `deda3271c92258870a8abbeffce163ba39fb9a5e6d3142aca8907ff969ddb7f6`.
- TestFlight build `289`, ID
  `dc5801e6-e1fd-42ef-b476-768e5ff5d411`, was archived from detached exact
  checkout `a8ec3d2`.
- Build `289` is valid, approved, internally and externally testing, and present
  in all three intended tester groups.
- Candidate-scoped signed-in production web passed `26/26` routes, `2/2`
  message-context cases, and `5/5` unchanged database assertions while blocking
  ten non-read requests.
- The connected iPhone 17 Pro still has build `288`; build `289` installation
  and device-authenticated UI execution remain required.
- The authenticated Play Console route resolves to `/console/signup`; no
  developer account or listing is available to audit yet.
- The hashable IPA is
  `27619987ad4121347dbbfa2ef68a840d4ccc5139757f6f14d28a31a3660a09e1`.
- `origin/main` advanced after the freeze only through founder-operations JSON
  snapshot refresh `cd6e748`; deployable application source did not change.
- Operations-only commit `b5e68cf06` repaired contained-process timeout output
  and refreshed the activation package hash chain without changing deployable
  application source or any frozen candidate artifact. Containment contracts
  passed `7/7`, activation and rollout contracts passed `62/62`, Node contracts
  passed `1612/1612`, Flutter tests passed `585/585`, and shipcheck passed.
- The soak has not started.

## Invariants

- All candidate-scoped claims must name `a8ec3d2` and their exact platform
  artifact identifier.
- Build `288` may remain evidence of behavior but cannot close build `289` gates.
- No source change may enter the candidate without rebuilding and refreezing all
  three platforms.
- No soak may start while any non-soak manifest gate is not `proven`.
- No public store release is authorized by this checkpoint.
- No production database mutation may be used to manufacture journey evidence.

## Evidence

- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/REPORT.md`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/summary.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/android_artifact_readback.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/ios_archive_readback.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/app_store_connect_readback.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/web_signed_out/summary.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/signed_in_web_retry_1/2026-08-09T19-43-59-506Z/summary.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/ios_physical_preflight/summary.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/play_console_account_readback.json`
- `docs/audits/release_completion_v1/synchronized_final_candidate_v1/2026-08-09T19-15-37Z/ops_containment_repair.json`

## Remaining Work

1. Install/open TestFlight build `289` on a connected physical iPhone.
2. Repeat Journeys A, C, and F against build `289` with governed readback.
3. Complete candidate-scoped Android and iPhone state-matrix proof.
4. Obtain a genuine fresh-user ten-second comprehension result.
5. Establish or identify the intended Google Play developer account and verify
   the current listing/assets.
6. Reconcile all non-soak gates to `proven`.
7. Start a new, non-backdated 72-hour soak and preserve daily observations.
8. After 72 continuous clean hours, issue the final production report and
   release decision.

## Explicit Next Gate

Physical-device candidate proof on TestFlight build `289` and Android build
`23`. Stop before soak creation until the manifest has no open non-soak gate.
