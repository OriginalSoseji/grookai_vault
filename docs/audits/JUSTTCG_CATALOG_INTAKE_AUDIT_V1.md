# JUSTTCG_CATALOG_INTAKE_AUDIT_V1

Status: DRAFT  
Type: Audit  
Scope: Evaluates JustTCG as a lawful catalog intake source for Grookai

---

## 1. Purpose

Audit whether JustTCG is a viable upstream source for Grookai catalog intake, using:

- current Grookai repo law and existing JustTCG implementation reality
- official JustTCG documentation as the upstream source of truth

This audit does not authorize new writes. It defines what is already lawful, what is blocked, and the next smallest lawful step.

---

## 2. Current Repo Reality

### Active Grookai law

Current active contracts make JustTCG a non-canonical source.

- `JUSTTCG_DOMAIN_CONTRACT_V1` allows JustTCG only as a source-isolated market/pricing domain attached through `external_mappings(source='justtcg')`.
- `JUSTTCG_DIRECT_STRUCTURE_MAPPING_CONTRACT_V1` allows deterministic mapping promotion into `external_mappings` plus helper rows in `justtcg_set_mappings` and `justtcg_identity_overrides`.
- `JUSTTCG_REMAINING_MAPPING_CONTRACT_V1` allows additional deterministic bridge mapping, primarily via `tcgplayerId`, but still only into `external_mappings`.
- `JUSTTCG_CANONIZATION_PROPOSAL_V1` and `JUSTTCG_CANONIZATION_CONTRACT_V2` are both `DRAFT`. They are not active law.

### What JustTCG is currently allowed to do

- supply card/variant pricing data for already-mapped canonical rows
- populate `external_mappings(source='justtcg')`
- populate isolated JustTCG pricing tables
- support deterministic helper mapping through explicit Grookai-side helper tables

### What JustTCG is currently forbidden to do

- modify `card_prints`
- define canonical identity
- influence `gv_id`
- define canonical set identity
- auto-create canon rows
- bypass warehouse or founder-gated promotion when identity is ambiguous

### Real tables and workers that already exist

Repo reality already includes:

- `public.external_mappings`
- `public.justtcg_variants`
- `public.justtcg_variant_price_snapshots`
- `public.justtcg_variant_prices_latest`
- `public.justtcg_set_mappings`
- `public.justtcg_identity_overrides`

Existing workers/scripts already in use:

- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
- `backend/pricing/justtcg_variant_prices_latest_builder_v1.mjs`
- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`

### Storage/model surfaces that do not yet exist lawfully

These do not exist as active, lawful production surfaces today:

- a JustTCG raw catalog intake table
- a JustTCG raw warehouse candidate lane
- a JustTCG-driven canon creation lane
- an active contract that permits JustTCG to create or mutate canonical identity

### Repo note

`JUSTTCG_DOMAIN_SCHEMA_SPEC_V1` still describes the JustTCG domain as a proposed pre-migration shape, but repo reality has since implemented the pricing-domain tables and workers. For this audit, active contract boundaries and current code/migrations are the authoritative repo state.

---

## 3. Official JustTCG Source Shape

Official docs audited:

- `https://justtcg.com/docs`
- `https://justtcg.com/blog/small-update-big-difference-search-now-understands-card-numbers`
- `https://justtcg.com/supported-games`

### Core endpoints

Officially documented endpoints relevant to intake:

- `GET /games`
- `GET /sets`
- `GET /cards`
- `POST /cards` batch lookup

### `/games`

Useful fields:

- `id`
- `name`
- `cards_count`
- `variants_count`
- `sets_count`
- `last_updated`
- market summary fields such as `game_value_index_cents`

Grookai implication:

- useful for supported-game discovery and coarse upstream freshness tracking
- not sufficient for canonical identity on its own

### `/sets`

Official docs show:

- required `game` filter
- optional `q`
- `orderBy` supports `name` or `release_date`
- `order` supports `asc` / `desc`

Useful fields:

- `id`
- `name`
- `game_id`
- `game`
- `cards_count`
- `variants_count`
- `release_date`

Grookai implication:

- suitable for deterministic set catalog discovery
- suitable for set-by-set intake planning
- `set` is an upstream identifier, not Grookai canonical set authority

### `/cards`

Official docs show the endpoint supports:

- direct lookup by `tcgplayerId`
- direct lookup by `cardId`
- direct lookup by `variantId`
- direct lookup by `tcgplayerSkuId`
- search mode via `q`
- game/set-scoped retrieval
- `number`
- `updated_after`
- `include_null_prices`
- `condition`
- `printing`
- `include_price_history`
- `include_statistics`

Important documented behavior:

- identifier inputs take precedence over search inputs
- `updated_after` is compatible with most structured filters such as `game`, `set`, and `cardId`, but not with `q`
- `include_null_prices=true` includes cards without pricing, but is ignored when `q` is used

### Card object shape

Identity-relevant upstream fields:

- `id` (`cardId`)
- `name`
- `game`
- `set`
- `set_name`
- `number`
- `tcgplayerId`
- `rarity`
- `details`

Pricing/market fields live on `variants[]`, not the card root:

- `id` (`variantId`)
- `condition`
- `printing`
- `language`
- `tcgplayerSkuId`
- `price`
- `lastUpdated`
- `priceChange24hr`
- `priceChange7d`
- `avgPrice`
- `priceHistory`
- additional 30d/90d/1y/allTime statistics

### Pagination shape

Response format is offset-based and documented through:

- `meta.total`
- `meta.limit`
- `meta.offset`
- `meta.hasMore`

The official example for set-wide sync loops over `offset` until `meta.hasMore` is false.

### Batch support

`POST /cards` supports batch lookup using an array of lookup objects.

Official limits:

- Enterprise: up to `200`
- Starter / Pro: up to `100`
- Free: up to `20`

### Rate-limit and sync considerations

Official docs expose per-response usage metadata:

- `_metadata.apiRequestLimit`
- `_metadata.apiRequestsRemaining`
- `_metadata.apiDailyLimit`
- `_metadata.apiDailyRequestsRemaining`
- `_metadata.apiRateLimit`

Official docs also define `429` handling and recommend exponential backoff.

Official site marketing states the catalog is updated every `6 hours`.

### Breaking-change history relevant to stored IDs

Official changelog documents:

- `2025-07-01`: card IDs changed to include full game name
- `2025-07-11`: breaking card ID standardization completed; old stored card and variant IDs were invalidated
- `2025-09-30`: set IDs were standardized and `set_name` was added to the card object

Grookai implication:

- `cardId`, `variantId`, and upstream `set` IDs are useful external identifiers
- they must never become Grookai canonical identity authority

---

## 4. What JustTCG Can Lawfully Supply Today

Today, JustTCG can lawfully supply:

- deterministic external lookup inputs, especially `tcgplayerId`
- non-canonical set and card discovery metadata
- raw upstream structure for audit or warehouse review
- pricing and variant market data
- delta-friendly refresh signals through `updated_after`

Source facts vs Grookai decisions:

- Source fact: JustTCG can return game/set/card objects and variant market data.
- Grookai decision: only external mappings and pricing-domain rows are currently lawful write targets.

---

## 5. What JustTCG Cannot Lawfully Supply Today

Today, JustTCG cannot lawfully supply:

- canonical identity authority
- automatic `card_prints` creation
- canonical set truth
- `gv_id`
- final printed-identity decisions
- warehouse bypass for ambiguous or novel identities

Important boundary:

- `tcgplayerId` is the strongest automatic bridge input in current repo law
- it is still not a canonical identity authority by itself

---

## 6. Intake Feasibility

### Set-based raw intake

Feasibility: `YES`, as a source capability.

Why:

- `/sets` provides deterministic set discovery by game
- `/cards` supports structured game/set retrieval
- `include_null_prices=true` allows broader catalog coverage when not using `q`
- offset pagination with `meta.hasMore` is documented

### Delta sync

Feasibility: `YES`, as a source capability.

Why:

- `updated_after` is officially supported on both `GET /cards` and `POST /cards`
- it is explicitly intended for efficient delta synchronization workflows

### Candidate discovery

Feasibility: `YES`, but only as raw discovery input.

Why:

- game/set/number filters are deterministic
- `q` search is not safe as write authority
- `include_null_prices` is ignored when `q` is used, so structured filters are the safe discovery lane

### Deterministic normalization

Feasibility: `PARTIAL`.

Why:

- `game`, `set`, `set_name`, `number`, `name`, `rarity`, and `details` are useful normalization inputs
- those fields are often enough to build a warehouse candidate
- they are not enough to grant JustTCG direct canonical authority for printed identity boundaries such as stamps, promos, or other canonical deltas

---

## 7. Canonization Feasibility

Direct canonization from JustTCG is not lawful today.

Reasons:

- active Grookai contracts restrict JustTCG to mappings and pricing domain writes
- current active law does not authorize JustTCG-driven `card_prints` creation
- official upstream IDs have a documented breaking-change history
- variant market structure is explicitly separate from canonical identity
- ambiguity between market representation and Grookai canonical identity still requires warehouse or equivalent governed review

Conclusion:

- JustTCG is suitable as a discovery and enrichment source
- JustTCG is not currently suitable as a direct canonical authority

---

## 8. Required New Surfaces

For a lawful catalog intake lane beyond the current pricing/mapping domain, Grookai would need new active surfaces such as:

- an active contract authorizing read-only JustTCG raw intake for warehouse discovery
- a sanctioned raw storage or report surface for intake outputs
- explicit normalization rules from JustTCG card shape into warehouse candidate shape
- an active contract that defines whether any automatic promotion from JustTCG can ever occur

Notably, these are still missing today:

- active warehouse-facing JustTCG intake contract
- active JustTCG-to-warehouse storage contract
- active JustTCG canonization contract

---

## 9. Recommended Next Step

Selected next step:

**Build JustTCG raw intake audit script**

Why this is the smallest lawful next step:

- the source is suitable for structured set scans and delta sync
- current contracts do not yet authorize a write-bearing intake worker or canonization lane
- a read-only audit script can measure:
  - set coverage
  - candidate volume
  - normalization quality
  - unresolved identity classes
- that evidence can inform any later contract amendment without violating current law

Why not the other options:

- `Build JustTCG raw intake worker`: premature; it needs sanctioned storage and intake contract surfaces
- `Amend contracts first`: likely required later, but a read-only audit script can be done first without violating current law
- `Stop — source not suitable`: unsupported by evidence; the source is operationally suitable for raw discovery

---

## 10. Final Recommendation

JustTCG is a viable upstream source for **raw discovery and enrichment**, but not for direct canonization under current Grookai law.

The source shape is strong enough for:

- set-based intake audits
- delta sync experiments
- warehouse candidate discovery

The source shape is not sufficient to justify direct canon writes under current contracts.

**Final recommendation: Build JustTCG raw intake audit script.**
