# Combined search broad-query local verification — September 22

Runtime source: `ed8645b93b4a23a8751b9fd81654f63ca48738aa`. Optimized build: `DWkDCIvf2uwqJggMpUuA-`.
Completed: 2026-09-22T20:20:00.447Z. Origin: http://127.0.0.1:3204.
No product changes, deployment, production writes, or device changes.

## Results

All five result sets match independent fixture identity sets across 107 pages.
Every response retains the requested artist, name, finish and language constraints;
no missing or duplicate IDs, unstable totals, changed first-page ordering, partial
fallbacks or HTTP failures were observed. Each paginated request uses 64 results.

| Search | Language | Fixture matches | Pages | Median ms | p95 ms | Max ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 5ban Graphics | all | 1805 | 29 | 728 | 813 | 833 |
| 5ban Graphics any holo | all | 2708 | 43 | 1897 | 2086 | 2129 |
| Pikachu reverse holo 5ban Graphics | all | 361 | 6 | 676 | 716 | 716 |
| 5ban Graphics reverse holo | ja | 150 | 3 | 282 | 291 | 291 |
| 5ban Graphics non-holo | en | 1655 | 26 | 1429 | 1517 | 1543 |

Totals displayed by the API can include two pre-existing 5ban Graphics fixture
parents. The independent expected set above counts only this new fixture. The
broader result set is additionally checked for requested constraints, unique IDs,
stable totals, and stable repeated first pages.

The legacy non-paginated limit-32 request retains all 2710 results,
including all 2,708 matching fixture printings. Its JSON body is
1,924,525 bytes. A three-request local burst passed;
individual response times were 1935, 2357, 2888 ms. This small
burst does not establish sustained-load capacity.

Mobile and desktop Chromium rendered the expected 2,710-result count, preserved
artist/finish filters and advanced from 24 to 48 results without page errors or
horizontal overflow. Initial visible results took mobile: 2558 ms; desktop: 2485 ms.
These browser samples are illustrative timings, not a percentile benchmark.

## Fixture and reproducibility

The existing isolated database uses loopback API 54321 and SQL 54330. The helper
asserts both origins before writes. Fixture `search-scale-20260922` in set
`csscale` contains 1,810 parents and 4,525 printings: 1,805 attributed to 5ban
Graphics (150 in Japanese scope), plus five unrelated-artist controls. Pikachu and
Raichu names, Normal/Reverse/Holo children and language scope vary independently.
The fixture is larger than the previously observed 1,719 live 5ban parents.
The manifest is generated independently and read back after the local transaction.
Existing fixtures and user inventory were preserved. The fixture remains local
for reproduction; counts and blank synthetic artwork are not production content.

Restarted only the owned loopback optimized preview on port 3204 to load the
latest completed strict build. A shared-credit canary returned all 84 printings,
confirming the latest repair is active. Port 3202 remains the separate dev server.

Private evidence directory:
`C:/grookai_vault_operator_artifacts/combined_search_20260922/`.
- `fixture-search-scale.mjs`, `search-scale-fixture.json`: bounded local seed.
- `verify-search-scale.mjs`, `search-scale-verification.json`: 117 timed
  API calls, exact source hashes, build ID, all pages and small-burst results.
- `verify-search-scale-browser.mjs`, `search-scale-browser.json`: browser proof.
- `search-scale-mobile.png`, `search-scale-desktop.png`: screenshots.

## Limits and next release work

This establishes larger-fixture correctness and local response times, not
production performance. The overall database is small, images are placeholders,
requests are guest/no-pricing, and network latency is loopback. Production table
size, indexes, permission checks, cold starts, authenticated pricing and sustained
traffic still need representative verification. Artist paging currently resolves
the complete candidate set before slicing each response; this preserves complete
filtering but repeats work on every page. Retain that as a performance consideration.

Remote main advanced to `76ff8b32b`: five founder dashboard JSON snapshots only,
no search/runtime overlap. It was inspected read-only; this frozen runtime was
not rebased or merged during measurements. Reconcile main before packaging.

The full product gate remains the passing shared-credit repair gate (4,050
contracts, four skipped, 736 Flutter tests). This step changes documentation and
private verification helpers only; it does not claim a new full gate. Remaining
external gates include physical iPhone acceptance, approved release-signed Android
HTTPS dispatch, candidate production performance, and separate web/native rollout
approval. CS-CATALOG-01 remains separate governed catalog work. The broader app/web
audit is not completed by these search checks.
