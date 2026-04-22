# IMAGE SURFACING HARDENING V1

**Status:** COMPLETE  
**Date:** 2026-04-22  
**Domain:** Product / Read Layer / Image Contract

---

## 1. CONTEXT

Grookai completed image surfacing unification so product surfaces can consume existing backend image coverage through `display_image_url`. This hardening pass makes that contract durable across web, Flutter, public vault, network, GVVI, wall, and provisional surfaces.

---

## 2. PROBLEM

The image pipeline already had substantial coverage, but user-facing surfaces were historically inconsistent. Some code paths could still regress to `image_url`-first behavior, drop representative images, or hand-roll different fallback behavior per screen.

That drift would make existing image coverage appear missing even when the backend had a valid display image.

---

## 3. DECISION

The product image contract is:

- `display_image_url` is the primary product image field
- `display_image_kind` carries exact / representative / missing context
- `image_url` and `image_alt_url` are fallback-only compatibility fields
- `representative_image_url` is a valid surfaced image when exact image fields are missing
- provisional image safety remains separate and strict

Product code must resolve images through the locked precedence:

`display_image_url -> image_url -> image_alt_url -> representative_image_url -> null`

---

## 4. WHAT CHANGED

- `apps/web/src/lib/publicCardImage.ts`
  - added `resolveDisplayImageUrl`
  - locked `display_image_url` as primary
  - kept legacy fields fallback-only

- Web read paths now use the shared display helper in:
  - `apps/web/src/lib/network/getCardStreamRows.ts`
  - `apps/web/src/lib/getSharedCardsBySlug.ts`
  - `apps/web/src/lib/network/getUserCardInteractions.ts`
  - `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
  - `apps/web/src/lib/vault/getOwnerVaultItems.ts`
  - `apps/web/src/app/wall/page.tsx`
  - `apps/web/src/app/vault/page.tsx`

- Flutter now has a shared image contract helper:
  - `lib/utils/display_image_contract.dart`

- Flutter models and services now call the shared precedence in:
  - `lib/models/card_print.dart`
  - `lib/services/network/network_stream_service.dart`
  - `lib/services/network/card_interaction_service.dart`
  - `lib/services/public/public_collector_service.dart`
  - `lib/services/public/compare_service.dart`
  - `lib/services/vault/vault_card_service.dart`
  - `lib/services/vault/vault_gvvi_service.dart`
  - `lib/screens/vault/vault_gvvi_screen.dart`

- Provisional app image parsing now rejects signed/private-looking URLs and non-HTTP image values.

- The read-model migration is annotated with lock comments:
  - `supabase/migrations/20260422120000_display_image_read_model_unification_v1.sql`

---

## 5. CURRENT TRUTHS

- `display_image_url` is the primary product image contract.
- Representative images are valid product images, not missing images.
- Legacy `image_url` and `image_alt_url` are compatibility fallbacks.
- Product placeholders should appear only when all safe image candidates are exhausted.
- Provisional images must remain public-safe and may resolve to null even when canonical images exist elsewhere.

---

## 6. INVARIANTS

- Product surfaces must not prefer `image_url` over `display_image_url`.
- Representative images must render normally when selected by the display contract.
- API serializers and read mappers must not drop `display_image_url` or `display_image_kind` where the surface depends on them.
- Malformed or private-looking URLs must fail closed to null / placeholder.
- Provisional image filtering must not be weakened to chase coverage.

---

## 7. REMAINING LIMITS

- Some founder, scanner, and internal review screens still use legacy image fields because they are not public product image surfaces.
- Full Flutter suite still has unrelated pre-existing failures outside the image contract tests.
- This pass does not add new backend image coverage or alter storage behavior.

---

## 8. WHY IT MATTERED

This converts backend image coverage into durable product behavior. The same card should now resolve through the same display-image contract across web and app, reducing false missing-image states without changing the image pipeline.

---

## 9. LOCK

All future user-facing image work must preserve:

- `display_image_url` primary
- legacy image fields fallback-only
- representative images as valid surfaced assets
- strict provisional image safety

Do not reintroduce image-url-only rendering on product surfaces.
