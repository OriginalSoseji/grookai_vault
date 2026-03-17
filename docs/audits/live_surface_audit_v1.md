# GROOKAI VAULT — LIVE SURFACE AUDIT V1

## Date
2026-03-16

## Objective
Audit Grookai Vault and classify each meaningful product surface by actual repo-visible reachability so execution stays aligned with live product reality instead of backend readiness or intended roadmap.

## Classification Definitions
- `LIVE ON WEB`: A real user can reach and use it through the website now.
- `LIVE IN APP`: A real user can reach and use it through the mobile app now.
- `LIVE IN BOTH`: A real user can reach and use it in both web and app now.
- `BACKEND READY / NOT WIRED`: Supporting backend/data logic exists, but there is no proven live user-facing entry point.
- `FUTURE / PARTIAL / DORMANT`: Present in repo but incomplete, placeholder, hidden, stale, or not proven product-ready.
- `INTERNAL / ADMIN ONLY`: Reachable only for founder/admin/ops use, not a collector-facing product surface.

## Live Surface Inventory
| System | Web Files / Routes | App Files / Screens | Backend / Data Dependency | Classification | Reachability | Status Notes | Recommended Action |
|---|---|---|---|---|---|---|---|
| Authentication and account entry | `apps/web/src/app/login/page.tsx`, `apps/web/src/app/account/page.tsx`, `apps/web/src/app/auth/callback/route.ts` | `lib/main.dart` (`LoginPage`, auth-gated `MyApp`) | Supabase Auth, `public_profiles` | LIVE IN BOTH | Proven live | Web has login + account settings. App has login/create-account gate and sign-out. | KEEP PUSHING NOW |
| Catalog / browse / search | `apps/web/src/app/page.tsx`, `apps/web/src/app/explore/page.tsx`, `apps/web/src/app/sets/page.tsx`, `apps/web/src/app/sets/[set_code]/page.tsx` | `lib/main.dart` (`HomePage`, trending + search catalog) | `card_prints`, public set helpers, pricing reads | LIVE IN BOTH | Proven live | Web browsing is broader. App catalog is narrower but clearly live. | KEEP PUSHING NOW |
| Compare workspace | `apps/web/src/app/compare/page.tsx`, `apps/web/src/components/compare/*` | None proven | Public card helpers, pricing display helpers | LIVE ON WEB | Proven live | Real compare route with underfilled state and full workspace. No app counterpart found. | KEEP PUSHING NOW |
| Card detail page | `apps/web/src/app/card/[gv_id]/page.tsx` | `lib/card_detail_screen.dart`, launched from `lib/main.dart` | Public card lookup, pricing, vault ownership reads | LIVE IN BOTH | Proven live | Both surfaces are real. Web is richer and now hosts condition viewer/assignment. | KEEP PUSHING NOW |
| Vault list / collection view | `apps/web/src/app/vault/page.tsx`, `apps/web/src/components/vault/VaultCollectionView.tsx` | `lib/main.dart` (`VaultPage`) | `v_vault_items_web`, canonical instance count overlays | LIVE IN BOTH | Proven live | Core collector surface in both clients. | KEEP PUSHING NOW |
| Vault add / remove ownership flows | `apps/web/src/lib/vault/addCardToVault.ts`, `apps/web/src/lib/vault/updateVaultItemQuantity.ts`, card/vault UI callers | `lib/services/vault/vault_card_service.dart`, `lib/main.dart`, `lib/screens/identity_scan/identity_scan_screen.dart` | Canonical instance RPC wrappers + temporary bucket mirror | LIVE IN BOTH | Proven live | Add/remove are fully wired through current live web and app flows. | VERIFY LIVE BEHAVIOR |
| Vault import | `apps/web/src/app/vault/import/page.tsx`, `apps/web/src/app/vault/import/ImportClient.tsx` | None proven | CSV parsing/matching/import helpers, canonical instance writes | LIVE ON WEB | Proven live | Real preview + import flow on web. No app import surface found. | KEEP PUSHING NOW |
| Public profile / public collection | `apps/web/src/app/u/[slug]/page.tsx`, `apps/web/src/app/u/[slug]/collection/page.tsx`, `apps/web/src/app/u/[slug]/pokemon/[pokemon]/page.tsx` | None proven | `public_profiles`, `shared_cards`, shared card query helpers | LIVE ON WEB | Proven live | Public collector profile and shared collection pages are clearly routed and rendered on web. | KEEP PUSHING NOW |
| Shared card controls | `apps/web/src/components/vault/VaultCollectionView.tsx`, `apps/web/src/lib/sharedCards/toggleSharedCardAction.ts`, `saveSharedCardPublicNoteAction.ts`, `toggleSharedCardPublicImageAction.ts` | None proven | `shared_cards`, public profile sharing settings | LIVE ON WEB | Proven live | Share toggle, note, and public image controls are called from the live vault view. | VERIFY LIVE BEHAVIOR |
| Wall / recent activity | `apps/web/src/app/wall/page.tsx` | None proven | `v_recently_added` | LIVE ON WEB | Proven live | Authenticated personal wall exists on web only. | KEEP PUSHING NOW |
| Pricing / value display | Web pricing on `apps/web/src/app/card/[gv_id]/page.tsx`, `apps/web/src/components/pricing/*`, `apps/web/src/components/compare/CompareWorkspace.tsx`, `apps/web/src/components/explore/ExplorePageClient.tsx` | `lib/card_detail_screen.dart` | `card_print_active_prices`, live price request function, pricing workers | LIVE IN BOTH | Proven live | Pricing is live in both, but some UI copy still labels it beta/refining. | KEEP PUSHING NOW |
| Founder / admin dashboard | `apps/web/src/app/founder/page.tsx` | None proven | Telemetry, canonical vault analytics, slab compatibility reads | INTERNAL / ADMIN ONLY | Proven live | Real page, but founder-email gated and not collector-facing. | KEEP PUSHING NOW |
| Condition snapshot viewer | `apps/web/src/app/card/[gv_id]/page.tsx`, `apps/web/src/components/condition/ConditionSnapshotSection.tsx`, `apps/web/src/lib/condition/getConditionSnapshotsForCard.ts` | None proven | `condition_snapshots`, `vault_item_instances`, `vault_items` historical lineage | LIVE ON WEB | Proven live, real-data follow-up needed | Wired into the live web card page for authenticated users. Empty-state path is proven; real snapshot data still needs runtime verification. | VERIFY LIVE BEHAVIOR |
| Unassigned scan assignment UI | `apps/web/src/components/condition/AssignConditionSnapshotDialog.tsx`, `apps/web/src/lib/condition/assignConditionSnapshotAction.ts`, wired from card page condition section | None proven | `condition_snapshots`, assignment candidate helper, controlled `gv_vi_id` assignment lane | LIVE ON WEB | Reachable when qualifying data exists | This is wired into a live page, but appears only for unresolved scans with valid candidates. End-to-end runtime behavior with real data is still pending. | VERIFY LIVE BEHAVIOR |
| Identity scan add-to-vault flow | None proven | `lib/screens/identity_scan/identity_scan_screen.dart`, entered from `lib/main.dart` scan nav and vault FAB | `identity_scan_enqueue_v1`, identity result polling, vault add wrapper | LIVE IN APP | Proven live | Real scan entry from app nav and vault FAB. This is a core live app collector flow. | KEEP PUSHING NOW |
| Condition scan capture + fingerprint review | None proven | `lib/screens/scanner/condition_camera_screen.dart`, `scan_capture_screen.dart`, `quad_adjust_screen.dart`, launched from vault item tiles in `lib/main.dart` | Signed upload plan, `condition_snapshots_insert_v1`, analysis polling, fingerprint event RPC | LIVE IN APP | Proven live, flow depth still needs runtime verification | The screen stack is reachable from live app vault tiles and contains real upload/save/analysis/fingerprint review UI. | VERIFY LIVE BEHAVIOR |
| Legacy scan-identify placeholder | None proven | `lib/screens/scanner/scan_identify_screen.dart` | Calls placeholder `card-identify` function path | FUTURE / PARTIAL / DORMANT | Dead / unreferenced | File exists, but no current app navigation reaches it, and earlier audits already proved the identify path is incomplete. | PAUSE |
| Fingerprint / provenance history surfaces | No collector-facing route found | No collector-facing standalone history screen found | Fingerprint worker, provenance tables/RPCs, historical bindings | BACKEND READY / NOT WIRED | Backend exists without proven product surface | Fingerprint review exists inside live app scan capture, but no standalone collector-facing provenance/history surface is wired. | BACKEND ONLY FOR NOW |
| Marketplace / trade / listing product flow | No marketplace/trade route found; only listing counts in pricing/card displays | No marketplace/trade screen found; listing count shown in card detail only | eBay ingestion, pricing/listing data, seller sync workers | FUTURE / PARTIAL / DORMANT | Backend/data partial, no live product flow | Listing-derived value exists, but there is no proven buy/sell/trade/listing user flow. | DEFER |
| Slab ownership surfaces | No collector-facing slab route found | No collector-facing slab screen found | `slab_certs`, slab-aware analytics/pricing compatibility | BACKEND READY / NOT WIRED | Backend/data exists only | Slab support exists in schema and analytics, but no live collector ownership surface is wired. | BACKEND ONLY FOR NOW |

## Key Findings
- The real collector product today is centered on four live paths: browse cards, open card detail, add/remove cards in the vault, and scan cards in the mobile app.
- Web is the broader product surface. It owns public profiles, shared collection controls, import, compare, wall, and founder/admin views.
- Mobile is narrower but very real: Catalog, Vault, identity scan, condition scan capture, fingerprint review, and card detail are all wired from `lib/main.dart`.
- Recent ownership migration work was not speculative backend-only work. The vault write-path cutovers, read-path cutovers, and pricing detachment all support surfaces users can already touch.
- Some newer condition work is live in code but still needs real-data verification. The viewer and assignment dialog are wired into the web card page, but their non-empty states were not fully exercised locally because there were no real snapshot rows in the rebuilt local dataset.
- Older scanner audit docs that said the scan stack was unreachable are stale relative to current repo truth. `lib/main.dart` now wires both scan entry and vault-based scan capture.
- Marketplace, trade, slab ownership UI, and provenance history remain ahead of current product reality. The backend/data groundwork exists more than the collector-facing product does.

## Direct Answers to Q1–Q5
### Q1
The recent condition snapshot viewer and assignment flows are not backend-only. They are wired into the live web card page at `apps/web/src/app/card/[gv_id]/page.tsx` through `ConditionSnapshotSection` and `AssignConditionSnapshotDialog`, so they are website-visible when the authenticated user and qualifying snapshot data exist. The honest caveat is that they still need real-data runtime verification; locally, only the empty-state path was directly exercised.

### Q2
The most important real user-facing paths right now are:
- web card detail + add to vault
- web/app vault collection add/remove flows
- mobile identity scan -> add to vault
- mobile condition scan capture/fingerprint review
- web public profile/shared collection flows

### Q3
Recent work that still matters even when not broadly user-visible:
- `vault_owners`, `vault_item_instances`, and GVVI allocator work
- web/mobile ownership write cutover and canonical read cutover
- bucket retirement planning and historical `vault_item_id` isolation
- condition snapshot assignment lane and reconciliation playbooks
- pricing migration cleanup away from `vault_items.qty`

### Q4
Code paths that should be paused because they are ahead of live product reality:
- marketplace/trade/listing product surfaces
- slab ownership UI/product work
- standalone provenance/history UI
- legacy `ScanIdentifyScreen`
- deeper Category C reconciliation implementation beyond the now-wired condition viewer/assignment seam

### Q5
The single highest-value next execution lane is:

`VERIFY LIVE BEHAVIOR` on the real scan-to-condition surfaces that users can already touch, especially the mobile identity scan / condition scan path and the web card-page condition viewer + assignment states.

That is the shortest path to turning recent migration/reconciliation work into validated product behavior instead of more backend-first expansion.

## Recommended Immediate Focus
Focus next on runtime verification and polish of the live collector loop:
- mobile identity scan -> add to vault
- mobile condition scan capture -> fingerprint review
- web card detail -> condition snapshot viewer -> assignment action

Do not expand marketplace, slab UI, or deeper provenance product surfaces until these already-wired collector paths are proven with real user data.

## Result
PASS WITH FOLLOW-UP — most live product reality is now clear, but the newest condition surfaces and the scan/fingerprint stack still need real runtime verification against actual data.
