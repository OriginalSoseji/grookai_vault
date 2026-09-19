# iOS storefront cold-launch repair

The original default-scene client lost a store URL delivered while its process was
stopped. Login succeeded but opened Pulse/onboarding instead of the intended store;
the private runtime log recorded a null initial URI. This differs from the earlier
passing warm-link journey. `baseline-failed.json` preserves that failing result.

## Change

`ios/Runner/SceneDelegate.swift` subclasses FlutterSceneDelegate and forwards the
initial URL contexts and web browsing activities to app_links after Flutter's
connection handler. Info.plist and the Xcode project register that delegate.
Flutter retains its existing handling of links delivered to an active scene.
No Dart routing, authentication, inventory or entitlement behavior changes.

The implementation follows the [app_links 6.x iOS scene guidance](https://raw.githubusercontent.com/llfbandit/app_links/master/doc/README_ios_6.md)
and [Flutter's UIScene lifecycle](https://docs.flutter.dev/release/breaking-changes/uiscenedelegate).

## Local evidence

The dedicated iPhone 17 Pro / iOS 26.5 simulator ran the regular full-app entry,
with production Dart from `7a13b553278aced661a35ffd8457727b448a7fb3` and the exact
new SceneDelegate, SHA256
`7270dae6eb0ab1cedbf65f1da13722ca5ff6f6a8e98b00760c0c744d74884f65`.
The isolated package, release iOS 16 minimum, retained synthetic 164xx Supabase
project and local web server match the preceding warm-auth proof. Firebase is
disabled and network guards restrict application traffic to loopback services.

`cold-passed.json` records exit zero for two real OS launch cases. XCTest asserts
the proof app is stopped before `simctl openurl` launches it; the test does not
launch the app itself. A signed-out store link survives real local email login.
After another full termination, the owner-preview product link uses the persisted
session and displays private product imagery. The two checked-in screenshots were
visually inspected. The reusable XCTest source is
`scripts/tests/storefront_ios_cold_auth_v1.swift.template`; its fixture file contains
only synthetic local credentials and must stay private.

`warm-regression-passed.json` independently records exit zero, four OS deliveries
and five checkpoints after the fix: login/refresh, Vendor Mode management, owner
preview, public visitor product and denied foreign preview. This regression uses
the existing full-app integration test. Cold and warm receipts reference the same
native patch hash. The focused Xcode registration/bootstrap suite passes 10 tests.

Private orchestrators, full XCTest logs/results and additional screenshots remain
under the Mac operator directory `storefront_native_325_20260919`, in
`cold-auth`, `cold-auth-fixed-v1` and `warm-after-cold-fix`. Failed evidence is
retained. Raw test logs may contain synthetic credential text and are not committed.

## Release implication

The earlier warm proof accurately established warm behavior on unchanged source;
its statement that archive 325 needed no change is superseded by this cold test.
Archive 325 remains signed and unuploaded, and must be preserved. A replacement
archive containing this fix is required before delivery. Real provider OAuth,
hosted HTTPS universal-link association, signed install and production pilot remain
unproven here. No production request, migration, grant, payment or deployment was
performed for this proof. Billing and checkout remain separate unfinished work.

## Signed replacement archive

The fix was committed and pushed as `4939f55e3f81692c1c6e7d24feb495c926dc7059`.
Both unchanged repository hooks passed: 3,910 Node tests (three skipped), web
typecheck/lint/strict build, Flutter analysis and all 748 Flutter tests. Main was
still `a151794a98cc1e47a9a8886e0e643009cea898e5`; PR #496 remained mergeable.

A new sparse Mac worktree at that exact source passed 96 focused native tests and
produced `GrookaiVault-1.0.0-326.xcarchive` using the documented desktop signing
session. The delegate source hash matches the simulator proof. The archived plist
selects `Runner.SceneDelegate`; deep strict signature validation and both Runner/App
dSYM UUID comparisons pass. The release configuration matches the retained build
319 reference with all three existing sealed flags enabled. No signing identity,
keychain permissions or tester audience was changed.

`archive326-verified.json` records direct readback. The preserved 194-file archive
manifest SHA256 is `9b7cacaf47643f57fe75e358d09889da7c3d05394b99f46789725f31660bb657`.
The full private manifest, log and exit-zero receipt remain under the new Mac
`storefront_native_326_20260919` operator directory. Archive 325 remains intact.
Build 326 is not uploaded, installed through TestFlight or publicly released.

The dedicated simulator, temporary web server, reverse tunnel and seven 164xx test
containers were stopped after verification, retaining their data. The separate
168xx release environment remains available for the unchanged repository hooks.

The separate staged Stripe candidate now passes 60 provider/enrollment tests,
TypeScript, lint and the legacy-key guard. Its customer/checkout evidence does not
yet have durable database integration or an enabled route, and made no provider
requests. These changes are not part of the signed native source or release migration.
