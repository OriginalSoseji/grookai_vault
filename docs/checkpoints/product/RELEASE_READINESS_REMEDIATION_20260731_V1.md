# Release Readiness Remediation 2026-07-31 V1

## Status

Repository and GitHub hardening is in progress on
`release/readiness-hardening-v1`, based on
`5d6a491eb980efddab23af510fa7be9cc604bc20`.

No production database write, pricing publication change, approval, or canary
configuration change was performed by this remediation.

## Closed Findings

1. The manual production core API probe now fails closed on missing secrets,
   transport failure, non-200 responses, or non-array JSON. It preserves an
   artifact on success and failure.
2. VS Code now assigns `supabase/functions` to the repository Deno config. The
   prior editor-only TypeScript errors were not Deno compiler failures.
3. The release checkpoint now names the real Network route, `/network`, rather
   than the nonexistent `/pulse` route.
4. The obsolete `ingest.merge_card_prints()` helper is retired by a new
   forward-only migration. The compatibility stub raises an explicit error and
   removes application-role execution instead of using an invalid identity
   conflict key.
5. The root `ws` dependency lock moved from vulnerable `8.18.3` to `8.21.1`.
   The root dependency audit now reports zero vulnerabilities.
6. GitHub `main` protection now enforces linear history and resolved review
   conversations and blocks force-pushes and deletion, including for admins.
7. Dependabot vulnerability alerts and security updates are enabled.
8. CodeQL default setup is enabled. Initial setup run: `30653482022`.
9. All three prior secret-scanning alerts are resolved:
   - the historical Supabase service-role JWT was verified inactive through a
     metadata-only REST-root request that returned `401`, then resolved as
     revoked;
   - the Android and iOS Firebase client identifiers were classified as public
     client configuration rather than authorization secrets.

## Verification

| Check | Result |
| --- | ---: |
| Focused release/probe/ingestion contracts | 8 / 8 passed |
| Full Node contract suite | 1,198 / 1,198 passed |
| Root dependency audit | 0 vulnerabilities |
| Git diff whitespace check | passed before checkpoint |
| Open GitHub secret alerts | 0 |

The first full contract invocation lacked installed root dependencies and
failed 31 import-only suites on missing `pg`. After `npm ci` from the exact
lockfile, the unchanged full suite passed. The failed invocation is not
reported as a product failure or hidden as a pass.

## New Blocking Finding

The web dependency audit is now able to reach the npm advisory service after
setting Node 22 to use the Windows system CA store. It reports:

- 6 high-severity production dependency findings;
- 16 high-severity findings including development tooling;
- Next.js `14.2.35` is affected and has no patched release in the Next 14 line;
- npm's supported repair path is a major upgrade to Next `16.2.12`.

This is a real public-launch blocker. It is not safe to hide with audit
exceptions or `--force` an untested framework upgrade into this repair branch.
A dedicated Next/React upgrade branch must pass typecheck, lint, strict build,
contract tests, route smoke tests, and production canary deployment before
merge.

## Deferred GitHub Controls

Pull-request-only enforcement and required status checks are not enabled yet.
The scheduled Founder Ops workflow still commits generated snapshots directly
to `main`, and multiple required checks use path filters. Enabling either
control now would silently break the scheduled workflow or leave valid pull
requests permanently pending.

Before public launch:

1. move Founder Ops snapshot publication off direct `main` pushes or give it a
   narrowly governed bypass;
2. make required checks emit on every pull request or introduce one aggregate
   required gate;
3. then require pull requests and the aggregate gate on `main`.

Secret-scanning validity checks and non-provider patterns remain unavailable
under the repository's current GitHub feature configuration; attempted enable
requests did not change their disabled state.

## Migration State

`20260731170000_retire_legacy_ingest_merge_card_prints_v1.sql` is a candidate
migration only. It has not been applied to production. It must follow the
already frozen pending pricing migrations in migration-history order.

## Current Truths

- Controlled invite-only beta remains authorized.
- Expanded beta still requires the physical-iPhone clean-account journey.
- The 72-hour pricing canary remains frozen until
  `2026-08-03T10:34:15.670Z`.
- Public launch is additionally blocked by the Next.js security upgrade.
- No release gate may treat the legacy fail-open probe as evidence after this
  checkpoint.

## Exact Next Gates

1. Merge and deploy the narrow repository hardening after CI passes.
2. Complete a dedicated Next `16.2.12` and React compatibility upgrade with
   full web and route verification.
3. Complete the physical-iPhone clean-account journey on TestFlight.
4. Preserve the pricing canary through its required end and run the mandatory
   final observer before any pricing migration apply.

