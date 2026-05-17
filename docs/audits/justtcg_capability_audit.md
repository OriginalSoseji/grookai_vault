# JustTCG Capability Audit

## 1. Summary

JustTCG CAN:

- Provide text and identifier based card lookup through `GET /cards`.
- Provide batch card lookup through `POST /cards`.
- Filter and retrieve cards by known identifiers such as `tcgplayerId`, `tcgplayerSkuId`, `cardId`, and `variantId`.
- Support set and number based lookup paths when a JustTCG set id and printed number are already known.
- Return structured card evidence: `id`, `name`, `game`, `set`, `set_name`, `number`, `rarity`, `tcgplayerId`, and `variants`.
- Return variant and pricing structure: `variant id`, `condition`, `printing`, `language`, `tcgplayerSkuId`, current price, average price, history, and statistics.
- Support a cached local support lane because Grookai already stores `external_mappings(source='justtcg')`, `justtcg_variants`, `justtcg_variant_price_snapshots`, and `justtcg_variant_prices_latest`.

JustTCG CANNOT, based on repo and official documentation evidence inspected here:

- Accept an image upload for recognition.
- Perform image-based card search.
- Perform perceptual-hash or fingerprint similarity matching.
- Replace the scanner visual recognition layer.
- Define Grookai canonical card identity.

Final scanner relevance:

- Usable for instant scan: no, not as the recognition engine.
- Usable for prefilter/support: yes, if another layer has already extracted or supplied deterministic text/ID evidence such as set, number, name, TCGplayer ID, JustTCG card ID, or variant ID.
- Direct scanner verdict: not usable for image -> card recognition.

## 2. API Capabilities

Repo client evidence:

- `backend/pricing/justtcg_client.mjs`
  - Base URL: `https://api.justtcg.com/v1`
  - Timeout: `8000ms`
  - Default POST batch size: `200`
  - Retries: `3`
  - Rate-limit retry delay base: `1200ms`
  - Auth header: `x-api-key`
  - Guardrails block unsafe GET batching for repeated, comma-separated, or `tcgplayerId[]` query parameters.
- `backend/pricing/justtcg_import_cards_worker.mjs`
  - Uses `GET /sets` with `game=pokemon`.
  - Uses paged `GET /cards` with `game`, `set`, `limit`, `offset`, and optional `updated_after`.
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
  - Uses `POST /cards`.
  - Batch object shape includes `cardId` and `game`.
  - Batch size is capped at `200`.
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
  - Uses `POST /cards` via `tcgplayerId`.
  - Resolves response rows by returned `tcgplayerId`, not response position.
- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`
  - Uses `GET /sets`.
  - Uses `GET /cards` with `game`, `set`, `number`, `include_null_prices`, `include_price_history=false`, and `include_statistics=7d`.
- `apps/web/src/lib/pricing/getJustTcgPriceHistory.ts`
  - Uses `GET /cards` with `variantId`.
  - Falls back to `GET /cards` with `cardId`.
  - Requests `include_price_history=true` and `priceHistoryDuration`.

Official documentation evidence checked:

- `https://justtcg.com/docs`
  - Documents `GET /games`, `GET /sets`, `GET /cards`, and `POST /cards`.
  - Describes `/cards` as direct lookup or flexible search when no id is supplied.
  - Documents identifier lookup fields including `tcgplayerId`, `tcgplayerSkuId`, `cardId`, and `variantId`.
  - Documents text/search and filter fields including `q`, `game`, `set`, `number`, `printing`, `condition`, `include_price_history`, `include_statistics`, `include_null_prices`, and `updated_after`.
  - Documents response `_metadata` fields that expose request limit, daily limit, remaining requests, and per-minute rate limit.
  - No official docs text was found for image upload, image recognition, visual similarity, perceptual hash, or scanner recognition.

Endpoint capability matrix:

| Endpoint | Inputs seen/proven | Scanner recognition relevance |
|---|---|---|
| `GET /games` | none beyond auth | Catalog discovery only |
| `GET /sets` | `game`, `q`, `orderBy`, `order` | Set lookup/support only |
| `GET /cards` | `q`, `game`, `set`, `number`, `tcgplayerId`, `tcgplayerSkuId`, `cardId`, `variantId`, `printing`, `condition`, history/stat filters | Text/ID support, not image recognition |
| `POST /cards` | array of lookup objects with `tcgplayerId`, `cardId`, `variantId`, `tcgplayerSkuId`, and related filters | Batch enrichment/support, not image recognition |

## 3. Data Model

Repo tables and storage paths:

- `public.raw_imports`
  - JustTCG card import worker stores raw payloads with `source='justtcg'`, `_kind='card'`, `_external_id`, `_set_external_id`, and `_fetched_at`.
- `public.external_mappings`
  - Stores active JustTCG card mapping as `source='justtcg'`.
  - `external_id` is the JustTCG card id.
  - Anchors to `card_print_id`.
  - Unique constraint exists on `(source, external_id)`.
- `public.justtcg_variants`
  - `variant_id`
  - `card_print_id`
  - `condition`
  - `printing`
  - `language`
  - `created_at`
- `public.justtcg_variant_price_snapshots`
  - `variant_id`
  - `card_print_id`
  - `price`
  - `avg_price`
  - `price_change_24h`
  - `price_change_7d`
  - `fetched_at`
  - `raw_payload`
  - `created_at`
- `public.justtcg_variant_prices_latest`
  - derived latest row per `variant_id`
  - includes `condition`, `printing`, `language`, current price fields, and `updated_at`
- `public.justtcg_set_mappings`
  - helper alignment from Grookai set ids to JustTCG set ids.
- `public.justtcg_identity_overrides`
  - helper override rows for difficult set/number/name/rarity alignment.

Live read-only sample evidence:

- `raw_imports(source='justtcg', payload->_kind='card')`: `15239`
- active `external_mappings(source='justtcg')`: `19995`
- `justtcg_variants`: `140541`
- `justtcg_variant_price_snapshots`: `358304`
- `justtcg_variant_prices_latest`: `140541`

Sample raw card payload keys:

- `_external_id`
- `_fetched_at`
- `_kind`
- `_set_external_id`
- `details`
- `game`
- `id`
- `mtgjsonId`
- `name`
- `number`
- `rarity`
- `scryfallId`
- `set`
- `set_name`
- `tcgplayerId`
- `variants`

Sample first-variant payload keys:

- `id`
- `condition`
- `printing`
- `language`
- `tcgplayerSkuId`
- `price`
- `avgPrice`
- `lastUpdated`
- `priceHistory`
- `priceHistory30d`
- 7d/30d/90d min/max/average/trend/statistical fields

Presence check:

| Field class | Present? | Evidence |
|---|---:|---|
| image URLs | no in sampled card/variant payload | no image-like keys in sampled payload |
| variant IDs | yes | `variants[].id`, `justtcg_variants.variant_id` |
| unique card identifiers | yes | card payload `id`, `external_mappings.external_id` |
| hashes/fingerprints | no | no hash-like keys in sampled payload |
| normalized names | not native from JustTCG; derived by Grookai workers | `justtcg_stage_clean_candidates_v1.mjs`, `justtcg_bucket_unresolved_candidates_v1.mjs` derive normalized fields |

## 4. Variant Handling

JustTCG represents variants as pricing-oriented rows under a card.

Repo and contract evidence:

- `JUSTTCG_DOMAIN_CONTRACT_V1` defines variant as `(card + condition + printing [+ language])`.
- `justtcg_domain_ingest_worker_v1.mjs` requires each variant to have `id`, `condition`, and `printing`.
- `justtcg_variants` preserves `variant_id`, `condition`, `printing`, and `language`.
- `justtcg_variant_price_snapshots` preserves raw upstream variant payloads.
- `apps/web/src/lib/pricing/getJustTcgPriceHistory.ts` selects variants by exact `variantId`, then by `condition` and `printing`, then language/update/price preference.

Differentiation support:

| Dimension | Supported? | Evidence |
|---|---:|---|
| condition | yes | `condition` filters and `justtcg_variants.condition` |
| printing | yes | `printing` filters and `justtcg_variants.printing` |
| language | yes | `language` stored on variants |
| base vs stamped/version-like labels | partial/support only | Grookai candidate filters inspect upstream names for signals like `Staff`, `Prerelease`, `1st Edition`, `Poke Ball`, `Master Ball` |
| finish-only vs separate issued version | not authoritative | `run_justtcg_candidate_audit_v1.mjs` and related interpreters treat JustTCG names as evidence, not canonical truth |
| alt prints/canonical print identity | not authoritative | contracts forbid JustTCG from defining Grookai identity |

## 5. Matching Potential

Direct card lookup:

- Supported when a deterministic identifier is already available:
  - `tcgplayerId`
  - `cardId`
  - `variantId`
  - `tcgplayerSkuId`
- Supported in batch through `POST /cards`.
- Useful after Grookai already has an external bridge or resolved card identity.

Structured lookup:

- Supported as a probe path using known JustTCG set id plus printed number.
- Grookai direct-structure mapping adds local guardrails:
  - set alignment
  - number normalization variants
  - exact normalized name
  - rarity disambiguation only when needed
  - ambiguity stop conditions

Fuzzy/text search:

- Official docs expose `q` search/flexible search behavior.
- Repo contracts explicitly forbid `q`-driven automatic writes and search-result ownership.
- This can support manual/operator discovery, but not scanner fast-path identity.

Image-based search:

- Not supported by repo code.
- Not documented in official JustTCG docs inspected for this audit.
- No image upload endpoint, image URL field, perceptual hash field, or similarity endpoint was found.

Similarity matching:

- Not supported by repo code.
- No hash/fingerprint tables or fields exist in the JustTCG domain.
- No nearest-neighbor or distance-based lookup path exists in JustTCG code.

Classification:

- usable for instant scan: no
- usable for prefilter: yes, only after another layer supplies deterministic text or IDs
- not usable as scanner recognition engine: yes

## 6. Performance Assessment

Sub-500ms resolution WITHOUT AI:

- Possible only for local cached lookups after another layer has produced a deterministic key.
- Not proven for live JustTCG HTTP calls in scanner-critical flow.
- Not suitable as a direct live dependency during capture because repo client timeout is `8000ms`, retries up to `3`, and rate-limit retry behavior exists.

Best-case support pattern:

- scanner/OCR/local resolver extracts set + number + name, or an existing local mapping exists
- Grookai performs local indexed lookup in `card_prints`, `external_mappings`, and/or `justtcg_*`
- JustTCG is used only for enrichment or offline refresh

Bad scanner pattern:

- capture image
- call JustTCG live
- rely on text/fuzzy results
- select card from search results

That pattern is not deterministic, not image-aware, and not safe for a scanner fast path.

## 7. Risks / Limitations

- No image capability was found.
- No fingerprint or hash capability was found.
- No visual similarity capability was found.
- Search results are not safe as automatic identity writes.
- JustTCG card and variant IDs have documented change history in prior repo audits.
- Variant IDs are pricing/condition/printing scoped, not Grookai card identity.
- Set/number/name lookup still requires local alignment and ambiguity handling.
- Live calls require API key auth and are subject to rate limits.
- Official responses include rate metadata, but per-plan limits depend on account state.
- Repo runtime client uses 8-second timeout and retry behavior, which is incompatible with scanner-critical sub-500ms guarantees.
- JustTCG is contractually non-canonical in Grookai and must not define identity.

## 8. Final Verdict

Verdict: USE AS SUPPORT SYSTEM

JustTCG should not be used directly for scanner recognition. It does not provide image upload, image search, perceptual hash lookup, or similarity matching in the repo or in the official docs inspected here.

It can support the scanner ecosystem only as a secondary deterministic data source after Grookai already has text or ID evidence:

- enrich resolved cards with variant/pricing structure
- support operator/debug lookups
- support set/number/name candidate review
- support local prefiltering when cached and indexed locally

It should not be placed in the capture -> instant match path as the recognition authority.

Commands used:

```powershell
rg -n -i "justtcg|justtcg_import|justtcg_domain|justtcg_variants|justtcg_variant_prices" .
rg --files | rg -i "justtcg|tcg|variant|price|ingest|import"
Get-Content backend\pricing\justtcg_client.mjs
Get-Content backend\pricing\justtcg_import_cards_worker.mjs
Get-Content backend\pricing\justtcg_domain_ingest_worker_v1.mjs
Get-Content backend\pricing\promote_tcgplayer_to_justtcg_mapping_v1.mjs
Get-Content backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs
Get-Content backend\pricing\justtcg_variant_prices_latest_builder_v1.mjs
Get-Content backend\pricing\justtcg_variant_prices_latest_refresh_v1.mjs
Get-Content backend\warehouse\justtcg_discovery_worker_v1.mjs
Get-Content backend\printing\justtcg_candidate_filter_v1.mjs
Get-Content backend\printing\run_justtcg_candidate_audit_v1.mjs
Get-Content apps\web\src\lib\pricing\getJustTcgPriceHistory.ts
Get-Content supabase\migrations\20260321100000_justtcg_domain_v1.sql
Get-Content supabase\migrations\20260322193000_add_justtcg_direct_structure_helpers_v1.sql
Get-Content docs\audits\JUSTTCG_UPSTREAM_CAPABILITY_AUDIT_V1.md
Get-Content docs\contracts\JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md
Get-Content docs\contracts\JUSTTCG_DOMAIN_CONTRACT_V1.md
```

External source checked:

- `https://justtcg.com/docs`
