# Release Readiness Audit 2026-07-31 V1

## Status

Controlled beta ready. Expanded beta remains gated by the current Xcode Cloud
result and clean-account physical-iPhone journey proof. Public launch is not
yet authorized.

This checkpoint supersedes the release-readiness facts in the assessment of
commit `91ab3c198d6c1fb300cd3f28cf463f72c62e79f6`. The wall-feed defects and
missing deployment identified there have since been repaired and proven in
production.

## Audit Scope

The audit covered:

- repository and migration truth on `main`
- GitHub, Vercel, and Xcode Cloud release state
- anonymous and authenticated pricing boundaries
- public web routes and canonical image delivery
- the production `wall_feed` Edge Function
- the frozen TCGPlayer Market 72-hour canary
- Node, Flutter, web, Deno, secret, drift, and runtime-protection checks

No production data mutation was performed by this audit. The only production
change was deployment of the read-only `wall_feed` function from merged code.

## Release Revisions

- Pricing and release-remediation merge: `8933fd73177b26eea8cc96b3e5f2b7d31b8eab3a`
- Wall-feed deployment-contract merge: `258215033d8ea35417fbba3f0766da91506344e4`
- Wall-feed count-quality merge and deployed revision:
  `40457c1f8c0f80cd91cbb6f92ca6c1d7fb1e30c2`

## Findings

### Closed Findings

1. Out-of-range wall-feed pagination now returns `200` with an empty item list
   and the available total instead of surfacing upstream `416` as `502`.
2. Upstream response-body read failures are handled inside the controlled JSON,
   CORS, and no-store error boundary.
3. Search metacharacters `%` and `_` are treated as literal input.
4. Public feed reads are bounded and rate-limited; write methods return `405`.
5. Feed counts use PostgREST estimated mode, which remains exact for small
   result sets and avoids unconditional exact-count cost at scale.
6. Signed-in Pulse network reads retain the verified viewer and exclude that
   viewer from discovery.
7. Governed TCGPlayer pricing code, migration history, web surfaces, Flutter
   surfaces, exact Vault totals, observability, and rollback controls are all on
   `main`.
8. Pricing-bearing routes remain authenticated and fail closed for anonymous
   callers.

### Production Proof

The deployed `wall_feed` revision returned:

| Probe | HTTP | Items | Count | Result |
| --- | ---: | ---: | ---: | --- |
| base, limit 5 | 200 | 5 | 7 | pass |
| search `asdf` | 200 | 2 | 2 | pass |
| minimum-price filter | 200 | 7 | 7 | pass |
| literal wildcard input | 200 | 0 | 0 | pass |
| offset `999999` | 200 | 0 | 7 | pass |
| POST | 405 | n/a | n/a | pass |

The final merge's Vercel deployment, legacy-key guard, and production edge
probe passed. Earlier read-only production checks also proved:

- home, login, card detail, set grid, Dex, and Pulse network routes return 200
- canonical artwork delivery returns a non-empty WebP image
- anonymous wall access redirects to login
- anonymous card-pricing API access returns 401
- card detail renders TCGPlayer Market labeling and the signed-out lock state

### Verification

| Suite | Result |
| --- | ---: |
| Node contracts | 1,182 / 1,182 passed |
| Flutter tests | 541 / 541 passed |
| Flutter analysis | no issues |
| Web TypeScript | passed |
| Web lint | passed |
| Strict web production build | passed |
| Wall-feed Deno tests | 7 / 7 passed |
| Wall/probe Node contracts | 6 / 6 passed |
| Runtime health and fail-closed reports | passed |
| Secret guard | passed |
| Production edge probe | passed |
| Production DB read-only probe | passed |

The isolated checkout did not contain `SUPABASE_DB_URL`, so a local managed-DB
preflight was not rerun there. Existing CI and production read-only proofs are
recorded separately and do not convert that skipped local check into a pass.

## Open Gates

### Xcode Cloud And TestFlight

The Xcode Cloud build for deployed main revision
`40457c1f8c0f80cd91cbb6f92ca6c1d7fb1e30c2` failed:

`33c5f31d-1e0f-4625-908b-17f9a18fb51e`

The immediately preceding builds for `258215033d8ea35417fbba3f0766da91506344e4`
and `8933fd73177b26eea8cc96b3e5f2b7d31b8eab3a` also failed. GitHub exposes
the App Store Connect build link and final status but not the archive log.
The Apple email for build 248 supplied the missing failure evidence:

- `ios/Flutter/Release.xcconfig` could not include `Generated.xcconfig`
- Xcode could not load the CocoaPods Runner framework output file list

The repository did not contain Xcode Cloud's recognized
`ios/ci_scripts/ci_post_clone.sh`, so the temporary macOS worker ran neither
`flutter pub get` nor `pod install` before archive. This is a dependency
bootstrap failure, not a Flutter test or application-code failure.

The repair candidate adds the official post-clone integration point, pins the
repository-tested Flutter `3.35.2` release, precaches iOS artifacts, resolves
the locked Dart packages, installs CocoaPods when absent, and runs `pod
install`. A new contract protects the complete bootstrap sequence. The repair
is not production-proven until a fresh Xcode Cloud archive passes. No
successful TestFlight artifact from current `main` is proven yet.

The first repair was merged as
`ac8a32290513702ef0870be231763d40a7006137`. Xcode Cloud build 250 then
advanced beyond both missing-input failures and reached Flutter's archive
configuration guard. It failed because the generated iOS settings were still
Debug and explicitly required `flutter build ios --config-only --release`.
The follow-up candidate adds that exact release-configuration step before the
Xcode archive. This is a new, narrower bootstrap class; live proof remains the
next Xcode Cloud build from the follow-up merge.

The dependency-order follow-up was merged as
`6bb118e54bf5bfa9314bc4ca3f82de4401775a87`. Build 251 then completed the
Flutter and CocoaPods setup and reached Swift compilation. The app's iOS host
uses `FlutterImplicitEngineDelegate`, `FlutterImplicitEngineBridge`, and
`FlutterSceneDelegate`, which belong to Flutter's UIScene lifecycle supported
by Flutter 3.41 and newer. The Xcode bootstrap still pinned Flutter `3.35.2`,
so those SDK types were unavailable. The next candidate aligns Xcode Cloud to
the current stable Flutter `3.44.7` SDK while preserving the migrated iOS
lifecycle and custom scanner registration. The SDK tag is verified upstream;
the next archive remains the authoritative macOS compile proof.

The Flutter 3.44.7 candidate merged as
`7cc8f2bf01d1e7ca6b0493b967428704b5d9b51c`. Builds 252 and 253 then failed
inside `ci_post_clone.sh` before Xcode archive, including one automatic retry
from unchanged iOS code. The script pinned 3.44.7 but reused the unversioned
cache path `${HOME}/flutter` whenever any Flutter executable already existed.
That made the requested SDK version unenforceable against an older Xcode Cloud
cache. The next candidate uses a version-specific SDK cache, verifies the
cached framework version before dependency resolution, and emits bounded phase
markers so future custom-script failures identify the exact failed stage.

Build 254 still failed inside the custom script. The same merged script then
passed end to end on a disposable GitHub macOS 15 runner in 4m42s, including
Flutter package resolution, CocoaPods installation, and release configuration.
That isolates the remaining failure to Xcode Cloud-specific state rather than
portable script behavior. The candidate still allowed a hidden
`FLUTTER_VERSION` workflow variable to override the repository default. The
next candidate removes that override path, freezes Flutter 3.44.7 in source,
and uses distinct non-secret exit codes for clone, precache, package, pod, and
release-configuration phases. The disposable diagnostic branch is not part of
the release and must not be merged.

Expanded beta requires:

1. a successful Xcode Cloud archive and distributable TestFlight build
2. clean-account validation on a physical iPhone
3. the core journey: sign up, find a card, own it, create a binder, add an
   intent or listing, and observe the resulting activity

### Pricing Canary

The frozen 100-row TCGPlayer Market canary is healthy and observing. Its
governed window is:

- start: `2026-07-31T10:34:15.670Z`
- required end: `2026-08-03T10:34:15.670Z`
- activation run: `0c23045d-8141-4b9c-ba41-2f8c44522921`
- frozen pricing commit: `416c4691d1c1d6be8a1461c148deebe627e813f8`
- expected publication rows: 100

Latest observation is green, with no unhealthy slots or run keys. Production
V1 cannot be declared complete before the required end and a final
`--require-pass` observation.

After the canary passes:

1. run the frozen linked migration preflight
2. apply the governed read-model completion package
3. verify schema, grants, RLS, authenticated reads, and anonymous denial
4. deploy the exact web and Flutter clients
5. execute and reconcile the 17-surface source-to-render proof
6. enable signed-in full publication through the governed pointer
7. observe seven unattended production cycles
8. run rollback rehearsal and publish the final pricing report

## Verdict

| Area | Rating | Audit judgment |
| --- | ---: | --- |
| Product foundation | 9.2 / 10 | strong canonical, security, and contract base |
| Controlled beta readiness | 9 / 10 | authorized with current signed-in boundaries |
| Expanded beta readiness | 8 / 10 | waits on Apple/TestFlight and physical-device proof |
| Public launch readiness | 7 / 10 | pricing duration and public/licensing gates remain |
| Operational confidence | 8 / 10 | substantially improved; final duration gates remain |

Grookai is ready for a controlled invite-only beta. It is not yet ready for an
unrestricted public launch. The remaining blockers are operational proof, not
missing core architecture.

## Invariants

- Do not shorten or backdate the 72-hour pricing canary.
- Do not represent a pending Apple build as distributable.
- Do not enable anonymous pricing before licensing and display authority.
- Do not weaken governed pricing, RLS, service-role, or canonical boundaries to
  satisfy a UI deadline.
- Do not call Production V1 complete until the final observer, migrations,
  17-surface proof, and seven unattended cycles all pass.

## Exact Next Gate

Merge the Xcode Cloud dependency-bootstrap repair and require a successful
archive and TestFlight artifact from the resulting `main`. Then validate the
clean-account journey on a physical iPhone. Independently, preserve the frozen pricing canary until
`2026-08-03T10:34:15.670Z`, then run its mandatory final pass before applying
any post-canary pricing migration.
