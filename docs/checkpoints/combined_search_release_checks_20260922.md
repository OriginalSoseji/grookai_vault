# Combined search: signed-in release checks

Source: 1d3ec6d4a plus the AASA compatibility follow-up and integration test.
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

- Full iOS signed-in shell remains unverified; earlier iOS evidence covers actual
  search screens inside a simulator harness only.
- Samsung and iPhone devices are available, but existing installations were left
  intact. Android already has the shared locked-acceptance package; use a separately
  isolated installation for this candidate. iOS needs isolation and signing review;
  observed Mac free space was approximately 3.4 GiB.
- Android full-shell captures show a gray layer over the search body after the
  onboarding probe. Actions pass, but the onboarding panel is not visible in those
  captures. Reproduce outside the harness and inspect OnboardingLadderOverlay
  before accepting native visual readiness. No onboarding product change was made.
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
