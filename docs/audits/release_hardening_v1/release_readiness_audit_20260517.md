# Release Readiness Audit 2026-05-17

## Classification

RELEASE_CANDIDATE

## Scope

This audit covers release integrity only: secret safety, Flutter compile/test integrity, Android signing posture, web build reliability, GitHub Actions release gates, signed artifact inspection, and Android smoke evidence.

Out of scope: DB remediation, migrations, card backfills, scanner architecture, GV-ID gate changes, Edge function deploys, production data writes, and blocked runtime lanes.

## Mobile Readiness

Status: RELEASE_CANDIDATE

- `.env` and `.env.local` are no longer declared as Flutter assets.
- Mobile config supports release-safe `--dart-define` values for `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- GitHub Actions release run `26011620654` for tag `v0.1.8` passed `flutter analyze`.
- GitHub Actions release run `26011620654` for tag `v0.1.8` passed `flutter test --no-pub`.
- Android release signing no longer falls back to debug signing in the production workflow.
- Production Android release builds require explicit signing material.
- Release run `26011620654` produced and published `app-release.aab`.

Remaining mobile gate:

- Android UI smoke is blocked. The AAB-derived APK set installed and launched a foreground process on attached device `SM-S908U` API 36 with no fatal crash observed, but after the device was unlocked the app remained on a blank white/splash surface. Auth flow, search, public routes, scanner parked state, and debug banner absence were not visually verified.

## Web Readiness

Status: PASS

- GitHub Actions release run `26011620654` passed web typecheck.
- GitHub Actions release run `26011620654` passed web lint.
- GitHub Actions release run `26011620654` passed strict web production build.
- Strict build guards fail on TLS certificate degradation patterns.

Remaining web risk:

- One non-blocking Next.js image optimization warning remains in `apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx`.

## CI Readiness

Status: PASS

- `npm run shipcheck` includes secret packaging guard, preflight, contracts tests, runtime health, web typecheck, web lint, strict web build, Flutter analyze, and Flutter tests.
- Release workflow blocks on all release-relevant checks before creating a GitHub release.
- Release workflow is enabled in GitHub Actions.
- Tag `v0.1.8` completed successfully in GitHub Actions.

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
- `jarsigner -verify` reports `jar verified` for the downloaded AAB.
- `jarsigner -strict` reports expected self-signed upload-key PKIX warnings; this does not mean the AAB is unsigned.

## GitHub Release Verification

Status: PASS

Verification evidence on 2026-05-18 UTC:

- Branch merged to `main`.
- `main` pushed at `b5f458ac81174408f7af292db18744a4a5f60aa2`.
- Release workflow run: `26011620654`.
- Release tag: `v0.1.8`.
- Workflow status: success.
- Published asset: `app-release.aab`.
- Asset digest reported by GitHub: `sha256:e9da5d2025607623ef6c4d322ab224156c90f0d0632c3783723b6749d04cede2`.
- Downloaded artifact size: `48098958` bytes.

## Secret Safety

Status: PASS

- Flutter assets no longer include `.env` or `.env.local`.
- `android/key.properties`, `android/*.jks`, and `android/*.keystore` are ignored.
- `npm run release:secret-guard` statically fails if env files or secret-like files are reintroduced into release packaging paths.
- Web public assets are scanned for secret-like filenames.
- Downloaded `app-release.aab` inspection found:
  - `env_file_hits`: `0`
  - `secret_like_filename_hits`: `0`
  - expected `BundleConfig.pb`: present
  - expected `base/manifest/AndroidManifest.xml`: present
  - expected `base/dex/classes.dex`: present

## Android Smoke

Status: PARTIAL

- AAB-derived APK set installed on attached Android device `SM-S908U`, API 36.
- Package installed: `com.example.grookai_vault`.
- Launcher activity resolved: `com.example.grookai_vault/.MainActivity`.
- App process launched and was visible in focused app/window dumps.
- No `FATAL EXCEPTION` / `AndroidRuntime` crash was observed in the sampled launch logs.
- Follow-up unlocked-device capture showed the app focused/resumed, but still rendering only a blank white/splash surface.
- UIAutomator dump contained only the root Android content frame and no app-visible text or controls.

Not verified:

- Auth flow reachable.
- Search works.
- Public card pages/routes work.
- Scanner remains parked/non-blocking from UI.
- No debug/dev banners from UI.

Reason: the signed release-derived install launches without an observed fatal crash, but the UI does not advance beyond a blank/splash surface on the unlocked attached device.

## Remaining Deferred Debt

Runtime preflight still reports known deferred debt outside this release-hardening lane:

- Legacy canonical card prints missing `gv_id`.
- Historical many-to-one source/card mapping groups.
- Canonical card prints without active identity rows.
- Runtime health still reports intentionally blocked or maintenance-contained canon/ownership trust paths.

These are not release pipeline blockers for this lane because no DB remediation was performed or required.

## Non-Release Blockers

- DB deferred debt remains governed by existing runtime and drift gates.
- Scanner remains parked; this lane only restored compile/test integrity and did not reopen scanner architecture.
- Manual Android UI smoke remains blocked by blank/splash launch behavior and must pass before promoting beyond `RELEASE_CANDIDATE`.

## Final Decision

Grookai Vault is RELEASE_CANDIDATE for release integrity as of this verification pass. The GitHub Actions signed release pipeline is proven end to end and the signed AAB is verified clean of `.env*` and secret-like packaged files. It is not classified `PRODUCTION_READY` because Android UI smoke is blocked by blank/splash launch behavior and could not verify auth, search, public routes, scanner parked state, or absence of debug/dev banners on the attached device.
