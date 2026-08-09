# Synchronized Final Candidate V1

## Result

Status: `PLATFORM IDENTIFIERS FROZEN - CANDIDATE-SCOPED JOURNEYS OPEN`

Web, Android, and iOS now originate from application source commit
`a8ec3d27808fd100cbb8e544032ee479e9632f24`. The verifier commit is
`e343879a5dc247958f77f37562e7f29ad8a50cfd`.

The repository's `origin/main` later advanced to `cd6e748df8d9bf1793eb84610b95709956d4eb1e`
only to refresh five founder-operations dashboard JSON snapshots. No deployable
web, Flutter, Android, iOS, dependency, or database source changed. The frozen
candidate remains `a8ec3d2` because that is the exact application source shared
by the three built artifacts.

After the candidate evidence was captured, operations-only commit `b5e68cf06`
repaired contained-process timeout output and refreshed the activation package
hash chain. It changed no deployable application source or candidate artifact.
Containment contracts passed `7/7`, activation and rollout contracts passed
`62/62`, the full Node contract suite passed `1612/1612`, Flutter tests passed
`585/585`, and the full shipcheck passed.

## Frozen Identity

- Web GitHub deployment: `5816529955`
- Web deployment URL: `https://grookai-vault-llmlay4xe-sosejis-projects.vercel.app`
- Production origin: `https://grookaivault.com`
- Android workflow run: `31301013632`
- Android artifact: `9034580292` (`signed-release-apk`)
- Android package/version: `com.grookai.vault`, `1.0.0 (23)`
- Android APK SHA-256: `deda3271c92258870a8abbeffce163ba39fb9a5e6d3142aca8907ff969ddb7f6`
- TestFlight build: `1.0.0 (289)`
- App Store Connect build ID: `dc5801e6-e1fd-42ef-b476-768e5ff5d411`
- iOS IPA SHA-256: `27619987ad4121347dbbfa2ef68a840d4ccc5139757f6f14d28a31a3660a09e1`

## Proven

- Production web serves the candidate SHA.
- Signed-out web passed `22/22` route cases and `2/2` personal-action
  continuation cases across narrow and desktop viewports.
- Signed-in production web passed `26/26` route cases and `2/2` exact-card
  message-context cases. The verifier blocked ten non-read requests and proved
  all five database assertions unchanged. An initial pre-authentication
  navigation timeout was preserved and classified before the unchanged
  verifier passed on one controlled retry.
- The signed Android APK passed package, build, signer, artifact, and SHA-256
  readback.
- Android build `23` installed on the physical Samsung without clearing app
  data. The device remained securely locked, so no new physical journey is
  claimed.
- Android build `23` cold-launched on the emulator, rendered signed-out card
  exploration with images, opened an exact Japanese card detail, and displayed
  the `Normal` printing label.
- The iOS archive was produced from a detached exact checkout of `a8ec3d2` using
  Xcode `26.6 (17F113)`.
- Archive and IPA readback agree on bundle `com.cesar.grookaivault`, version
  `1.0.0`, and build `289`.
- App Store Connect reports build `289` as `VALID`, `IN_BETA_TESTING` internally
  and externally, with beta review `APPROVED` and auto-notify enabled.
- All three intended TestFlight groups contain build `289`.
- Four arm64 dSYM bundles exist, including `Runner.app.dSYM` UUID
  `D3780FFB-530F-3840-90FE-F9E281EEDC93`.
- The Mac checkout was returned to the exact candidate tree after CocoaPods
  rewrote only its generated `PODFILE CHECKSUM`. The pre-existing untracked
  `Studio.app/` directory was not altered.
- The connected iPhone 17 Pro still has build `288`. A read-only TestFlight UI
  preflight was blocked before test execution by device authentication, and a
  later launch attempt confirmed the device was locked. No candidate journey
  result is claimed from that attempt.
- The authenticated Play Console route resolves to `/console/signup`, proving
  that developer enrollment and listing readback remain external prerequisites.

## Not Yet Proven

- Genuine fresh-user ten-second comprehension.
- Journey A signed-out continuation on physical iPhone build `289`.
- Journey C Want-to-match-to-message-to-opt-out on physical iPhone build `289`.
- Journey F signed-out locked-feature continuation on physical iPhone build
  `289`.
- Candidate-scoped physical Android and iPhone state-matrix completion.
- Google Play developer account and current listing/assets readback.
- The 72-hour immutable-candidate soak.

Historical TestFlight build `288` remains valid functional Journey C evidence,
but it cannot substitute for build `289` at the candidate trust boundary.

## Boundaries

- No public App Store release.
- No Google Play release.
- No production database write.
- No collector-data mutation.
- No soak start or backdating.
- No reuse of a historical build as candidate-scoped proof.
- No candidate identity or artifact was changed by the operations-only repair.

## Exact Next Gate

Install TestFlight build `289` on a connected physical iPhone and repeat
Journeys A, C, and F plus the required state matrix. Complete the corresponding
physical Samsung state proof, obtain genuine fresh-user comprehension evidence,
and establish the intended Google Play account/listing readback. Reconcile those
results into the manifest. Only after every non-soak gate is `proven` may the
72-hour soak start.
