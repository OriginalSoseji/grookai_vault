# GV Secrets Contract v1

This contract is the single source of truth for Grookai Vault secrets. Every new secret must be documented here before use, and any rename must update this file plus all consumer locations (.env.local, Supabase Project Secrets, GitHub Actions).

## Current Secrets

| Secret | Purpose | .env.local | Supabase Project Secrets | GitHub Actions |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Base URL for the Supabase project (used by backend workers and Edge functions). | ✅ | ✅ (`SUPABASE_URL`) | ✅ (`SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon key for Edge functions and clients (this is the “anon key” in the Supabase dashboard). | ✅ | ✅ (`SUPABASE_PUBLISHABLE_KEY`) | ✅ (`SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for backend workers (`createBackendClient`). Same value as `SUPABASE_SECRET_KEY` in Supabase. | ✅ (`SUPABASE_SERVICE_ROLE_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) |
| `OPENAI_API_KEY` | AI-powered tooling (if enabled; currently optional). | ✅ (optional) | ✅ (optional) | ✅ (optional) |
| `TCGDEX_BASE_URL` | TCGdex API base URL (used by new ingestion). | ✅ | ✅ | (not required) |
| `TCGDEX_LANG` | Active TCGdex language slug (e.g., `en`). | ✅ | ✅ | (not required) |
| `TCGDEX_API_KEY` | Reserved for TCGdex auth (currently unused; keep empty unless provided). | ✅ | ✅ | (not required) |

> NOTE: Supabase project secrets live under Settings → Configuration → Secrets. GitHub Actions secrets must match these names in lowercase (e.g., `SUPABASE_SECRET_KEY`). `SUPABASE_PUBLISHABLE_KEY` maps to the “anon key” in the Supabase dashboard. `SUPABASE_SERVICE_ROLE_KEY` in this contract corresponds to the `SUPABASE_SECRET_KEY` entries in Supabase project secrets and GitHub Actions.

## Naming Rules

1. The legacy `ANON_KEY`/`SERVICE_ROLE_KEY` names are banned in new code. Use the contract names (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) everywhere.
2. Any new secret must be added to this contract before use, with purpose and required locations filled out.
3. Any rename requires simultaneous updates to this file, `.env.local`, Supabase project secrets, GitHub Actions secrets, and all code references.
4. When configuring Supabase project secrets or GitHub Actions, `SUPABASE_SERVICE_ROLE_KEY` must be stored under the name `SUPABASE_SECRET_KEY`; they always share the same value.
