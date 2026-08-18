# GVVI Vendor QR V1 Product Proof

Date: 2026-08-17 / 2026-08-18 UTC

Environment: local feature runtime using read-only production inventory truth. No feature deployment and no inventory mutation.

## Existing Public Vendor GVVI

- GVVI: `GVVI-065CAB28-001319`
- GV-ID: `GV-PK-CRZ-GG23`
- Card: Dunsparce, Crown Zenith Galarian Gallery `GG23`
- Public vendor: `imnotcesar`
- Asking price: `$5.00 USD`
- Condition: `NM`

The candidate was discovered through service-authenticated reads only. It already satisfied public profile, Vault sharing, active vendor entitlement, active GVVI, Sell intent, asking-price mode, positive ask, and canonical card requirements.

## Signed-Out Landing Proof

`GET /gvvi/GVVI-065CAB28-001319?entry=qr` returned `200` without an auth session.

Automated browser readback at 390 by 844 and 1280 by 900 proved:

- card name present;
- self-hosted canonical card image rendered;
- vendor price exactly `$5.00`;
- condition `NM` present;
- vendor `imnotcesar` present with public avatar;
- zero horizontal overflow;
- zero browser console warnings/errors after the React 19/LCP repair;
- vendor price begins at mobile pixel 619 and is visible in the first viewport.

Evidence:

- `REAL_GVVI_MOBILE_20260817.png`
- `REAL_GVVI_DESKTOP_20260817.png`

## QR Resolution Proof

The generated physical QR decoded to exactly:

`https://grookaivault.com/q/GVVI-065CAB28-001319`

The local governed-origin entry route returned:

- status: `307`;
- destination: `/gvvi/GVVI-065CAB28-001319?entry=qr`;
- cache policy: `private, no-store`;
- anonymous visitor cookie: present;
- encrypted HttpOnly referral cookie: present.

`GET /q/GVVI-INVALID-000000` returned bounded `404 Not found`.

Evidence: `REAL_GVVI_QR_20260817.png`.

## Physical Samsung Native Proof

The isolated package `com.grookai.vault.lockedacceptance`, version `1.0.0 (297)`, was built with the existing public mobile configuration and installed beside the Play-signed production package. The production package and its data were not replaced.

On the connected Samsung Galaxy S22 Ultra, the app opened the real Wall card and read back:

- `Vendor card`;
- Dunsparce;
- `VENDOR PRICE` and `$5.00`;
- `Available` and `NM`;
- vendor `imnotcesar`;
- GVVI `GVVI-065CAB28-001319`;
- an inline owner `Vendor QR` with Copy, Share, and Print.

The native vendor-card page rendered the stable QR directly, without an intermediate modal. Print opened Android's native print preview with the vendor, card, asking price, condition, QR, and GVVI on a 2.5 by 3.5 inch document. Evidence: `REAL_NATIVE_SAMSUNG_QR_20260817.png`.

The same Samsung build exposes one `Price cards` action at the top of the owner Wall. It opens a 32-copy list with the card image, `Market price`, and editable `My price` in each row. Dunsparce read back its existing `$5.00` asking price. Market values use the exact `card_printing_id` from the governed Wall read model; a missing exact market value remains `—`.

## Stability Proof

The QR destination builder accepts only the governed origin and GVVI. Price, condition, vendor avatar, and presentation state are not inputs. Unit tests generated the URL before/after simulated mutable changes and proved byte-for-byte equality.

## Wall Convergence

The governed Wall contract and current route helper point public viewers to `/gvvi/[gvvi_id]`. `/q/[gvvi_id]` redirects to that same resource. There is no QR-specific card page or second identity.

## Authorization And Privacy

- Public resolution preserves active, profile-public, Vault-sharing, Wall/intent, and canonical-card gates.
- Vendor status requires an active database entitlement linked by owner user ID or server-resolved owner email.
- QR SVG export and print view require authenticated owner equality and vendor capability.
- QR entry and export contain no inventory mutation.
- Referral cookie contains no vendor ID.
- Referral credit re-resolves the vendor from GVVI, rejects self-referral, and deduplicates per new user.
- Market pricing is skipped for asking-price pages.

## Test Telemetry Containment

The first real-data browser smoke inherited production telemetry credentials and created eight test-only rows under the new event names. The exact eight IDs were identified by new event name, exact GVVI path, contract metadata, and test window; only those rows were removed. Readback proved `0` remaining feature events in the test window and `0` canonical/Vault rows touched.

`GROOKAI_DISABLE_TELEMETRY=1` was then added and used for all subsequent real-data browser verification. Final readback remained net zero.

## Verification Summary

- QR generation/decode and policy tests: `6/6` passed.
- GVVI route/security contracts: `8/8` passed.
- Native vendor-offer parsing and stable-URL tests: `3/3` passed.
- Flutter analysis: passed with no issues.
- Android physical-device configured build, launch, vendor readback, QR render, and print preview: passed.
- Interaction/security targeted contracts: `36/36` passed.
- Complete repository contract suite: `2,207/2,207` passed.
- GVVI responsive/accessibility tests: `5/5` passed.
- Release-convergence browser suite: `76/76` passed.
- TypeScript: passed.
- ESLint: passed with zero warnings.
- Next production build: passed.
- Production dependency audit: zero vulnerabilities.

## Production Boundary

No application deploy, schema migration, inventory write, pricing write, MEE change, referral signup creation, or owner-state mutation was performed. Production preview/canary remains the next gate.
