# Market Listing Warehouse V2

Status: candidate

Date: 2026-08-03

## Objective

Acquire active market listings broadly before exact canonical assignment. Preserve raw singles, graded singles, sealed products, lots/bundles, accessories, and unresolved listings as warehouse evidence without treating any listing as published market truth.

## Governing Flow

```text
provider listing
  -> immutable raw warehouse evidence
  -> product-kind and packaging classification
  -> downstream canonical assignment
  -> qualification and review
  -> governed pricing publication
```

Acquisition must not require an exact `card_print_id` or `card_printing_id`. Exact printing assignment is a later stage.

## Product Dimensions

`product_kind` and `packaging_state` are independent.

Allowed V2 product kinds:

- `raw_single`
- `graded_single`
- `sealed_product`
- `lot_or_bundle`
- `accessory`
- `unknown`

Packaging state includes:

- `sealed`
- `not_observed`

Examples:

- A factory-sealed promo card is `raw_single` with `packaging_state=sealed`.
- A PSA card is `graded_single`.
- An Elite Trainer Box or booster box is `sealed_product` with `packaging_state=sealed`.
- `pack fresh` does not prove sealed packaging.

## Assignment Domains

- `raw_single` and `graded_single` may later resolve to a card printing.
- `graded_single` additionally requires grader, grade, and certification dimensions when evidence exists.
- `sealed_product` requires a separate sealed-product canonical identity. It must never be attached directly to a card printing merely because the title contains a card or set name.
- lots, accessories, and unknown listings remain unassigned until a governed resolver exists.

All warehouse-first observations must carry:

```json
{
  "canonical_assignment_status": "deferred",
  "pricing_publication_eligible": false
}
```

## Provider Category Governance

Provider category IDs are versioned routing evidence, not canonical identity.

- The acquisition request must use the category IDs stored in its frozen request plan.
- No fetch adapter may hardcode the individual-card category.
- Raw and graded discovery may share the provider individual-card category when provider condition/title evidence separates them.
- Sealed acquisition requires category IDs selected from a frozen official provider taxonomy artifact.
- A category route cannot activate until its category tree version, category IDs, names, provenance, and review decision are recorded.
- Category changes require a new registry fingerprint.

The official eBay Taxonomy API is the authority for category-tree discovery. See the [eBay Taxonomy API overview](https://developer.ebay.com/api-docs/commerce/taxonomy/static/overview.html) and [Browse category guidance](https://developer.ebay.com/api-docs/user-guides/static/make-a-call/bb-categories.html).

## Acquisition Policy

The planner creates provider-category shelf requests for raw, graded, and sealed product families. It does not create exact-printing requests during broad discovery.

Scheduling order:

1. Satisfy configured minimum call floors for each product family.
2. Cover first pages across all frozen set/product families.
3. Spend remaining calls adaptively on non-exhausted lanes with the best observed unique yield.
4. Stop query families from provider totals, short final pages, or repeated-page evidence.

Minimums are coverage floors, not permanent percentages. Unused capacity spills to valid remaining lanes.

## Warehouse Contract

The existing internal `market_listing_*` tables remain the storage target for this gate. No migration is required because normalized classification and routing evidence are retained in query JSON and price-event payloads while raw provider payloads remain immutable.

The V2 warehouse plan may propose rows only for:

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_price_events`

It must propose zero rows for:

- `market_listing_card_candidates`
- `market_listing_rollups`
- public pricing tables/views
- identity tables

The guarded apply wrapper is dry-run/preflight by default. A real append-only apply additionally requires `--apply`, `MEE_WAREHOUSE_V2_ALLOW_APPLY=1`, a valid V2 plan, matching row hashes, and the existing idempotent warehouse writer. This gate does not authorize a database apply by itself.

## Publication Boundary

Warehouse acceptance does not authorize pricing display.

- Sealed products and lots cannot enter the current TCGPlayer raw-single Product V1 read model.
- Graded evidence remains separate from ungraded raw-single evidence.
- Existing publication policy continues to require exact canonical, language, finish, freshness, and ambiguity checks.
- No V2 acquisition artifact may write app-visible pricing.

## Operational Artifacts

Every live run must preserve:

- frozen provider category registry
- category tree version and registry fingerprint
- frozen acquisition plan and request manifest
- request results
- skipped requests
- raw snapshots
- projected observations
- product-kind and packaging counts
- local backfill plan and hashes
- reconciliation report

## Hard Stops

Stop before provider calls when:

- the sealed route lacks reviewed taxonomy provenance;
- any category route is empty;
- the plan contains a card-print or printing target;
- provider or database boundaries differ from this contract;
- product-family minimums exceed the call ceiling.

Stop after fetching when:

- artifact manifests disagree;
- a product kind or packaging claim lacks evidence;
- a database migration or identity write would be required;
- provider errors exceed the approved canary threshold.

## Current Gate

V2 code and offline replay may proceed without database writes. Production activation requires:

1. official taxonomy discovery;
2. reviewed sealed category route;
3. bounded provider canary;
4. artifact reconciliation;
5. separate approval for warehouse apply;
6. downstream assignment design for sealed-product identities.
