# Legacy Set SQL Review Repair

Date: 2026-09-17.
Status: Local implementation and loopback proof; not deployed runtime enforcement.

## Confirmed Gaps

`set_repair_runner.mjs` called an admin checkpoint INSERT from its dry-run and
closed-set paths. Its apply path inserted Reverse printings from provider flags
and numeric joins without reviewed Master Index authority. The independent
`tcgdex_canonize_set.mjs --apply` could mutate classifications, sets, parents and
mappings even though its new-set parent caller was already retired by PR #489.
These were static code findings; neither historical command was run against
production to demonstrate the problem.

## Repair

- Both active entry points now invoke a shared evidence reader. Historical SQL
  bodies remain preserved and unexported but are no longer invoked.
- Explicit dry-run and one exact set code are mandatory. Reject all apply
  spellings, unknown/duplicate flags, all-auto-safe, invalid scopes and limits.
  Help works without constructing a client. Imported execution checks admission
  again before client construction.
- GET-only reads use the existing backend client. There is no active PostgreSQL
  pool, transaction, mutation, RPC or checkpoint write.
- Default 50, maximum 500 rows per evidence collection; one-row lookahead makes
  truncation explicit. Exact Pokemon set lookup has its own two-candidate limit.
  At most seven requests, each with a 15-second abort deadline.
- Preserve raw set/card payloads, both source scope-key shapes, existing parents,
  observed printings and mappings. Do not generate a finish, identity or plan from
  provider flags. Ambiguous sets do not select an arbitrary parent scope.
- Reports are always unreviewed and `write_ready:false`, with explicit independent-
  read consistency and no printing-completeness claim. Read errors, duplicate IDs,
  overlapping source pages and foreign catalog scope fail without an accepted report.

## Verification

Twenty focused tests cover direct/imported rejection, help, exact configured
CLIs with poisoned SQL targets and loopback HTTP fixtures, no mutation requests,
raw-payload preservation, truncation, ambiguity, absent sets and read failures.
The test fixtures reject every non-GET request. Full release gates and review
remain required before integration. No production data or runtime was changed.

## Remaining Work

Inventory actual deployed callers before replacing any runtime. These interim
review tools are not replacement canonical writers. Use the existing reviewed
Master Index planner and applicable bounded executor, then verify real schedules
and exception delivery. Continue historical source adjudication and dependency-
preserving reconciliation. The separate frozen McDonald's production executor
still requires its exact authority and production rollback/readback contract.
