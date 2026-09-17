# Catalog Source Access Checkpoint

Date: 2026-09-17 UTC
Status: Narrow code repair; not deployed.

## Failure Evidence

Run `35188899452` on main `4badc65ff7bf470edb99cd83559a94a0c0046110`
failed discovery when Bulbapedia's Storm Emeralda page returned HTTP 403.
The transport wrapper incorrectly called this `SOURCE_INTEGRITY_FAILURE`.
That prevented the existing degraded-source wrapper from containing the outage.

The separate publication gate still audited 2,389 sets, including 1,382 Pokemon
sets, and updated issue #475 with printing findings. Count reconciliation had
zero mismatches. That part of PR #474 is verified; do not redispatch the same
run or conflate a source outage with discovered printing gaps.

## Repair

- Classify typed HTTP 401/403 as `SOURCE_ACCESS_DENIED`.
- Stop retrying a denied endpoint. No access-control circumvention or new route.
- Record its HTTP status and `source_access_denied` failure class.
- Exclude the failed lane's candidate output while independent lanes continue.
- Do not enable optional candidate fallback for access denial.
- Keep malformed payloads, parser failures and unexpected 4xx fatal.
- Prefer typed error classifications over message strings, so an integrity
  error cannot be disguised by an outage phrase in its message.

Thirty-three source contract tests pass, including four new regression tests.
Syntax/import checks, full repository checks and release are next. No production
database, Storage, pricing, ownership or catalog mutation is authorized here.

Worktree: `C:/grookai_vault_catalog_source_access_20260917`
Branch: `fix/catalog-source-access-20260917`

## Follow-Up

Merge only after normal checks; run one read-only discovery audit from the
merged producer and inspect source_failures.json, candidate exclusions and
the dedicated source issue. A persisted 403 is a visible degraded source, not
proof the data has been acquired. Do not mark that source complete.

The worker's existing database TLS configuration is separate legacy debt;
this HTTP classifier repair does not change it or claim it verified.
