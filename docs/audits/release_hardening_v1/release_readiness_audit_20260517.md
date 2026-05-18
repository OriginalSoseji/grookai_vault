# Release Readiness Audit 2026-05-17

## Classification

PRODUCTION_READY

## Scope

This audit covers release integrity only: secret safety, Flutter compile/test integrity, Android signing posture, web build reliability, GitHub Actions release gates, signed artifact inspection, and Android smoke evidence.

Out of scope: DB remediation, migrations, card backfills, scanner architecture, GV-ID gate changes, Edge function deploys, production data writes, and blocked runtime lanes.

## Mobile Readiness

Status: PASS

- `.env` and `.env.local` are not declared as Flutter assets.
- Mobile config supports release-safe `--dart-define` values for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- Release config no longer reads `flutter_dotenv` when no dotenv asset is bundled.
- GitHub Actions release run `26013394418` for tag `v0.1.10` passed Flutter analyze and tests.
- Android release signing does not fall back to debug signing in the production workflow.
- Release run `26013394418` produced and published `app-release.aab`.
- Android UI smoke on `SM-S908U` API 36 passed: the signed AAB-derived install clears splash, renders real app UI, reaches Search, reaches Account/authenticated profile surfaces, and shows no fatal Flutter or Android runtime crash in sampled logs.

## Web Readiness

Status: PASS

- GitHub Actions release run `26013394418` passed web typecheck.
- GitHub Actions release run `26013394418` passed web lint.
- GitHub Actions release run `26013394418` passed strict web production build.
- Strict build guards fail on TLS certificate degradation patterns.

Remaining web risk:

- One non-blocking Next.js image optimization warning remains in `apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx`.

## CI Readiness

Status: PASS

- `npm run shipcheck` includes secret packaging guard, preflight, contracts tests, runtime health, web typecheck, web lint, strict web build, Flutter analyze, and Flutter tests.
- Release workflow blocks on all release-relevant checks before creating a GitHub release.
- Release workflow is enabled in GitHub Actions.
- Tag `v0.1.10` completed successfully in GitHub Actions.

Remaining CI risk:

- GitHub Actions reports a Node 20 action deprecation warning to track before GitHub enforcement dates.

## Signing Readiness

Status: PASS

- GitHub Actions secrets present for release signing/config:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
  - `MOBILE_SUPABASE_URL`
  - `MOBILE_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_DB_URL`
  - `SUPABASE_SECRET_KEY`
- Release workflow validates required secrets before build.
- Unsigned APK output is not treated as a production release artifact.
- GitHub Release uploads signed Android App Bundle `app-release.aab`.
- `jarsigner -verify` reports the downloaded AAB as signed; `jarsigner -strict` PKIX warnings are expected for self-signed upload-key material.

## GitHub Release Verification

Status: PASS

Verification evidence on 2026-05-18 UTC:

- Branch merged to `main`.
- `main` pushed at `f134aff8ff740901ae0a8f8430afe54ec541c3c5`.
- Release workflow run: `26013394418`.
- Release tag: `v0.1.10`.
- Workflow status: success.
- Published asset: `app-release.aab`.
- Downloaded artifact SHA256: `56BC82AB6D4BA63B3C784BF702A9F7D3E32522509E038BA42CD3323AA0135E26`.

## Secret Safety

Status: PASS

- Flutter assets do not include `.env` or `.env.local`.
- `android/key.properties`, `android/*.jks`, and `android/*.keystore` are ignored.
- `npm run release:secret-guard` statically fails if env files or secret-like files are reintroduced into release packaging paths.
- Web public assets are scanned for secret-like filenames.
- Downloaded `app-release.aab` inspection found:
  - `env_file_hits`: `0`
  - `secret_like_filename_hits`: `0`
  - expected `base/manifest/AndroidManifest.xml`: present
  - expected `base/dex/classes.dex`: present

## Android Smoke

Status: PASS

- AAB-derived APK set from tag `v0.1.10` installed on attached Android device `SM-S908U`, API 36.
- Package installed: `com.example.grookai_vault`.
- Launcher activity resolved: `com.example.grookai_vault/.MainActivity`.
- App process launched, drew the first real `MainActivity` window, and removed the Android splash surface.
- Screenshot evidence showed the authenticated Feed UI with bottom navigation and no debug/dev banner.
- UIAutomator evidence showed Search controls including search input, Browse sets, filters, and trending cards.
- UIAutomator evidence showed Account/authenticated profile surfaces reachable.
- Sampled logs after Feed/Search/Account/Scan-tab taps reported `fatal_or_unhandled_count=0`.
- Scanner remained non-blocking during smoke; no scanner architecture changes were made.

## Remaining Deferred Debt

Runtime preflight still reports known deferred debt outside this release-hardening lane:

- Legacy canonical card prints missing `gv_id`.
- Historical many-to-one source/card mapping groups.
- Canonical card prints without active identity rows.
- Runtime health still reports intentionally blocked or maintenance-contained canon/ownership trust paths.

These are not release pipeline blockers for this lane because no DB remediation was performed or required.

## Non-Release Blockers

- DB deferred debt remains governed by existing runtime and drift gates.
- Scanner remains parked; this lane only restored compile/test/release integrity and did not reopen scanner architecture.
- GitHub Actions Node 20 action deprecation warning remains a CI maintenance follow-up.

## Final Decision

Grookai Vault is PRODUCTION_READY for this release-integrity lane as of this verification pass. The GitHub Actions signed release pipeline is proven end to end, the signed AAB is verified clean of `.env*` and secret-like packaged files, and the Android signed-release smoke now reaches real app UI without fatal startup errors. Remaining DB/runtime debt is deferred non-release debt governed by existing gates.
