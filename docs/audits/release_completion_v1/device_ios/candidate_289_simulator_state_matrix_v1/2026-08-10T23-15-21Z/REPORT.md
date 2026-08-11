# iOS Frozen-Candidate Simulator State Matrix V1

## Decision

Status: `PASS`

The authorized non-mutating iOS simulator state matrix is complete for frozen
application source `a8ec3d27808fd100cbb8e544032ee479e9632f24`.
Signed-out, loading, empty, deterministic offline/error, recovery, private,
large-text, and sign-out restoration states all passed.

This evidence closes the functional iOS portion of the cross-platform state
matrix under the August 10 handoff, which explicitly permits simulator proof
for these non-mutating states after TestFlight build 289 already proved
physical installation, candidate identity, and the high-risk Journeys A, C,
and F.

## Candidate And Environment

- Frozen app source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- TestFlight authority already proven: `1.0.0 (289)`
- Simulator build: `1.0.0 (23)` from the exact frozen source
- Online Runner SHA-256:
  `8fccc03da56286bcb0b5fa8d0c457a00b2d45a76ad8aeae18e858517ee186a26`
- Deterministic offline Runner SHA-256:
  `1725f96bb9d6db74b90f8f723fe41abf983c17735db2d91916da8d8de36074d3`
- Simulator: iPhone 17 Pro, iOS 26.5, `iPhone18,1`
- Xcode: `26.6 (17F113)`

## Proven States

| State | Result | Evidence |
|---|---|---|
| Signed out | Pass | `signed_out.png` |
| Loading | Pass | `loading.png` |
| Empty | Pass | `empty.png` |
| Offline/error | Pass | `offline_error.png` |
| Recovery | Pass | `recovery.png` |
| Private authenticated | Pass | `private_authenticated.png` |
| Accessibility-medium text | Pass | `text_scale_accessibility_medium.png` |
| Sign-out restoration | Pass | `signed_out_restored.png` |

Visual inspection found no incoherent overlap in any preserved state. The
loading screen exposes bounded skeletons, the empty and offline states explain
their condition, online recovery renders live card images, and the large-text
entry keeps primary controls readable and scrollable.

## Fixture Correction

The initial supposed empty query, `zzzz-no-card-can-match-20260810`, was not a
valid impossible-query fixture. Production search removed generic terms and
returned legitimate rows. That first combined result bundle therefore ended
with one failed empty assertion while its signed-out assertion passed and its
loading screenshot remained valid.

No code or configuration changed. The empty test alone was rerun with
`Qzxwvplmntr999999`, which production independently returned as zero rows. The
corrected test passed. This is a fixture correction, not a product repair.

## Offline Method

iOS Simulator does not expose a reliable automated airplane-mode control. The
offline state used a second binary built from the same frozen source with only
its service endpoints directed to loopback. It displayed the exact bounded
fallback copy and did not crash or remain indefinitely loading. The preserved
online binary was reinstalled afterward and its executable hash matched
exactly before recovery and cleanup proof.

## Private-State Boundary

A disposable Supabase session was obtained without printing credentials or
tokens and inserted only into the simulator app's local preferences. The
private Pulse shell passed. The product UI then signed the session out.
Readback proves the app-local and simulator-domain session keys are absent.

No Vault, pricing, message, approval, publication, or other application data
was written. Raw result bundles from failed credential experiments were not
preserved in source control.

## Restoration

- Installed online Runner matches the preserved online build: `yes`
- Content size category restored to `default`: `yes`
- App-local disposable Supabase session absent: `yes`
- Simulator-domain disposable Supabase session absent: `yes`
- Production application database mutations: `0`

## Release Effect

The `cross_platform_state_matrix` gate may move from `partial` to `proven`.
The eight-week completion manifest therefore moves from `10/14` to `11/14`.

This does not prove or waive:

1. genuine fresh-user ten-second comprehension;
2. Google Play developer-account and listing authority;
3. the final non-backdated 72-hour release-candidate soak.

Public launch remains unauthorized until those three gates pass and the final
production report is issued.
