# Vendor Storefront Desktop Management V1

Status: implemented and locally tested candidate; no release authority.

## Purpose and access

`/account/store` is the signed-in owner workspace for the existing browse-only
storefront and custom collectible contracts. Account and the desktop account menu
link to it. Authentication preserves the destination. One account owns one store.

Desktop authoring requires the active database `store_app` capability and app
rollout flag. This includes owners with the app-only package: the package controls
publication destinations, not which device can manage inventory. `store_web` and
the web rollout flag additionally gate public web publication. Client flags cannot
grant either capability. Retained owner inspection, unpublication and removal use
the existing governed exceptions after downgrade. Packages are not billable here.

## Owner workflow

- Save store identity and a normalized, unique slug as a private draft. The slug
  freezes after first publication; branding is separate from collector assets.
- Find/add catalog cards and import through existing website tools. Edit exact-copy
  price, condition, intent and printing through `/vault/gvvi/{GVVI}`. The desktop
  storefront must not duplicate these writers or infer missing printing identity.
- Explicitly select eligible exact copies; retain distinct sibling rows and display
  owner-only exclusion reasons. Search/filter and pagination use the shared owner
  projection. Remember applied filters while switching workspace tabs.
- Create custom drafts with seller-described metadata, price, quantity and private
  SKU. Upload/reorder/remove photos and assign selected existing Wall sections.
  SKU remains owner-only. Store sections never enroll additional copies implicitly.
- Preview privately, then explicitly publish products and app/web store destinations.
  Creating a section uses existing Wall behavior, disclosed before the action; the
  section remains unselected for the store until explicitly chosen.
- Quantity zero, invalid required fields or no photos unpublish custom products.
  Restock and package upgrades do not republish. Archive retains history.

All mutations use existing owner APIs/RPCs and database authorization. Product
mutations include their expected version; a conflict preserves unsaved form values.
Reloading, switching workspace tabs or following same-tab website links from a
dirty editor requires an explicit discard choice. Browser history within an existing
client-side route history is not universally blocked; no autosave is claimed. Published
product edits and publication changes require explicit confirmation. Existing Vault
ownership and storefront eligibility remain authoritative on every uncached read.

## Private manual transaction history

The owner store inventory also provides an inline Mark sold dialog for each
physical copy. It calls the same server action as the exact-copy page, with an
explicit actual USD sale price and optional buyer label, followed by confirmation.
A successful receipt removes that copy from the displayed inventory immediately;
refresh failure does not turn a recorded sale into another write. An uncertain
response retains the original details for identical receipt recovery. The action
remains available for retained owner inventory after loss of store editing access.
It does not extend manager grants or record sales of custom-product quantities.

The exact-copy owner page records off-platform sales and trades through the existing
authenticated disposition V2 RPC. Actual amounts and private partner details are
owner-entered; they never establish payment verification or recipient ownership.
Archived copies retain their private receipts, with public eligibility unchanged.

`/vault/transactions` is available from the Vault, store workspace and copy receipt.
It derives the owner from server authentication and reads through that user's RLS
client, with an additional owner predicate. No package grant is required to inspect
retained history. Search supports copy ID or partner name, plus sale/trade filters.
Pages contain at most 30 separate receipts, sorted by timestamp and ID; cursors
preserve database microseconds and validate both fields before query construction.
Errors remain distinct from empty results. Authentication retains the safe filtered
destination. History pages are dynamic and excluded from search indexing.

Proof: `docs/audits/vendor_desktop_disposition_v1/PROOF.md` and
`HISTORY_PROOF.md` in that directory. No schema or online-payment boundary changes.

## Browser media boundary

`/api/stores/owner/media` uses authenticated user clients and RLS, never service
credentials. POST requires the configured same origin, active editing capability,
store ownership and (for custom photos) an owned, active product and custom rollout.
Both actual request bytes and declared length are capped at 6 MiB; files are capped
at 5 MiB and must have JPEG/PNG/WebP signatures. Immutable UUID paths stay scoped to
the store/product. Upload is separate from version-checked attachment; an attachment
failure may leave a private orphan object, which grants no listing or media access.

GET rechecks ownership and current attachment and serves no-store, nosniff media.
Foreign or detached objects are unavailable. Private draft images bypass the shared
image optimizer. Existing public media routes continue to enforce publication.

## Compatibility and limits

The original workspace adds no billing, checkout, orders, payouts, staff or domains.
Custom CSV now extends it under `VENDOR_CUSTOM_PRODUCT_IMPORT_V1.md`, with its own
additive batch receipt migration and local proof. Existing catalog add/import and
Vault edit tools are reused. Complete desktop parity with every native Vendor Mode
operation remains unproven. QR destinations recognize exact loopback HTTP hosts consistently
with the website; non-loopback destinations still require HTTPS. Public QR identity,
eligibility and attribution remain unchanged.

Proof and release gates:
`docs/audits/vendor_storefront_desktop_v1/DESKTOP_PROOF_20260918.md`.
Navigation review and release handoff:
`docs/audits/vendor_storefront_desktop_review_v1/REVIEW_AND_HANDOFF_20260918.md`.
