# Combined search: signed-in release checks

Latest follow-up: [physical acceptance](combined_search_physical_acceptance_20260922.md).
The Samsung full shell and local cold/warm intents pass. A discovered sign-out
route cleanup defect is repaired and verified; iOS simulator and a fresh complete
repository gate also pass. Physical iPhone acceptance remains open after its
connection dropped. Earlier source-specific findings below retain their original
scope; the physical follow-up supersedes their all-devices-open status.

Source: 1d3ec6d4a, the 1f6cabce6 AASA/test follow-up, and the dock-height repair
described below. Exact file hashes and commit are in onboarding-source-manifest.json.
No deployment, store upload, production mutation, or real-user messaging occurred.
The Vendor Mode candidate and broader audit inventory remain separate.

## Verified outcomes

| Environment / role | Outcome and evidence |
| --- | --- |
| Optimized local web, mobile Chromium, owner | Password login returns to owned query; three cards; session survives reload; detail shows ownership; artist link refines search |
| Optimized local web, mobile Chromium, visitor | Password login returns to owned query; zero cards; session survives reload; no owner data leakage |
| Optimized local web, mobile WebKit, owner / visitor | Same two journeys pass, zero page errors |
| Android API 36 emulator, owner, actual app.main / MyApp / AppShell | Password login, profile gate, Search tab, three owned cards, typo + artist + name + exact reverse finish (168), remove finish (335), sign-out all pass |
| Prior source a98dd26f7 vs candidate | Two executable Dart checks: prior parser returns null for /explore and /search while candidate routes them; both retain card links |
| iOS association compatibility | AASA expansion removed; resulting SHA-256 equals live file: 06227e2dd1564a116ab330bf135aba18965198bdaafd7635a8d5162f3919ceac |
| Scoped verification | Integration test analysis passes; 14 routing/association tests pass; two prior/candidate routing checks pass; full Android shell test passes |
| Android onboarding / search visual regression | Reproduced the screen-height dock and offscreen close action; corrected the dock height; onboarding is visible and dismissible, then owned and combined search render without the gray layer |
| iOS 26.5 simulator, owner, actual app.main / MyApp / AppShell | Password login, visible onboarding and dismissal, three owned cards, 168 exact reverse-holo matches, 335 after finish removal, dock-height checks, and sign-out all pass on a253902aa native source |

Web uses the existing optimized build on loopback port 3204. Development preview
remains on 3202; report remains on 3203. Both use local API 54321 and SQL 54330.
The two pre-existing contained owner/visitor fixture accounts were reused; only
their local credentials were prepared. Owner has three active fixture copies,
visitor has none. No production account or inventory was used.

Native proof boots the actual app and enters the password through its normal UI.
It does not substitute a HomePage-only MaterialApp harness. Notifications were
denied in the emulator. It clears only the local endpoint's persisted auth token
before startup and verifies sign-out after the journey. Credentials come from a
private dart-define file. Physical-device and onboarding completion are not implied.

Earlier failed harness attempts remain private: taps during boot, crash reporting
replacing the test error handler, a nonexistent complete-list count label, and
input focus after permission dismissal. The final run passes. WebKit waits for
form hydration; its optimized-build run passes without development-overlay errors.
These are test setup corrections, not claims of product fixes.

## Read-only live baseline

At 2026-09-22T14:25Z, published AASA returned HTTP 200 without search paths.
The deployed artist resolver returned 195 Yuka Morii rows over five pages, all
HTTP 200, with observed single-run page times of 581–1173 ms. Its artist result
list contains Wurmple GV-PK-PL-103. This observes current public data; it does not
independently prove live catalog completeness or existence of particular finishes.

The deployed name-only Wurmple response returned 14 rows without artist paging
metadata; completeness remains unverified. These timings describe the existing
deployed resolver, not the new combined resolver. No development service was
pointed at production and no live records were imported into the fixture database.

## Open findings and remaining checks

- Both Android and iOS signed-in shells now pass on virtual devices. Physical
  devices, additional hardware/OS combinations, and OS link dispatch remain open.
- Samsung and iPhone devices are available, but existing installations were left
  intact. Android already has the shared locked-acceptance package; use a separately
  isolated installation for this candidate. iOS needs isolation and signing review;
  observed Mac free space after the iOS check was approximately 2.7 GiB.
- The Android gray-layer finding is resolved on the API 36 emulator as detailed
  below. This is full-app integration evidence, not a standalone manual launch,
  or physical-device proof. The iOS shell is separately verified below.
- iOS HTTPS search association expansion is deferred. Native parsing and artist
  links remain in source; publication requires a compatibility plan for older
  installed clients. Android OS dispatch and physical-device behavior remain open.
- Production-scale combined-query latency and independent live finish/catalog
  completeness remain open. Do not substitute fixture counts or this baseline.

Private evidence: C:/grookai_vault_operator_artifacts/combined_search_20260922/.
Receipts: signed-in-web-verification.json, android-signed-in-shell-verified.log,
android-signed-in-owned.png, android-signed-in-combined.png,
legacy-link-compatibility.log, association-regression.log,
signed-in-integration-analysis.log, live-association-readback.json,
and live-search-baseline.json. Credentials, intermediate failures, and full logs
stay outside the repository and browsable report.

## Android dock-height repair

The gray layer was a real shell layout error. `_buildMobileBottomDock` used an
`Align` without a height factor, so the bottom-navigation layout expanded to the
entire 914.29-logical-pixel screen height. With `Scaffold.extendBody`, Flutter
passed that height to the body as bottom safe-area padding. The onboarding panel's
close control was laid out at y=-298 to -266, above the viewport; its scrim still
covered the body. The underlying search remained interactive.

Set `heightFactor: 1` on the dock's Align so Scaffold reserves the dock's actual
height. Onboarding content, permissions, queries, catalog data, and service rules
are unchanged. The signed-in test now checks dock height at landing and again
after search, verifies that a present onboarding close action is visible and
hit-testable, dismisses it, and checks that the overlay is absent from results.

The new dock assertion failed against the original code (actual 914.29 vs expected
less than 304.76). After the repair, the complete Android test passed: password
login, visible onboarding and dismissal, three owned fixture cards, 168 exact
reverse-holo matches, 335 matches after removing finish, and sign-out. These are
synthetic catalog counts. The notification permission was denied in the emulator.
One intermediate test needed its dock finder refreshed after shell rebuilds;
the final passing log is `android-onboarding-verified.log`.

Private evidence: `android-onboarding-diagnostic.log`,
`android-onboarding-regression-before.log`, `android-onboarding-verified.log`,
and `android-onboarding-fixed-{onboarding,owned,combined}.png`. The original gray
captures remain preserved. The browsable report includes an annotated before/after
pair and the visible onboarding panel; full logs and credentials remain private.

The complete local repository shipcheck passed at 2026-09-22T15:08:27Z: 4,046
contracts passed, the same four documented skips, zero failures; 736 Flutter
tests passed; web typecheck/lint/strict build, Flutter analysis, secret packaging,
runtime preflight/health, and contract reports passed. Receipts are
`onboarding-shipcheck.log` and `onboarding-shipcheck-result.json`; earlier full-gate
receipts are preserved. API/SQL routing stayed local. The local checkpoint commit
intentionally uses the documented `--no-verify` operator path after this complete
gate to avoid a duplicate run, without waiving any failed check.

## Full signed-in iOS shell

On September 22, the same checked-in `combined_search_signed_in_test.dart` passed
through the actual app on the existing iOS 26.5 simulator
`B3B4DF3D-004F-4157-B694-3A4F7B305533`. The Mac checkout retains its c28f2eea8 Git
baseline plus the isolated native payload. Before building, 257 tracked native,
integration-test, dependency, and iOS Runner files were hash-compared with Windows
candidate a253902aa3ad4cf735e6fcc575f75dc589b2ddfe; there were zero mismatches.
The previous Mac native files were backed up privately before synchronization.

Environment: Xcode 26.6 (17F113), Flutter 3.44.9, Dart 3.12.2. Mac loopback ports
3202 and 54322 use the established SSH reverse forwards to the Windows local web
and sandbox API. The existing contained owner account was reused; its profile
was already complete, so this run does not establish new-profile creation on iOS.
No product code, schema, production data, physical installation, or signing
configuration changed in this verification step.

The first functional run passed but iOS notification permission UI covered its
screenshots. Those captures are retained as `ios-permission-covered-*.png`, with
`ios-signed-in-permission-covered.log`, and do not count as clean visual evidence.
A separate private XCUITest runner matched only the Grookai Vault notification
alert and tapped Don't Allow. It passed; the repeat full-app run recorded
`permission_denied`, visible onboarding and dismissal, all search assertions,
and sign-out, ending `00:36 +1: All tests passed!`.

Final visual evidence uses light appearance, the same account and fixture queries
as Android: `ios-signed-in-{onboarding,owned,combined}.png`. Inspecting the images
confirmed the onboarding panel is visible above the dock and the search body is
unobscured after dismissal. Simulator screenshots are 1206 x 2622 pixels (402 x 874
logical pixels); Android comparison is 1080 x 2400 (411.43 x 914.29 logical pixels).
Safe areas and system chrome differ legitimately. Artwork is synthetic fixture
placeholder content, not evidence about live image or finish completeness.

Private receipts: `ios-signed-in-shell.log`, `ios-shell-source-readback.json`,
`ios-shell-source-expected.json`, `simulator-permission-test.log`, and the safe
summary `ios-shell-verification.json`. The report includes Android/iOS pairs.
Credentials, full logs, the UI-test helper, and local build settings remain outside
the repository. Physical iPhone acceptance, release signing, and deployed link
dispatch are not implied. The existing complete shipcheck at a253902aa still
applies to unchanged application code; this follow-up only updates documentation
and private evidence. Its documentation checkpoint uses the explicit operator
commit bypass without representing a new full shipcheck run.
