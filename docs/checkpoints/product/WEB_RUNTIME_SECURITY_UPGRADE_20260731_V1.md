# Web Runtime Security Upgrade 2026-07-31 V1

## Status

Implementation and local verification are complete on
`security/next16-upgrade-v1`. Production deployment and production canary
verification remain separate gates.

No database migration, production database write, pricing publication change,
approval, embedding, or downstream integration was performed by this upgrade.

## Context

The release-readiness audit found that the web application used Next.js
`14.2.35`. The reachable npm advisory set included high-severity production
findings, and there was no patched release in the Next 14 line. The supported
repair path required a major framework upgrade rather than an audit exception.

## Problem

The public web runtime could not satisfy the Production V1 dependency-security
gate while it remained on Next 14. Framework request APIs, lint integration,
request interception, build defaults, and React peer requirements also changed
between the installed release and the patched release.

## Risk

A mechanical major-version upgrade can compile while changing route behavior,
authentication boundaries, image optimization, middleware execution, metadata,
or request parameter handling. Transitive dependency overrides can also remove
an advisory while creating an unsupported runtime combination.

## Decision

1. Pin Next.js to `16.2.12` and React/React DOM to `19.2.8`.
2. Pin ESLint to `9.39.5` and `eslint-config-next` to `16.2.12`.
3. Migrate App Router `params`, `searchParams`, and cookie access to the async
   Next 16 contracts.
4. Rename `middleware.ts` to `proxy.ts` without changing its security,
   authentication, telemetry, or rate-limit behavior.
5. Preserve the already-proven webpack production engine explicitly with
   `next build --webpack`; Turbopack adoption is not part of this security gate.
6. Override vulnerable transitive PostCSS and Sharp releases with tested patched
   versions: PostCSS `8.5.25` and Sharp `0.35.3`.
7. Preserve raw observations from tests and repair the one line-ending-sensitive
   source contract rather than weakening image-source ordering.

## Alternatives Rejected

- Keeping Next 14 with an npm audit exception was rejected because the public
  runtime would remain on an affected framework release.
- Running `npm audit fix --force` without migration review was rejected because
  it would make an ungoverned major upgrade.
- Adopting Turbopack in the same change was rejected because it expands the
  behavioral surface beyond the dependency-security repair.
- Disabling dependency checks was rejected because it would hide a release
  blocker rather than close it.

## Verification

| Check | Result |
| --- | ---: |
| Web production dependency audit | 0 vulnerabilities |
| Next 16 upgrade contracts | 4 / 4 passed |
| Full Node contract suite | 1,197 / 1,197 passed |
| Web TypeScript | passed |
| Web ESLint | passed with zero warnings |
| Next production build | passed |
| Static pages generated | 26 / 26 |
| Public HTTP smoke routes | 5 / 5 returned 200 |
| Image optimizer | 200, valid PNG, 13,309 bytes |
| Application-origin browser errors | 0 |
| Git diff whitespace check | passed |

The local production smoke covered `/`, `/login`, `/sets`, `/network`,
`/api/public-set-cards?set_code=base1`, `/explore?q=Pikachu`, and
`/card/GV-PK-AR-71`. The primary card image rendered at `600 x 825`.

The new `proxy.ts` is byte-equivalent to the prior `middleware.ts` after only
normalizing the exported function name. Static scans found no unsafe request-API
casts, stale middleware imports, imported dynamic route-config constants, or
unawaited Supabase server helpers.

## Current Truths

- This upgrade closes the known web npm advisory gate locally.
- It does not prove a Vercel production deployment or signed-in production
  journey under Next 16.
- Controlled invite-only beta remains authorized under the existing release
  decision.
- Expanded beta still requires the physical-iPhone clean-account journey.
- The 72-hour pricing canary remains frozen until
  `2026-08-03T10:34:15.670Z`.

## Invariants

- Canonical identity and database truth are unchanged.
- Protected routes still authenticate through verified Supabase cookies.
- Binder secret routes retain private no-store, no-referrer, and no-index
  behavior.
- Abuse protection and security headers remain active through the proxy.
- Card images retain hosted-first fallback ordering.
- Dependency overrides must remain covered by audit, build, image-optimizer,
  and route-smoke evidence.

## What Must Never Be Broken

- A framework upgrade must not weaken route authentication or application RLS.
- A dependency audit pass must not be achieved by suppressing advisories.
- Middleware-to-proxy migration must not silently remove security headers,
  throttling, telemetry, or binder secret handling.
- Image optimization must continue to return valid nonblank card assets.
- Production deployment must remain separable and reversible from database
  migration gates.

## Exact Next Gate

1. Rebase this upgrade onto the merged release-readiness hardening commit.
2. Pass the full repository shipcheck from the rebased commit.
3. Open a draft pull request and require all CI and Vercel preview checks to
   pass.
4. Smoke-test the Vercel preview, including authentication redirects, public
   search, card detail, and image optimization.
5. Merge and observe the production deployment before declaring the public web
   dependency gate closed.
