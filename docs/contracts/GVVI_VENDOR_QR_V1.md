# GVVI Vendor QR V1

Status: implementation complete on isolated feature branch; production deployment not authorized.

## Purpose

GVVI Vendor QR V1 links a vendor's physical card to the existing public exact-copy resource. It does not create a QR identity, listing identity, or vendor-card identity.

```text
GV-ID = canonical card identity
GVVI  = one owned physical copy

physical QR -> /q/{GVVI} -> /gvvi/{GVVI}
Vendor Wall ----------------^
```

## Eligibility

A GVVI receives vendor presentation and owner QR controls only when all of these facts are currently true:

- the GVVI is active;
- the existing public GVVI resolver permits the copy under profile, Vault-sharing, and Wall/intent rules;
- the owner has an active database `user_entitlements` row that grants vendor tools;
- intent is `sell`;
- pricing mode is `asking`;
- asking price is a positive amount.

Environment allowlists may permit signed-in tool access, but they do not independently publish a vendor offer. Public vendor classification fails closed to the active database entitlement.

## Persistent URL

The QR encodes only `https://{site}/q/{GVVI}`. Price, condition, vendor branding, canonical card fields, and lifecycle state are resolved at request time. Those mutable properties must never enter the QR destination.

The QR entry route validates the identifier and current public vendor offer, records a best-effort scan event, stores encrypted referral context when configured, and redirects to `/gvvi/{GVVI}?entry=qr`.

Invalid, private, archived, unpublished, or non-vendor GVVI identifiers return the same non-descriptive `404` response. The route grants no write authority.

## Public Landing

`/gvvi/{GVVI}` remains the only public exact-copy surface for Wall and QR entry. Vendor mode adds canonical card identity and image, `VENDOR PRICE` from the owner asking price, existing condition vocabulary, availability, public vendor name/avatar, and the vendor Wall/profile link. This customer-facing landing never renders the QR itself or owner editing controls.

Market pricing is not loaded for an asking-price vendor page and is not required for rendering.

The mobile app consumes `/api/gvvi/{GVVI}/vendor-offer`, a bounded no-store read model that returns only the GVVI, public vendor presentation, asking price, condition, and availability after the server proves vendor authority. A `404` leaves the ordinary native GVVI experience unchanged. The mobile response excludes user IDs, email, private inventory fields, and write authority.

## Owner Controls

Owner QR controls live on an explicit private management surface and are never inferred merely because the owner opened the customer landing. Web controls provide an accessible preview, persistent link, owner-authenticated SVG download, and a compact 2.5 by 3.5 inch printable QR card. The native app exposes the same stable URL only when Vendor Mode explicitly opens personal QR tools, and supports copy, share, and a 2.5 by 3.5 inch Android print flow after the bounded server read proves vendor eligibility.

The authenticated right-side application drawer exposes `Vendor Mode` immediately below `Grookai Objects` for routine vendor repricing. Vendor Mode is not rendered on the owner Wall. Each exact copy appears in a single list with card identity, governed exact-printing market price when available, and an editable owner asking price. Editing the asking price writes through the existing exact-GVVI sale boundary and requires no card-detail, printing-version, or public-Wall preview navigation. Missing exact market evidence displays as unavailable and is never replaced with an inferred parent price.

## Referral Attribution

The scan cookie is AES-256-GCM encrypted with the dedicated `GVVI_REFERRAL_COOKIE_SECRET`. It contains only the GVVI identifier, creation time, expiry time, and contract version. It does not contain or assert a vendor ID.

The attribution window is 30 days. On authenticated account creation Grookai decrypts the cookie, resolves the current public vendor offer from GVVI, derives the vendor from ownership, blocks self-referral, records at most one `vendor_referred_signup` event per new user, and clears the cookie.

Repeated scans may produce scan events, but cannot produce repeated signup credit. Referral failure never blocks the card page. If the dedicated secret is absent, the card experience works and signup attribution is disabled.

## Data And Privacy

V1 adds no schema and no migration. It reuses `vault_item_instances`, `card_prints`, `card_printings`, `public_profiles`, `user_entitlements`, and service-written `web_events`.

Public responses never expose vendor email, private notes, acquisition cost, internal inventory fields, or write credentials. Existing server authorization and RLS remain unchanged.

## Lifecycle

The QR identity is durable and can support a future unavailable/sold historical state. V1 preserves current semantics: an archived or no-longer-public offer fails closed. A historical sold landing state requires a separate lifecycle contract.

## Events

- `gvvi_qr_scan`
- `vendor_card_page_view`
- `vendor_referred_signup`

Events are best effort. Product access does not depend on analytics success.

## Non-Goals

V1 does not implement checkout, payments, POS, transaction ledger, sold-state mutation, cash/trade composition, accounting, CRM, market pricing, label design, or vendor analytics dashboards.
