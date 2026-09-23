# Shared artist credits and printing preservation — September 22

Source: `1fb8af11b` plus this local repair on `feature/combined-search-20260922`.
Private evidence: `C:/grookai_vault_operator_artifacts/combined_search_20260922/`.
No deployment, production data edits, migrations, or physical-device changes.

## Findings and repair

CS-ARTIST-02: parsed individual artists previously became exact stored-credit
lookups and omitted known joint credits. `artistSearch.ts` now adds snapshot-known
credits containing the whole contributor name. Ken Sugimori and Yusuke Ohmura
each include `Ken Sugimori/Yusuke Ohmura`. The displayed interpretation remains
the individual artist, without a false ambiguity choice. Equality reads, existing
visibility rules, language scope, and complete pagination are preserved.
Explicit `illustrator` filters retain their existing exact stored-credit meaning;
a query naming the full joint credit remains specific to that joint credit.
Unknown credits outside the artist snapshot remain outside this guarantee.

CS-SEARCH-03: the expanded fixture exposed another missing-result case. Family
relevance promotion used parent IDs to remove already-promoted results. Promoting
one finish therefore removed a second finish sharing that parent. Promotion now
moves individual result objects and preserves the other matching printings.
The real API returned 83 instead of 84 for `Ken Sugimori Cynthia & Caitlin any holo`
before this repair; number sorting returned all 84. Both finishes now survive
relevance ranking. Two executable regressions failed before and pass afterward.

## Verification ledger

| Verification | Result and evidence |
| --- | --- |
| Artist regression before repair | Two failures in `shared-credit-regression-before.log` |
| Ranking regression before repair | Two failures in `shared-credit-ranking-before.log` |
| Scoped contracts | 26 passed, zero failed; `shared-credit-contracts.log` |
| Actual local API | 13 cases across 46 pages, exact identity sets and no duplicate results; `shared-credit-api-verification.json` |
| Legacy native API shape | Non-paginated limit-32 request returns all 56 reverse printings |
| Browser journeys | Mobile Chromium, mobile WebKit, desktop Chromium: all 84 printing links, exact reverse detail, back restores loaded results, finish removal retains artist/name; `shared-credit-browser.json` |
| Full repository gate | PASS at 18:27:47 UTC: 4,050 contracts passed, four skipped, zero failed; 736 Flutter tests; web typecheck/lint/strict build and Flutter analysis; `shared-credit-shipcheck-result.json` |
| Android API 36 emulator | PASS: two new native repository/UI tests; both contributors return 56 reverse printings; any holo returns 84 unique printings; filter removal returns 56 parents. `shared-credit-android.json`, screenshot and private driver log. |
| Physical Android / iOS | No new run for this web-service repair. Earlier device evidence remains historical. |

Fixture `shared-credit-20260922` contains 59 synthetic parents and 148 printings
in local set `csart`: 55 shared-credit matching names, individual contributor
controls, an unrelated artist, and a different-name control. It contains no
owner inventory. API expectations come from the fixture manifest, not resolver
output. Cases cover both contributors, surname, typo, reordered terms, normal,
holo, reverse, any holo, full shared credit, and explicit exact illustrator.

Browser automation counts unique target URLs because each displayed card has
both image and title links. Earlier harness failures from counting these as
duplicate cards and locating a finish badge inside the title anchor are retained
as harness diagnostics; the final receipt verifies actual result identity.

Native harness: `integration_test/shared_artist_search_local_test.dart`; targeted
Flutter analysis passes. The APK uses the isolated package
`com.grookai.vault.combinedsearch20260922`, with original Gradle/manifest bytes
restored after packaging. Only emulator loopback routes were added for the test;
the helper removes them and its isolated installation afterward. Source hashes
and APK identity are in `shared-credit-android-build.json`. The checked-in native
product code was unchanged. The new target was formatted and separately analyzed
after the full gate; the native run tests that exact target.

## Remaining release boundaries

These are local repairs, not proof of deployed closure or independent catalog
completeness. Keep CS-CATALOG-01 (Lost Origin Wurmple's missing artist metadata),
production HTTPS dispatch, physical iPhone acceptance, and production-scale
candidate performance visible in the release ledger. The broader app/web audit
and Vendor Mode work remain separate. Do not replay production catalog writers.
