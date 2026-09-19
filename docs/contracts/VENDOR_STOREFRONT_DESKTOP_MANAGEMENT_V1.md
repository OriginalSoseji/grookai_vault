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

No new schema, billing, checkout, orders, payouts, staff accounts or domains.
Existing catalog add/import and Vault edit tools are reused. This contract does not
claim desktop feature parity for every native Vendor Mode operation or bulk custom
CSV import. QR destinations now recognize exact loopback HTTP hosts consistently
with the website; non-loopback destinations still require HTTPS. Public QR identity,
eligibility and attribution remain unchanged.

Proof and release gates:
`docs/audits/vendor_storefront_desktop_v1/DESKTOP_PROOF_20260918.md`.
Navigation review and release handoff:
`docs/audits/vendor_storefront_desktop_review_v1/REVIEW_AND_HANDOFF_20260918.md`.
