# Supabase Security and App Health Audit

Date: 2026-07-30
Project: `ycdxbpibncqcchqiihfz`
Branch: `agent/security-app-health`

## Scope

- Inspect the live Supabase project with the database security advisor, catalog
  readbacks, role probes, Data API probes, and repository contract tests.
- Repair confirmed security exposures without changing public collector reads.
- Reproduce the reported app problems across Flutter and web.
- Remove deployable dependency vulnerabilities and restore a warning-free
  production web build.

## Confirmed Supabase Findings

1. `external_mapping_aliases` had RLS disabled and client roles inherited broad
   table privileges.
2. `v_market_evidence_lifecycle_current_v1` used owner-context view behavior and
   exposed internal market evidence to client roles.
3. Eight functions had mutable search paths.
4. Internal `SECURITY DEFINER` trigger and dispatcher functions inherited
   `PUBLIC` execute.
5. The service-only `vault_post_to_wall` function referenced retired
   `vault_items` columns.

## Applied Repairs

- `20260730193000_security_advisor_hardening_v2.sql`
  - enables RLS and makes `external_mapping_aliases` service-only;
  - makes the market lifecycle view security-invoker and service-only;
  - fixes all eight advisor-reported search paths;
  - removes client execution from internal privileged functions;
  - limits the three app notification RPCs to authenticated and service roles.
- `20260730194000_vault_post_to_wall_schema_repair_v1.sql`
  - uses current `vault_items.card_id`, `user_id`, and `condition_label`;
  - keeps the legacy RPC service-only.

Both migrations were rehearsed in a rollback-only transaction, applied
atomically to the live project, and recorded in Supabase migration history.

## Live Readback

- Supabase database security advisor: no issues found.
- `external_mapping_aliases`: 272 rows preserved; RLS enabled; anon and
  authenticated CRUD removed.
- Market observations: 505,407 rows preserved.
- Market lifecycle events: 3,537,849 rows preserved.
- Market lifecycle view: security-invoker enabled; client SELECT removed;
  service-role SELECT retained.
- Public-executable security-definer functions: 0.
- Advisor-targeted mutable function search paths: 0.
- Anonymous REST probes:
  - internal alias table: `401`;
  - internal market lifecycle view: `401`;
  - public card stream, wall cards, and section cards: `200`.

The existing filtered public collector views were deliberately preserved.
Changing those views to security-invoker failed the rollback-only compatibility
probe and was not applied.

## App Repairs

- Upgraded the web app from vulnerable Next.js 14/React 18 dependencies to
  Next.js `16.2.12` and React `19.2.8`.
- Migrated async cookie and dynamic route parameter APIs required by Next.js 16.
- Migrated all page `params` and `searchParams` consumers to the async request
  contract, including request-time-only routes not exercised during prerender.
- Replaced removed `next lint` behavior with the supported ESLint flat config.
- Renamed `middleware.ts` to the Next.js 16 `proxy.ts` convention.
- Made sitemap segment configuration statically analyzable.
- Added the required Suspense boundary for `/sets`.
- Removed broad founder filesystem discovery and statically traced backend
  warehouse workers.
- Pinned patched production transitive dependencies:
  - `postcss` `8.5.25`;
  - `sharp` `0.35.3`;
  - root backend `ws` `8.21.1`.

## Verification

- Full repository `shipcheck`: pass.
- Release secret packaging guard: pass.
- Runtime preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical failures.
- Full Node contract suite: pass.
- Supabase security hardening contracts: 3/3 pass.
- Web typecheck: pass.
- Web ESLint: pass.
- Strict Next.js production build: pass with no build warnings.
- Playwright mobile parity/accessibility suite: 23/23 pass.
- Web production dependency audit: 0 vulnerabilities.
- Root production dependency audit: 0 vulnerabilities.
- Flutter analyzer: no issues found.
- Flutter tests: 531/531 pass.
- `git diff --check`: pass.
- Final local production HTTP smoke:
  - `/`, `/sets`, and one live dynamic set route: `200`;
  - legacy set route: canonical `307` redirect;
  - unauthenticated `/account`: login `307` redirect;
  - missing profile: `404`;
  - security headers present.

## Reported “65 Problems”

The repository does not reproduce 65 source diagnostics. Flutter reports 63
packages with newer incompatible versions; those are upgrade availability
notices, not analyzer errors. A broad Flutter dependency migration was not
performed because the current analyzer and all tests pass, and unrelated major
upgrades would increase regression risk.

## Remaining Non-Release Debt

- `npm audit` still reports development-only advisories inherited through the
  current official ESLint/Next lint plugin tree. Production audits are clean.
  The registry-proposed fix requires unsupported major/plugin combinations, so
  it was not forced.
- Database lint retains previously known static-analysis warnings and one temp
  table false positive. The stale `vault_post_to_wall` correctness error is
  resolved.
- Runtime preflight continues to report governed deferred identity and
  maintenance debt, with zero critical failures.
