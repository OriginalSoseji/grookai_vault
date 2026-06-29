# Market Listing Nightly Ingest V1

Status: candidate

Date: 2026-06-26

## Objective

Run one bounded overnight Market Evidence Engine listing cycle with a single approval, using the existing internal `market_listing_*` warehouse and the strict-filtered review pipeline.

This contract exists to replace repeated micro-approvals for normal nightly pricing evidence acquisition while keeping dangerous actions explicitly blocked.

## Core Principle

Nightly listing ingestion may collect and organize evidence. It must not publish market truth.

The nightly job can fetch active listing evidence, store it internally, attach it to likely Grookai card identities, and compute internal review-only rollups. It cannot create public pricing, write app-visible pricing, mutate canon, or rewrite user/vault/image data.

## Allowed In One Approved Nightly Run

The approved run may:

- Execute a bounded `ebay_active` Browse API acquisition using the configured call ceiling.
- Write local acquisition and audit artifacts under `docs/audits/market_evidence_engine_v1`.
- Insert one acquisition run row into `market_listing_acquisition_runs`.
- Insert related rows into:
  - `market_listing_query_cache`
  - `market_listing_raw_snapshots`
  - `market_listing_observations`
  - `market_listing_seller_snapshots`
  - `market_listing_price_events`
  - `market_listing_card_candidates`
  - `market_listing_rollups`
- Keep raw-single and slab evidence separated.
- Attach candidates and rollups to `card_print_id` and `gv_id` when the acquisition target is known.
- Apply strict title evidence filtering before rollup medians are calculated.
- Mark all generated candidates and rollups as review-only:
  - `needs_review = true`
  - `can_publish_price_directly = false`
  - `publishable = false`
  - `app_visible = false`
  - `market_truth = false`
- Generate a final morning report with counts, failures, coverage, bucket summaries, and next recommended actions.

## Required Pipeline Order

1. Preflight environment, schema, contract version, and API budget.
2. Build or load the prioritized acquisition batch.
3. Fetch provider data into local artifacts.
4. Validate and classify listings as `raw_single`, `slab`, or `excluded_or_ambiguous`.
5. Insert internal warehouse rows.
6. Build review-only card candidates.
7. Apply strict title evidence filtering.
8. Compute strict-filtered internal rollups from passing listing rows only.
9. Produce a final readback and morning report.

## Strict Filtering Rule

Rollup medians must be calculated after listing-level filtering.

The job must not calculate a median from contaminated listings and then merely flag the parent rollup. Bad listing rows must be excluded from the rollup input first.

High-risk lanes require stricter title evidence:

- Base Set 1st Edition must include an acceptable first-edition title token.
- Base Set Shadowless must include a shadowless title token.
- Base Set 1999-2000 must include a 1999-2000 or fourth-print title token.
- Base print-run lanes must include Base Set context and exact printed number evidence.
- Titles with lot, bulk, choose-a-card, playset, or foreign-language noise must be excluded from rollup medians unless a later reviewed exception contract allows them.

## Hard Stops

The job must stop before writing further rows if any of these occur:

- Missing or incompatible `market_listing_*` schema.
- Provider/API error rate exceeds the configured ceiling.
- API call ceiling would be exceeded.
- Row-count drift outside the planned tolerance.
- Strict filtering code is unavailable.
- Generated candidate or rollup rows would become app-visible or publishable.
- Any write outside the allowed `market_listing_*` tables is required.
- A migration is required.
- A delete outside same-run repair is required.
- A public pricing view change is required.

## Explicitly Out Of Scope

Not allowed in this contract:

- Public pricing views.
- App-visible pricing.
- `pricing_observations` writes.
- `ebay_active_prices_latest` writes.
- JustTCG-derived public pricing.
- Price rollups exposed to users.
- Identity-table writes.
- `card_prints` or `card_printings` writes.
- Vault/user data writes.
- Image/storage writes.
- Migrations.
- Deletes outside exact same-run repair cleanup in `market_listing_*`.
- Global apply.
- Merges or deploys.
- Sold/completed eBay pricing claims.

## Same-Run Repair Allowance

If a nightly run partially writes rows and then fails, the repair allowance is limited to rows created by the same run key inside `market_listing_*`.

Repairs may:

- complete missing same-run rows,
- skip exact duplicates,
- sanitize values that violate existing warehouse constraints when the sanitized value is explicitly non-pricing authority metadata.

Repairs may not:

- delete historical rows from prior runs,
- rewrite prior run medians,
- publish pricing,
- touch non-`market_listing_*` tables.

## Approval Text Template

Use this single approval for a bounded run:

```text
Approve real MARKET-LISTING-NIGHTLY-INGEST-V1 run only. Contract hash: {contract_hash}. Scope: run one bounded overnight Market Listing ingestion cycle using existing approved market_listing_* warehouse schema only. Allow up to {call_ceiling} ebay_active Browse API calls, local acquisition artifacts, warehouse inserts into market_listing_acquisition_runs, market_listing_query_cache, market_listing_raw_snapshots, market_listing_observations, market_listing_seller_snapshots, market_listing_price_events, review-only market_listing_card_candidates, and internal-only market_listing_rollups. Keep raw_single and slab lanes separated. Apply strict title evidence filtering before rollup medians are calculated. Keep all candidates and rollups needs_review=true, publishable=false, app_visible=false, market_truth=false, and can_publish_price_directly=false where applicable. No public pricing views. No app-visible pricing. No pricing_observations writes. No ebay_active_prices_latest writes. No JustTCG public pricing. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No migrations. No deletes except exact same-run market_listing_* repair cleanup. No merges. No global apply. Produce final audit report before stopping.
```

## Morning Report Requirements

The final report must include:

- contract name and hash
- run key
- call ceiling and consumed call count
- provider error count
- raw listing count
- raw-single count
- slab count
- excluded/ambiguous count
- candidate row count
- strict title passed/excluded count
- strict-filtered rollup count
- review-ready count
- needs-more-evidence count
- top contamination reasons
- schema/write boundary confirmation
- artifact paths
- recommended next step

