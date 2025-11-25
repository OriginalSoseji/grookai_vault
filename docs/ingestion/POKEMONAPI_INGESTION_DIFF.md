# PokemonAPI Ingestion Diff (Old vs New)

## Old Ingestion/Edge Paths (baseline before PokemonAPI workers)
- **Edge Functions (pricing only)**  
  - `supabase/functions/import-prices/index.ts` and `import-prices-v3/index.ts`  
  - Trigger: HTTP Edge Function. Branches: health, pipeline_test, full import.  
  - Writes: Inserts/updates `admin.import_runs` (kind `pipeline_test`, status, timestamps, scope). Calls RPC `admin.import_prices_do` (not in repo) — presumed to write pricing tables (`prices/card_prices/...`), but no visibility here. No use of `raw_imports`.
- **Backend workers (infra/pricing placeholders)**  
  - `backend/pricing/import_prices_worker.mjs`: Tunnel check reading `card_prices`; no imports.  
  - `backend/sets/import_sets_worker.mjs` (before new change): purely probed candidate tables; no inserts.  
  - `backend/infra/backfill_print_identity_worker.mjs`: Updates `card_prints.print_identity_key`; not ingestion.  
  - `backend/infra/system_health_worker.mjs`: Reads `card_prices` for connectivity.  
  - No evidence of prior set/card ingestion writing to `sets`, `card_prints`, or `raw_imports`.
- **Conclusion for old path**: Imports (pricing) bypass `raw_imports`; sets/cards had no implemented importer in code. Hence `raw_imports` remained empty.

## New PokemonAPI Components (current code)
- **Shared client**: `backend/clients/pokemonapi.mjs`  
  - Fetch helper with optional `X-Api-Key`; ignores pricing fields.
- **Sets import worker**: `backend/sets/import_sets_worker.mjs`  
  - Trigger: manual Node script (`npm run pokemonapi:import:sets`).  
  - Writes: `raw_imports` with `{ source: 'pokemonapi', status: 'pending', payload: { ...setJSON, _kind: 'set', _external_id: set.id } }`. Upsert by payload `_kind` + `_external_id`. Logs `admin.import_runs` (kind `pokemonapi_import_sets`).
- **Cards import worker**: `backend/pokemon/pokemonapi_import_cards_worker.mjs`  
  - Trigger: manual Node script (`npm run pokemonapi:import:cards [--set <id>]`).  
  - Writes: `raw_imports` with `{ source: 'pokemonapi', status: 'pending', payload: { ...cardJSON, _kind: 'card', _external_id: card.id, _set_external_id: setId } }`. Upsert by `_kind` + `_external_id`. Logs `admin.import_runs` (kind `pokemonapi_import_cards_for_set`).
- **Normalization worker**: `backend/pokemon/pokemonapi_normalize_worker.mjs`  
  - Trigger: manual Node script (`npm run pokemonapi:normalize`).  
  - Reads: `raw_imports` where `source = 'pokemonapi'`, `payload->_kind IN ('set','card')`, `status = 'pending'`.  
  - Writes/updates:  
    - `sets`: merge/add using `(game='pokemon', code)` or `source->pokemonapi->>'id'`; merges `source` JSON; sets `logo_url`, `symbol_url`, `release_date`, `name` non-destructively.  
    - `card_prints`: match by `external_ids->pokemonapi`, then `(set_id, number)`, then `(set_id, number_plain)`; upsert `external_ids`, `regulation_mark`, `artist`, `rarity`, `image_url/_alt_url` (source `pokemonapi` when upgrading), `ai_metadata.pokemonapi` (legalities, flavor_text). Inserts new prints if none found.  
    - `card_print_traits`: inserts traits for `pokemon:type`, `pokemon:supertype`, `pokemon:subtype`, `pokemon:legal` (standard/expanded).  
    - `mapping_conflicts`: when ambiguous/missing set or card matches.  
    - Updates `raw_imports.status` to `normalized/conflict/error`. Logs `admin.import_runs` (kind `pokemonapi_normalize`).
- **Env placeholders**: `.env.example` now includes `POKEMONAPI_BASE_URL`, `POKEMONAPI_API_KEY` (backend-only).

## Old vs New: Use of `raw_imports`
- **Old path**: Did not populate `raw_imports` (pricing edge functions call RPC directly; set/card imports absent). No observed INSERT/UPSERT into `raw_imports`.
- **New path**: Explicit INSERT into `public.raw_imports` with:
  - Columns: `source = 'pokemonapi'`, `status = 'pending'`, `payload` = full API JSON plus `_kind` (`'set'|'card'`) and `_external_id` (and `_set_external_id` for cards).  
  - No separate `kind` column; stored inside `payload`.

## Alignment / Potential Mismatches
- Raw imports now depend on `_kind` and `_external_id` inside `payload`; ensure any consumers (future or DB-level) use the same markers.  
- Normalizer assumes:  
  - `raw_imports.status = 'pending'` rows exist with `source='pokemonapi'`.  
  - `sets` lookup by `code` or `source->pokemonapi->>'id'`.  
  - `card_prints` identity via existing constraints; may create new prints if none match.  
- No conflicting schema changes detected; uses existing columns (`external_ids`, `ai_metadata`, `regulation_mark`, `image_*`, `card_print_traits`).

## Examples
- **Old pricing insert shape (Edge)**:  
  - `admin.import_runs` insert: `{ kind: 'pipeline_test', scope: <request body>, status: 'running', started_at: now() }` (see `supabase/functions/import-prices/index.ts` & `import-prices-v3/index.ts`). No `raw_imports` usage. RPC `admin.import_prices_do` called with `_payload`, `_bridge_token` (details not in repo).
- **New PokemonAPI set insert shape**:  
  - Table: `public.raw_imports`  
  - Example payload: `{ ...pokemonSetJson, _kind: 'set', _external_id: 'sv3' }`  
  - Columns: `source='pokemonapi'`, `status='pending'`, `payload=<above>`.
- **New PokemonAPI card insert shape**:  
  - Table: `public.raw_imports`  
  - Example payload: `{ ...pokemonCardJson, _kind: 'card', _external_id: 'sv3-12', _set_external_id: 'sv3' }`  
  - Columns: `source='pokemonapi'`, `status='pending'`, `payload=<above>`.

## NEXT FIX STEPS
1) Run the new pipelines end-to-end to actually populate `raw_imports`:  
   - `npm run pokemonapi:import:sets`, `npm run pokemonapi:import:cards`, then `npm run pokemonapi:normalize` (with env keys set).  
2) Confirm `raw_imports` contains `source='pokemonapi'`, `_kind` markers, and that normalizer resolves sets/cards without excessive conflicts; adjust matching logic or mappings if conflicts spike.  
3) If other consumers expect a `kind` column instead of payload markers, consider adding a computed column/view or align downstream queries to use `payload->>'_kind'` consistently.
