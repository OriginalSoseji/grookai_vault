# Grookai Vault Web (MVP)

Read-only Next.js client reusing the existing env contract.

## Environment
- Root `.env.local` (fallback `.env`) must provide:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
- Do **not** create nested `.env` in `apps/web`. `next.config.mjs` maps root env into:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Commands
```bash
cd apps/web
npm install
npm run dev
# RLS probe for vault views (needs SUPABASE_TEST_EMAIL/PASSWORD in env)
npm run rls:probe
```

App runs at http://localhost:3000

## Features
- Login/Sign up/Sign out (Supabase auth)
- Catalog search via RPC `search_card_prints_v1`
- Card detail read from `card_prints` + `sets`
- Vault read-only from `v_vault_items_ext` (falls back to error message if RLS blocks)
