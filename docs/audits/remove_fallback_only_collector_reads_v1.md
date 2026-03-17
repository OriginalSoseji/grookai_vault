# Title
Remove Fallback-Only Collector Reads V1

# Date
2026-03-16

# Objective
Remove the remaining collector-facing ownership fallbacks so web and mobile collector surfaces stop using legacy bucket quantity as a fallback and rely on canonical active instance counts only.

# The 5 Active Runtime Dependencies Identified
1. [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
   - Function/component: `CardPage`
   - Old fallback logic: canonical count lookup from `getOwnedCountsByCardPrintIds(...)`, then fallback to `public.vault_items.qty`
   - Surface type: web card detail
   - Collector-facing impact: “You own X copies” could still display bucket quantity if canonical read failed
2. [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
   - Function/component: `normalizeVaultItems`
   - Old fallback logic: `quantity: canonicalQuantity ?? legacyQuantity`
   - Surface type: web vault page data normalization
   - Collector-facing impact: vault list ownership counts could still be bucket-derived
3. [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
   - Function/component: `VaultCollectionView`
   - Old legacy dependency: downstream use of `item.quantity` for totals, duplicates, optimistic quantity state, and zero-removal decisions
   - Surface type: web vault collector UI
   - Collector-facing impact: even though the fallback lived upstream, this component still treated the fallback-fed field as ownership truth
4. [apps/web/src/components/vault/VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
   - Function/component: `VaultCardTile`
   - Old legacy dependency: downstream use of `item.quantity` for the visible “Qty” badge and quantity controls
   - Surface type: web vault card tile
   - Collector-facing impact: rendered bucket-derived ownership if upstream fallback fed it
5. [lib/main.dart](/c:/grookai_vault/lib/main.dart)
   - Function/component: `VaultPageState.reload`, `_ownedCountForRow`, and `_VaultItemTile`
   - Old fallback logic: mobile row hydration kept `legacy_qty`, and `_ownedCountForRow` used `owned_count -> legacy_qty -> qty`
   - Surface type: mobile vault collector UI
   - Collector-facing impact: mobile ownership labels and sorting could still fall back to bucket quantity during rollout

Note: the earlier bucket retirement audit’s broader active-runtime list also included import reconciliation and pricing freshness. Those are still active runtime dependencies, but they are not collector-facing fallback reads and were intentionally left out of this task.

# Pre-Fix Fallback Behavior
- Web card detail could still display bucket quantity if canonical count lookup failed.
- Web vault row normalization could still inject bucket quantity into the collector-facing `quantity` field.
- Web vault downstream components then treated that field as collector ownership truth for badges, summaries, duplicates, and quantity controls.
- Mobile vault hydration still carried legacy quantity, and `_ownedCountForRow` would fall back to it if canonical counts were missing.
- Result: collector ownership displays were canonical-first, but not canonical-only.

# Fallback Removal Applied
- [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
  - Removed the direct `public.vault_items.qty` fallback query.
  - Canonical count failure now logs and resolves to `0` instead of reviving bucket truth.
- [apps/web/src/app/vault/page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
  - Removed `quantity` from the `v_vault_items_web` collector query.
  - Replaced `canonicalQuantity ?? legacyQuantity` with canonical-only `owned_count`.
  - Kept `v_vault_items_web` only for metadata fields still needed by the vault page.
- [apps/web/src/components/vault/VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
  - Replaced downstream uses of `item.quantity` with `item.owned_count`.
  - Summary totals, duplicate detection, optimistic quantity updates, and removal thresholds now use canonical-only owned counts.
- [apps/web/src/components/vault/VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
  - Replaced visible quantity display and stepper count display with `item.owned_count`.
  - This makes the collector-visible tile count unambiguously canonical.
- [lib/main.dart](/c:/grookai_vault/lib/main.dart)
  - Removed `qty` from the mobile `v_vault_items` collector query.
  - Stopped hydrating `legacy_qty`.
  - Simplified `_ownedCountForRow` to canonical-only `owned_count ?? 0`.
  - Updated collector-facing mobile UI locals to use canonical owned count naming.

# Collector Surface Verification
- Static collector verification:
  - direct fallback markers were removed from the touched collector files
  - web vault downstream components now consume `owned_count`, not fallback-fed `quantity`
  - mobile collector count helper no longer reads `legacy_qty` or `qty`
- Build/analyze verification:
  - `npm run typecheck` in `apps/web` passed
  - `dart analyze lib/services/vault/vault_card_service.dart lib/main.dart lib/card_detail_screen.dart` completed with pre-existing warnings only
- Runtime/UI verification:
  - I did not run a full browser-click or emulator session in this task
  - collector-facing count logic was verified by source inspection plus real local DB state against the same fixture user/cards used in the recent ownership cutover checks

# Database Verification
Environment used:
- local Supabase stack from `supabase status`
- fixture user: `d8711861-05fa-480c-a252-be6677753aab`
- fixture cards:
  - `33333333-3333-3333-3333-333333333333`
  - `55555555-5555-5555-5555-555555555555`

Canonical instance counts:

| user_id | card_print_id | active_instances |
|---|---|---:|
| `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | 1 |
| `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` | 1 |

Legacy bucket rows retained for compatibility only:

| user_id | card_id | qty | archived_at |
|---|---|---:|---|
| `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | 0 | `2026-03-17T02:14:50.796409+00:00` |
| `d8711861-05fa-480c-a252-be6677753aab` | `33333333-3333-3333-3333-333333333333` | 1 | `null` |
| `d8711861-05fa-480c-a252-be6677753aab` | `55555555-5555-5555-5555-555555555555` | 1 | `null` |

Interpretation:
- canonical collector ownership truth is active instance count
- bucket rows still exist, but they are no longer needed as a collector-facing fallback source

# Result
PASS WITH FOLLOW-UP

# Follow-Up Notes
- No migration was required.
- Collector-facing ownership displays in the touched web/mobile surfaces are now canonical-only.
- `vault_items` and bucket views still remain for:
  - compatibility mirroring
  - metadata bridging
  - historical `vault_item_id` consumers
  - analytics/admin surfaces that are still out of scope for this task
- Full browser/emulator interaction was not rerun here; the result is based on code-level fallback removal plus local DB verification of canonical instance truth.

# Next Step
audit and cut over analytics/admin quantity surfaces first
