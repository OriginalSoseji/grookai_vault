# Padded collector-number search: isolated web release

## Scope

Founder requested the next step after the search repair and declined further
manual testing. This branch isolates that repair from the Samsung 304/305
collector/scanner development tree and its unrelated failures.

- Worktree: `C:/gv_search_collector_release_20261026`.
- Branch: `fix/search-padded-collector-number-20261026`.
- Production/main baseline: `ed0b7c6a8cacb307b09ca57131b0f64f12167ab2`.
- Only the collector lookup, regression tests and release documentation change.
- No scanner model/index, Flutter app, schema, catalog, ownership, pricing,
  authentication, environment guard or deployment configuration change.

The existing Samsung scanner's separately activated Greninja reference remains
on its local 8801 service; this branch does not deploy that service publicly.

## Repair

`getExploreRows.ts` now consumes both printed and normalized collector-number
tokens as numeric evidence. `081` no longer becomes a required name substring.
Numeric candidate lookup includes both `81` and `081`. Purely numeric lookups
use indexed exact equality; alphanumeric collector tokens retain the current
case-insensitive, escaped exact-pattern lookup. Name, number, language and
bounded request constraints remain binding. No new search identity authority.

## Automated qualification before normal commit

- Related regression/search checks: **36 passed**, including lowercase
  alphanumeric suffixes, sibling-suffix exclusion and exact numeric requests.
- Initial full repository contract suite: **8336 passed, 11 skipped, zero failed**.
  The normal hook subsequently caught an old blanket source assertion banning
  numeric equality. That assertion now requires the numeric-only equality guard
  while preserving escaped case-insensitive suffix matching. Behavioral tests
  verify that lowercase and sibling suffixes remain distinct. The final normal
  hook is rerun after this correction; no assertion was simply removed.
- Full web typecheck and lint: passed with the pinned current-main dependencies.
- Strict production-shape build: passed in loopback read-only collector mode,
  with production credentials removed. Vercel must rebuild with the existing
  production environment; this local artifact must not be promoted directly.
- Playwright logo/header/browser release checks: **11 passed**, no manual test.
- Release secret-packaging guard: passed.
- Production drift SQL, run unchanged through management HTTPS in a repeatable
  read-only transaction: 13 checks, **zero critical failures**, three known
  deferred-debt checks. Direct PostgreSQL TCP to production timed out; this
  transport failure was not presented as a successful connection.
- Existing isolated scanner schema database was verified by container, network,
  server IP, workers=0 and enforced read-only connection. Normal runtime
  preflight passed there. This local result is separate from production proof.
- Real public-key SDK lookup checks on the production catalog confirm
  `mega greninja 081`, `mega greninja 81`, and `081 mega greninja` return
  `GV-PK-MEP-081`; incorrect `080` returns no card; Maushold 155 still resolves.
  Current-main baseline pattern queries timed out in this comparison; that
  outcome is recorded explicitly, not converted to a claim of an empty catalog.

These live probes exercise the actual collector lookup functions and omit
unrelated pricing/image enrichment. The full deployed endpoint must be read
back after any qualified deployment before claiming the repair is live.

## Evidence and remaining gates

Local receipts are under `.tmp/release-*.log`, corresponding status JSON files,
`.tmp/search_collector_live_smoke_305.json`, and
`.tmp/production-drift-readonly.json`. They contain no reusable credentials.

The normal installed commit hook, hosted CI, merge and production deployment
remain pending at preparation time. No hook or release-guard bypass is allowed.
Existing GitHub/Vercel integration owns production deployment from merged main.
Do not include changes from the mixed development tree or replay completed
image/database repairs. No production writes were performed by these checks.
