# Grookai Vault Grookai Objects Plan

Source: `Grookai Vault · Grookai Object Objects · Codex Implementation Plan · July 12, 2026` pasted request
Additional source: `Grookai Vault · Grookai Objects · Codex Implementation Plan · July 12, 2026` pasted request
Date audited: 2026-07-12
Branch audited: `fix/pricing-ingestion-nightly`
Head audited: `c9ed7e83`

## Phase 0 Result

This is the required planning-only pass. No app code changes are included in this phase.

The worktree already contains unrelated modified/untracked pricing and deploy files. This plan does not touch them.

## July 12 Grookai Objects Reference Update

The updated reference archive is present at
`C:\Users\ccabr\Downloads\Grookai Vault repository.zip` and contains the
canonical renamed folder:

- `flutter_reference/grookai_objects/README.md`
- `flutter_reference/grookai_objects/grookai_object.dart`
- `flutter_reference/grookai_objects/grookai_object_renderer.dart`
- `flutter_reference/grookai_objects/grookai_object_skin.dart`
- `flutter_reference/grookai_objects/grookai_object_frame.dart`
- `flutter_reference/grookai_objects/grookai_object_atoms.dart`
- `flutter_reference/grookai_objects/grookai_object_models.dart`
- `flutter_reference/grookai_objects/grookai_object_layout_registry.dart`
- `flutter_reference/grookai_objects/memory_card_widgets.dart`
- `flutter_reference/grookai_objects/sale_card_widgets.dart`
- `flutter_reference/grookai_objects/lot_card_widgets.dart`

This supersedes the earlier `shareable_cards` naming. The product architecture
name is now `GrookaiObject{type, skin, layout, fields, metadata}` rendered by
`GrookaiObjectRenderer` through `grookaiObjectLayouts`. Existing repo work from
the prior pass has now been moved to `grookai_objects` as a focused
no-behavior follow-up rather than by adding a second renderer tree.

Rename follow-up status: complete. Production code now imports the canonical
`lib/widgets/grookai_objects/`, `lib/screens/grookai_objects/`, and
`lib/services/grookai_objects/` paths. Tests now live under
`test/grookai_objects/`. Stale golden failure artifacts were removed, and
`test/grookai_objects/grookai_object_naming_guard_test.dart` now guards against
reintroducing the old `ShareableCard*` / `shareable_cards` naming in Dart
sources.

## Operating Rules

- Planning first. Implementation waits for approval of this `PLAN.md`.
- Do not build a Marketplace browse/search screen, payments/escrow, seller ratings/trust backend, or a general DM inbox.
- These are generated post/share objects. They attach to existing collector/feed objects only if a compatible entity exists.
- Small PRs: one capability per PR.
- Shared rendering/skin logic must live in one place and be used by Memory, For Sale, and Lot cards.
- PR1 must preserve the generic publishing-engine architecture: `GrookaiObject{type, skin, layout, fields, metadata}`, a layout registry, and a `GrookaiObjectRenderer` that dispatches by layout without per-type branching.
- Every implementation PR runs `flutter analyze` and `flutter test`.
- Every renderer-touching PR produces screenshots for front/back in all three skins.
- Visual fidelity is governed by the approved reference implementation and mockups. The literal Dart implementation has been found at `C:\Users\ccabr\Downloads\Grookai Vault repository.zip`, containing `flutter_reference/grookai_objects/`. PR1 should copy/adapt that folder rather than re-derive visuals from the HTML mockups.

Repository note: no `AGENTS.md` exists at the repo root in this audit. Because
this request is planning-only, this pass records the operating rules here and
does not create or edit `AGENTS.md` without explicit approval.

## PR Status

| PR | Status |
| --- | --- |
| P0 Repo audit / PLAN.md | Complete in this document |
| PR1 Grookai object + layout registry + skin picker | Complete |
| PR2 Collector Memory flow | Complete |
| PR3 For Sale flow, single card | Complete |
| PR4 Lot / bundle flow | Complete |
| PR5 Flattened export & share | Complete |
| PR6 Attach to collector post | Descoped/stubbed because no post entity exists |

## Open Questions

### 1. Export Image Mechanism

Recommendation: implement on-device widget-to-image capture with `RepaintBoundary`/`RenderRepaintBoundary.toImage`, then share the PNG via `share_plus`.

Evidence:
- Existing sharing is app-side through `share_plus`: `lib/card_detail_screen.dart`, `lib/main.dart`, `lib/screens/public_collector/public_collector_screen.dart`, `lib/screens/vault/vault_gvvi_screen.dart`, `lib/screens/vault/vault_manage_card_screen.dart`.
- `share_plus` is already in `pubspec.yaml`.
- There is no current app-side card-object export service or server render job.
- Existing Flutter surfaces already use `RepaintBoundary` in scanner-related screens, proving the app can host widget capture patterns.

Tradeoffs:
- On-device capture gives offline support, avoids server render/load, and keeps font/image behavior closest to the in-app Flutter render.
- It can be sensitive to async image loading and device pixel ratio, so the export service must explicitly precache images/fonts and capture at a fixed logical size.
- Server-side rendering would improve deterministic output across devices, but would add a new render service, auth/upload path, queue/error handling, and operational load for a feature that is explicitly share/export scoped.

Implementation note: PR5 should create one shared capture/export service and not duplicate capture logic inside Memory, For Sale, or Lot flows.

### 2. DM/Contact Mechanism

Finding: yes, there is an existing card-specific messaging/contact system.

Evidence:
- Flutter UI: `lib/widgets/contact_owner_button.dart`, `lib/screens/network/network_inbox_screen.dart`, `lib/screens/network/network_thread_screen.dart`.
- Service boundary: `lib/services/network/card_interaction_service.dart`.
- Schema: `supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql` creates `public.card_interactions` with `card_print_id`, `vault_item_id`, `sender_user_id`, `receiver_user_id`, `message`, `status`, `created_at`.
- Later migrations add grouped thread state and reply behavior: `supabase/migrations/20260324143000_add_card_interaction_group_states_v1.sql`, `supabase/migrations/20260324114500_allow_card_interaction_group_replies.sql`.

Recommendation: PR3 routes `Message to Buy` through the existing `ContactOwnerButton`/`CardInteractionService` path when a generated sale object has a resolvable public owner copy (`vault_item_id`, `card_print_id`, owner user/profile context). If the generated object is being viewed outside a context that can resolve those fields, fall back to system share/mail text as an explicitly marked interim. Do not create a new inbox or messaging backend.

### 3. Collector Post / Feed-Post Entity

Finding: no compatible collector-post entity exists for attaching arbitrary generated card objects.

Evidence:
- `public.card_feed_events` exists in `supabase/migrations/20260414164857_ai_feed_intent_comments_v1.sql`, but it is an append-only event/ranking signal table with constrained event types, not a user post table.
- `public.card_comments` exists in the same migration, but it is card-anchored text comments, not a post object with image attachment/caption.
- Network/feed rendering uses derived rows (`NetworkStreamRow`, `NetworkStreamService`, `v_card_stream_v1`, local community feed RPCs) from public vault/intent data, not a general post schema.
- Wall data exists (`wall_sections`, `wall_section_memberships`) but represents curated vault placement, not shareable feed posts.
- Collector memories already exist, but are explicitly private owner-only exact-copy annotations, not public posts. See `supabase/migrations/20260710100000_product_evolution_e9_collector_memories_contracts_v1.sql` and `lib/services/vault/collector_memory_service.dart`.

Recommendation: PR6 is descoped until a real post entity is specified. Leave only a TODO/plan note; do not create a feed/post system as a side effect.

## Required Locations

### Card Detail Action Bar

Confirmed file/widget:
- `lib/card_detail_screen.dart`
- Bottom action bar: `_buildActions(BuildContext, ThemeData, ColorScheme)`.
- Current primary actions: ownership button (`Add to Vault`, `View your copy`, `Add copy`, `Manage card`) plus Want/favorite icon.
- Top page chrome: `_buildPageChrome`, containing Comments, Compare, and Share icons.

Plan: PR2 and PR3 should attach `Share Memory` and `List for Sale` in this same card-detail action area, likely by expanding the existing bottom action bar into a compact action menu or secondary row while preserving the glass/floating treatment.

### Vault Grid / Multi-Select Surface

Confirmed file/widgets:
- `lib/main_vault.dart`
- Grid tile builder: `_buildVaultGridTile`.
- Grid rendering: `_buildVaultCollectionSlivers`.
- Tile widget: `_VaultGridTile`.

Finding: the main vault grid has no multi-select state or long-press selection path today. It has per-tile tap-to-manage and a per-tile popup menu for scan/add/remove/delete. Exact-copy bulk selection exists only inside `lib/screens/vault/vault_manage_card_screen.dart`, scoped to copies of one card, not arbitrary vault-grid cards.

Plan: PR4 must add new vault-grid multi-select state/action UI if approved.

## Architecture Intent

This is a publishing engine, not three isolated widgets. Memory, Sale, and Lot are the first layouts registered against the same object envelope and renderer. Future objects such as Trade, Looking For, Showcase, New Pickup, Completed Set, Tournament Win, Vault Milestone, or Store Inventory must be additive: one typed field-schema/form adapter, front/back layout widgets, and one registry entry. They should not require changes to the object envelope, frame, skin tokens, or renderer dispatch.

Status Objects are a distinct future category in the same system: Completed Base Set, 1,000 Cards Collected, First PSA 10, Tournament Champion, and Vault Milestone. They use the same `GrookaiObject` envelope, renderer, skins, and registry pattern, but a different field schema without sale/contact fields.

The `fields` payload should remain a plain map so future form input and AI-assisted creation can feed the same renderer without a separate system. Typed classes like `MemoryCardData`, `SaleListingData`, and `LotListingData` are ergonomic adapters only, not the durable renderer contract.

## PR Roadmap

### PR1 - Grookai Object + Layout Registry + Skin Picker

Branch: `feat/grookai-object-renderer`

Targets:
- Copy `flutter_reference/grookai_objects/` from `C:\Users\ccabr\Downloads\Grookai Vault repository.zip` into the repo, suggested destination `lib/widgets/grookai_objects/`.
- Preserve the reference architecture: `GrookaiObject{type, skin, layout, fields, metadata}`, `GrookaiObjectSkin`, `GrookaiObjectTokens`, layout registry, frame/atoms, and `GrookaiObjectRenderer`.
- Adapt only the README wiring TODOs to this repo: fonts, icons, image loading widget, logo asset, flip wrapper, and golden fixtures.
- Add `google_fonts` to `pubspec.yaml` if the reference requires it. Current audit: `google_fonts` is already present in `pubspec.yaml` and `pubspec.lock`.
- Keep flip behavior outside the renderer. Use two `GrookaiObjectRenderer` instances (`showFront: true/false`) inside an idiomatic wrapper when flows need interactive flipping.
- Add fixtures/tests under `test/grookai_objects/` using fixed `GrookaiObject` fixtures for Memory, Sale, and Lot.

Reference files:
- `README.md`
- `grookai_object_skin.dart`
- `grookai_object_frame.dart`
- `grookai_object_atoms.dart`
- `grookai_object.dart`
- `grookai_object_models.dart`
- `grookai_object_layout_registry.dart`
- `grookai_object_renderer.dart`
- `memory_card_widgets.dart`
- `sale_card_widgets.dart`
- `lot_card_widgets.dart`

Diff estimate: medium-large, 10 copied/adapted reference files plus fixtures/tests and likely `pubspec.yaml`/`pubspec.lock`.

Tests:
- `flutter analyze`
- `flutter test`
- Golden/screenshot tests for fixed fixtures: 3 skins x front/back x 3 layouts = 18 images.

Screenshots:
- Memory: Onyx/Ivory/Kraft front/back
- Sale: Onyx/Ivory/Kraft front/back
- Lot: Onyx/Ivory/Kraft front/back

Guardrail:
- Do not re-derive or rewrite the renderer from the HTML mockups. Integrate the reference folder and only adapt repo-wiring TODOs from its README.

### PR2 - Collector Memory Flow

Branch: `feat/memory-card`

Targets:
- `lib/card_detail_screen.dart` for `Share Memory` action.
- Reuse/extend `lib/services/vault/collector_memory_service.dart` instead of creating a duplicate private-memory persistence path.
- Add `lib/screens/grookai_objects/memory_card_capture_screen.dart`.
- Add model adapter from `CollectorMemory` to PR1 renderer.
- Persist/transmit renderer data as `GrookaiObject.fields`; typed memory data is a form adapter over that map.

Diff estimate: medium, about 3-5 files plus tests.

Important constraint:
- Existing `collector_memories` schema is private, GVVI/exact-copy anchored, and currently has `note`, `place_label`, `occasion_label`, `memory_date`, `photo_path`, but no `skin`. PR2 needs either a small approved schema/RPC extension for per-object `skin`, or a separate generated-card-object record. Do not silently hide skin persistence if the share object must be recoverable later.

Tests:
- `flutter analyze`
- `flutter test`
- Service/model tests for memory-to-renderer mapping.
- Widget test for capture flow validation.

Screenshots:
- Card Detail action bar
- Memory capture screen
- Generated memory card in all three skins

### PR3 - For Sale Flow, Single Card

Branch: `feat/for-sale-card`

Targets:
- `lib/card_detail_screen.dart` for `List for Sale` action.
- Add `lib/models/grookai_sale_listing.dart` as an ergonomic adapter over `GrookaiObject.fields`.
- Add `lib/services/grookai_objects/sale_listing_service.dart`.
- Add `lib/screens/grookai_objects/for_sale_terms_screen.dart`.
- Reuse `lib/widgets/contact_owner_button.dart` / `CardInteractionService` for `Message to Buy` when contact context exists.

Diff estimate: medium-large, about 5-8 files plus persistence tests. Database migration likely needed unless sale objects are deliberately local-only.

Tests:
- `flutter analyze`
- `flutter test`
- Persistence/service tests for `sale_listing`.
- Widget test for price, condition chips, quantity, Allow DMs.

Screenshots:
- Card Detail action bar
- Set-terms screen
- Generated sale card in all three skins

### PR4 - Lot / Bundle Flow

Branch: `feat/lot-listing`

Targets:
- `lib/main_vault.dart` for vault-grid multi-select and `List N as Lot`.
- Extend `lib/models/grookai_sale_listing.dart` for `items: [{card_ref, price, condition}]` and `bundle_price`.
- Add `lib/screens/grookai_objects/lot_pricing_screen.dart`.
- Use the Lot layout copied/registered in PR1; do not create a parallel renderer path.

Diff estimate: large, about 6-10 files plus tests, because it changes the main vault grid interaction model.

Tests:
- `flutter analyze`
- `flutter test`
- Widget tests for entering/exiting multi-select and selected count.
- Service/model tests for lot price totals.

Screenshots:
- Vault multi-select
- Lot pricing step
- 9-card lot in all three skins

### PR5 - Flattened Export & Share

Branch: `feat/card-flatten-export`

Status: complete.

Targets:
- Add `lib/services/grookai_objects/grookai_object_export_service.dart`.
- Add `lib/widgets/grookai_objects/grookai_object_flattened_renderer.dart`.
- Integrate PR2-PR4 share flows through one export service.
- Reuse PR1 widgets/tokens/atoms for flattened export. If flattened-specific layout tweaks are needed, extend existing atoms instead of creating a second visual system.

Diff estimate: medium, about 3-5 files plus tests.

Tests:
- `flutter analyze`
- `flutter test`
- Export service test with fixed fixture.
- Flattened export-boundary widget test with fixed fixture; direct
  `RenderRepaintBoundary.toImage` byte assertion was avoided because it hung in
  the Windows Flutter test runner, while existing renderer goldens cover all
  card types/skins.

Screenshots:
- Flattened Memory card in all three skins
- Flattened For Sale card in all three skins
- Flattened Lot card in all three skins

### PR6 - Attach To Collector Post

Branch: `feat/card-post-attach`

Status: descoped/stubbed.

Reason: Phase 0 did not find an existing collector-post/feed-post entity that can accept a flattened image and caption. `card_feed_events` is an analytics/ranking event lane, not a post table.

Targets:
- Add only a TODO near share-sheet/post action planning if needed after PR5.
- Do not add schema, feed rendering, or post creation in this PR.

Diff estimate: tiny if left as a TODO, otherwise blocked pending product/schema decision.

Tests:
- None until a real post entity is approved.

Screenshots:
- None until a real post entity is approved.

## Explicit Non-Goals

- No Marketplace browse/search screen or listing index.
- No payments, escrow, shipping, fulfillment, or seller-rating system.
- No general-purpose DM inbox beyond existing `card_interactions`.
- No new feed/post backend in this round.

## Approval Gate

Stop here. The next step is approval of this `PLAN.md`, plus making the two approved mockup HTML files available in the repo or attachments before PR1 starts.

Updated gate from the July 12 revised request: PR1 requires the literal Dart reference folder at `flutter_reference/grookai_objects/`. It is available inside `C:\Users\ccabr\Downloads\Grookai Vault repository.zip`; implementation should still wait for approval of this plan before copying code.
