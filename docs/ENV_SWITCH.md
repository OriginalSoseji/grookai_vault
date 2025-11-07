**Overview**
- The app chooses env file via `--dart-define=GV_ENV=local|staging|prod`.
- Mapping:
  - `local`   → `.env.local`
  - `staging` → `.env.staging`
  - `prod`    → `.env.prod`
- Fallback order if missing: `.env` → empty defaults (secrets.dart fallback).

**How To Run**
- Local dev:
  - `flutter run --dart-define=GV_ENV=local`
  - Or VS Code task: `Grookai: Dev (LOCAL)`
  - Ensure `.env.local` contains your local Supabase URL and publishable key.
- Staging:
  - `flutter run --dart-define=GV_ENV=staging`
  - Or VS Code task: `Grookai: Dev (STAGING)`

**Confirmation Log**
- On startup, Env prints a one-line diagnostic like:
  - `[ENV] GV_ENV=local file=.env.local initialized=true`

**Files**
- `.env.local`, `.env.staging`, `.env.prod` are included in `pubspec.yaml` assets.
- `.env` remains ignored by git to prevent accidental secret commits.

