# VENDOR_CUSTOM_COLLECTIBLES_V1

Status: active implementation contract, local candidate only. Extends
`VENDOR_STOREFRONTS_V1`; no release or entitlement activation authority.

## Identity and stock authority

Custom collectibles are seller-authored store records with stable UUIDs. Their
route is `/store/{frozen-store-slug}/products/{product-uuid}`. They never acquire
GV-IDs, GVVIs, canonical cards/printings/sets, market prices, or inferred matches.
There is no conversion from a Vault copy, especially an ineligible or quarantined
copy. Existing catalog stock remains exact physical Vault instances and links to
`/gvvi/{GVVI}`. No canonical or ownership writer changes are authorized.

`vendor_store_custom_products` is the sole authority for custom asking price and
vendor-reported availability. Quantity is an integer from 0 through 1,000,000;
this is neither verified stock nor a sale/payment/ownership-transfer ledger.
`vendor_store_custom_product_events` retains immutable client-inaccessible
version snapshots, including selected sections at product edit time. Archive
retains records and history. There is no restore, matching, association, variant
matrix, checkout, or reservation workflow in V1.

The existing provisional warehouse handles catalog review/admission, explicitly
excluding ownership and pricing. The governed owned-collectible contract requires
an existing card/slab/sealed anchor and exact-copy identity. Neither can represent
seller-authored quantity listings without breaking those boundaries; this is why
the separate presentation/product tables are necessary.

## Authoring and publication

One existing store per account remains authoritative. Incomplete drafts are legal.
Publishing requires nonblank title and description, at least one uploaded photo,
positive asking price, positive quantity, and permitted profile/sharing state.
Custom currency is the store's `custom_currency`, constrained to USD in V1;
clients cannot supply or override currency. Existing catalog currencies are intact.
Price is 0 through 99,999,999.99, with at most two fractional digits; zero/null
is draft-only. Title max 120, description 4,000, category/franchise/region/language
80, manufacturer 120, condition/packaging 500, private SKU 80 characters.

All writes use `vendor_store_custom_mutate_v1`. Existing products require the
expected bigint version. Owner advisory lock, store lock, then product row lock
serialize publication and stock edits; a stale version raises SQLSTATE `PT409`
and HTTP 409. No silent last-writer-wins overwrite. The native editor preserves
unsaved text on failure and explicitly confirms discarding it before reload.

Creation, upload, sections, price/quantity edits and upgrades never turn publication
on. Saving a complete published product may update its public details. Invalidating
required fields, removing every photo, zero stock, archive or unpublish turns it
off. Restocking or repairing required fields requires explicit republishing.
Publishing a product does not publish its store: the product becomes visible only
in already explicitly published, entitled store destinations.

Database `store_app`/`store_web` capabilities, store publication, sharing/privacy,
and existing rollout gates apply on every public read. Environment grants cannot
authorize these records. Loss of `store_app` suspends custom product publication
durably; re-upgrade restores neither store nor product publication. A web-to-app
downgrade retains in-app listings but clears web publication until explicit
republishing. Owners retain management, preview, unpublish and archive access.
Preview is owner-only and does not require a public web grant.

## Sections and shared projection

`vendor_store_custom_product_sections` references both `(store_id,product_id)` and
the existing `(store_id,section_id)` selection. Mutations reject foreign, inactive
or unselected sections. Custom entries never enter card-only Wall memberships.
Removing a store section removes its custom membership references, not products.
Catalog section contents retain the selected-copy/Wall-membership intersection.

`vendor_store_read_v2` returns `VENDOR_STORE_V2`, consumed by app and web with
discriminators `catalog_copy` and `custom_product`. V1 remains available for
compatibility. V2 reuses V1 audience authority and the unchanged exact-copy
eligibility function, including the quarantine-aware public printing boundary.
It emits separate GVVIs even for sibling card copies.

Rows/counts are filtered before deterministic `(entry_type,id)` pagination:
default 40, max 100, offset 0–100,000. Search max 120 is case-insensitive literal
substring matching; custom search covers public title, description, category,
franchise and manufacturer, never private SKU. Types: all, catalog, custom, raw,
slab. Catalog condition filters apply only to catalog entries; custom free-text
condition claims are not normalized grades. Selected-section filters span both
types. Complete drafts may appear in owner grid preview; incomplete and archived
products remain in separate owner management and individual owner preview.

Public custom fields are explicitly enumerated in SQL. Owner IDs, private SKUs,
versions, publication internals and storage paths are excluded. A product exposes
only its own attached photo filenames; clients use guarded media routes. Generic
page metadata does not disclose drafts. Seller text is plain escaped text; detail
views say “Seller-provided details” without authenticity, licensing, verified
printing, or Grookai market-value assertions.

## Photos, navigation and rollback

Reuse private `vendor-store-media` at
`{storeUUID}/products/{productUUID}/{objectUUID}.{jpg|png|webp}`. Up to eight ordered
photos, 5 MB each, accepted JPEG/PNG/WebP. Storage insertion requires current
owner, product/store binding, store_app and app/custom rollout. Attachment checks
object existence and exact product scope; arbitrary external URLs and another
vendor's assets are not accepted. Reordering/removal increments the product version.
Removed/orphaned bytes remain private; garbage collection is separate work.

Public, authenticated app and owner-preview media endpoints have fixed audiences.
They re-resolve current product/store eligibility and current attachment before
streaming private bytes, with `private, no-store`, `nosniff` and restrictive CSP.
No signed public URLs are minted. Errors use an honest unavailable-photo display.
Owner storage reads retain the existing owner-only policy.

Web login and native pending routes preserve the entire custom destination and
preview query. Store referral context is reused and derived server-side; no custom
vendor identifier is accepted. Existing QR identities, signup ledger and credit
rules remain unchanged. Cross-device/deferred-install attribution is unsupported.

The base additive migration is `20260918070000_vendor_custom_collectibles_v1.sql`.
`20260918100000_vendor_custom_collectible_conflict_status_v1.sql` replaces only
the stale-edit SQLSTATE with `PT409`, returning HTTP 409 without transient retries.
`vendor_store_rollout.custom_enabled` defaults false. Separately authorized rollback
sets it false: public custom grids/details/media and new edits stop, catalog stores
continue, retained owner inspection/unpublish/archive remains possible. Retain
tables, snapshots, private photos and stock data. Re-enabling this operational
switch restores otherwise eligible explicitly published products; subscription
re-upgrade still requires explicit republishing. Never delete Vault or canonical
data as rollback. Full isolated Supabase replay and real Auth/Storage passed; see
`../audits/vendor_storefront_supabase_v1/LOCAL_SUPABASE_PROOF_20260918.md`.
Physical Android password login, refresh and pending store/product routes passed
through the full Dart app; see `../audits/vendor_storefront_native_auth_v1/NATIVE_AUTH_PROOF_20260918.md`.
Provider/cold-process links, iOS and coordinated schema/navigation integration
remain separate release checks.
