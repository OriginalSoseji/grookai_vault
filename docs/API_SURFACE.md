# API Surface (Edge Functions & Views)

This document records the current request/response contracts and key SQL views.

## Edge Functions

- search_cards (POST)
  - Body: `{ query: string, limit?: number, lang?: string }`
  - Response: `{ results: Array<{ id?: string, set_code?: string, number?: string, name?: string, image_url?: string, source: 'db'|'tcgdex' }> }`
  - Notes: DB-first (`v_card_search` -> `card_prints`), then TCGdex fallback. Image URLs derive from `image_best|image_url|image_alt_url` or tcgdex heuristic.

- hydrate_card (POST)
  - Body: `{ print_id?: string, set_code?: string, number?: string, name?: string, query?: string, ping?: boolean, lang?: string }`
  - Response: `card_prints` row (or `{ ok:true, warm:true }` for `ping=true`)
  - Notes: Service-role capable; upserts minimal fields; avoids clobbering curated columns.

- import-prices (POST)
  - Body: `{ set_code | set | setCode | code: string, cardLimit?: number, cardOffset?: number, debug?: boolean }`
  - Response: `{ ok: boolean, tried?: string[], fetched: number, processed: number, staged: number, inserted: number, next_offset?: number|null, ptcg_diag?: any }`
  - Notes: Uses PokemonTCG API for TCGplayer USD prices; writes to `price_observations` with service role.

- import-all-prices (POST)
  - Body: `{ throttleMs?: number, debug?: boolean, only?: string[] }`
  - Response: `{ ok: boolean, tried: number, failed: number, fetched: number, inserted: number }`
  - Notes: Iterates `sets` list from PokemonTCG API, invokes `import-prices` per set.

- check-sets (POST)
  - Body: `{ fix?: boolean, throttleMs?: number, only?: string[], fixMode?: 'prices'|'cards'|'both' }`
  - Response: `{ ok: boolean, total_api: number, total_db: number, missing_count: number, extra_count: number, missing: string[], extra: string[], fix: { requested: boolean, mode?: string, tried: number, ok: number } }`
  - Notes: Compares PokemonTCG set IDs vs DB. With `fix=true`, can trigger imports:
    - `fixMode='prices'` (default): calls `import-prices` for missing sets.
    - `fixMode='cards'`: calls `import-cards` to materialize set/cards.
    - `fixMode='both'`: runs `import-cards` then `import-prices` per set.

- check-prices (POST)
  - Body: `{ maxAgeDays?: number, only?: string[], dry_run?: boolean, throttleMs?: number }`
  - Response: `{ ok: boolean, cutoff: string, total_sets: number, considered_sets: number, to_import: number, triggered?: number, sets: Array<{ set_code, total_prints, priced_prints, fresh_prints, stale_prints, unpriced_prints, last_observed_max, coverage_pct, fresh_pct }> }`
  - Notes: Audits per-set coverage/staleness using `v_latest_print_prices`; if `dry_run` is false, triggers `import-prices` for sets with stale or missing prices (throttled).

- keep_alive (GET)
  - Response: `{ ok: boolean }`
  - Notes: Pings `search_cards` and `hydrate_card` to reduce cold starts.

## Database Views

- v_latest_print_prices
  - Columns: `set_code, number, print_id, condition, grade_agency, grade_value, source, price_usd, observed_at`
  - Notes: Joins `latest_prices` to `card_prints` for client lookups by set/number.

- v_best_prices_all
  - Columns: `card_id, base_market, base_source, base_ts, condition_label, cond_market, cond_source, cond_ts, grade_company, grade_value, grade_label, grad_market, grad_source, grad_ts`
  - Notes: Derived from `latest_prices` (base/condition/graded layers).

## RPCs

- get_prints_by_pairs(pairs jsonb)
  - Input JSON: `[{ set: string, num: string }, ...]` (aliases: `set_code|setCode` and `number` also accepted)
  - Returns: rows from `card_prints` matching `(set_code, number)` pairs
  - Usage: `select * from public.get_prints_by_pairs('[{"set":"sv6","num":"001"}]'::jsonb)`

## Environment Variables (Edge)

- SUPABASE_URL (preferred), PROJECT_URL (fallback)
- SUPABASE_SERVICE_ROLE_KEY (preferred), SERVICE_ROLE_KEY / SB_SERVICE_ROLE_KEY (fallbacks)
- Optional: POKEMON_TCG_API_KEY
