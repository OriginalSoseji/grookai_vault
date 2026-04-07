# Web vs App Parity Audit V3 (Real Repo)

Audited against the active git repository at `/Users/cesarcabral/grookai_vault`.

## WEBSITE SURFACE INVENTORY

| Surface | Route / File | Purpose | Primary UI Sections | Key Interactions | Key Data Dependencies | Web Wired? |
| --- | --- | --- | --- | --- | --- | --- |
| Public landing | `apps/web/src/app/page.tsx` | Signed-out discovery and search entry | Hero, featured cards, CTA, search | Search, sign-in CTA, browse | featured cards, marketing content | REAL |
| Explore | `apps/web/src/app/explore/page.tsx`, `apps/web/src/components/explore/ExplorePageClient.tsx`, `apps/web/src/components/explore/ExploreDiscoverySections.tsx` | Discovery-first public browse | Discovery sections, browse sets, search results, compare tray, view/sort controls | Search, compare selection, open set, open card | featured cards, public sets, resolver search | REAL |
| Card Detail | `apps/web/src/app/card/[gv_id]/page.tsx` | Canonical public card page | Hero, pricing rail, vault actions, owner/contact, other versions, set context | Add to vault, compare, share, contact owner, open set | `card_prints`, pricing UI, vault/public ownership, related versions | REAL |
| Market | `apps/web/src/app/card/[gv_id]/market/page.tsx` | Deep pricing / market history | chart, duration controls, insights | change duration, inspect market history | market analysis model | REAL |
| Public Collector / Wall | `apps/web/src/app/u/[slug]/page.tsx`, `apps/web/src/components/public/PublicCollectorProfileContent.tsx` | Public collector identity and shared collection | header, collection/in-play, view controls, pokemon jump, contact owner, follow | switch segment, open card, contact owner, follow | public profile, shared cards, follows | REAL |
| Public Collection route | `apps/web/src/app/u/[slug]/collection/page.tsx` | Dedicated collection view | collection-only wall | browse shared collection | public profile, shared cards | REAL |
| Public Pokemon route | `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx` | Pokemon-filtered public collection | pokemon header, filtered cards | jump to pokemon, open card | public profile, shared cards | REAL |
| Public followers | `apps/web/src/app/u/[slug]/followers/page.tsx` | Public follower list | collector list | open collector, follow | public profiles, follows | REAL |
| Public following | `apps/web/src/app/u/[slug]/following/page.tsx` | Public following list | collector list | open collector, follow | public profiles, follows | REAL |
| Vault | `apps/web/src/app/vault/page.tsx`, `apps/web/src/components/vault/VaultCollectionView.tsx` | Private collection home | summary, smart views, search/sort, view modes, recent cards | add/manage cards, change view, filter/search | vault rows, pricing, public wall state | REAL |
| Vault grouped card management | `apps/web/src/app/vault/card/[cardId]/page.tsx` | Manage grouped owned card | hero, wall settings, grouped copies, card link | add/remove wall, save note/category, inspect copies | grouped vault data, shared card settings | REAL |
| Private exact copy | `apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx` | Manage exact owned copy | exact-copy hero, settings, notes, media, history | edit copy, inspect media/history | GVVI + related vault data | REAL |
| Public exact copy | `apps/web/src/app/gvvi/[gvvi_id]/page.tsx` | Public exact-copy view | exact-copy identity, owner contact, pricing | contact owner | GVVI + public ownership | REAL |
| Network cards | `apps/web/src/app/network/page.tsx` | Card stream / network feed | lane switch, intent filters, card rows | browse cards, open inbox | card interactions, public network signals | REAL |
| Network discover | `apps/web/src/app/network/discover/page.tsx` | Collector discovery | search, collector rows, follow affordances | search, follow, open collector | public profiles, follows | REAL |
| Network inbox | `apps/web/src/app/network/inbox/page.tsx` | Card-specific messaging | inbox tabs, thread groups, reply tools | open thread, reply, state changes | card interactions, group states | REAL |
| Sets browse | `apps/web/src/app/sets/page.tsx` | Public set browse | search, filters, set results | search/filter, open set | sets + card availability | REAL |
| Set detail | `apps/web/src/app/sets/[set_code]/page.tsx` | Public set page | set header, card grid/list | open card | sets + set cards | REAL |
| Compare | `apps/web/src/app/compare/page.tsx` | Multi-card compare workspace | underfilled state, compare workspace, attribute tables | compare selected cards, clear | compare selection + public card compare reads | REAL |
| Account | `apps/web/src/app/account/page.tsx`, `apps/web/src/components/account/PublicProfileSettingsForm.tsx` | Signed-in account/profile hub | profile settings, media, quick links, tools | save profile, upload media, open tools | public profile settings, profile media | REAL |
| Following | `apps/web/src/app/following/page.tsx` | Signed-in following list | collector list | open collector | follows + public profiles | REAL |
| Import Collection | `apps/web/src/app/vault/import/page.tsx`, `apps/web/src/app/vault/import/ImportClient.tsx` | Import CSV into vault | upload, preview, match review, import | upload CSV, import | import parsing + vault writes | REAL |
| Submit Missing Card | `apps/web/src/app/submit/page.tsx`, `apps/web/src/components/warehouse/WarehouseSubmissionForm.tsx` | Warehouse ingestion | intent selection, evidence, notes, submit | upload evidence, submit | storage + warehouse intake | REAL |
| Private Wall | `apps/web/src/app/wall/page.tsx` | Signed-in private wall/activity surface | wall activity layout | review private wall activity | private wall data | REAL |

## FLUTTER SURFACE INVENTORY

| Surface | Screen / File | Purpose | Primary UI Sections | Key Interactions | Key Data Dependencies | Flutter Reality |
| --- | --- | --- | --- | --- | --- | --- |
| App shell / nav | `lib/main.dart` | Main signed-in shell | Explore, Wall, Scan, Network, Vault, app-bar actions, account hub | tab switch, account, messages, sets, compare, scan | shell state only | REAL_END_TO_END |
| Explore | `lib/main.dart` (`HomePage`) | Public browse/search | search, rarity chips, shared view mode, compare tray, results grid/list, featured sets | search, open card, open set, compare selection | resolver search, trending, featured sets, shared pricing | REAL_END_TO_END |
| Card Detail | `lib/card_detail_screen.dart` | Public card detail | hero, identity, pricing, actions, placeholder sections, details, set context | open set, compare, contact owner from context | pricing UI, passed-in card fields, contact context | PARTIALLY_WIRED |
| Wall home wrapper | `lib/main.dart` (`_MyWallTab`) | Signed-in Wall home | ready state -> public wall, unavailable state -> account setup | open account, open by slug, refresh | own public profile entry state | REAL_END_TO_END |
| Public Collector / Wall | `lib/screens/public_collector/public_collector_screen.dart` | Public collector profile and shared cards | header, collection/in-play segments, shared view mode, grid/list cards, pricing, contact owner | switch segment, open card, contact owner | public profile, shared cards, shared pricing | REAL_END_TO_END |
| Vault | `lib/main.dart` (`VaultPage`) | Private collection surface | summary row, search, sort, structural view chips, grid/list/by-set, recent strip | add card, scan, qty changes, open grouped management | vault rows, pricing, vault writes | REAL_END_TO_END |
| Vault grouped management | `lib/screens/vault/vault_manage_card_screen.dart` | Manage grouped owned card | hero, counts, wall settings, grouped copies | add/remove wall, save wall category/note, open wall, open card | grouped vault data, shared card settings | REAL_END_TO_END |
| Network cards | `lib/screens/network/network_screen.dart` | Network card lane shell | view mode, collectors lane switch, intent chips, empty content section | change intent, open collectors | no live card stream read | PARTIALLY_WIRED |
| Network discover | `lib/screens/network/network_discover_screen.dart` | Collector discovery | search, lane switch, collector list | search, open collector | public collector discover read | REAL_END_TO_END |
| Network inbox | `lib/screens/network/network_inbox_screen.dart` | Message list | inbox tabs, thread list | open thread | card interaction summaries | REAL_END_TO_END |
| Network thread | `lib/screens/network/network_thread_screen.dart` | Thread detail / reply | card summary, message list, reply box | open card, send reply | card interaction thread reads/writes | REAL_END_TO_END |
| Sets browse | `lib/screens/sets/public_sets_screen.dart` | Public set browse | hero, search, filter chips, set grid | search/filter, open set | set summaries | REAL_END_TO_END |
| Set detail | `lib/screens/sets/public_set_detail_screen.dart` | Public set page | header, shared view mode, card grid/list | open card | set detail + set cards + pricing | REAL_END_TO_END |
| Compare | `lib/screens/compare/compare_screen.dart` | Compare workspace | underfilled state, control card, preview grid, attribute tables | clear compare, pin reference, open card | compare selection + compare reads | REAL_END_TO_END |
| Account / profile | `lib/screens/account/account_screen.dart` | Signed-in account hub | hero, profile settings, public/vault toggles, media upload, quick links, collection tools | save profile, upload media, open following/import/submit | account profile service, public profile entry state | REAL_END_TO_END |
| Following | `lib/screens/account/following_screen.dart` | Signed-in following list | collector list | open collector | follow list read | REAL_END_TO_END |
| Import Collection | `lib/screens/account/import_collection_screen.dart` | Native CSV import | upload, preview, filter, import | pick CSV, import | import service + vault RPC | REAL_END_TO_END |
| Submit Missing Card | `lib/screens/account/submit_missing_card_screen.dart` | Native ingestion submission | intent cards, notes, tcgplayer id, evidence, submit | pick image, submit | warehouse service + storage + edge function | REAL_END_TO_END |
| Shared card view system | `lib/widgets/card_view_mode.dart` | Reused grid/list mode control | grid, compact, comfortable | change card density | UI only | REAL_END_TO_END |
| Shared card pricing pills | `lib/widgets/card_surface_price.dart`, `lib/services/public/card_surface_pricing_service.dart` | Lightweight pricing on cards | price pill | show real price/value | `v_card_pricing_ui_v1` | REAL_END_TO_END |
| Shared card artwork / zoom | `lib/widgets/card_surface_artwork.dart`, `lib/widgets/card_zoom_viewer.dart` | Full-card thumbnails and enlarge behavior | portrait thumbnail, zoom viewer | tap-to-zoom | image URLs | REAL_END_TO_END |
| Contact owner | `lib/widgets/contact_owner_button.dart`, `lib/services/network/card_interaction_service.dart` | Card-owner messaging entry | composer sheet, send, inbox link | send message, jump to inbox | `v_card_contact_targets_v1`, `card_interactions` | REAL_END_TO_END |
| Scan / camera / identity | `lib/screens/identity_scan/identity_scan_screen.dart`, `lib/screens/scanner/*` | Native scan flows | capture, condition camera, quad adjust, identify shell | scan/import into card flows | device camera + scan services | REAL_END_TO_END |

## PARITY TABLE

| Website Surface | Flutter Equivalent | Status | Wired Reality | Missing Pieces | Notes |
| --- | --- | --- | --- | --- | --- |
| `/` public landing | Login shell in `lib/main.dart` | WEB_ONLY | NOT_PRESENT | public signed-out discovery landing | App starts as authenticated utility shell, not public landing |
| `/explore` | `HomePage` in `lib/main.dart` | PARTIAL | REAL_END_TO_END | web discovery sections breadth, default discovery-first entry, compare tray parity, richer browse shortcuts | Real search, sets entry, compare selection, pricing pills, view modes exist |
| `/card/[gv_id]` | `lib/card_detail_screen.dart` | PARTIAL | PARTIALLY_WIRED | real other versions, real printings, real market route, real vault/share actions, richer metadata | Still ships placeholder sections and `coming soon` actions |
| `/card/[gv_id]/market` | none | MISSING | NOT_PRESENT | entire market analysis route | No Flutter equivalent |
| `/u/[slug]` | `lib/screens/public_collector/public_collector_screen.dart` | PARTIAL | REAL_END_TO_END | follow button, followers/following links, pokemon jump route parity | Core wall/profile/cards/contact flow is real |
| `/u/[slug]/collection` | collection segment inside `PublicCollectorScreen` | PARTIAL | REAL_END_TO_END | dedicated route model | Content exists as a segment, not a distinct surface |
| `/u/[slug]/pokemon/[pokemon]` | none | MISSING | NOT_PRESENT | pokemon-filtered public collection | No Flutter equivalent |
| `/u/[slug]/followers` | none | MISSING | NOT_PRESENT | public followers list | No Flutter equivalent |
| `/u/[slug]/following` | none | MISSING | NOT_PRESENT | public following list | No Flutter equivalent |
| `/vault` | `VaultPage` in `lib/main.dart` | PARTIAL | REAL_END_TO_END | real On Wall and Pokemon structural views, fuller vault summary parity | Core vault is real; some smart views are explicit placeholders |
| `/vault/card/[cardId]` | `lib/screens/vault/vault_manage_card_screen.dart` | PARTIAL | REAL_END_TO_END | deeper grouped-card details, exact-copy drilldown | Wall settings and copy list are real |
| `/vault/gvvi/[gvvi_id]` | none | MISSING | NOT_PRESENT | private exact-copy management | No Flutter equivalent |
| `/gvvi/[gvvi_id]` | none | MISSING | NOT_PRESENT | public exact-copy surface | No Flutter equivalent |
| `/network` | `lib/screens/network/network_screen.dart` | PARTIAL | PARTIALLY_WIRED | actual card stream/feed data | Lane shell exists but body is empty-state only |
| `/network/discover` | `lib/screens/network/network_discover_screen.dart` | PARTIAL | REAL_END_TO_END | follow/unfollow controls | Collector search/list is real |
| `/network/inbox` | `lib/screens/network/network_inbox_screen.dart`, `lib/screens/network/network_thread_screen.dart` | PARTIAL | REAL_END_TO_END | close/archive controls parity | Inbox, thread open, and reply are real |
| `/sets` | `lib/screens/sets/public_sets_screen.dart` | MATCH | REAL_END_TO_END | none material | Real public set browse/search/filter surface |
| `/sets/[set_code]` | `lib/screens/sets/public_set_detail_screen.dart` | MATCH | REAL_END_TO_END | none material | Real set header + card surface |
| `/compare` | `lib/screens/compare/compare_screen.dart` | PARTIAL | REAL_END_TO_END | richer compare depth and polish | Real workspace exists |
| `/account` | `lib/screens/account/account_screen.dart` | PARTIAL | REAL_END_TO_END | more community/account utilities from web | Public profile/media/toggles/tools are real |
| `/following` | `lib/screens/account/following_screen.dart` | MATCH | REAL_END_TO_END | none material | Real signed-in following list |
| `/vault/import` | `lib/screens/account/import_collection_screen.dart` | PARTIAL | REAL_END_TO_END | manual disambiguation depth / exact web import nuance | Native flow is real; not a web handoff |
| `/submit` | `lib/screens/account/submit_missing_card_screen.dart` | MATCH | REAL_END_TO_END | none material | Native submission uses real backend paths |
| `/wall` | `_MyWallTab` in `lib/main.dart` | WRONG_MODEL | PARTIALLY_WIRED | real private wall surface | Flutter home wall is a public collector wrapper, not the private `/wall` product |
| App-native scan/camera flows | `lib/screens/identity_scan/*`, `lib/screens/scanner/*` | APP_ONLY | REAL_END_TO_END | no web equivalent needed | Intentional app-native exception |

## FEATURE-LEVEL GAPS

### Explore / browse
- Website has: discovery-first explore, browse sets, spotlight/rail sections, compare tray, search results.
- App has: search, rarity chips, sets entry, compare tray, pricing pills, shared view modes, results grid/list.
- Missing in app: web discovery section breadth and stronger discovery-first default behavior.
- Partial in app: featured sets rail is real but narrow; default empty-query state still resolves catalog data.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Search
- Website has: resolver-backed card search with discovery handoff.
- App has: resolver-backed card search with result pricing and compare selection.
- Missing in app: none material.
- Partial in app: search presentation differs from web discovery/search split.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Card detail
- Website has: fully populated collector page with pricing, vault actions, versions, set context, market, owner/contact context.
- App has: hero, identity, pricing read, compare entry, set-link entry, contact-owner when opened from public card context.
- Missing in app: market route, real other versions, real printings, richer set context, real in-set content.
- Partial in app: many secondary sections are explicit placeholders.
- Wrong in app: actions still include placeholder `Add to Vault coming soon` and `Share coming soon`.
- Surfaced but not fully real: printings, collector offers when not opened from contact context, other versions, condition, in-set.

### Pricing
- Website has: current pricing rail and market route.
- App has: real card-surface pricing pills and real detail pricing reads.
- Missing in app: dedicated market route and market-history surface.
- Partial in app: detail pricing block is real but still simpler than web.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Wall / public collector
- Website has: public profile, collection/in-play, follow, contact owner, pokemon jump, followers/following routes.
- App has: public profile header, collection/in-play, pricing pills, contact owner, shared view modes, My Wall home wrapper.
- Missing in app: follow action, public followers, public following, pokemon-filter route.
- Partial in app: public wall family coverage stops at the main slug page.
- Wrong in app: none on the core `/u/[slug]` surface.
- Surfaced but not fully real: none on the core wall page.

### Vault
- Website has: private collection home, smart views, recent cards, summary, density controls.
- App has: private collection home, add card, qty actions, search, sort, view modes, grouped set view, recent strip.
- Missing in app: real On Wall smart view, real Pokemon smart view, fuller summary/value behavior.
- Partial in app: structural smart views are present but two are placeholder-backed.
- Wrong in app: none on the core vault route.
- Surfaced but not fully real: `On Wall`, `Pokemon`.

### Vault management
- Website has: grouped manage-card plus exact-copy drilldown.
- App has: grouped manage-card with wall toggle, category, public note, copies list, open wall, open card.
- Missing in app: exact-copy drilldown and exact-copy route family.
- Partial in app: grouped management exists but stops before GVVI-level depth.
- Wrong in app: none on the grouped manage-card screen.
- Surfaced but not fully real: copy rows expose data but do not open a GVVI surface.

### Exact copy / GVVI
- Website has: private and public GVVI routes.
- App has: none.
- Missing in app: entire feature family.
- Partial in app: none.
- Wrong in app: none.
- Surfaced but not fully real: GVVI ids only appear as inert data inside vault copy rows.

### Network
- Website has: real card stream, collector discover, inbox/messages.
- App has: collector discover and inbox/messages; cards lane shell only.
- Missing in app: live card stream/feed.
- Partial in app: top-level Network tab is still mostly a shell.
- Wrong in app: none.
- Surfaced but not fully real: network card lane.

### Messaging / inbox / contact owner
- Website has: contact owner, inbox threads, reply, state controls.
- App has: contact owner composer, send, inbox list, thread list, reply.
- Missing in app: close/archive state controls.
- Partial in app: closed-tab support depends on backend state that mobile does not mutate yet.
- Wrong in app: none.
- Surfaced but not fully real: closed/archive workflow.

### Sets
- Website has: set browse and set detail.
- App has: native set browse and set detail.
- Missing in app: none material.
- Partial in app: none material.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Compare
- Website has: compare workspace.
- App has: compare workspace, underfilled state, reference pinning, attribute tables.
- Missing in app: deeper compare richness and polish.
- Partial in app: current app compare is simpler.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Account / profile
- Website has: profile settings, media, quick links, tools, community-adjacent utilities.
- App has: profile settings, media upload/remove, quick links, following, import, submit, messages link.
- Missing in app: more community/account-adjacent utilities from web.
- Partial in app: current account surface is real but slimmer than web.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Import / ingestion / submit
- Website has: real import and warehouse submission.
- App has: native import and native submission.
- Missing in app: some web nuance in import review/matching depth.
- Partial in app: import is functional but lighter than web.
- Wrong in app: none.
- Surfaced but not fully real: none.

### Following
- Website has: signed-in following plus public followers/following route family.
- App has: signed-in following screen only.
- Missing in app: public followers/following pages and follow/unfollow controls.
- Partial in app: signed-in following is real, but the full follow graph product is not ported.
- Wrong in app: none.
- Surfaced but not fully real: none.

### App-native scan/camera flows
- Website has: no equivalent.
- App has: scan, identity, condition, quad adjust, capture.
- Missing in app: none.
- Partial in app: none.
- Wrong in app: none.
- Surfaced but not fully real: `scan_identify_screen.dart` is repo-present but still placeholder-backed and not part of the surfaced shell.

## PRIORITY GAPS

| Priority | Surface / Feature | Why It Matters | Current App Status | Wired Reality | Recommended Next Move |
| --- | --- | --- | --- | --- | --- |
| P0 | `main.dart` shell debt, navigation stabilization, performance | Every surfaced product area depends on this shell; it now carries too much state and too many route responsibilities | PARTIAL | REAL_END_TO_END | Refactor shell structure and stabilize navigation/performance before more route expansion |
| P0 | Network card stream | Network tab is one of the main destinations and currently lands on a shell instead of product content | PARTIAL | PARTIALLY_WIRED | Port the real `/network` card stream reads and rows |
| P0 | Card Detail placeholder removal + real actions | Card Detail is a core collector screen and still contains placeholder sections/actions in the active repo | PARTIAL | PARTIALLY_WIRED | Replace placeholder sections with real web-backed content or remove them |
| P0 | Public collector extensions | Public collector is already real, but follow/followers/following/pokemon routes are still missing | PARTIAL | REAL_END_TO_END | Port follow graph + pokemon drilldown on top of existing wall |
| P1 | Private `/wall` parity | Signed-in home is currently a public-wall wrapper, not the private wall product surface | WRONG_MODEL | PARTIALLY_WIRED | Decide whether to port `/wall` or intentionally retire it from the mobile product model |
| P1 | Exact-copy / GVVI family | Web exact-copy surfaces are entirely absent | MISSING | NOT_PRESENT | Port private GVVI first, then public GVVI |
| P1 | Vault smart-view parity | Vault already works, but two visible structural views are placeholders | PARTIAL | REAL_END_TO_END | Wire real `On Wall` and `Pokemon` views or remove them until ready |
| P1 | Network discover follow controls | Collector discovery without follow/unfollow undercuts the social loop | PARTIAL | REAL_END_TO_END | Add real follow/unfollow actions backed by existing follow tables |
| P2 | Explore discovery-first parity | Explore works, but still defaults too much toward resolver catalog behavior instead of web discovery | PARTIAL | REAL_END_TO_END | After shell work, align empty-query Explore to real discovery mode |
| P2 | Compare depth | Compare exists and works, but it is still slimmer than the website | PARTIAL | REAL_END_TO_END | Expand only after shell/network/card detail priorities land |

## DO NOT TOUCH YET

- App-native scanner/camera/identity/condition flows in `lib/screens/identity_scan/*` and `lib/screens/scanner/*`. These are not the current website-parity blocker.
- Native import flow in `lib/screens/account/import_collection_screen.dart` and `lib/services/import/collection_import_service.dart`. It is real and no longer a fake web handoff.
- Native warehouse submission in `lib/screens/account/submit_missing_card_screen.dart` and `lib/services/warehouse/warehouse_submission_service.dart`. It is real and should not be pulled back into a shell refactor.
- Signed-in Following in `lib/screens/account/following_screen.dart`. This is already a real route.
- Shared view mode system in `lib/widgets/card_view_mode.dart` and shared pricing pills in `lib/widgets/card_surface_price.dart`. These are already serving multiple real surfaces.
- Set browse/detail in `lib/screens/sets/public_sets_screen.dart` and `lib/screens/sets/public_set_detail_screen.dart`. These are good enough for now.
- Public collector core wall surface in `lib/screens/public_collector/public_collector_screen.dart`. Extend it later, but do not rework the core route before shell work.

## NEXT IMPLEMENTATION PASS

1. Build next: `main.dart` shell debt reduction + navigation stabilization + performance pass.
2. Build immediately after shell work: real Network card stream in `lib/screens/network/network_screen.dart`.
3. Clean immediately after shell work: Card Detail placeholder purge and real action/section parity in `lib/card_detail_screen.dart`.
4. Build after shell + network/card detail: public collector extensions for follow/followers/following/pokemon.
5. Wait until after shell debt reduction: any further Explore polish, compare depth work, or visual cleanup passes.
6. Wait until after a performance pass: GVVI / exact-copy family and any lower-priority route expansions.
