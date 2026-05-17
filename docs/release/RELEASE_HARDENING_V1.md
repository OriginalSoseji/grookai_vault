# RELEASE HARDENING V1

## Scope
Release hardening covers secret packaging, CI correctness, Android signing, Flutter integrity, and web production build reliability.

This lane does not authorize DB remediation, migrations, scanner architecture work, GV-ID gate changes, or blocked runtime lanes.

## Mobile Environment
Flutter release builds must receive public runtime configuration through `--dart-define`:

```powershell
flutter build apk --release `
  --dart-define=SUPABASE_URL="https://<project-ref>.supabase.co" `
  --dart-define=SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Local dotenv files may be used for development only. `.env`, `.env.local`, and `.env.*` must not be declared as Flutter assets or uploaded as release artifacts.

## Android Signing
Production Android release artifacts require GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `MOBILE_SUPABASE_URL`
- `MOBILE_SUPABASE_PUBLISHABLE_KEY`

Local signed release builds may use ignored `android/key.properties` with:

```text
ANDROID_KEYSTORE_PATH=<absolute-or-android-relative-path-to-keystore>
ANDROID_KEYSTORE_PASSWORD=<password>
ANDROID_KEY_ALIAS=<alias>
ANDROID_KEY_PASSWORD=<password>
```

Unsigned APKs are not production release artifacts.

## Required Release Gates
The release lane must run:

- `npm run release:secret-guard`
- `npm run preflight`
- `npm run contracts:test`
- `npm run contracts:runtime-health`
- `npm --prefix apps/web run typecheck`
- `npm --prefix apps/web run lint`
- `npm run web:build:strict`
- `flutter analyze`
- `flutter test --no-pub`

`npm run web:build:strict` fails if TLS certificate failures appear during production build output.
