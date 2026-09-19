# Storefront integration review

Recorded September 19, 2026 UTC. Candidate: `C:/gv_store_release_20260919`.
Reviewed against main `a151794a98cc1e47a9a8886e0e643009cea898e5` and open PR #473
at `6e747bb1561354fc56b62c73be39f258da506f15`. Main and that PR are unchanged.
Other open PRs were #118 (search) and #495 (AnyIO dependency update).

## Outcome

The focused integration review found no new application/schema defect in the
inspected boundaries. The website and native product source, release migration,
and formal preflight tools remain unchanged from the preceding tested candidate.
The test handoff needed correction: historical harnesses still bind the original
397-migration environment. A new guarded 395-migration runner now provides the
current rollback-only integration command, with historical harnesses clearly mapped
in `scripts/tests/STOREFRONT_TESTING.md`.

The local review branch is `review/vendor-storefronts-release-20260919`; changes
are staged, not committed. The repository pre-commit hook requires `npm run shipcheck`.
That full release suite was not run in this focused review, and the hook was not
bypassed. The targeted results below are not a full shipcheck pass. No merge,
push, production migration, entitlement change, worker dispatch or deployment is
part of this review. Existing proof databases, frozen repair evidence and other
worktrees were not modified. Only the release database and fixed relay were
temporarily started; both were stopped after testing, retaining their data.

## Vault-add and native integration

PR #473 changes 13 files; 11 match exactly after newline normalization.
`lib/main.dart` contains the complete PR implementation plus exactly four added
storefront import/route lines. The playbook retains both checkpoints. A reverse
patch check passes for all code/test files; the accumulated playbook header is the
sole textual overlap requiring its existing combined version to be retained.

The three current SQL rollback checks pass: unassigned Vault adds, explicit eligible
copy publication with app/web identity parity, and custom-only publication with
foreign-owner rejection, PT409 conflicts and downgrade/re-upgrade boundaries.
These checks do not replace the earlier physical native auth/navigation proof.

If #473 merges independently, reconcile it as an already included prerequisite.
Do not apply it twice or drop its service validation to resolve a navigation conflict.

## Catalog dependencies

The active mapping worktree remains dirty at `208ddd290c61ca0dae4d2b56e2eaeca4dd04024b`.
Its exact-ID, collector-coordinate, Prize Pack parser and staged Trainer Kit work
were inspected read-only and not imported. This candidate changes none of the
catalog/printing/warehouse writers or the active search implementation files.

The read-only local catalog check executes the real `readExecutionSchema` reader.
All columns, constraints, indexes, triggers, rules and public printing RPC definitions
match the preserved `english-provenance-schema-v7.json` evidence exactly.
Coordinate definitions also match the preserved recent-28 plan. The raw coordinate
snapshot differs in known physical `card_prints` column positions inherited from
replay; the report distinguishes that from exact frozen-plan equality. No plan
fingerprint, fixture, evidence file or repair runner was changed or executed.

The storefront adds references to `vault_item_instances` and `wall_sections`, plus
two triggers on `user_entitlements`. The inspected scoped printing reader does not
change, but broader dependency inventories must include these additions. Before
production schema application, any pending frozen repair must run its own fresh
schema/dependency preflight; if it differs, stop and refreeze through its governed
path. This local comparison is not permission to reuse a stale repair plan.

## Validation and limits

- 14 source/mock/guard/comparison tests passed, with remote connections blocked in
  runtime test processes. No application env file was loaded.
- Current integration runner: full 395-row ledger and source/tool bindings checked;
  three rollback SQL tests passed; no synthetic users remained and all rollout flags
  remained false. No reset was performed.
- Catalog comparison passed in an explicit local read-only transaction. Only
  schema metadata was queried; no production database was accessed this turn.
- Reproducible migration packaging, release-secret packaging guard and diff checks
  passed. The preceding two formal migration gate receipts remain source/tool-valid.
- Website/native code did not change, so the earlier browser/build/device receipts
  are retained rather than represented as newly rerun tests.

The inspected web boundaries include owner mutation authorization, session-bound
media upload/delivery, anonymous versus owner/app reads, referral consumption, and
navigation/auth regression tests. This is a focused integration review, not a claim
that every repository test or every production runtime path was reverified.

Next release actions remain full shipcheck and local commit, code-review acceptance, coordination of the two included
work streams, and a separately authorized production rollout. Recheck main and
preflight if source, schema or tooling changes. Rollout defaults remain off; billing,
checkout and custom domains remain outside scope.

Receipts: `pr473-review.json`, `catalog-dependencies.json`, `sql-tests.json`,
`checks.json`, and `final-source.json`. Previous migration and desktop receipts remain
under their original audit directories.
