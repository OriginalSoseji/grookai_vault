# WEB_TO_APP_PARITY_AUDIT_V1

## Surface Table

| Surface | Web route | Web files | Web capabilities present | Mobile equivalent files | Mobile parity status |
| --- | --- | --- | --- | --- | --- |
| Public collector / profile / wall | `/u/[slug]` | `apps/web/src/app/u/[slug]/page.tsx`<br>`apps/web/src/components/public/PublicCollectorHeader.tsx`<br>`apps/web/src/components/public/PublicCollectorProfileContent.tsx`<br>`apps/web/src/components/public/PublicCollectionGrid.tsx` | Rich public header, follow action, segmented Collection / In Play surface, density toggle, Pokemon jump, copy-aware In Play contact flow, richer metadata, follower/following counts | `lib/screens/public_collector/public_collector_screen.dart`<br>`lib/services/public/public_collector_service.dart` | partial |
| Public collection subroutes / collector relationships | `/u/[slug]/collection`<br>`/u/[slug]/pokemon/[pokemon]`<br>`/u/[slug]/followers`<br>`/u/[slug]/following` | `apps/web/src/app/u/[slug]/collection/page.tsx`<br>`apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx`<br>`apps/web/src/app/u/[slug]/followers/page.tsx`<br>`apps/web/src/app/u/[slug]/following/page.tsx` | Dedicated collection page, Pokemon-filtered collection route, follower list, following list, collector relationship navigation | Closest: `lib/screens/public_collector/public_collector_screen.dart`<br>`lib/screens/account/following_screen.dart` | missing |
| Card detail core | `/card/[gv_id]` | `apps/web/src/app/card/[gv_id]/page.tsx`<br>`apps/web/src/components/pricing/CardPagePricingRail.tsx`<br>`apps/web/src/components/vault/AddToVaultCardAction.tsx`<br>`apps/web/src/components/ShareCardButton.tsx`<br>`apps/web/src/components/condition/ConditionSnapshotSection.tsx` | Pricing rail, add-to-vault, share card, compare, collector network offers, open exact copy links, owned-copy summary and removal, condition snapshot section, related prints, adjacent card navigation, set context | `lib/card_detail_screen.dart`<br>`lib/services/public/compare_service.dart` | partial |
| Card market analysis | `/card/[gv_id]/market` | `apps/web/src/app/card/[gv_id]/market/page.tsx` | Dedicated market route, history chart, duration filters, insight cards, pricing/source disclosure | No mobile equivalent | missing |
| Public GVVI / discoverable exact copy | `/gvvi/[gvvi_id]` | `apps/web/src/app/gvvi/[gvvi_id]/page.tsx`<br>`apps/web/src/components/vault/VaultInstanceVisiblePricingCard.tsx` | Canonical + exact-copy identity, pricing, photos, contact CTA, share section, copyable public route, collector/card links | `lib/screens/gvvi/public_gvvi_screen.dart`<br>`lib/services/vault/vault_gvvi_service.dart` | partial |
| Private GVVI / owned exact copy | `/vault/gvvi/[gvvi_id]` | `apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx`<br>`apps/web/src/components/vault/VaultInstancePricingCard.tsx`<br>`apps/web/src/components/vault/VaultInstanceNotesMediaCard.tsx`<br>`apps/web/src/components/vault/VaultInstanceSettingsCard.tsx` | Per-copy pricing editor, notes/media editor, per-copy intent/condition/image-display controls, messages summary, execution/history, share section, open public page | `lib/screens/vault/vault_gvvi_screen.dart`<br>`lib/services/vault/vault_gvvi_service.dart` | partial |
| Set browsing / set detail | `/sets`<br>`/sets/[set_code]` | `apps/web/src/app/sets/page.tsx`<br>`apps/web/src/app/sets/[set_code]/page.tsx`<br>`apps/web/src/components/PublicSetCardGrid.tsx`<br>`apps/web/src/components/sets/PublicSetTile.tsx` | Search/filter toolbar, compare-aware links, share card on tiles, load-more pagination, compare tray, denser browse semantics | `lib/screens/sets/public_sets_screen.dart`<br>`lib/screens/sets/public_set_detail_screen.dart`<br>`lib/services/public/public_sets_service.dart` | partial |
| Vault manage card / grouped card management | `/vault/card/[cardId]` | `apps/web/src/app/vault/card/[cardId]/page.tsx`<br>`apps/web/src/components/vault/VaultManageCardSettingsPanel.tsx` | Share card button, messages-first primary action, copy list with visibility badges, wall settings, wall note, copy removal, wall navigation | `lib/screens/vault/vault_manage_card_screen.dart`<br>`lib/services/vault/vault_card_service.dart` | partial |
| Network card stream / collector discover | `/network`<br>`/network/discover` | `apps/web/src/app/network/page.tsx`<br>`apps/web/src/app/network/discover/page.tsx`<br>`apps/web/src/components/network/NetworkStreamCard.tsx` | Intent filters, card stream, discover collectors lane, follow buttons, multi-copy contact flow, owner/collector links, section nav | `lib/screens/network/network_screen.dart`<br>`lib/screens/network/network_discover_screen.dart`<br>`lib/widgets/network/network_interaction_card.dart` | partial |
| Network inbox / thread workflow | `/network/inbox` | `apps/web/src/app/network/inbox/page.tsx`<br>`apps/web/src/components/network/InteractionGroupControls.tsx`<br>`apps/web/src/components/network/InteractionGroupExecutionPanel.tsx` | Inbox tabs, mark read, close, archive, reply, sale/trade execution panel, open-card and collector links, grouped thread workflow | `lib/screens/network/network_inbox_screen.dart`<br>`lib/screens/network/network_thread_screen.dart`<br>`lib/services/network/card_interaction_service.dart` | partial |

## GVVI Audit

- Web GVVI surfaces:
  - Public exact-copy page: `apps/web/src/app/gvvi/[gvvi_id]/page.tsx`
  - Private exact-copy page: `apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx`
- Mobile GVVI surfaces:
  - Public exact-copy page: `lib/screens/gvvi/public_gvvi_screen.dart`
  - Private exact-copy page: `lib/screens/vault/vault_gvvi_screen.dart`
- Web GVVI capabilities present:
  - Public GVVI has identity, owned-copy data, photos, pricing, contact CTA, and a dedicated share section with copyable public route.
  - Private GVVI has per-copy pricing editor, notes/media editor, exact-copy controls for intent/condition/image-display, execution/history, messages summary, and share/open-public-page controls.
- Mobile GVVI capabilities present:
  - Public GVVI has identity, photos, pricing, and contact CTA.
  - Private GVVI has identity, notes, media upload/remove, pricing display, outcomes, wall toggle, open public page, and remove copy.
- Missing GVVI parity items on mobile:
  - Public GVVI share/copy affordance is missing.
  - Private GVVI share/copy affordance is missing.
  - Private GVVI messages summary / jump-to-messages is missing.
  - Private GVVI per-copy controls for intent, condition, and image-display mode are missing.
  - Private GVVI is visually present, but still materially weaker than web as the exact-copy control center.
- Priority level:
  - P0

## Gap Classification

- Missing screen:
  - Mobile has no equivalent for `/card/[gv_id]/market`.
  - Mobile has no public collector equivalents for `/u/[slug]/pokemon/[pokemon]`, `/u/[slug]/followers`, or `/u/[slug]/following`.
- Missing section within existing screen:
  - Mobile card detail lacks the web condition snapshot section, web pricing rail, and the web "Your Vault" ownership section depth.
  - Mobile public collector lacks the web Pokemon jump section and the richer In Play copy-expansion/contact section.
  - Mobile private GVVI lacks the web messages section and dedicated share section.
- Missing action:
  - Mobile card detail does not surface share-card or add-to-vault actions that web exposes.
  - Mobile public collector does not expose follow on the collector profile surface.
  - Mobile network inbox/thread does not expose mark read, close, archive, or outcome execution actions.
- Missing data display:
  - Mobile public collector does not expose the same follower/following relationship surfaces, Pokemon-filtered collection, or copy-count summaries depth as web.
  - Mobile private GVVI does not expose per-copy image-display mode, pricing form state, or message summary.
- Missing visual treatment:
  - Mobile set detail is usable, but web set detail is more explicitly compare/share aware and built as a collector browse destination.
  - Mobile public collector is card-first now, but web still carries more product truth in the surrounding collector controls.
- Missing navigation path:
  - Mobile has no route path to web-only market analysis.
  - Mobile has no public-route drilldown for follower/following/pokemon collection surfaces.
- Present but materially weaker than web:
  - Card detail
  - Public collector
  - Public GVVI
  - Private GVVI
  - Network inbox
  - Set detail

## Recommended Mobile Parity Order

### P0

- GVVI parity:
  - Bring `vault_gvvi_screen.dart` up to the web exact-copy control model first.
  - Then add public GVVI share/copy parity.
- Card detail product truth:
  - Close the gap on share, add-to-vault, ownership state, and condition/pricing depth before more visual redesign.
- Public collector product truth:
  - Add follow, collector relationship navigation, Pokemon collection path, and richer In Play copy/contact behavior.
- Network inbox controls:
  - Add read/close/archive controls and card-outcome execution parity.

### P1

- Manage-card parity:
  - Bring over share/messages-first behavior and tighten the grouped-card action model to match web.
- Set detail parity:
  - Add share action parity, load-more/pagination parity, and compare-aware set browsing behavior.
- Cross-surface share normalization:
  - Align profile/card/GVVI share affordances so public surfaces behave consistently.

### P2

- Pricing presentation polish:
  - Bring mobile closer to web pricing depth and disclosure where the data already exists.
- Gallery/tile polish:
  - Continue visual convergence after product-truth gaps are closed.

## Recommended Mobile Parity Order

1. Private GVVI parity in `lib/screens/vault/vault_gvvi_screen.dart`
2. Public GVVI share parity in `lib/screens/gvvi/public_gvvi_screen.dart`
3. Card detail product-truth parity in `lib/card_detail_screen.dart`
4. Public collector parity in `lib/screens/public_collector/public_collector_screen.dart`
5. Network inbox control/execution parity in `lib/screens/network/network_inbox_screen.dart` and `lib/screens/network/network_thread_screen.dart`
6. Manage-card action parity in `lib/screens/vault/vault_manage_card_screen.dart`
7. Set browse/detail parity in `lib/screens/sets/public_sets_screen.dart` and `lib/screens/sets/public_set_detail_screen.dart`
