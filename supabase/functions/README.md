# Edge Functions — Production Contracts

This document summarizes the HTTP contracts for the production Edge Functions, based on the source under `supabase/functions`.

| Function       | Method | Auth             | Secrets (names only)                                     | Minimal Payload JSON |
|----------------|--------|------------------|-----------------------------------------------------------|----------------------|
| import-prices  | POST   | service-role JWT | SUPABASE_URL or PROJECT_URL; SERVICE_ROLE_KEY; POKEMON_TCG_API_KEY (optional, improves API rate/coverage) | {"set_code":"sv1","debug":false} |
| check-sets     | POST   | service-role JWT | PROJECT_URL or SUPABASE_URL; SERVICE_ROLE_KEY; POKEMON_TCG_API_KEY (optional) | {"fix":false,"throttleMs":200} |
| wall_feed      | GET    | anon (publishable)| SUPABASE_URL; SUPABASE_ANON_KEY                            | none (use query, e.g., `?limit=1`) |

Notes
- Both `import-prices` and `check-sets` require a service-role bearer token in `Authorization` and typically include `apikey: SERVICE_ROLE_KEY` for PostgREST calls they perform.
- `wall_feed` is read-only and uses the anon key internally to read `wall_feed_view`. Provide no body; use query parameters such as `limit`, `offset`, optional `q`, and `condition`.

