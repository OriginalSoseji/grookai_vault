# Audit Rule L1 – Auth Keys (Supabase)

## Summary
- Flutter client previously hard-coded Supabase URL + anon key in `lib/main.dart` and `lib/secrets.dart`; now switched to env-driven publishable key.
- Env contract for Flutter is `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` loaded via `.env.local` (fallback `.env`).
- Backend Node client already uses `SUPABASE_SECRET_KEY` (`backend/supabase_backend_client.mjs`) aligned with Secrets Contract.
- Legacy `SUPABASE_ANON_KEY` usage found only in historical/backup files (e.g., `lib/main.backup.dart`, `lib/main.dart.bak.*`, `lib/main.vault-backup.dart`, `lib/secrets.dart` old content) — not part of active boot path.

## Locations – Flutter
- Supabase initialization: `lib/main.dart` – `Supabase.initialize(url: supabaseUrl, anonKey: supabasePublishableKey)` after loading env via `flutter_dotenv`.
- Env accessors: `lib/secrets.dart` – `supabaseUrl`/`supabasePublishableKey` getters read `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`.
- Env assets: `pubspec.yaml` lists `.env` and `.env.local` as assets; dependency `flutter_dotenv` added.

## Locations – Backend
- Node backend client: `backend/supabase_backend_client.mjs` reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (service-role) only; no legacy env names in active code.

## Legacy / Hard-coded Keys
- Active code: none (hard-coded anon JWT removed from `lib/main.dart` and `lib/secrets.dart`).
- Residual backups: legacy anon key strings remain in `lib/main.backup.dart`, `lib/main.dart.bak.*`, `lib/main.vault-backup.dart` (not referenced by the app); safe to ignore but keep noted for cleanup.

## Wiring Status
- Flutter now wired to publishable key: YES — uses `SUPABASE_PUBLISHABLE_KEY`.
- Backend continues using secret/service key for server contexts: YES — `SUPABASE_SECRET_KEY`.
- No secrets or keys added to repo; `.env.example` already reflects `SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`.
