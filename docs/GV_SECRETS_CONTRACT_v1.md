# GV Secrets Contract v1

This contract is the single source of truth for Grookai Vault secrets. Every new secret must be documented here before use, and any rename must update this file plus all consumer locations (.env.local, Supabase Project Secrets, GitHub Actions).

## Current Active Status

As of the current stabilization phase:

- Canonical env names are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `BRIDGE_IMPORT_TOKEN`
- Legacy names such as `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and framework aliases such as `NEXT_PUBLIC_SUPABASE_ANON_KEY` may remain present for compatibility
- Compatibility aliases are not equal-authority contract names for new code

## Current Secrets

| Secret | Purpose | .env.local | Supabase Project Secrets | GitHub Actions |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Base URL for the Supabase project (used by backend workers and Edge functions). | ✅ | ✅ (`SUPABASE_URL`) | ✅ (`SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon key for Edge functions and clients (this is the “anon key” in the Supabase dashboard). | ✅ | ✅ (`SUPABASE_PUBLISHABLE_KEY`) | ✅ (`SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SECRET_KEY` | Canonical service-role secret for backend workers and admin/edge boundaries. | ✅ (`SUPABASE_SECRET_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) |
| `OPENAI_API_KEY` | AI-powered tooling (if enabled; currently optional). | ✅ (optional) | ✅ (optional) | ✅ (optional) |
| `TCGDEX_BASE_URL` | TCGdex API base URL (used by new ingestion). | ✅ | ✅ | (not required) |
| `TCGDEX_LANG` | Active TCGdex language slug (e.g., `en`). | ✅ | ✅ | (not required) |
| `TCGDEX_API_KEY` | Reserved for TCGdex auth (currently unused; keep empty unless provided). | ✅ | ✅ | (not required) |

> NOTE: Supabase project secrets live under Settings → Configuration → Secrets. GitHub Actions secrets must match these names in lowercase (e.g., `SUPABASE_SECRET_KEY`). `SUPABASE_PUBLISHABLE_KEY` maps to the “anon key” in the Supabase dashboard. Older runtime surfaces may still reference `SUPABASE_SERVICE_ROLE_KEY`, but current canonical authority is `SUPABASE_SECRET_KEY`.

## Naming Rules

1. The legacy `ANON_KEY`/`SERVICE_ROLE_KEY` names are banned in new code. Use the canonical contract names (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) everywhere.
2. Any new secret must be added to this contract before use, with purpose and required locations filled out.
3. Any rename requires simultaneous updates to this file, `.env.local`, Supabase project secrets, GitHub Actions secrets, and all code references.
4. When configuring Supabase project secrets or GitHub Actions, service-role access must be stored under the canonical name `SUPABASE_SECRET_KEY`. Older `SUPABASE_SERVICE_ROLE_KEY` references are compatibility-only.
