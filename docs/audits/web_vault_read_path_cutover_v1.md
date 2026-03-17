# Web Vault Read Path Cutover v1

## Title
Web Vault Read Path Cutover v1

## Date
2026-03-16

## Objective
Cut over the live web ownership displays so collector-facing web surfaces no longer treat legacy bucket quantity as ownership truth and instead derive owned count from active `vault_item_instances`.

## Web Read Paths Found
Proven live ownership reads in the current web app:

| File | Function / Component | Current ownership field | Surface | Reachability | Classification |
| --- | --- | --- | --- | --- | --- |
| [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx) | `CardPage()` | `vault_items.qty` | card detail ownership summary | proven live | ACTIVE OWNERSHIP READ |
| [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) | `normalizeVaultItems(...)` input from `v_vault_items_web` | `quantity` from `v_vault_items_web` | vault list source data | proven live | ACTIVE OWNERSHIP READ |
| [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) | `summary`, `duplicateItems`, smart views, optimistic quantity state | `item.quantity` | vault counters, duplicate view, quantity-driven filtering | proven live | ACTIVE OWNERSHIP READ |
| [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx) | `item.quantity` | `Qty` badge and stepper display | vault card tile | proven live | ACTIVE OWNERSHIP READ |

Other audited bucket/quantity reads:

| File | Surface | Classification | Notes |
| --- | --- | --- | --- |
| [founder page](/c:/grookai_vault/apps/web/src/app/founder/page.tsx) | admin/founder analytics | METADATA READ ONLY | not collector-facing vault ownership UI |
| [matchCardPrints.ts](/c:/grookai_vault/apps/web/src/lib/import/matchCardPrints.ts) | import comparison | METADATA READ ONLY | import diffing, not ownership display |
| [shared card actions](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts) | sharing writes/lookup | METADATA READ ONLY | out of scope for this cutover |
| [addCardToVault.ts](/c:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts) | bucket mirror write | METADATA READ ONLY | write seam, already instance-first |
| [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts) | archive/decrement mirror write | METADATA READ ONLY | write seam, already canonical-first |

## Pre-Fix Behavior
Before this cutover:
- card detail ownership on [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx) read `vault_items.qty`
- vault page data on [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) read `quantity` from `v_vault_items_web`
- all downstream vault counters, duplicate detection, badges, and quantity display inherited that bucket-derived quantity

That meant web write paths were already instance-first, but web ownership display was still bucket-truth.

## Canonical Instance Read Applied
New canonical helper:
- [getOwnedCountsByCardPrintIds.ts](/c:/grookai_vault/apps/web/src/lib/vault/getOwnedCountsByCardPrintIds.ts)
- function: `getOwnedCountsByCardPrintIds(userId, cardPrintIds)`
- source truth:
  - `public.vault_item_instances`
  - `user_id = <authenticated user>`
  - `archived_at is null`
  - grouped in the helper by `card_print_id`

Why no migration was required:
- web server components can safely use the existing server-only admin client
- `vault_item_instances` remains service-role-only under RLS
- no client-visible service-role behavior was introduced

Applied cutover:
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
  - card detail ownership now reads canonical count first
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - vault page now fetches canonical counts for all `card_id` values returned by `v_vault_items_web`
  - `quantity` passed into the vault UI is now `canonicalQuantity ?? legacyQuantity`
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
  - no direct data-source change needed
  - its `item.quantity` input is now canonical-first
- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
  - still renders `item.quantity`
  - that quantity is now canonical-first because the page data changed upstream

## Temporary Fallbacks Retained
Remaining fallbacks after cutover:

| File | Fallback | Why retained |
| --- | --- | --- |
| [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx) | fallback to direct `vault_items.qty` read if canonical helper throws | keeps card page ownership display resilient while the new helper bakes in |
| [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) | `canonicalQuantity ?? legacyQuantity` | keeps the vault list stable if canonical count fetch fails while `v_vault_items_web` still provides metadata rows |

No remaining touched collector-facing surface treats bucket quantity as primary truth.

## Verification Method
Verification used the rebuilt local Supabase stack plus the already-cut-over authenticated write wrappers.

Test fixture:

| Field | Value |
| --- | --- |
| user_id | `d8711861-05fa-480c-a252-be6677753aab` |
| card_print_id 1 | `33333333-3333-3333-3333-333333333333` |
| card_print_id 2 | `55555555-5555-5555-5555-555555555555` |

Runtime sequence:
1. archive all existing instances for both cards
2. add card 1 twice
3. add card 2 once
4. archive card 1 once
5. inspect canonical instance counts
6. inspect legacy bucket rows

Observed runtime results:

| Step | Outcome |
| --- | --- |
| add card 1 first | created `GVVI-80FA44D5-000003` |
| add card 1 second | created `GVVI-80FA44D5-000004` |
| add card 2 once | created `GVVI-80FA44D5-000005` |
| archive card 1 once | one active instance archived, one active instance remained |

Tooling:
- `npm run typecheck` in `apps/web` passed
- `npm run build` in `apps/web` did not complete within the allotted window, so build is not claimed as verified here

## Database Verification
Canonical instance truth after the runtime sequence:

| card_print_id | active_instances |
| --- | ---: |
| `33333333-3333-3333-3333-333333333333` | `1` |
| `55555555-5555-5555-5555-555555555555` | `1` |

Legacy bucket rows after the same sequence:

| card_id | qty | archived_at |
| --- | ---: | --- |
| `33333333-3333-3333-3333-333333333333` | `1` | `null` |
| `33333333-3333-3333-3333-333333333333` | `0` | `2026-03-17 02:14:50.796409+00` |
| `55555555-5555-5555-5555-555555555555` | `1` | `null` |

Interpretation:
- canonical counts matched the intended collector-facing ownership truth
- legacy bucket rows still exist as compatibility data, including a historical archived bucket episode for card 1
- the touched web pages now consume canonical counts first, so those bucket rows are no longer the primary display source

## Result
PASS WITH FOLLOW-UP

## Follow-Up Notes
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) still reads `v_vault_items_web` for metadata and keeps temporary legacy quantity fallback
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx) still has a direct `vault_items.qty` fallback path if canonical count fetch fails
- founder/admin analytics still read `v_vault_items_web.quantity`; that is outside this collector-facing cutover
- no browser automation run was completed; verification was done at the real web data and DB layer

## Next Step
Proceed to bucket retirement planning after the remaining web/mobile fallback-only paths and admin analytics reads are explicitly reconciled.
