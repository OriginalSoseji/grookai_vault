# Vendor custom-product CSV import V1

Status: local candidate; no production activation authority.

The desktop store workspace imports up to 100 custom collectible drafts from a
UTF-8 CSV of at most 1 MiB. Required columns are `title` and `available_quantity`.
Optional columns exactly match the existing custom product fields: description,
category, franchise, manufacturer, release_region, language, condition_description,
packaging_description, private_sku, and asking_price_amount. The template lists all
columns. Unknown/duplicate headers, malformed quoting, invalid numeric values and
field-limit violations reject the whole preview. Quoted multiline fields and a
UTF-8 BOM are supported. Every row creates a distinct product; SKU is private
context, never a unique match key or stock-reconciliation instruction.

The preview shows every row's title, quantity, price and private SKU, with expandable
remaining fields. Explicit confirmation precedes creation. Photos and sections are
added afterward through existing editors. No CSV field can supply publication,
currency, owner, store, catalog identity, media URLs or existing product IDs.
Incomplete descriptions/prices and zero quantity are valid private drafts.

## Atomic authority and recovery

`vendor_store_custom_import_v1` takes a batch UUID and bounded JSON rows. It derives
the owner from Auth and takes the existing owner advisory lock followed by the
store row lock. New products use `vendor_store_custom_mutate_v1` with null identity
and `save`, preserving that function's ownership, package, rollout, field and history
authority. A failing row rolls back every product and event from the batch.

`vendor_store_custom_imports` stores only the store/batch identity, SHA256 of the
immutable JSON payload, ordered created product IDs and timestamp. It does not
duplicate stock, prices, fields, photos or canonical inventory. The store/batch
primary key and shared lock serialize concurrent retries. A matching completed
request returns its original receipt; changed rows with that batch ID return 409.
Retry never reapplies edits, restores archived products or republishes anything.
Direct client inserts/updates/deletes are denied. Authenticated owner RLS permits
retained receipt reads, including after subscription downgrade. Anonymous reads
and execution are denied. New batches still require current store editing access.

The private `/account/store/import/{batchId}` URL preserves recovery identity.
Refresh reads the committed receipt. If no receipt exists, the owner can select
the original file and retry the same batch. An interrupted response is not evidence
of failure. The server independently reads the receipt after RPC success before
confirming completion. “Start a different import” deliberately creates a new batch;
the same file under a new batch creates additional drafts, never merges quantities.

The HTTP endpoint requires authentication, the configured same origin for POST,
JSON media type, bounded streamed bytes and exact request fields. It uses the
authenticated client rather than service credentials. Responses are private/no-store.
Authentication preserves the batch URL and exact imported-product editor destination.

## Schema and release

The additive migration is `20260919120000_vendor_custom_product_import_v1.sql`.
The two older storefront/billing migrations retain their exact hashes. All catalog
writers, printing authority and Vault ownership remain unchanged. New dependencies
still require the established production schema/fingerprint coordination gate.

The new isolated project is `grookai-custom-import-20260919` on 184xx ports. Preserve
all earlier projects. Read `docs/audits/vendor_custom_import_v1/PROOF.md` for actual
baseline, replay, API/browser and full-hook status; source existence alone is not
release proof. Import is inaccessible when the existing custom rollout is disabled.
Rollback retains import receipts, products, events and media; do not delete stock
or canonical data. This feature does not implement checkout, payments or payouts.
