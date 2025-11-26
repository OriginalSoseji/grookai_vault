# Audit Rule L2 – Environment Routing (Flutter vs Supabase CLI)

## Findings
- **Env files present:** `.env.local` (real values), `.env` (placeholder only). `.env.staging` / `.env.prod` do not exist.
- **Flutter env loading:** `lib/main.dart` uses `flutter_dotenv` to load `.env.local` (fallback `.env`); Supabase init uses `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` via `supabaseUrl`/`supabasePublishableKey` getters in `lib/secrets.dart`.
- **Current Flutter target:** `.env.local` sets `SUPABASE_URL=https://ycdxbpibncqcchqiihfz.supabase.co` with publishable key for that project (was showing empty card_prints).
- **Supabase CLI config:** `supabase/config.toml` `project_id` was `grookai_vault` (local default), now aligned to `ycdxbpibncqcchqiihfz` to match the Flutter project.
- **Legacy/forbidden env names:** None in active code; no `SUPABASE_ANON_KEY` references in current boot path.

## Match Check
- **Flutter project ref:** `ycdxbpibncqcchqiihfz` (from `SUPABASE_URL` in `.env.local`).
- **CLI project_ref:** now `ycdxbpibncqcchqiihfz` in `supabase/config.toml`.
- **Status:** Matched after update. Prior state was mismatched (CLI local `grookai_vault` vs Flutter `ycdxbpibncqcchqiihfz`), causing Flutter to hit a project with empty `card_prints`.

## Risk / Next Steps
- Ensure `.env.local` contains the publishable key for the canonical project with the 30k `card_prints` data (project ref `ycdxbpibncqcchqiihfz`).
- Supabase CLI commands will now target the same project_ref; verify `supabase db list` or `supabase db pull` against that ref if needed.
- No secrets added to repo; `.env` remains placeholder.
