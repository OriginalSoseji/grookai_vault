# Phase 7A Fingerprint Index — L2 Audit

## 1. Executive Summary

This audit inspected the repo schema, schema snapshots, migrations, ingestion workers, image-source workers, scanner app path, identity scanner backend worker, existing condition fingerprinting code, and backend worker ownership patterns for a future precomputed card fingerprint index.

Verified from repo evidence:

- Canonical card images currently live primarily on `public.card_prints` as `image_url`, `image_alt_url`, `image_path`, `representative_image_url`, `image_source`, `image_status`, and `image_note`.
- Product read models expose `display_image_url` through `public.v_card_images` and `public.v_card_search`, but the underlying canonical image fields are still on `card_prints`.
- `public.card_prints.image_hash` already exists, but no active migration or worker evidence shows a canonical precomputed visual fingerprint index keyed by `card_print_id`.
- Existing fingerprinting tables, `fingerprint_bindings` and `fingerprint_provenance_events`, are user/vault-item condition-scan bindings, not a global canonical card fingerprint index.
- TCGdex and PokemonAPI normalization workers write canonical image URLs to `card_prints`; JustTCG is primarily raw discovery, mapping, and pricing/variant data and is not evidenced as a canonical image source.
- The current scanner pipeline is latency-sensitive: native capture -> optional local in-memory cache -> upload -> `identity_snapshots` -> Edge enqueue -> `identity_scan_events` -> backend worker -> border -> warp -> AI identify -> `search_card_prints_v1` -> `identity_scan_event_results`.

Unknowns that remain outside repo-only evidence:

- Current live post-April-22 image coverage counts for exact vs representative images across all canonical rows.
- Whether all source URLs are fetchable at batch scale with stable content and acceptable rate limits.
- Which visual hash family, threshold model, and collision policy should govern a global card-print index.

## 2. Schema Evidence

Commands used:

- `git branch --show-current`
- `git status --short`
- `rg --files | rg "(^supabase/|migrations|schema|views|raw_imports|card_prints|identity_scan|scanner|tcgdex|pokemonapi|justtcg|fingerprint|hash|image)"`
- `rg -n "card_prints|raw_imports|image_url|image_urls|images|tcgdex|pokemonapi|justtcg|fingerprint|perceptual|phash|identity_scan|scanner|scan_events|identity_snapshots" supabase backend scripts lib docs -S`
- `Get-Content` / line-window reads on the files cited below.
- `rg -n "fingerprint" supabase\migrations docs\audits backend\condition lib\services\scanner -S`

Current branch at audit start: `scanner-phase7-db-index`. Working tree was clean before the audit file was created.

Schema snapshot evidence:

- `docs/checkpoints/full_db_audit_v1/04_games_sets_card_prints_shape.json`
  - `card_prints_shape.columns` confirms `id`, `game_id`, `set_id`, `name`, `number`, `variant_key`, `set_code`, generated `number_plain`, and `gv_id`.
  - Snapshot counts: `total_rows = 33998`, `set_code_present = 22208`, `number_present = 22240`, `gvid_present = 20412`, `variant_key_present = 1698`.
- `docs/checkpoints/full_db_audit_v1/10_raw_imports_surface.json`
  - Snapshot counts: `raw_imports` total rows `45349`.
  - Source counts: `tcgdex = 22616`, `justtcg = 15239`, `pokemonapi = 7494`.
  - Linked raw summary shows linked raw evidence for TCGdex and PokemonAPI, but not a complete linked-image proof for all rows.

`public.card_prints` baseline fields:

- `supabase/migrations/20251213153625_baseline_init.sql:207-239`
  - Table fields include `id`, `game_id`, `set_id`, `name`, `number`, `variant_key`, `rarity`, `image_url`, `tcgplayer_id`, `external_ids`, `set_code`, generated `number_plain`, `artist`, `regulation_mark`, `image_alt_url`, `image_source`, `variants`, `print_identity_key`, `ai_metadata`, `image_hash`, `data_quality_flags`, `image_status`, `image_res`, `image_last_checked_at`, `printed_set_abbrev`, and `printed_total`.
  - `image_source` check allows `tcgdex`, `ptcg`, `pokemonapi`, `identity`, and `user_photo`.
  - `image_status` baseline check allowed `ok`, `placeholder`, `missing`, and `user_uploaded`.

Image-related migrations after baseline:

- `supabase/migrations/20260327090000_repair_tcgdex_card_prints_image_url_shape.sql:19-22`
  - Repairs malformed TCGdex asset URLs in `card_prints.image_url` by appending `/high.webp` for TCGdex asset paths that lack it.
- `supabase/migrations/20260330113000_card_prints_image_path_v1.sql`
  - Adds `card_prints.image_path text`.
  - Comment defines it as durable storage path for identity-backed canonical images; signed URLs must not be stored there.
- `supabase/migrations/20260416160247_representative_image_schema_v1.sql:1-14`
  - Adds `representative_image_url` and `image_note`.
  - Defines `representative_image_url` as lawful shared/fallback image when exact variant imagery is unavailable.
- `supabase/migrations/20260416160247_representative_image_schema_v1.sql:19-35`
  - Expands `image_status` to target states: `exact`, `representative_shared`, `representative_shared_collision`, `representative_shared_stamp`, `missing`, `unresolved`, plus legacy compatibility values.
- `supabase/migrations/20260416160247_representative_image_schema_v1.sql:38-53`
  - Deterministically normalizes rows with exact lanes to `image_status = 'exact'` and rows with no exact/representative/path to `missing`.
- `supabase/migrations/20260422120000_display_image_read_model_unification_v1.sql:3-24`
  - Locks `display_image_url` as the product read-model image.
  - `v_card_images` selects `image_url`, `image_alt_url`, `representative_image_url`, `image_status`, `image_note`, and derives `display_image_url` and `display_image_kind`.
- `supabase/migrations/20260422120000_display_image_read_model_unification_v1.sql:26-64`
  - `v_card_search` now resolves `image_url`, `thumb_url`, `image_best`, and `display_image_url` through `coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)`.

Identity fields relevant to attaching fingerprints:

- `supabase/migrations/20260306172935_add_gv_id_to_card_prints.sql:1-5`
  - Adds `card_prints.gv_id` and a partial unique index where non-null.
- `supabase/migrations/20260403133000__add_identity_domain_columns.sql:7-14`
  - Adds `card_prints.identity_domain` and an index.
- `supabase/migrations/20260413120000_global_print_identity_key_uniqueness_transition_v1.sql:29-38`
  - Adds a unique index over `set_id`, `number_plain`, `print_identity_key`, and `coalesce(variant_key,'')` when `number_plain` and `print_identity_key` are present.
- `supabase/migrations/20260402100000__card_print_identity_table.sql:3-35`
  - Defines `public.card_print_identity`: `card_print_id`, `identity_domain`, `set_code_identity`, `printed_number`, `normalized_printed_name`, `source_name_raw`, `identity_payload`, `identity_key_version`, `identity_key_hash`, `is_active`.
- `supabase/migrations/20260402100001__card_print_identity_indexes.sql:3-22`
  - Enforces one active identity row per `card_print_id`.
  - Enforces unique active `(identity_domain, identity_key_version, identity_key_hash)`.
  - Adds lookup indexes on identity domain, set code, number, and normalized name.
- `supabase/migrations/20260402100005__card_print_identity_post_backfill_constraints.sql:75-112`
  - Enforces allowed domain/version pairs and required fields for active identities.

Existing fingerprint/hash schema:

- `supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:5-15`
  - `public.fingerprint_bindings` stores `(user_id, fingerprint_key) -> vault_item_id/snapshot_id/analysis_key`, unique by `(user_id, fingerprint_key)`.
- `supabase/migrations/20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:52-63`
  - `public.fingerprint_provenance_events` stores append-only fingerprint events, also scoped by `user_id`, `snapshot_id`, and optional `vault_item_id`.
- `supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:4-43`
  - `admin_fingerprint_bind_v1` is service-role only and upserts user/vault fingerprint bindings.
- `supabase/migrations/20260114001500_fingerprinting_v1_1_admin_rpcs_bindings_events.sql:46-87`
  - `admin_fingerprint_event_insert_v1` inserts append-only provenance events.
- `supabase/migrations/20260117123000_disable_fingerprint_enqueue.sql`
  - Disables legacy direct enqueue; fingerprint runs inside the condition analysis pipeline.

Conclusion from schema evidence: current schema has image columns and an `image_hash` placeholder on `card_prints`, and it has user-owned condition fingerprint tables. It does not have an evidenced canonical global fingerprint-index table for `card_print_id` matching.

## 3. Image Source Evidence

### TCGdex

- `docs/backend/tcgdex_ingestion.md:3`
  - Documents TCGdex as importing canonical set/card data into `raw_imports`, normalizing to `sets` and `card_prints`, emitting `external_mappings`, and enriching traits.
- `docs/backend/tcgdex_ingestion.md:20-22`
  - Commands: `tcgdex:import-sets`, `tcgdex:import-cards`, `tcgdex:normalize`.
- `backend/pokemon/tcgdex_import_cards_worker.mjs:74-114`
  - Upserts card payloads into `raw_imports` by `source = 'tcgdex'`, `_kind = 'card'`, `_external_id`.
- `backend/pokemon/tcgdex_import_cards_worker.mjs:201-209`
  - Raw card payload shape includes `_kind`, `_external_id`, `_source`, set ids, fetch timestamp, and `card`.
- `backend/pokemon/tcgdex_normalize_worker.mjs:629-642`
  - Extracts primary image candidates from `cardData.images.large`, `cardData.image`, `cardData.hiresImage`, `cardData.imageUrl`.
  - Extracts secondary image candidates from `cardData.images.small`, `cardData.thumbnail`, `cardData.imageSmall`.
  - Normalizes TCGdex asset URLs with `normalizeTcgdexAssetImageUrl`.
- `backend/pokemon/tcgdex_normalize_worker.mjs:650-658`
  - Inserts `card_prints.image_url`, `image_alt_url`, and `image_source = 'tcgdex'`.
- `backend/pokemon/tcgdex_normalize_worker.mjs:694-697`
  - Updates existing `card_prints` image fields when image upgrade policy allows it.
- `backend/pokemon/tcgdex_normalize_worker.mjs:820-830`
  - After normalization, ensures TCGdex external mapping, handles printings, traits, and marks raw import normalized.

### PokemonAPI

- `backend/pokemon/pokemonapi_import_cards_worker.mjs:35-70`
  - Upserts raw card payloads into `raw_imports` by `source = 'pokemonapi'`, `_kind = 'card'`, `_external_id`.
- `backend/pokemon/pokemonapi_import_cards_worker.mjs:140-147`
  - Raw payload includes the PokemonAPI card object plus `_kind`, `_external_id`, and `_set_external_id`.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:325-328`
  - Extracts `card.images.large` and `card.images.small`.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:337-345`
  - Inserts `card_prints.image_url`, `image_alt_url`, `image_source = 'pokemonapi'`, and merged external ids.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:374-377`
  - Updates image fields only when the existing source can be upgraded or no image exists.
- `backend/pokemon/pokemonapi_normalize_worker.mjs:517-524`
  - Normalizes traits, ensures PokemonAPI mapping, handles printings, and marks raw import normalized.

### JustTCG

- `backend/pricing/justtcg_import_cards_worker.mjs:111-123`
  - Builds raw card payloads with `_kind = 'card'`, `_external_id`, `_set_external_id`, and fetched timestamp.
- `backend/pricing/justtcg_import_cards_worker.mjs:126-177`
  - Upserts those payloads into `raw_imports` by `source = 'justtcg'`, `_kind`, and `_external_id`.
- `backend/pricing/justtcg_import_cards_worker.mjs:381-400`
  - Only writes raw rows in `--apply` mode; otherwise it summarizes fetched cards.
- `supabase/migrations/20260321100000_justtcg_domain_v1.sql:1-79`
  - JustTCG domain schema is `justtcg_variants`, `justtcg_variant_price_snapshots`, and `justtcg_variant_prices_latest`, all keyed back to `card_print_id`, with raw pricing payloads.
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs:1-4`
  - Reads active JustTCG mappings, fetches JustTCG cards, parses variants, upserts variant tables, and inserts price snapshots.
- `backend/warehouse/justtcg_discovery_worker_v1.mjs:179-228`
  - Queues missing-pricing candidates into `raw_imports` as `source = 'justtcg_discovery'`, not as canonical image coverage.

No direct evidence was found that JustTCG supplies canonical exact images into `card_prints.image_url`.

### Existing card_print image fields/tables/views

- Table fields: `card_prints.image_url`, `image_alt_url`, `image_source`, `image_hash`, `image_status`, `image_res`, `image_last_checked_at`, `image_path`, `representative_image_url`, `image_note`.
- Views:
  - `v_card_images`: primary card image read model with `display_image_url`.
  - `v_card_search`: search result image fields derive from exact and representative image fields.
  - Baseline views `v_card_prints`, `v_card_search`, and `card_prints_public` historically exposed `image_url`/`image_alt_url`.

### AI/generated image systems if present

- `backend/images/source_image_enrichment_worker_v1.README.md:5-23`
  - Worker applies exact or representative image enrichment for source-backed canonical rows and explicitly avoids writing representative fallback into exact `image_url`.
- `backend/images/source_image_enrichment_worker_v1.mjs:233-325`
  - Writes `representative_image_url`, `image_status`, `image_note`, and `image_source` only when `image_url` and existing representative image are blank.
- `docs/checkpoints/product/image_surfacing_hardening_v1.md:25-35`
  - Product contract: `display_image_url` is primary; `image_url`/`image_alt_url` are fallback compatibility; `representative_image_url` is valid when exact images are missing.
- `docs/checkpoints/warehouse/representative_image_schema_read_model_v1.md:76-89`
  - Read-time rule: exact first, otherwise representative, otherwise missing.

No repo evidence found that AI-generated images are allowed as exact canonical images. Representative images are explicitly caveated and must not be treated as exact fingerprint ground truth without a later architecture decision.

## 4. Ingestion Pipeline Evidence

Current raw -> normalized -> canonical flow from repo evidence:

1. Raw external rows are inserted/upserted into `public.raw_imports`.
   - Table definition: `supabase/migrations/20251213153625_baseline_init.sql:1860-1868`.
   - Comments: raw payloads from external sources or AI scans before normalization; source values include `justtcg`, `ai_scan`, `csv`, `manual`.
2. TCGdex import workers insert raw set/card payloads, then `tcgdex_normalize_worker` normalizes into `sets`, `card_prints`, `external_mappings`, `card_print_traits`, and printings.
3. PokemonAPI import workers insert raw set/card payloads, then `pokemonapi_normalize_worker` normalizes into `sets`, `card_prints`, `external_mappings`, traits, and printings.
4. JustTCG import workers insert raw JustTCG rows and domain pricing workers write variant/pricing tables keyed to `card_print_id`; evidence does not show JustTCG as a canonical image writer.
5. Warehouse flows handle non-canonical/provisional candidate intake:
   - `canon_warehouse_candidates` owns candidate state and promotion summaries (`supabase/migrations/20260328110000__warehouse_candidates.sql:5-54`).
   - `canon_warehouse_candidate_evidence` stores evidence with optional `storage_path`, `identity_snapshot_id`, `condition_snapshot_id`, and `identity_scan_event_id` (`supabase/migrations/20260328110001__warehouse_evidence.sql:3-18`).
   - `warehouse_intake_v1` accepts image arrays with `storage_path` and writes evidence rows (`supabase/migrations/20260328120009__warehouse_intake_rpc_v1.sql:13-22`, `170-188`).
6. Canonical identity is governed by `card_prints` plus `card_print_identity`; warehouse candidates remain non-canonical until promotion.

Important evidence boundary: normalization workers currently make image decisions at `card_prints.image_url`/`image_alt_url` write time, while representative image handling is a later, distinct image enrichment path.

## 5. Scanner Pipeline Evidence

App entry:

- `lib/main.dart:54-55`
  - `kNativeScannerPhase0Enabled` is true on iOS.
- `lib/main_shell.dart:412-415`
  - `_startScanFlow()` routes to `NativeScannerPhase0Screen` when native scanner is enabled.
- `lib/main_shell.dart:418-423`
  - Non-native fallback opens condition camera capture.

Native scanner and local cache:

- `lib/screens/scanner/native_scanner_phase0_screen.dart:346-378`
  - Reads captured image bytes, computes `PerceptualImageHash.hashNormalizedCardRegion`, and checks `RecentScanCache.findByFingerprint`.
- `lib/services/scanner/perceptual_image_hash.dart:40-47`
  - Hashes normalized card region via `CardRegionNormalizer.normalize` and 64-bit dHash.
- `lib/services/scanner/recent_scan_cache.dart:44-78`
  - Uses an in-memory map keyed by fingerprint and max Hamming distance `9`.
- `lib/screens/scanner/native_scanner_phase0_screen.dart:398-431`
  - Stores recent backend result in local memory when candidates include name, set code, and number.

Backend handoff:

- `lib/screens/scanner/native_scanner_phase0_screen.dart:464-494`
  - `_startIdentityHandoff` calls `IdentityScanService.startScan` with captured image path and then polls.
- `lib/services/identity/identity_scan_service.dart:59-87`
  - Reads file bytes and uploads to storage bucket `identity-scans`.
- `lib/services/identity/identity_scan_service.dart:128-146`
  - Inserts `identity_snapshots` with `images.bucket = identity-scans` and front path.
- `lib/services/identity/identity_scan_service.dart:155-159`
  - Invokes `identity_scan_enqueue_v1` with `snapshot_id`.
- `supabase/functions/identity_scan_enqueue_v1/index.ts:75-87`
  - Resolves `identity_snapshots` for the authenticated user.
- `supabase/functions/identity_scan_enqueue_v1/index.ts:110-143`
  - Inserts `identity_scan_events` with `status = pending`, `source_table`, empty `signals`, and empty `candidates`.

Polling and output contract:

- `lib/services/identity/identity_scan_service.dart:183-208`
  - Calls `identity_scan_get_v1?event_id=...`, then directly reads latest `identity_scan_event_results`.
- `lib/services/identity/identity_scan_service.dart:210-236`
  - Returns status, event id, snapshot id, error, candidates, and signals.
- `lib/screens/scanner/native_scanner_phase0_screen.dart:542-560`
  - `ai_hint_ready` with candidates becomes match/needs-review UI state; `failed` becomes failed state.

Worker path:

- `backend/identity/identity_scan_worker_v1.mjs:38-69`
  - `ensureJobs` creates `ingestion_jobs` for `identity_scan_events` with no results.
- `backend/identity/identity_scan_worker_v1.mjs:307-323`
  - Fetches event with either `condition_snapshots` or `identity_snapshots`.
- `backend/identity/identity_scan_worker_v1.mjs:325-357`
  - Extracts bucket/front path and downloads storage image.
- `backend/identity/identity_scan_worker_v1.mjs:363-375`
  - Calls AI border detection; failure writes `status = failed`, `reason = ai_border_failed`.
- `backend/identity/identity_scan_worker_v1.mjs:377-395`
  - Warps card quad through AI border service.
- `backend/identity/identity_scan_worker_v1.mjs:404-412`
  - Calls `ai-identify-warp`; failures write `ai_identify_failed`.
- `backend/identity/identity_scan_worker_v1.mjs:521-548`
  - Uses parsed AI name/collector number to call `search_card_prints_v1` and build result candidates.
- `backend/identity/identity_scan_worker_v1.mjs:602-605`
  - Inserts `ai_hint_ready` result with signals and candidates.

Latency-sensitive points:

- Client upload to Supabase storage.
- Edge function enqueue.
- Worker queue/claim loop.
- Storage download from backend worker.
- Border detection HTTP call.
- Warp HTTP call.
- AI identify HTTP call.
- Resolver RPC `search_card_prints_v1`.
- Poll loop in the app.

Potential safe insertion surfaces for a later fingerprint lookup, without choosing architecture:

- After native capture and local normalized hash, before upload: fastest, but currently only local in-memory cache and no canonical index contract.
- In `identity_scan_worker_v1` after image download and before border/AI identify: backend-owned and can use service role, but still after upload/queue latency.
- In `identity_scan_worker_v1` after border/warp: normalized card image is available, reducing false positives but still incurs border/warp latency.
- In a separate worker-precomputed index read path called from scanner: requires new schema/API contract not present in repo today.

## 6. Existing Worker Evidence

Relevant workers/scripts/functions and responsibilities:

- `backend/pokemon/tcgdex_import_cards_worker.mjs`
  - Imports TCGdex cards into `raw_imports`.
- `backend/pokemon/tcgdex_normalize_worker.mjs`
  - Normalizes TCGdex rows into canonical cards, mappings, traits, printings, and image fields.
- `backend/pokemon/pokemonapi_import_cards_worker.mjs`
  - Imports PokemonAPI cards into `raw_imports`.
- `backend/pokemon/pokemonapi_normalize_worker.mjs`
  - Normalizes PokemonAPI rows into canonical cards, mappings, traits, printings, and image fields.
- `backend/pricing/justtcg_import_cards_worker.mjs`
  - Imports JustTCG cards into `raw_imports`.
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
  - Uses active JustTCG mappings to write variant/pricing domain rows.
- `backend/warehouse/justtcg_discovery_worker_v1.mjs`
  - Finds active JustTCG mappings missing pricing snapshots and queues discovery rows.
- `backend/images/source_image_enrichment_worker_v1.mjs`
  - Applies exact/representative image enrichment for bounded source-backed canonical rows, guarded by canon-write contract assertions.
- `backend/condition/fingerprint_worker_v1.mjs`
  - Computes condition-scan pHash/dHash fingerprints from user-owned front/back condition snapshots, matches against same-user prior analyses, and binds to `vault_item_id`.
- `backend/condition/condition_analysis_job_runner_v1.mjs`
  - Backend Highway service for condition analysis jobs; invokes fingerprint worker for `v1_fingerprint`.
- `backend/identity/identity_scan_worker_v1.mjs`
  - Identity scanner worker; processes `identity_scan_events` through border, warp, AI identify, resolver, and result insert.
- `supabase/functions/identity_scan_enqueue_v1/index.ts`
  - Thin authenticated lane that validates snapshot ownership and inserts an identity scan event.
- `supabase/functions/identity_scan_get_v1/index.ts`
  - Thin authenticated lane that reads identity scan event status.

Backend ownership policy evidence:

- `docs/BACKEND_ARCHITECTURE.md:10-11`
  - Backend workers are the private highway; heavy logic is not placed in Edge Functions.
- `docs/BACKEND_ARCHITECTURE.md:38`
  - Edge wrappers validate, route, and translate requests into highway operations.
- `docs/WORKERS_GUIDE.md:5-11`
  - Backend workers use service-role credentials with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

## 7. Candidate Fingerprint Attachment Points

No final architecture is selected in this audit.

### Candidate A: Existing `card_prints.image_hash`

- Table/location: `public.card_prints.image_hash`.
- Pros:
  - Existing field, already near canonical image fields.
  - Directly attached to `card_print_id`.
- Risks:
  - Single text field is underspecified: cannot safely represent algorithm version, source image URL/path, exact vs representative, hash components, computed timestamp, confidence, or collision groups.
  - Existing field may have historical/legacy semantics.
  - Hard to support multiple algorithms or recomputation history.
- Evidence:
  - `supabase/migrations/20251213153625_baseline_init.sql:229-231` includes `ai_metadata`, `image_hash`, and `data_quality_flags`.

### Candidate B: New canonical card fingerprint index table

- Table/location: not present today; would be additive if later approved.
- Pros:
  - Can key by `card_print_id`, source image field, algorithm version, exact/representative state, hash components, and lifecycle timestamps.
  - Can support multiple fingerprints per card and collision analysis without overloading `card_prints`.
  - Aligns with append/evidence style used elsewhere.
- Risks:
  - Requires schema design and migration, which is out of scope for this audit.
  - Needs clear constraints for duplicates, variants, representative images, and source-image drift.
  - Needs careful query performance design for scanner latency.
- Evidence:
  - No active global canonical fingerprint table found by `rg -n "fingerprint" supabase\migrations`.
  - Existing fingerprint tables are user/vault scoped, not canonical card scoped.

### Candidate C: `card_print_identity` adjunct

- Table/location: `public.card_print_identity` or a table keyed to `card_print_identity.id`.
- Pros:
  - Strongly tied to governed identity rows and active identity invariants.
  - Provides protection against identity drift if fingerprints are tied to active identity version/hash.
- Risks:
  - Visual image fingerprints are not identity-law hashes; overloading `identity_key_hash` would violate intent.
  - Active identity rows can be repaired/reconciled independently of image assets.
  - Some fingerprint candidates may need to attach to a card print before identity repair is complete.
- Evidence:
  - `card_print_identity.identity_key_hash` is deterministic identity serialization hash, not a visual hash (`20260402100000__card_print_identity_table.sql:58-62`).
  - Unique active identity constraints exist (`20260402100001__card_print_identity_indexes.sql:3-15`).

### Candidate D: `raw_imports` / `external_mappings` attached evidence

- Table/location: `public.raw_imports.payload`, `public.external_mappings.meta`.
- Pros:
  - Preserves source provenance and could tie fingerprints to upstream image payloads.
  - Useful for audit/debug of source-image changes.
- Risks:
  - Raw imports are source receipts, not canonical lookup surfaces.
  - Raw rows can be duplicated across sources and may not map one-to-one to canonical cards.
  - Too slow/noisy for scanner lookup.
- Evidence:
  - `raw_imports` stores source payloads and lifecycle status (`20251213153625_baseline_init.sql:1860-1889`).
  - TCGdex/PokemonAPI workers use raw imports before normalizing to canonical rows.

### Candidate E: Existing `fingerprint_bindings`

- Table/location: `public.fingerprint_bindings`.
- Pros:
  - Existing fingerprint schema and RPCs.
  - Already has key derivation and provenance around pHash/dHash.
- Risks:
  - Scoped to `(user_id, fingerprint_key)` and binds to `vault_item_id`.
  - Designed for condition scans of owned cards, not a global canonical index.
  - Reuse would mix personal collection state with canonical card recognition.
- Evidence:
  - `fingerprint_bindings` columns include `user_id`, `fingerprint_key`, `vault_item_id`, and `snapshot_id` (`20260113233000_fingerprinting_v1_1_bindings_and_provenance.sql:5-15`).

### Candidate F: App local `RecentScanCache`

- Table/location: in-memory Flutter map.
- Pros:
  - Already in scanner path and very low latency.
  - Provides a proof of local dHash/hamming behavior for recently recognized cards.
- Risks:
  - Not persistent, not global, not canonical, and only populated after backend success.
  - Cannot prove image -> card before first backend recognition.
- Evidence:
  - `lib/services/scanner/recent_scan_cache.dart:44-78`.

## 8. Candidate Worker Ownership Points

No final owner is selected in this audit.

### Candidate A: Extend TCGdex/PokemonAPI normalization workers

- Worker/script/service: `tcgdex_normalize_worker.mjs`, `pokemonapi_normalize_worker.mjs`.
- Pros:
  - These workers already decide canonical image fields when normalizing source rows.
  - Fingerprint could be computed when exact images are first written.
- Risks:
  - Normalization would become network/image-processing heavy.
  - Recomputing on image-policy changes or representative image writes would be scattered.
  - JustTCG lacks evidenced canonical image writes, so this would not cover all rows.
- Evidence:
  - TCGdex image write: `backend/pokemon/tcgdex_normalize_worker.mjs:650-658`, `694-697`.
  - PokemonAPI image write: `backend/pokemon/pokemonapi_normalize_worker.mjs:337-345`, `374-377`.

### Candidate B: Extend `source_image_enrichment_worker_v1`

- Worker/script/service: `backend/images/source_image_enrichment_worker_v1.mjs`.
- Pros:
  - Image-focused worker with canon-write contract guardrails.
  - Already distinguishes exact and representative image semantics.
- Risks:
  - Currently scoped and bounded; V1 is not a general image-index worker.
  - Representative images are not safe exact fingerprints unless explicitly marked and treated separately.
- Evidence:
  - Worker scope and restrictions: `source_image_enrichment_worker_v1.mjs:12-19`, `64-72`.
  - Write guard and representative-image update path: `source_image_enrichment_worker_v1.mjs:233-325`.

### Candidate C: Extend condition `fingerprint_worker_v1`

- Worker/script/service: `backend/condition/fingerprint_worker_v1.mjs`.
- Pros:
  - Existing pHash/dHash implementation and matching logic.
  - Existing border/warp preprocessing path.
- Risks:
  - Bound to condition snapshots, front/back owned-card scans, `vault_item_id`, and same-user match space.
  - Would require separating algorithm modules from condition ownership.
  - Current `fingerprint_bindings` schema is the wrong storage target for canonical card prints.
- Evidence:
  - Hash algorithms in `backend/condition/fingerprint_hashes_v1.mjs`.
  - Condition worker loads `condition_snapshots` images and writes condition analyses/provenance.
  - Same-user candidate matching via `condition_snapshot_analyses` (`fingerprint_worker_v1.mjs:633-671`).

### Candidate D: Extend identity scanner worker lookup path

- Worker/script/service: `backend/identity/identity_scan_worker_v1.mjs`.
- Pros:
  - Already owns scanner backend execution and result contract.
  - Could insert fingerprint lookup before or after AI identify in the worker result.
- Risks:
  - Adds complexity to the hot latency path.
  - If placed after upload/queue, it does not solve client-side upload/queue latency.
  - If placed before border/warp, raw-photo fingerprints may false-match due to perspective/lighting.
- Evidence:
  - Identity worker hot path: download -> border -> warp -> AI identify -> resolver -> result (`identity_scan_worker_v1.mjs:357-605`).

### Candidate E: New Backend Highway canonical fingerprint worker

- Worker/script/service: not present today; would follow backend worker model if later approved.
- Pros:
  - Keeps heavy image fetch/processing out of Edge Functions and scanner UI.
  - Can run one-time batch and incremental jobs.
  - Can own index lifecycle, recomputation, and collision reporting.
- Risks:
  - Requires schema and job contract not yet designed.
  - Needs operational controls for rate limits, source failures, and partial backfills.
- Evidence:
  - Backend architecture says heavy logic belongs in workers/highway (`docs/BACKEND_ARCHITECTURE.md:10-11`, `38`).

### Candidate F: One-time batch plus incremental worker

- Worker/script/service: candidate mode of a future worker, not present today.
- Pros:
  - Batch can build initial coverage from current `card_prints` images.
  - Incremental mode can react to new/changed canonical image fields later.
- Risks:
  - Needs drift detection when image URLs change, image content changes, or representative images are added.
  - Needs retry/quarantine for bad upstream images.
- Evidence:
  - Existing ingestion scripts use batch/backfill modes in package scripts (`package.json` TCGdex/PokemonAPI scripts).
  - Source image enrichment already uses bounded input-json/apply patterns.

## 9. Risks / Red Flags

- Identity drift:
  - `card_prints`, `card_print_identity`, `print_identity_key`, `gv_id`, and representative image lanes can change independently unless an index records the exact identity/image version used.
- Duplicate fingerprints:
  - Same art across reprints, promos, stamped versions, and variant rows can collide visually.
  - Existing condition worker thresholds are not validated for global canonical print recognition.
- Variant ambiguity:
  - Representative images and shared art may correctly identify a base card but not a variant/stamp/finish.
  - `card_print_identity` has special domains and payload requirements; visual fingerprints cannot replace identity law.
- AI-generated or representative fallback images:
  - No evidence found that AI-generated images are lawful exact canonical images.
  - Representative images are explicitly caveated and should not be treated as exact variant fingerprints.
- Bad upstream images:
  - TCGdex URL repair migration proves upstream/source URL shape can be malformed.
  - Batch fetching may encounter missing, redirected, private, or changed content.
- JustTCG noisy product data:
  - JustTCG is evidenced as raw/mapping/pricing-oriented, not as a canonical image source.
  - JustTCG rows should not seed visual fingerprints without separate proof of image quality and exactness.
- Scanner false positives:
  - Low-distance dHash matches can be unsafe across similar layouts, energies, trainers, and repeated art.
  - Need explicit ambiguity handling and confidence gates before bypassing AI/resolver.
- Pricing/ingestion interference:
  - Fingerprint computation should not slow or destabilize pricing workers or source normalization.
  - JustTCG variant pricing tables should remain isolated from image recognition index writes.
- TCG Pocket / non-physical rows:
  - Schema snapshot includes `domain = tcg_pocket` and `exclude_from_physical_pipelines = true` in set source payloads; physical scanner indexing must not include digital-only rows without explicit rules.
- Privacy/signed URL risk:
  - `image_path` comment says durable storage paths, not signed URLs.
  - Product hardening rejects signed/private-looking URLs for provisional surfaces.

## 10. Safe Extension Boundaries

Safe later extension boundaries, subject to architecture approval:

- Additive schema only; do not overload existing `fingerprint_bindings` for canonical global recognition.
- Treat `card_prints.image_url` and `image_alt_url` as exact-image candidates; treat `representative_image_url` as separately labeled and lower authority.
- Keep heavy image fetch, decoding, hashing, and collision analysis in Backend Highway workers, not Edge Functions or UI.
- Keep scanner UI contract stable: `identity_scan_event_results.status`, `signals`, `candidates`, and failure detail must remain understandable by current app polling.
- Keep JustTCG pricing/domain workers isolated from fingerprint writes unless a source image contract is separately proven.
- Preserve `card_print_identity` as identity authority; visual fingerprints may reference identity version/hash, but must not replace it.
- Require source URL/path, algorithm version, computed-at timestamp, and exact/representative classification in any future index design.

## 11. Open Questions

- What are the current live post-April-22 counts for `image_url`, `image_alt_url`, `image_path`, and `representative_image_url` by `image_source`, `image_status`, and identity domain?
- Are TCGdex and PokemonAPI image URLs fetchable at full-catalog scale from the VPS/worker environment without rate-limit or content-type failures?
- Should representative images be excluded from Phase 7A entirely, or indexed in a separate low-authority lane?
- Which algorithm family should be used for canonical index matching: existing 64-bit dHash, existing pHash+dHash, normalized warped-card hash, feature embeddings, or a hybrid?
- What false-positive threshold is acceptable before scanner bypasses AI identify, and what ambiguity response should the app receive?
- Should digital-only/TCG Pocket rows be excluded from physical scanner fingerprinting by default?

## 12. Recommended Next Step

Proceed to Phase 7A architecture design, not implementation.

Implementation remains blocked until the architecture phase defines:

- Canonical fingerprint index schema and constraints.
- Exact vs representative image policy.
- Batch plus incremental worker ownership.
- Hash algorithm and threshold contract.
- Scanner integration point and fallback behavior.
- Read-only live coverage and URL-fetch preflight commands.
