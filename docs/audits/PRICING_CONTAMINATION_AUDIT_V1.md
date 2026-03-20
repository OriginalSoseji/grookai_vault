# PRICING_CONTAMINATION_AUDIT_V1

## Scope

This audit determines whether current persisted eBay-derived pricing in Grookai Vault shows evidence of contamination from unmapped, ambiguous, or weakly-mapped listings.

This is an audit-only artifact. No data was mutated. No workers, schema, or UI were changed.

Audit method:

- code-path inspection of the active Browse pricing worker and related mapping surfaces
- linked-project database reads against current live tables
- migration/schema inspection to confirm which columns and constraints actually exist

Important limit:

- the active canonical eBay pricing tables persist card-print–level aggregates, not listing-level identities
- because of that, some contamination checks are provable and some are not

## Mapping Path Analysis

Current active Browse pricing path is defined in `backend/pricing/ebay_browse_prices_worker.mjs`.

Proven path:

1. `updatePricingForCardPrint(...)` in `backend/pricing/ebay_browse_prices_worker.mjs` requires an existing canonical `card_print_id`.
2. It loads that card from `card_prints`.
3. `buildSearchQueryForPrint(...)` builds an eBay query from canonical fields:
   - `name`
   - `set_name` / `set_code`
   - collector number via `buildNumberDescriptor(...)`
   - rarity hints for some secrets
4. `searchActiveListings(...)` in `backend/clients/ebay_browse_client.mjs` fetches listing summaries.
5. `fetchItemDetails(...)` in the same client fetches per-item details.
6. `categorizeListing(...)` in `backend/pricing/ebay_browse_prices_worker.mjs` filters and buckets listings.
7. Accepted listings are aggregated and written directly to:
   - `ebay_active_price_snapshots`
   - `ebay_active_prices_latest`
   - `card_print_price_curves`

What this means:

- there is no listing-level join through `external_mappings` in the active Browse pricing path
- there is no `external_id -> card_print_id` mapping step for accepted Browse listings
- the effective mapping is implicit: the job starts from a canonical `card_print_id`, then trusts the search query plus listing heuristics

Mapping strictness classification: PARTIAL

Why PARTIAL instead of STRICT:

- strict input exists at the job boundary because the worker starts from a canonical `card_print_id`
- strict listing-level external mapping does not exist in this path
- there is no name-only fallback for acceptance
- but there is heuristic acceptance via `categorizeListing(...)`, including `unknown_as_lp` when a listing looks like the correct set and collector number but lacks an explicit condition match

Unmatched behavior:

- unmatched / rejected Browse listings are dropped in-memory by `categorizeListing(...)`
- the active Browse worker does not write rejected listings to `unmatched_price_rows`
- repo search found no `external_mappings` or `unmatched_price_rows` writes inside `backend/pricing/ebay_browse_prices_worker.mjs`

## Data Audit Results

### Unmapped Rows

Direct query A from the prompt cannot be executed as written against `ebay_active_price_snapshots`, because that table does not contain `external_id`.

Schema proof:

- `public.ebay_active_price_snapshots` in `supabase/migrations/20251213153625_baseline_init.sql` stores:
  - `card_print_id`
  - `source`
  - `captured_at`
  - aggregated price fields
  - sample counts
- it does not store `external_id`, `title`, or per-listing price rows

Live data results:

- `external_mappings where source = 'ebay'`: `0`
- `ebay_active_price_snapshots` rows: `1423`
- `ebay_active_prices_latest` rows: `1286`
- `card_print_active_prices` rows with `listing_count > 0`: `1126`

Interpretation:

- current persisted canonical eBay pricing is not anchored by any explicit eBay `external_mappings` rows
- that does not prove contamination by itself
- it does prove there is no listing-level mapping audit trail in the active canonical lane

### Multi-Mapped Listings

Direct collision check on `external_mappings` for `source = 'ebay'` returned no collisions.

Live data result:

- `external_mappings where source = 'ebay'`: `0`
- multi-mapped eBay external IDs: `0`

Constraint proof:

- `external_mappings` has unique constraint `external_mappings_source_external_id_key` on `(source, external_id)` in `supabase/migrations/20251213153630_baseline_constraints.sql`

Interpretation:

- collision risk through `external_mappings` is not currently visible because there are no live eBay mapping rows at all
- that is architectural weakness, not evidence of current collision contamination

### Cross-Print Usage

Direct query A from the prompt for "same listing used across multiple card_print_ids" cannot be executed against the active canonical snapshot tables, because those tables do not persist listing external IDs.

Live data evidence:

- most recent `card_print_price_curves.raw_json` keys were:
  - `card_print_id`
  - medians / floors
  - confidence
  - listing counts
  - raw sample counts
- no listing IDs, titles, or item payloads were present

- most recent `ebay_active_price_snapshots` row contained only:
  - `id`
  - `card_print_id`
  - `source`
  - `captured_at`
  - aggregate price fields
  - sample counts

Interpretation:

- current canonical active-price storage cannot prove whether the same eBay listing was ever reused across multiple `card_print_id`s
- absence of evidence here is not proof of cleanliness

Additional anomaly scan performed on available historical aggregates:

- historical snapshot rows: `1423`
- distinct priced prints in snapshot history: `1286`
- distinct prints with greater-than-10x historical median swings: `2`
  - `Charizard`, `base1`, `#4`
  - `Pikachu`, `bw1`, `#115`

These are anomaly signals from aggregate history, not direct proof of cross-card contamination.

### Weak Signal Listings

Direct weak-title query from the prompt cannot be executed against `ebay_active_price_snapshots`, because the active canonical snapshot table does not store `title`.

Code-path proof of weak-signal acceptance:

- `categorizeListing(...)` rejects clear mismatches such as:
  - wrong collector number
  - wrong set
  - wrong language
  - lots / sealed / proxy / graded
- but if a listing appears to match the set and collector number and has no explicit condition match, it still accepts the listing via:
  - `return pushBucket('lp', 'unknown_as_lp');`

Live data guardrail result:

- active priced prints checked for weak canonical identity (`set_code is null or number_plain is null`): `0 / 1126`
- snapshot-history prints checked for weak canonical identity: `0 / 1286`

Interpretation:

- active canonical prices are at least attached to strongly identified `card_prints`
- but listing-level acceptance still includes a heuristic weak-signal path

## Code Path Analysis

Active Browse pricing code is not externally mapped. It is query-and-filter based.

Evidence:

- `backend/pricing/ebay_browse_prices_worker.mjs::updatePricingForCardPrint(...)`
- `backend/pricing/ebay_browse_prices_worker.mjs::buildSearchQueryForPrint(...)`
- `backend/pricing/ebay_browse_prices_worker.mjs::categorizeListing(...)`
- `backend/pricing/ebay_browse_prices_worker.mjs::writeV3SnapshotToDB(...)`

Code-path classification: PARTIAL

Why:

- canonical print identity is required before the worker starts
- accepted listings are filtered against set and collector number signals
- unmatched listings are dropped
- but there is no explicit eBay listing mapping, no persisted rejected-listing staging in this path, and no persisted listing-level audit trail

Adjacent eBay ingestion surfaces remain looser in code:

- `backend/ebay/ebay_self_orders_worker.mjs` inserts `price_observations` with `print_id: null`
- `backend/ebay/ebay_sellers_sync_worker.mjs` inserts `price_observations` with `card_print_id: null`

Live data result for those adjacent tables:

- `price_observations` total rows: `0`
- `price_observations` rows with `marketplace_id = 'EBAY_US' and print_id is null`: `0`

Interpretation:

- those looser ingestion paths are present in code
- there is no live evidence that they have already contaminated persisted observations in the current linked project

## Contamination Signals

Proven contamination:

- none found in the currently persisted canonical active-price tables

Proven absence of contamination:

- none; the active canonical tables do not persist enough listing-level identity to prove cleanliness

Proven risk signals:

1. No explicit eBay external mapping is present.
   - Live result: `external_mappings(source='ebay') = 0`

2. Canonical active-price tables persist only aggregates, not listing identities.
   - Proven from `ebay_active_price_snapshots` schema and `card_print_price_curves.raw_json` shape

3. The active worker contains a heuristic weak-signal acceptance branch.
   - Proven by `unknown_as_lp` in `categorizeListing(...)`

4. Unmatched staging is not being used by the active Browse pricing path.
   - Live result: `unmatched_price_rows = 2`, both manual smoke-test rows with `reason = 'unknown_source_id'`
   - no evidence of active eBay Browse staging rows

5. Aggregate anomaly signals exist in a small number of prints.
   - Live result: `2 / 1286` distinct priced prints showed greater-than-10x historical median swings

## Quantitative Summary

- Live `ebay_active_price_snapshots` rows: `1423`
- Live `ebay_active_prices_latest` rows: `1286`
- Live `card_print_active_prices` rows with `listing_count > 0`: `1126`
- Live `card_print_price_curves` rows: `1409`
- Live `external_mappings(source='ebay')`: `0`
- Live multi-mapped eBay external IDs: `0`
- Active priced prints with weak canonical identity: `0 / 1126` (`0%`)
- Snapshot-history prints with weak canonical identity: `0 / 1286` (`0%`)
- Distinct priced prints with greater-than-10x historical median swings: `2 / 1286` (`0.16%`)
- Live `price_observations` rows: `0`
- Live `unmatched_price_rows`: `2`, both manual smoke-test rows

What cannot be honestly quantified from current persisted canonical data:

- percent of accepted listings with no explicit mapping
- percent of listings reused across multiple `card_print_id`s
- count of weak-title listings actually used in persisted canonical pricing

Reason:

- the active canonical eBay pricing tables do not retain listing-level `external_id`, title, or item payloads

## System State Classification

AT RISK

Why:

- there is no direct evidence that current canonical active pricing has already been cross-card contaminated
- but there is also no explicit listing-level eBay mapping and no persisted listing-level audit trail that could prove the current prices are clean
- the active worker uses implicit query-and-filter attachment plus a heuristic `unknown_as_lp` path

This is not CLEAN.

This is not CONTAMINATED based on current evidence.

It is AT RISK because cleanliness cannot be proven from current persisted canonical data.

## Root Cause (if any)

Root cause of current audit risk:

- the active Browse pricing path is canonical at the job boundary, but implicit at the listing boundary
- accepted listings are not tied to canonical prints through persisted eBay external mappings
- accepted and rejected Browse listings are not stored in a durable auditable staging lane before aggregation

Repo evidence:

- `backend/pricing/ebay_browse_prices_worker.mjs`
- `backend/clients/ebay_browse_client.mjs`
- `supabase/migrations/20251213153625_baseline_init.sql`
- live linked-project counts showing `external_mappings(source='ebay') = 0`

## Risk Level

HIGH

Why:

- broader eBay connection would increase volume through the same implicit listing-attachment model
- the current canonical tables do not retain enough evidence to verify or disprove contamination after the fact
- current live data is therefore operationally usable but not contamination-auditable

## Next Required Action (do NOT fix, just state)

Before broader eBay connection, Grookai needs one authoritative, auditable mapping-first boundary for eBay-derived pricing inputs.

At minimum, the next action should establish whether accepted Browse listings are going to be:

- explicitly mapped to canonical identity before canonical price persistence
- or durably staged with listing-level identifiers and rejection reasons so contamination can be audited later

Until that boundary exists, current raw pricing should be treated as operationally useful but not provably clean.
