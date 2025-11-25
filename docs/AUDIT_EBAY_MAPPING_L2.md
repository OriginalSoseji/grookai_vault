# Audit: eBay Mapping Layer (L2)

## 1. Overview
The repo already contains a modern mapping contract for PokemonAPI/TCGdex (raw staging ➜ normalization ➜ external_mappings ➜ enrichment), but no eBay-specific implementation yet. Schema elements such as `external_mappings`, `mapping_conflicts`, `card_prints.print_identity_key`, and `price_observations` are in place, and recent migrations explicitly call out `source = 'ebay'` as an expected value. However, only Pokemon/TCG workers currently exercise those tables. The new `ebay_self` pricing skeleton writes price observations with `print_id = null`, meaning the mapping layer necessary to connect eBay identifiers to canonical `card_prints` still needs to be designed and wired into the existing contract.

## 2. Inventory of Mapping-Related Schema
- **`external_mappings`** (`supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql`, `20251117124500_external_mappings_pokemonapi.sql`, `20251120220749_remote_schema.sql`)
  - Columns: `id bigserial`, `card_print_id uuid NOT NULL`, `source text NOT NULL` (comment lists `tcgplayer`, `justtcg`, `ebay`, `manual`), `external_id text NOT NULL`, `meta jsonb`, `synced_at timestamptz DEFAULT now()`, `active boolean DEFAULT true`.
  - Constraints/Indexes: `external_mappings_card_print_id_fkey` (`ON DELETE CASCADE`), `external_mappings_card_print_id_idx`, `external_mappings_source_external_id_key` (unique on `(source, external_id)`), legacy `(card_print_id, source, external_id)` uniqueness dropped in `20251120220749`.
  - Comments state it is the canonical link between prints and third-party IDs, explicitly naming eBay.
- **`mapping_conflicts`** (`supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql`)
  - Columns: `id bigserial`, `raw_import_id bigint REFERENCES raw_imports ON DELETE CASCADE`, `candidate_print_ids bigint[]`, `ai_confidence numeric`, `reason text`, `requires_human boolean DEFAULT true`, `resolved_by text`, `resolved_at timestamptz`, `created_at timestamptz DEFAULT now()`.
  - Purpose: log unresolved or ambiguous matches requiring review. **Note:** `candidate_print_ids` is `bigint[]` even though `card_prints.id` is `uuid`, which limits direct FK usage and should be corrected before eBay mapping relies on this table.
- **`raw_imports`** (`supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql`, `docs/ingestion/RAW_IMPORTS_AUDIT.md`)
  - Shared staging table keyed by `source`, `_kind` (inside `payload`), and `status` (`pending`, `normalized`, `conflict`, `error`). Downstream of imports and upstream of normalization/mapping.
- **Identity tables** (`docs/GV_SCHEMA_CONTRACT_V1.md`, `supabase/migrations/20251115040000_ai_ingestion_schema_v1.sql`)
  - `card_prints`: canonical identity uses `(set_id, number_plain, variant_key)` plus `print_identity_key` (unique when not null). Holds `external_ids` JSON storing per-source IDs, plus metadata fields (artist, image URLs, AI metadata).
  - `sets`: `UNIQUE (game, code)` and `source` JSON for external IDs. Normalization workers prefer matching by code or nested source IDs.
  - `card_print_traits`: metadata/performance traits keyed to `card_print_id`.
- **Pricing schema**
  - `price_observations` (`supabase/000_baseline_prod.sql`, `supabase/migrations/20251120120000_pricing_ebay_self_extension.sql`): stores `print_id uuid` (nullable), listing/pricing metadata, `source text`, new columns `marketplace_id`, `order_id`, `order_line_item_id`, `shipping_amount`, `seller_location`, `raw_payload`. Listing-type check constraint now allows uppercase eBay enums. Canonical path expects `print_id` populated eventually.
  - `price_sources`: table enumerating allowed price sources (migration `20251120120000` upserts `'ebay_self'`).

## 3. Inventory of Mapping-Related Code
- **PokemonAPI normalization pipeline** (`backend/sets/import_sets_worker.mjs`, `backend/pokemon/pokemonapi_import_cards_worker.mjs`, `backend/pokemon/pokemonapi_normalize_worker.mjs`, `backend/pokemon/pokemonapi_mapping_helpers.mjs`, `backend/pokemon/pokemonapi_backfill_mappings_worker.mjs`)
  - Pattern: ingest API data into `raw_imports` (`_kind = set/card`, `_external_id`), normalize sets/cards, resolve `card_print_id` by priority (existing `external_mappings` ➜ `(set_id, number)` ➜ `(set_id, number_plain)`), update `card_prints`, create traits, and insert `mapping_conflicts` when no unique match exists. The helper exposes `ensurePokemonApiMapping()` to upsert external mappings via `source, external_id`.
- **TCGdex normalization pipeline** (`backend/pokemon/tcgdex_import_*` and `backend/pokemon/tcgdex_normalize_worker.mjs`)
  - Mirrors the PokemonAPI flow with namespaced `source = 'tcgdex'`, `ensureTcgdexMapping`, and conflict handling, proving the contract supports multiple ingestion lanes.
- **Enrichment and identity maintenance** (`backend/pokemon/pokemon_enrichment_worker.mjs`, `backend/infra/backfill_print_identity_worker.mjs`)
  - Enrichment worker reads normalized rows, resolves `card_print_id` via external mappings, and writes traits; identity backfill ensures `print_identity_key` exists for matching heuristics.
- **Pricing skeleton for eBay** (`backend/ebay/ebay_self_orders_worker.mjs`)
  - Fetches seller orders, builds `price_observations` rows with `source: 'ebay_self'`, but leaves `print_id = null` with a TODO to map via `external_mappings`.

## 4. Existing vs Partial vs Missing
- **Existing**
  - Canonical schema for `external_mappings`, `mapping_conflicts`, `raw_imports`, `card_prints`, and `price_observations`.
  - Fully wired PokemonAPI/TCGdex pipelines that demonstrate how to populate mappings, detect conflicts, and log normalization runs.
  - Helper modules (`pokemonapi_mapping_helpers.mjs`) encapsulating set/card resolution logic.
  - Migration guardrails (IF NOT EXISTS patterns, FK validation, comments referencing eBay).
- **Partial**
  - `mapping_conflicts` data type mismatch (`bigint[]` vs `uuid`), making conflict resolution harder for future eBay tooling.
  - No shared abstraction for mapping beyond Pokemon-specific helpers; logic is replicated per source.
  - Pricing pipeline currently allows `price_observations.print_id` to remain null (e.g., `ebay_self` worker), delaying traceability until mapping exists.
  - No ingestion lane for eBay raw data; price worker ingests direct orders without staging in `raw_imports`, meaning mapping_conflicts/external_mappings pattern isn't reused yet.
- **Missing**
  - eBay-specific mapping helper/worker to resolve listing/item identifiers to `card_print_id`.
  - Agreement on canonical eBay identifiers (`legacyItemId`, `itemId`, `EPID`, etc.) and how they translate into `external_id` and `meta`.
  - Conflict resolution interface/process for eBay (currently only Pokemon workers insert conflicts).
  - Backfill strategy tying historic eBay listings to canonical prints before enabling production price ingestion.

## 5. Risks & Red Flags
- `mapping_conflicts.candidate_print_ids` stores `bigint[]`, incompatible with `card_prints.id uuid`, so conflict review tooling cannot join to prints without casting. Any eBay-focused conflict pipeline would hit the same limitation unless the column is migrated to `uuid[]`.
- `ebay_self` worker inserts `price_observations` rows with `print_id = null`. If pricing analytics depend on populated prints, running this worker without a mapping layer could contaminate downstream aggregates or require manual cleanup.
- No raw staging lane exists for eBay; inserting directly into `price_observations` bypasses the proven `raw_imports ➜ mapping_conflicts ➜ external_mappings` lifecycle, risking inconsistent workflows and missing audit trails.
- External IDs for Pokemon/TCG are stored inside `card_prints.external_ids` JSON and mirrored in `external_mappings`; there is no equivalent eBay data yet, so attempts to map or deduplicate will fail until real IDs are ingested.
- No documentation defines whether eBay should use EPID, `legacyItemId`, or `orderLineItemId` as `external_id`. Choosing the wrong identifier could prevent deduplication across listings/orders.

## 6. Safe Areas for Development
- **Schema-level**: `external_mappings.meta jsonb` leaves room to store additional per-ID metadata (marketplace site, seller SKU, etc.), and comments already mention eBay, so adding `source = 'ebay_self'` or `source = 'ebay_market'` is contractually aligned.
- **Pipeline pattern**: The PokemonAPI/TCGdex normalize + mapping helpers provide a blueprint for eBay normalization (staging raw payloads, resolving sets, upserting `external_mappings`, emitting `mapping_conflicts` when ambiguous). Reusing this pattern reduces risk.
- **Pricing tables**: The recent migration adding `marketplace_id`, `order_id`, `order_line_item_id`, and `raw_payload` ensures eBay-specific data can be stored without further schema churn.
- **Backfill tooling**: Existing `pokemonapi_backfill_mappings_worker` and identity backfill script demonstrate how to run safe upserts and could be cloned/adapted for eBay once identifier strategy is known.

## 7. Prerequisites for eBay → card_print Mapping
1. **Define canonical eBay identifiers**: decide which identifier becomes `external_mappings.external_id` (e.g., EPID vs `legacyItemId` vs `orderLineItemId`). Consider storing alternates in `meta`.
2. **Stage raw eBay catalog/order data**: either reuse `raw_imports` with `_kind` markers or create an equivalent queue so mapping_conflicts can be logged consistently.
3. **Implement eBay set/card resolution**: need a resolver that matches eBay listings to existing `card_prints` using catalogue metadata (set code, number, variant) or crosswalk tables.
4. **Extend `mapping_conflicts` type**: convert `candidate_print_ids` to `uuid[]` (or store a join table) before eBay workflows rely on it.
5. **Populate `external_mappings` for eBay**: create an `ensureEbayMapping` helper to upsert `(source='ebay_self' | 'ebay_market', external_id, card_print_id)` and optionally embed listing metadata in `meta`.
6. **Gate price ingestion on mapping**: update the `ebay_self` worker (or downstream RPC) to require a resolved `card_print_id` before inserting `price_observations`, or insert into a staging table until mapping succeeds.
7. **Monitoring & review**: plan an audit dashboard for `mapping_conflicts` and `external_mappings` growth so newly ingested eBay data can be verified before becoming canonical.

## 8. Final Recommendations
1. **Adopt the existing ingestion contract**: build an `ebay_import` stage (either via `raw_imports` or a dedicated queue) that mirrors Pokemon/TCG flows, so conflicts and mappings follow the same governance.
2. **Fix `mapping_conflicts` data type**: migrate `candidate_print_ids` to `uuid[]` (or introduce a child table) to avoid blocker later; document the intended review workflow.
3. **Create eBay mapping helpers**: similar to `pokemonapi_mapping_helpers.mjs`, add reusable utilities for resolving eBay identifiers to sets/prints and for writing `external_mappings`.
4. **Decide on identifier taxonomy**: document whether to ingest EPIDs, item IDs, seller SKUs, etc., and how each maps to `external_id` vs `meta`.
5. **Update `ebay_self` worker to stage before insert**: either gate inserts behind a mapping lookup or write to a temporary table until `card_print_id` is known; avoid long-lived null `print_id` data.
6. **Backfill before launch**: run a dedicated backfill to populate `external_mappings` for historic eBay transactions so pricing analytics have coverage from day one.
7. **Document the contract**: extend `docs/EBAY_INTEGRATION_OVERVIEW.md` (or a new mapping doc) with the agreed mapping workflow, conflict escalation path, and schema touchpoints to keep future audits straightforward.

## Mapping Conflicts Column Upgrade
- `mapping_conflicts.candidate_print_ids bigint[]` is now **legacy** and retained only for historical data.
- New code must populate `mapping_conflicts.candidate_print_uuids uuid[]`, which is the canonical candidate list aligned with `card_prints.id`.
- Existing bigint entries are not automatically converted; they remain for backward compatibility and should not be treated as authoritative.
- Future conflict-handling pipelines (including eBay) should write UUID candidates into `candidate_print_uuids`, optionally mirroring other identifiers into the legacy column only if an older workflow still expects them.
