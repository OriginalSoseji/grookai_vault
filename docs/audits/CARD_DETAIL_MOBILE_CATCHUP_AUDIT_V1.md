# CARD_DETAIL_MOBILE_CATCHUP_AUDIT_V1

## OBJECTIVE
Audit the authoritative Card Detail surface on web and Flutter, identify contract and presentation drift, and define a deterministic merge path that brings Flutter Card Detail toward the newer web product direction without guessing parity from memory.

Scope rules used for this audit:

- Repository evidence only.
- Card Detail only.
- No implementation beyond this artifact.
- No profile/public wall, compare page, vault import, founder tools, or unrelated search/catalog redesign work.

Primary evidence files audited for this artifact:

- Web route and route helpers:
  - `apps/web/src/app/card/[gv_id]/page.tsx`
  - `apps/web/src/app/card/[gv_id]/loading.tsx`
  - `apps/web/src/lib/getPublicCardByGvId.ts`
  - `apps/web/src/lib/getAdjacentPublicCardsByGvId.ts`
  - `apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts`
  - `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
  - `apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts`
  - `apps/web/src/lib/condition/getConditionSnapshotsForCard.ts`
  - `apps/web/src/lib/condition/getAssignmentCandidatesForSnapshot.ts`
  - `apps/web/src/lib/network/getCardStreamRows.ts`
  - `apps/web/src/lib/cards/getDisplayPrintedIdentity.ts`
  - `apps/web/src/lib/cards/variantPresentation.ts`
  - `apps/web/src/types/cards.ts`
- Web presentational/action subcomponents:
  - `apps/web/src/components/pricing/CardPagePricingRail.tsx`
  - `apps/web/src/components/cards/PrintingSelector.tsx`
  - `apps/web/src/components/condition/ConditionSnapshotSection.tsx`
  - `apps/web/src/components/vault/AddToVaultCardAction.tsx`
  - `apps/web/src/components/vault/OwnedObjectRemoveAction.tsx`
  - `apps/web/src/components/network/ContactOwnerButton.tsx`
  - `apps/web/src/components/compare/CompareCardButton.tsx`
  - `apps/web/src/components/ShareCardButton.tsx`
  - `apps/web/src/components/compare/CardZoomModal.tsx`
  - `apps/web/src/components/common/PricingDisclosure.tsx`
- Flutter entry and upstream callers:
  - `lib/card_detail_screen.dart`
  - `lib/main.dart`
  - `lib/models/card_print.dart`
  - `lib/models/card_print_price_curve.dart`
  - `lib/services/vault/vault_card_service.dart`
  - `lib/screens/scanner/scan_capture_screen.dart`
  - `lib/screens/scanner/scan_identify_screen.dart`
  - `lib/screens/identity_scan/identity_scan_screen.dart`
- Contract and DB evidence used only where directly relevant to Card Detail:
  - `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`
  - `supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql`
  - `docs/contracts/STABILIZATION_CONTRACT_V1.md`
  - `docs/contracts/APP_FACING_DB_CONTRACT_V1.md`
  - `docs/contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md`

## WEB CARD DETAIL AUDIT
Authoritative entry path:

- `apps/web/src/app/card/[gv_id]/page.tsx`

Supporting route files:

- `apps/web/src/app/card/[gv_id]/loading.tsx`
- `apps/web/src/app/card/[gv_id]/market/page.tsx`
  - Referenced from the pricing rail as a follow-on route.
  - Not separately audited as a primary surface because this phase is Card Detail only.

Route-level data and helper layer:

- `getPublicCardByGvId(gv_id)`
  - Primary card-detail read.
  - Reads `card_prints`, `card_print_traits`, `card_printings`, `sets`, `card_print_identity`, and compatibility pricing through `getPublicPricingByCardIds`.
  - Builds the `CardDetail` object defined in `apps/web/src/types/cards.ts`.
- `getAdjacentPublicCardsByGvId(gv_id)`
  - Builds previous/next set navigation.
- `getCardPricingUiByCardPrintId(cardPrintId)`
  - Reads `v_card_pricing_ui_v1` for the web pricing block.
- `getOwnedObjectSummaryForCard(userId, cardPrintId)`
  - Reads owned raw/slab state from `vault_item_instances` and `slab_certs`.
- `getConditionSnapshotsForCard(userId, cardPrintId)`
  - Reads condition scan history.
- `getAssignmentCandidatesForSnapshot(userId, snapshotId, cardPrintId)`
  - Reads assignable owned instances for unassigned scans.
- `getCardStreamRows({ cardPrintId, excludeUserId, limit })`
  - Reads collector network offers from `v_card_stream_v1` plus exact-copy drilldown from `vault_item_instances` and `slab_certs`.
- `getDisplayPrintedIdentity(card)`
  - Prefers `card_print_identity.printed_number` over legacy `card_prints.number`.
- `getVariantLabels(card, limit)`
  - Maps variant flags and number-lane rules into UI badges.

Presentational and action subcomponents directly used by the page:

- `CardZoomModal`
- `CardPagePricingRail`
- `PrintingSelector`
- `ConditionSnapshotSection`
- `AddToVaultCardAction`
- `AddSlabCardAction`
- `OwnedObjectRemoveAction`
- `CompareCardButton`
- `ShareCardButton`
- `ContactOwnerButton`
- `PricingDisclosure`
- `CompareTray`

Major UI sections in render order:

1. Hero shell container with optional set-logo watermark.
2. Left hero column with zoomable card image.
3. Center identity column:
   - supertype pill
   - ownership pill
   - title
   - set link and set-code chip
   - collector number line from printed identity
   - rarity badge
   - variant badges
   - GV-ID row with copy button
   - illustrator text
4. Right action/pricing rail:
   - pricing card
   - vault summary card
   - add-to-vault action
   - add-slab action
   - compare button
   - share button
5. `PrintingSelector`
6. Collector Network
7. Card Details
8. Other Versions of This Card
9. About This Set
10. Your Vault
11. Condition
12. In This Set
13. `PricingDisclosure`
14. `CompareTray`

Action controls present on web:

- Add to Vault
- Add PSA slab
- Compare
- Share
- Contact owner
- Open exact copy / open copy
- Remove raw copy
- Remove slab
- Assign condition snapshot

Conditional states present on web:

- Missing card triggers `notFound()`.
- Pricing rail is auth-gated.
- Vault summary and owned-item lists expand only for signed-in users and owned state.
- Condition section is shown only for signed-in users.
- Collector Network appears only when `getCardStreamRows` returns rows.
- Printing selector hides when there are no displayable printings or only a single non-fallback printing.
- Compare tray appears only when compare-card query state exists.

Loading, error, and empty states on web:

- Route loading state:
  - `apps/web/src/app/card/[gv_id]/loading.tsx` renders a skeleton layout.
- Missing-card state:
  - route calls `notFound()` when `getPublicCardByGvId` returns null.
- Pricing states:
  - signed-out locked state
  - signed-in empty state when `v_card_pricing_ui_v1` has no primary price
- Condition states:
  - explicit empty state: `No condition scans yet`
- Ownership/network sections:
  - absent when data is not present rather than rendering placeholders
- Route folder does not define an `error.tsx`; there is no dedicated Card Detail route-level error component in this folder.

Reusable card-detail subcomponents on web:

- `CardPagePricingRail`
- `PrintingSelector`
- `ConditionSnapshotSection`
- `CardZoomModal`
- `AddToVaultCardAction`
- `OwnedObjectRemoveAction`
- `ContactOwnerButton`

Web authority conclusion:

- The authoritative web Card Detail surface is a fully hydrated server-rendered card-detail route keyed by `gv_id`.
- It already depends on multiple secondary contracts beyond basic card identity: pricing UI view, condition history, network offers, ownership summary, and printings metadata.

## FLUTTER CARD DETAIL AUDIT
Authoritative entry path:

- `lib/card_detail_screen.dart`

Authoritative entry callers audited:

- `lib/main.dart`
  - catalog search results
  - trending cards
  - vault list rows
- `lib/screens/scanner/scan_capture_screen.dart`
- `lib/screens/identity_scan/identity_scan_screen.dart`

Screen contract as implemented today:

- Constructor-only shallow props:
  - `cardPrintId`
  - optional `gvId`
  - optional `name`
  - optional `setName`
  - optional `number`
  - optional `imageUrl`
  - optional `quantity`
  - optional `condition`
- No dedicated Flutter `CardDetail` model exists.
- No dedicated provider/state notifier/repository is used by the screen itself.

Repository/service/provider path feeding Flutter Card Detail:

- Catalog/trending entry path:
  - `CardPrintRepository` in `lib/models/card_print.dart`
  - search path uses `search_card_prints_v1` first, with direct `card_prints` fallback queries
  - trending path queries `card_prints` directly
  - upstream `CardPrint` model already contains `gvId` and `rarity`
  - current catalog/trending call sites pass `cardPrintId`, `name`, `setName`, `number`, `imageUrl`
  - current catalog/trending call sites do not pass `gvId`
- Vault entry path:
  - `VaultCardService.getCanonicalCollectorRows()`
  - reads RPC `vault_mobile_collector_rows_v1`
  - vault call site passes `gvId`, `quantity`, `condition`, `number`, and image fallback data
- Scan entry path:
  - `VaultCardService.resolveCanonicalCard()`
  - reads canonical identity from `card_prints`
  - `identity_scan_screen.dart` passes canonical `gvId`
  - `scan_capture_screen.dart` passes only shallow card context
- Detail-screen-owned data path:
  - `CardDetailScreen` directly queries `v_best_prices_all_gv_v1`
  - `CardDetailScreen` directly queries `card_print_active_prices`
  - `CardDetailScreen` directly invokes edge function `pricing-live-request`

Widget composition in `lib/card_detail_screen.dart`:

- `AppBar`
- `SafeArea`
- `SingleChildScrollView`
- `Column`
  - `_buildHeroImage`
  - `_buildTitleSection`
  - `_buildMetaChips`
  - `_buildPricingSection`
  - divider
  - `_buildInfoSection`
  - `_buildActions`

Current render sections in order:

1. App bar title.
2. Hero image card.
3. Title and subtitle block.
4. Meta chips:
   - set
   - number
   - condition
   - quantity
   - GV-ID or fallback card ID
5. Pricing card.
6. Generic info block.
7. Placeholder action buttons.

Action controls present on Flutter:

- Pricing card actions:
  - `Get live price`
  - `Refresh`
- Bottom placeholder buttons:
  - `Vault actions (coming soon)`
  - `Get live price (coming soon)`

Pricing, status, and variant handling on Flutter:

- Pricing is the only live data loaded by the screen.
- Pricing read model is inline and map-based, not a typed detail contract.
- Pricing source:
  - `v_best_prices_all_gv_v1` for raw price/source/timestamp
  - `card_print_active_prices` for listing count, floor/median, confidence, freshness metadata
- Pricing presentation shows:
  - Grookai Value
  - NM floor
  - LP median
  - listing count
  - source
  - updated age
  - confidence
  - request-live-price and refresh controls
- No rarity handling.
- No variant badges.
- No printings selector.
- No related printings or related-card versions.
- No active-identity/printed-number resolution from `card_print_identity`.

Loading, error, and empty states on Flutter:

- No route-level or screen-level loading state for the card detail shell.
- No route-level not-found state.
- Hero image fallback states:
  - generic icon when image URL is empty
  - broken-image fallback on network failure
- Pricing-only states:
  - loading spinner card
  - inline error card: `Failed to load pricing`
  - inline empty card: `No pricing data yet.`

Reusable mobile subcomponents:

- None extracted into reusable widgets for Card Detail.
- The screen is a single file with private builder methods only.

Flutter authority conclusion:

- The authoritative Flutter Card Detail surface is a single self-contained screen with shallow constructor props and inline pricing reads.
- It is not contract-parity with web.
- Current detail richness depends on whichever caller opened the screen, not on a canonical card-detail read model.

## CARD DETAIL GAP MATRIX
| Domain | Web | Flutter | Status | Notes |
|---|---|---|---|---|
| hero/header | Full hero shell with image, set watermark, identity column, and right-side action/pricing rail | App bar plus single image card | WEB_RICHER | Flutter has no equivalent shell composition. |
| title/identity block | Title, linked set, set-code chip, collector number line, GV-ID copy row, illustrator | Title plus subtitle built from passed `setName` and `number` | WEB_RICHER | Flutter does not resolve printed identity or illustrator and does not expose copy/share identity affordances. |
| set/number metadata | Printed-set abbrev, collector identity, printed total, release date, set context grid, set link | Set and number only, shown in subtitle/chips | WEB_RICHER | Mobile lacks set context and printed-identity rules. |
| image/gallery | Zoomable hero image with canon/TcgDex fallback | Single network image with icon fallback, no zoom | WEB_RICHER | Neither side has a multi-image gallery, but web has a materially richer image surface. |
| rarity/badges | Rarity badge, variant badges, supertype pill, ownership pill | No rarity or variant badges | MISSING_ON_FLUTTER | Upstream Flutter `CardPrint` has `rarity`, but Card Detail does not consume it. |
| printings/variants selector | `PrintingSelector` plus related versions section | No printings or variants UI | MISSING_ON_FLUTTER | Web also includes fallback base-printing messaging. |
| pricing block | Auth-gated `v_card_pricing_ui_v1` presentation with primary price, low/mid/high, market-analysis link | Inline raw pricing read from `v_best_prices_all_gv_v1` and `card_print_active_prices`, plus refresh/request-live controls | DIFFERENT_MODEL | Surface and data contract differ. |
| vault ownership state | Canonical ownership summary, raw/slab counts, owned-item list | Optional `quantity` and `condition` chips only when caller passes them | DIFFERENT_MODEL | Flutter state depends on entry route, not a canonical ownership read. |
| add/remove or vault action | Real add-to-vault, add-slab, remove-raw, remove-slab actions | Placeholder action buttons only | MISSING_ON_FLUTTER | Web actions are live and auth-aware. |
| share/public action | Share button on detail rail | No share/public action | MISSING_ON_FLUTTER | Web copies the public card URL. |
| seller/trade/contact action | Collector Network with contact-owner flows and exact-copy drilldown | No seller/trade/contact affordances | MISSING_ON_FLUTTER | Requires `v_card_stream_v1` plus interaction actions. |
| condition/meta block | Condition snapshot history, assignment flow, card-details grid, set-context grid | Generic info paragraph plus optional condition chip | DIFFERENT_MODEL | Flutter has placeholder explanatory copy, not condition history or structured metadata blocks. |
| notes/explanatory text | Section intros, pricing disclosure, section-level explanatory copy | One generic future-looking paragraph | WEB_RICHER | Web copy is distributed across the actual sections. |
| loading state | Route skeleton in `loading.tsx` plus section-specific data gating | Pricing-only spinner after shell already renders | WEB_RICHER | No Flutter shell loading state exists. |
| error state | Missing-card 404 via `notFound()` and component/action error messaging; no route `error.tsx` in folder | Pricing-only inline error card | DIFFERENT_MODEL | Flutter has no card-not-found or route-level error state. |
| empty/fallback state | Pricing empty state, no-condition-scans state, printings fallback, not-found fallback | No-pricing-data card and image fallbacks | DIFFERENT_MODEL | Both sides have fallbacks, but not for the same domains. |

## DEPENDENCY / CONTRACT TRACE
Web contracts and dependencies required for parity-safe merge:

- `apps/web/src/types/cards.ts`
  - Defines the effective web `CardDetail` and `CardPrinting` contract.
- `apps/web/src/lib/getPublicCardByGvId.ts`
  - Reads:
    - `card_prints`
    - `card_print_traits`
    - `card_printings`
    - `sets`
    - `card_print_identity`
    - `v_best_prices_all_gv_v1` through `getPublicPricingByCardIds`
  - Produces:
    - `active_identity`
    - `printings`
    - `display_printings`
    - `related_prints`
    - canonical image resolution
- `apps/web/src/lib/cards/getDisplayPrintedIdentity.ts`
  - Rule: prefer `card_print_identity.printed_number` when active; fall back to `card_prints.number`.
- `apps/web/src/lib/cards/variantPresentation.ts`
  - Rule: variant badges are derived from `variant_key`, `variants`, and number-lane prefixes.
- `apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts`
  - Reads `v_card_pricing_ui_v1`.
  - Web price block is built from this UI view, not the mobile inline raw-price map.
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
  - Reads `v_best_prices_all_gv_v1` plus `card_print_active_prices`.
  - Carries the stabilization rule that product reads stay on the compatibility lane.
- `apps/web/src/lib/vault/getOwnedObjectSummaryForCard.ts`
  - Reads `vault_item_instances` and `slab_certs`.
  - Ownership parity is not derivable from a single legacy bucket quantity.
- `apps/web/src/lib/condition/getConditionSnapshotsForCard.ts`
  - Reads `condition_snapshots`, `vault_item_instances`, and `vault_items`.
- `apps/web/src/lib/condition/getAssignmentCandidatesForSnapshot.ts`
  - Reads assignment candidates from active owned instances.
- `apps/web/src/lib/network/getCardStreamRows.ts`
  - Reads `v_card_stream_v1` plus exact-copy drilldown from `vault_item_instances` and `slab_certs`.
- `apps/web/src/lib/getAdjacentPublicCardsByGvId.ts`
  - Reads `card_prints` for previous/next navigation in the same set.
- `apps/web/src/lib/vault/addCardToVault.ts`
  - Uses `resolveActiveVaultAnchor` and `admin_vault_instance_create_v1`, then mirrors `vault_items`.
  - Web add/remove parity is not a pure presentation change.

Flutter contracts and dependencies required for parity-safe merge:

- `lib/card_detail_screen.dart`
  - Current surface contract is constructor-only and incomplete for web parity.
  - Directly reads:
    - `v_best_prices_all_gv_v1`
    - `card_print_active_prices`
    - edge function `pricing-live-request`
- `lib/models/card_print.dart`
  - Defines the upstream `CardPrint` model used by catalog/trending.
  - Already has `gvId` and `rarity`.
  - Search path uses `search_card_prints_v1` with direct `card_prints` fallback queries.
- `lib/services/vault/vault_card_service.dart`
  - `resolveCanonicalCard()` reads canonical card identity from `card_prints`.
  - `getCanonicalCollectorRows()` reads `vault_mobile_collector_rows_v1`.
  - `addOrIncrementVaultItem()` calls `vault_add_card_instance_v1`.
  - `archiveOneVaultItem()` calls `vault_archive_one_instance_v1`.
  - `archiveAllVaultItems()` calls `vault_archive_all_instances_v1`.
- `supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql`
  - Confirms vault list rows return:
    - `card_id`
    - `gv_id`
    - `condition_label`
    - `name`
    - `set_name`
    - `number`
    - `photo_url`
    - `image_url`
    - `owned_count`
    - `gv_vi_id`
  - This is a vault-list contract, not a full card-detail contract.
- `supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql`
  - Confirms mobile add/archive actions use mobile wrapper RPCs instead of the web server-action path.

Card-detail-specific contract rules that can break parity if ignored:

- Pricing stabilization rule:
  - `docs/contracts/STABILIZATION_CONTRACT_V1.md` states all app-facing pricing reads must go through `v_best_prices_all_gv_v1`.
  - Web still adds a second presentation layer via `v_card_pricing_ui_v1`.
  - Result: pricing parity requires an intentional contract decision, not a blind copy of either UI.
- Printed identity governance rule:
  - `docs/contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md` states `card_print_identity` owns printed-identity inputs while `gv_id` remains stored on `card_prints`.
  - Result: mobile parity must not invent a new `gv_id` source or assume `number` on `card_prints` is always the display authority.
- Mobile app-facing DB contract:
  - `docs/contracts/APP_FACING_DB_CONTRACT_V1.md` identifies `card_print_active_prices` as the current Flutter Card Detail pricing read surface and `search_card_prints_v1` as the primary search contract.

Current divergence classification:

- Presentation-only drift:
  - header shell
  - section ordering
  - explanatory copy distribution
  - image zoom affordance
- Data-shape-driven drift:
  - printed identity
  - rarity and variant badges
  - display printings
  - pricing block
  - vault ownership summary
  - add/remove action state
  - network contact state
  - condition history
- Mixed drift:
  - some Flutter upstream paths already have data the detail screen drops today
  - examples:
    - `CardPrint.gvId` exists upstream but catalog/trending detail pushes omit it
    - `CardPrint.rarity` exists upstream but the screen has no slot for it

Overall contract conclusion:

- The current divergence is not presentation-only.
- P1 can stay presentation-first.
- P2 through P4 require a focused Flutter card-detail read contract because the current constructor payload does not contain the web surface dependencies.

## PHASED MERGE PLAN
### P1 — Visual Shell Parity
- Target files:
  - `lib/card_detail_screen.dart`
  - `lib/main.dart`
  - `lib/screens/scanner/scan_capture_screen.dart`
- Change type:
  - structure/layout/section ordering only
  - promote existing identity props into a web-like header shell
  - pass through already-available outward identity where callers already have it
- Risk level:
  - Low
- Dependency risk:
  - Low
  - No new DB reads required if limited to existing constructor props.
- Safe verification method:
  - Open Card Detail from catalog, trending, and vault in the simulator.
  - Verify top-of-screen order matches the planned shell and no pricing/action behavior changes.

### P2 — Identity + Pricing Parity
- Target files:
  - `lib/card_detail_screen.dart`
  - `lib/models/card_detail.dart` (new)
  - `lib/services/card_detail/card_detail_service.dart` (new)
- Change type:
  - introduce a focused Flutter read model for card identity, badges, set metadata, printings visibility, and pricing presentation inputs
  - hydrate the screen by `cardPrintId` instead of relying only on caller-passed props
- Risk level:
  - Medium
- Dependency risk:
  - Medium-High
  - Web pricing uses `v_card_pricing_ui_v1` while current Flutter pricing uses raw compatibility and listing-metadata reads.
  - Printed identity must respect `card_print_identity` display rules.
- Safe verification method:
  - Compare the same `gv_id` on web and simulator while signed in.
  - Verify title/identity, badges, set metadata, printings visibility, and price block state against the audited web render.

### P3 — Action Parity
- Target files:
  - `lib/card_detail_screen.dart`
  - `lib/services/vault/vault_card_service.dart`
  - `lib/services/card_detail/card_detail_service.dart`
  - `lib/services/card_detail/card_detail_actions.dart` (new)
- Change type:
  - replace placeholder buttons with real vault/share/interaction actions
  - surface ownership state strongly enough to support add/remove flows
  - add share/public affordances and contact entry points where the backend contract exists
- Risk level:
  - High
- Dependency risk:
  - High
  - Mobile write flows currently use wrapper RPCs while web uses server actions and additional ownership summary reads.
  - Seller/trade/contact parity depends on card-interaction contracts not currently wired into Flutter Card Detail.
- Safe verification method:
  - Run authenticated simulator checks for add, remove one, remove all where applicable, share copy, and logged-out gating.
  - Confirm no unrelated vault surfaces regress.

### P4 — Advanced Detail Parity
- Target files:
  - `lib/card_detail_screen.dart`
  - `lib/models/card_detail.dart`
  - `lib/services/card_detail/card_detail_service.dart`
  - `lib/services/card_detail/card_condition_service.dart` (new)
- Change type:
  - add secondary richness blocks:
    - condition history
    - assignment affordances
    - related versions
    - set-context detail
    - adjacent-card navigation
    - richer empty-state and explanatory copy
- Risk level:
  - High
- Dependency risk:
  - High
  - Requires condition-snapshot reads and assignment rules, related-print derivation, and secondary route/context data now present only on web.
- Safe verification method:
  - Test cards with and without owned copies, with and without condition scans, and with and without related printings.
  - Compare empty-state behavior and conditional section visibility against web for the same card.

## RECOMMENDED FIRST SLICE
Smallest safe next implementation slice:

- Rebuild the Flutter Card Detail top shell to mirror the web section order using existing data only.
- Include passing `gvId` from the catalog/trending call sites in `lib/main.dart` so the header can consistently show the outward card identity in the main mobile entry flows.

Why this slice is first:

- High visibility:
  - users will immediately see the header/shell alignment
- Low risk:
  - no new DB reads
  - no write-path changes
  - no action-contract changes
- Presentation-first:
  - stays within P1
- Easy to verify:
  - simulator check from catalog, trending, and vault routes

Recommended files for that first slice:

- `lib/card_detail_screen.dart`
- `lib/main.dart`

Explicitly out of scope for the first slice:

- pricing contract changes
- printings/variant data loads
- share/contact actions
- vault add/remove behavior changes
- condition history

## NOTES / DO NOT ASSUME
- Do not assume the current Flutter screen is missing only polish. It is missing both presentation parity and multiple data contracts.
- Do not assume the web price block can be copied from current Flutter pricing output. Web depends on `v_card_pricing_ui_v1`; Flutter detail currently reads raw compatibility pricing plus listing metadata directly.
- Do not assume `card_print_identity` owns `gv_id`. The identity contract keeps `gv_id` on `card_prints`.
- Do not assume `card_prints.number` is always the correct displayed collector number. Web explicitly prefers active `card_print_identity.printed_number`.
- Do not assume mobile entry routes provide the same inputs. Vault, catalog, trending, scan-capture, and identity-scan entry paths pass different subsets of data today.
- Do not assume vault quantity on Flutter equals web ownership parity. Web ownership state is based on `vault_item_instances` and slab state, not only bucket quantity.
- Do not assume share/contact parity is a simple button port. Web detail depends on network stream and interaction contracts.
- Do not assume printings parity can be added without a new Flutter read contract. Current Flutter detail has no typed place for `display_printings`, `related_prints`, or variant flags.
- Do not assume this audit authorizes touching compare, wall/profile, import, founder, or unrelated catalog/search surfaces.
