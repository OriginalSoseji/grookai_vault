# Release Readiness Audit 2026-05-17

## Classification

RELEASE_CANDIDATE

## Scope

This audit covers release integrity only: secret safety, Flutter compile/test integrity, Android signing posture, web build reliability, and CI gate coverage.

Out of scope: DB remediation, migrations, card backfills, scanner architecture, GV-ID gate changes, and blocked runtime lanes.

## Mobile Readiness

Status: RELEASE_CANDIDATE

- `.env` and `.env.local` are no longer declared as Flutter assets.
- Mobile config now supports release-safe `--dart-define` values for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- `flutter analyze` passes with no issues.
- `flutter test --no-pub` passes.
- Android release signing no longer falls back to debug signing.
- Production Android release builds require explicit signing material.

Remaining mobile gate:

- Signed release artifact build was not executed locally because production signing secrets are not present in the workspace.

## Web Readiness

Status: RELEASE_CANDIDATE

- `npm --prefix apps/web run typecheck` passes.
- `npm --prefix apps/web run lint` passes with one non-blocking `<img>` LCP warning.
- `npm --prefix apps/web run build` now runs with Node system CA trust and no TLS degradation output.
- `npm run web:build:strict` fails if TLS certificate failures appear in build logs.

Remaining web risk:

- `apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx` still has one Next.js image optimization warning.

## CI Readiness

Status: RELEASE_CANDIDATE

- `npm run shipcheck` now includes secret packaging guard, preflight, contracts tests, runtime health, web typecheck, web lint, strict web build, Flutter analyze, and Flutter tests.
- Flutter CI now triggers on `test/**` and `analysis_options.yaml`, not only `lib/**`.
- Release workflow blocks on all release-relevant checks before creating a GitHub release.

Remaining CI risk:

- Production signing depends on GitHub Actions secrets being configured correctly.

## Signing Readiness

Status: RELEASE_CANDIDATE

- Release workflow requires:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
  - `MOBILE_SUPABASE_URL`
  - `MOBILE_SUPABASE_PUBLISHABLE_KEY`
- Unsigned APK output is no longer treated as the production release artifact.
- GitHub Release uploads the signed Android App Bundle path.

Remaining signing gate:

- Signing secrets were not available in the local environment, so signed release build execution remains a GitHub-secrets validation step.

## Secret Safety

Status: RELEASE_CANDIDATE

- Flutter assets no longer include `.env` or `.env.local`.
- `android/key.properties`, `android/*.jks`, and `android/*.keystore` are ignored.
- `npm run release:secret-guard` statically fails if env files or secret-like files are reintroduced into release packaging paths.
- Web public assets are scanned for secret-like filenames.

## Remaining Deferred Debt

Runtime preflight still reports known deferred debt outside this release-hardening lane:

- Legacy canonical card prints missing `gv_id`.
- Historical many-to-one source/card mapping groups.
- Canonical card prints without active identity rows.
- Runtime health still reports intentionally blocked or maintenance-contained canon/ownership trust paths.

These are not release pipeline blockers for this lane because no DB remediation was performed or required.

## Non-Release Blockers

- DB deferred debt remains governed by existing runtime and drift gates.
- Scanner remains parked; this lane only restored compile/test integrity.

## Final Decision

Grookai Vault is RELEASE_CANDIDATE for release integrity after this hardening lane, conditional on production signing secrets being present in GitHub Actions. It is not classified as PRODUCTION_READY until a signed release workflow run completes successfully with production secrets.
