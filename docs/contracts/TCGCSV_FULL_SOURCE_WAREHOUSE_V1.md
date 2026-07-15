# TCGCSV Full Source Warehouse V1

## Purpose

Mirror TCGCSV broadly as internal source evidence:

- current TCGplayer categories, groups, products, and prices;
- historical daily price archives from February 8, 2024 onward;
- source disappearance state without deleting products;
- artifact metadata sufficient to prove which source payload produced each row.

This warehouse is not Grookai product truth and is not Grookai Value.

## Source Boundary

TCGCSV exposes TCGplayer cached data across categories, not only Pokemon. The full warehouse ingests all non-empty categories by default and skips TCGCSV-documented empty categories `9, 10, 12, 14, 21, 55, 69, 70` unless explicitly overridden.

The existing Pokemon-mapped `tcgcsv_reference` lane remains unchanged. That lane creates card-print-linked reference candidates. This warehouse is a broader source mirror for future classification and promotion.

## Tables

- `tcgcsv_source_sync_runs`: mutable run row for a sync/backfill execution, with status, provenance, parser versions, counts, artifact root, and errors.
- `tcgcsv_source_artifacts`: immutable artifact metadata: URL, local path, SHA-256, byte size, fetched timestamp, HTTP status, headers, run ID, category/group/date context.
- `tcgcsv_source_categories`: latest source category dimension with `first_seen_at`, `last_seen_at`, `last_seen_run_id`, `source_active`, and `source_missing_since`.
- `tcgcsv_source_groups`: latest source group dimension with the same disappearance fields.
- `tcgcsv_source_products`: latest source product dimension. Historical archive-only products are inserted as placeholders with `catalog_metadata_status = 'historical_price_only'`.
- `tcgcsv_source_price_daily_observations`: one wide daily price fact per `source_price_row_identity + observed_on`.
- `tcgcsv_source_group_fetch_status`: per-run fetch status for resumability and failure isolation.

All tables have RLS enabled and are service-role-only. No anon or authenticated client access is granted.

## Price Identity and History

TCGCSV documents that `productId` is not safe as a price primary key and must be combined with `subTypeName`. V1 therefore defines:

```text
source_price_row_identity = tcgplayer:<productId>:<normalized subTypeName>
```

The daily fact table is wide:

```text
source_price_row_identity
product_id
subtype_name
observed_on
low_price
mid_price
high_price
market_price
direct_low_price
raw_payload
source_archive_path
```

Same-day reruns update the same daily row to correct or complete that day's ingestion while preserving `first_observed_at`, `last_observed_at`, `first_seen_run_id`, and `last_seen_run_id`. A new calendar day creates a new observation row.

## Current Sync

The current sync checks `last-updated.txt` as an optimization, not as sole truth. Operators can force a run with `--force` / `--ignore-last-updated`.

Current sync behavior:

1. Fetch `last-updated.txt`.
2. Fetch categories.
3. Fetch groups for each non-empty category.
4. Fetch products and prices for each group.
5. Upsert latest category/group/product dimensions.
6. Upsert current-day price observations.
7. If the run is complete, mark dimensions not seen in the run as `missing_from_latest_source`; never delete them.

## Historical Backfill

TCGCSV historical archives are date-addressable:

```text
https://tcgcsv.com/archive/tcgplayer/prices-YYYY-MM-DD.ppmd.7z
```

The archive starts at `2024-02-08`. Historical backfill extracts price files and writes daily price facts. It does not require historical product metadata to exist. Missing product dimensions are preserved with `catalog_metadata_status = 'historical_price_only'`.

## Operational Statuses

Run status values:

- `planned`
- `running`
- `partial_success`
- `completed`
- `failed`
- `aborted_request_ceiling`
- `skipped_no_change`

A run with some failed categories/groups is `partial_success`, not `completed`.

## Safety Rules

- Dry-run is the default.
- `--apply` is required for database writes.
- Request ceiling defaults to `10,000`.
- Request delay defaults to `100ms`.
- Every request uses a Grookai-specific User-Agent.
- Historical extraction requires 7zip.
- No writes to `pricing_observations`, `ebay_active_prices_latest`, public pricing views, identity tables, vault tables, images, or storage.

## Rollback

Disable the timer or stop running the worker. The warehouse tables are isolated and service-role-only. No public or app-facing pricing path depends on them.
