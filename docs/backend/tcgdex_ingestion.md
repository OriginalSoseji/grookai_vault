# TCGdex Ingestion Pipeline

The TCGdex ingestion workers mirror the PokemonAPI flow but are namespaced under `source = 'tcgdex'`. They import canonical set + card data into `raw_imports`, normalize to `sets` / `card_prints`, emit `external_mappings`, and enrich `card_print_traits` without touching identity columns.

## Environment

Set the following environment variables (see `.env.example` for placeholders):

- `TCGDEX_BASE_URL` — Required base URL for the TCGdex REST API (no default).
- `TCGDEX_API_KEY` — Optional API key/header if the instance enforces auth.
- Standard Supabase backend secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

Each worker supports `--dry-run`, `--limit`, and `--mode` flags in line with existing contracts. Missing env vars cause an early exit with a descriptive error.

## Commands

Run these scripts from the repo root:

- `npm run tcgdex:import-sets` — Fetches paginated TCGdex set data and upserts into `raw_imports` (`_kind = 'set'`). Supports `--limit`, `--page`, `--mode`, and `--dry-run` for scoped imports.
- `npm run tcgdex:import-cards` — Imports cards per set into `raw_imports` (`_kind = 'card'`). Accepts `--set <setId>` to scope runs, plus `--limit`, `--mode`, and `--dry-run`.
- `npm run tcgdex:normalize` — Normalizes pending `raw_imports` rows into `sets`, `card_prints`, `external_mappings`, and `card_print_traits`. Honors `--limit`, `--dry-run`, and `--mode` without mutating PokemonAPI identity.

Order of operations:

1. `tcgdex:import-sets`
2. `tcgdex:import-cards`
3. `tcgdex:normalize`

Repeat the cycle whenever new data lands upstream, or run with `--dry-run` to audit changes safely.


