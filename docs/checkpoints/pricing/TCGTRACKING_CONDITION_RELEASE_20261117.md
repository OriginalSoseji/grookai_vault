# Condition pricing release candidate — November 17, 2026

This is the current integration checkpoint, following
[V2 implementation](TCGTRACKING_CONDITION_PRICING_V2_20261117.md). Source use is
authorized under the owner's no-separate-permission policy; the old provider
inquiry is not a release prerequisite. No public deployment, schema apply,
source refresh import or pricing/ownership mutation is performed by this work.

## Release checkout

`C:/grookai_condition_release_20261117`, branch
`codex/tcgtracking-condition-release-20261117`, starts from current-main commit
`ad05da8049ce11b1736019443896a54a34a4ab65` (PR945). The full prepared candidate
was applied with Git's three-way merge. The operator-playbook conflict retained
both current-main Prismatic/Paldean guidance and the condition-pricing sections.
No migration file was added or edited by this feature. The older implementation
checkout and its completed private intake artifacts remain intact.

Root dependencies reuse the complete locked installation at
`C:/grookai_completion_main_20261113/node_modules`; web dependencies reuse its
`apps/web/node_modules`, and backend dependencies reuse its
`backend/node_modules`. The first full check exposed that the initial link to
the backend-only installation lacked root TypeScript/UUID test dependencies.
The corrected complete installation passes all 310 tests from the 20 affected
files (in addition to the initial 30-test spot check).
This was an installation error, not a reason to waive any test or hook.

## Verified gates

- Strict integrated web builds pass on both the original implementation base
  and the current-main release checkout. These use an isolated loopback,
  read-only collector preview configuration with production credentials removed.
  Existing Supabase dynamic-import warnings remain visible in the logs.
- Runtime preflight passes with `PASS_WITH_DEFERRED_DEBT`: zero critical failures,
  ten known deferred checks. Database transport uses verified TLS and startup
  read-only options. The existing project CA was available in the owner's
  Downloads directory; no certificate verification was disabled or server SSL
  setting changed.
- The intake worker and full-payload readback tool now use the shared canonical
  `condition_reference_database_config_v1.mjs`. It rejects wrong projects, TLS
  URL overrides and disabled verification. Readback starts read-only. A live
  transport check confirms authorized TLS, hostname verification, read-only `on`
  and 559 existing private source receipts, with no production writes.
- All 54 targeted condition/route/Vault/transport tests pass on the release
  checkout. V2's exact amounts, missing-value behavior, mapping isolation and
  real-control browser evidence remain unchanged.

The transport hardening changes the executing intake bundle hash. That bundle
now binds the database helper in addition to worker and projection. Historical
plan/receipt/apply hashes and original source remain in the preserved older
checkout. Do not reapply the consumed batch or reuse its acknowledgement. Any
future acquisition/apply needs the normal reviewed scope and current hashes.

## Full checks and review receipt

Normal repository `shipcheck`, pre-commit and pre-push remain mandatory. No hooks
are bypassed. The first full check retains its incomplete-dependency failure
receipt (8,445 passed, 20 file-loading failures, 11 skipped); it must not be
represented as passing. All 20 affected files then passed their 310 tests with
the corrected dependencies. The corrected checkout uses the
normal managed commit hook for the complete check, including backend/contracts,
web typecheck/lint/build and Flutter checks.

The first managed commit attempt completed all 8,766 contract tests (8,755 passed,
11 existing skips), then stopped because backend Sharp was not installed in this
checkout. The complete backend installation fixed that dependency, and all 12
eBay tests passed. One subsequent Square artwork process terminated with Windows
native exit code `3221226356`; its focused rerun passed all 21 tests, and the
complete remaining-stages rerun passed all 120 Square tests. This transient
failure is retained, not hidden or skipped; its root cause was not established.

All remaining normal stages then passed: 12 eBay tests, 120 Square tests, 19
vendor-pricing tests, runtime/quarantine/deferred reports, web type checking,
full lint, strict production-configured build, Flutter dependency resolution,
Flutter analysis and 2,058 Flutter tests with two existing skips. The production
configuration was used only for local compilation, not a running dev server or
deployment. The final managed commit hook still requires the complete sequence
to pass together; use its actual completion receipt rather than inferring a
successful commit from the separate stage results.

Local artifacts live in `artifacts/condition_pricing_release_v1/20261117/`:

- `current-main-web-build.log`: successful isolated integrated web build.
- `transport-readback.json`: live verified-TLS/read-only receipt.
- `dependency-recheck.log`: all 30 dependency rechecks pass.
- `all-dependency-rechecks.log`: all 310 tests in the 20 affected files pass.
- `targeted-checks.log`: all 54 feature/Vault/transport checks pass.
- `shipcheck.log`, `shipcheck-status.json`: initial full-check attempt.
- `commit.log`, `commit-status.json`: initial managed commit attempt.
- `remaining.log`: preserved first native Square process failure.
- `sharp-native-recheck.log`: all 21 focused artwork tests pass.
- `remaining-r2.log`, `remaining-r2-status.json`: every remaining normal stage passes.
- `commit-final.log`, `commit-final-status.json`: final complete managed commit retry.
- `candidate.json`: exact base, candidate tree and source fingerprints for review.

Check the completion receipts and the release branch's Git HEAD for the final
commit state; a local build or a draft is not proof of a hosted release. A
successful commit requires the normal managed hook to complete. Remote CI and
authenticated hosted acceptance must be recorded separately before claiming
public availability.

Publication follows the repository's explicit external-action authorization
rule in `AGENTS.md`. The next approval, when checks are complete, concerns the
concrete prepared release; it is not a request for TCGTracking's permission.
