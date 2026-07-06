# P0 Foundations Audit

Date: 2026-07-06  
Branch: `codex/product-evolution-v2`  
Scope: audit only. No app, web, backend, or database implementation changes were made.

## Summary

| Area | Status | Evidence |
| --- | --- | --- |
| Messaging end to end | Mostly implemented in app and web; live two-account send not executed in this read-only gate | App path traced through `ContactOwnerButton`, `CardInteractionService`, `NetworkInboxScreen`, and `NetworkThreadScreen`; mock widget test passed |
| Push notifications | Not present today | No matches for FCM/APNs/device token/notification dispatcher terms across `lib`, `apps`, `backend`, `supabase/migrations`, or package manifests |
| UX plan PRs 1-9 | Merged into current baseline | Git log contains the PR-specific commits and guard tests in `test/app_flow_prod_readiness_test.dart` |
| E8 public rendering | Card pages and public walls render logged out; card OG is strong; wall OG is basic | `curl` returned 200 for a card and public wall; route code uses `notFound()` for non-public/unresolved profiles |
| Set/Dex completion | Computed from existing views/services; no new view needed for E1 watch | Dex uses `v_grookai_dex_species_v1` plus owned counts; set completion uses master-set variant-option denominator |

## 1. Messaging End To End

### App Path

Entry points:

| Entry | File evidence | Behavior |
| --- | --- | --- |
| Card detail collector contact | `lib/widgets/contact_owner_button.dart:196`, `:265`, `:276` | Composer sends through `_sendMessage`, then opens `NetworkThreadScreen` when a thread summary resolves |
| Feed action bar contact / choose-copy | Covered by `test/contact_owner_button_test.dart` | Direct contact and choose-copy flows are both exercised in widget tests |
| Inbox render | `lib/screens/network/network_inbox_screen.dart:56` | Loads `CardInteractionService.fetchThreadSummaries` and opens thread detail |
| Thread render / reply | `lib/screens/network/network_thread_screen.dart:70`, `:108`, `:144`, `:161` | Fetches messages, marks read, sends replies |

Service path:

| Stage | File evidence | Notes |
| --- | --- | --- |
| Send | `lib/services/network/card_interaction_service.dart:124` | Requires signed-in user, validates message, `vaultItemId`, and `cardPrintId` |
| Contact target | `lib/services/network/card_interaction_service.dart:162` | Reads `v_card_contact_targets_v1` before inserting |
| Duplicate guard | `lib/services/network/card_interaction_service.dart:200` | Dedupes same sender/receiver/card/message within 15 seconds |
| Insert | `lib/services/network/card_interaction_service.dart:224` | Inserts `card_interactions` |
| Summaries | `lib/services/network/card_interaction_service.dart:279`, `:339` | Groups `card_interactions`; joins unread state from `card_interaction_group_states` |
| Messages | `lib/services/network/card_interaction_service.dart:463`, `:484` | Fetches participant-pair messages for the card |
| Reply | `lib/services/network/card_interaction_service.dart:514`, `:616` | Verifies thread exists, inserts reply row |
| Mark read | `lib/services/network/card_interaction_service.dart:643`, `:667` | Updates `card_interaction_group_states` for the current user |

Web has the same table family:

| Web path | File evidence |
| --- | --- |
| Contact button action | `apps/web/src/components/network/ContactOwnerButton.tsx:108` |
| Create interaction | `apps/web/src/lib/network/createCardInteractionAction.ts:67`, `:150` |
| Reply | `apps/web/src/lib/network/replyToCardInteractionGroupAction.ts:39`, `:128` |
| Inbox/group state | `apps/web/src/lib/network/getUserCardInteractions.ts:306`, `:329`, `:371` |
| Read/archive/close state | `apps/web/src/lib/network/updateCardInteractionGroupStateAction.ts:93`, `:174` |

### Thread Model And RLS

Tables/views:

| Object | Migration evidence | Purpose |
| --- | --- | --- |
| `card_interactions` | `supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql:29` | Append-style message/event rows with sender, receiver, card, vault item, message, status |
| Participant select policy | `20260324091500_card_interaction_network_phase1_v1.sql:130` | Only sender or receiver can select rows |
| Contact-target insert policy | `20260324174000_add_card_contact_targets_view_v1.sql:3`, `:35` | Initial sends must target a public/shared/profile-enabled vault item from `v_card_contact_targets_v1` |
| Reply insert policy | `20260324183000_restore_card_interaction_reply_insert_policy_v1.sql:5` | Replies allowed when prior thread rows exist for the same participant pair/card/vault item |
| Append-only hardening | `20260324103000_make_card_interactions_append_only_phase1.sql:3` | Authenticated users cannot update message rows |
| `card_interaction_group_states` | `20260324143000_add_card_interaction_group_states_v1.sql:1` | Per-user grouped unread/archive/closed/read state |
| Unread trigger | `20260324143000_add_card_interaction_group_states_v1.sql:57`, `:133` | Sender row is read; receiver row is unread after each insert |

### Runtime Evidence

Executed:

```text
flutter test test/contact_owner_button_test.dart
```

Result:

```text
direct contact send opens the conversation
choose-copy contact send closes sheet and opens conversation
send failures stay visible in the composer
All tests passed
```

Not executed in P0:

| Requested evidence | Status | Reason |
| --- | --- | --- |
| Live message between two dev accounts | Not executed | P0 says audit-only/no implementation; a live send mutates `card_interactions` and requires two authenticated dev accounts |

### Push / E2 Dispatcher Hook

No push exists today. Search produced no matches for `device_tokens`, `notification_prefs`, `notifications_log`, `firebase_messaging`, `FirebaseMessaging`, `FCM`, `APNs`, `push_notifications`, `notification_dispatch`, or `expo-notifications` across app/web/backend/migrations/package manifests.

E2 dispatcher hook should attach after successful `card_interactions` insert, ideally server-side from the shared event/insert boundary rather than direct client push. Current insertion points are:

| Surface | Hook point |
| --- | --- |
| Flutter send | `CardInteractionService.sendMessage` after `card_interactions` insert |
| Flutter reply | `CardInteractionService.replyToThread` after `card_interactions` insert |
| Web send | `createCardInteractionAction` after `card_interactions` insert |
| Web reply | `replyToCardInteractionGroupAction` after `card_interactions` insert |
| Preferred DB event | `trg_sync_card_interaction_group_states_v1` or a new notification outbox triggered by `card_interactions` insert |

### Messaging Gaps

| Size | Gap |
| --- | --- |
| S | Run a controlled live two-account smoke test and record sender, receiver, unread, reply, and mark-read behavior |
| S | Add a small explicit manual test script/checklist for messaging, because current proof is widget-test plus code/RLS trace |
| S | The inbox empty copy mentions archive/closed controls not fully wired on mobile |
| M | Web and app duplicate messaging logic around `card_interactions`; shared server action/RPC would reduce drift |
| M | Add delivery/error telemetry for message sends and replies |
| L | E2 push notifications: token storage, preferences, notification outbox, dispatcher, badge counts, retry/dead-letter handling |

## 2. UX Plan PRs 1-9

Source plan: `Codex Implementation Plan v2.pdf` extracted to `.tmp/product_evolution_p0/codex_implementation_plan_v2.txt`.

| PR | Plan item | Status | Evidence |
| --- | --- | --- | --- |
| PR 1 | Shell nav dedupe | Merged | `81f586d0 style: dedupe app shell navigation`; guard tests at `test/app_flow_prod_readiness_test.dart:100`, `:117` |
| PR 2 | Dock geometry + Scan elevation | Merged | `06a2798e style: stabilize app bottom dock`; guard tests at `test/app_flow_prod_readiness_test.dart:289`, `:301` |
| PR 3 | Remove hidden nav from Search controls | Merged | `e0715cbe style: remove hidden search navigation shortcuts`; guard at `test/app_flow_prod_readiness_test.dart:320` |
| PR 4 | Copy & jargon sweep | Merged | `5b61fd21 copy: remove visible vault jargon`; guard at `test/app_flow_prod_readiness_test.dart:345` |
| PR 5 | Search filter collapse | Merged | `56a31e88 style: collapse search filters`; guard at `test/app_flow_prod_readiness_test.dart:333` |
| PR 6 | Vault filter collapse + search scope | Merged | `53be9c1d style: collapse vault filters`; guard at `test/app_flow_prod_readiness_test.dart:371` |
| PR 7 | One card shape | Merged | `4c2c55f2 style: unify card tile geometry`; guard at `test/app_flow_prod_readiness_test.dart:384` |
| PR 8 | Card Detail fixed action placement | Merged | `8797c65e style: fix card detail action bar` |
| PR 9 | Chip unification | Merged | `659fc8e9 style: unify vault copy chips`; guard at `test/app_flow_prod_readiness_test.dart:407` |

No open or stale PR 1-9 work was found in the current branch state. Later visual baseline commits (`88585170`, `9ce37a93`, `7d4e5814`, `b627b807`) sit on top of these PRs.

## 3. E8 Public Rendering Baseline

### Card Page

Live logged-out probe:

```text
GET https://grookaivault.com/card/GV-PK-JPN-CP4-037
status=200
length=97332
HTML contained: <title>, og:title, og:image, twitter:card, GV-PK-JPN-CP4-037, Magnemite
```

Code evidence:

| Requirement | Evidence |
| --- | --- |
| SSR metadata | `apps/web/src/app/card/[gv_id]/page.tsx:287` |
| Canonical URL | `apps/web/src/app/card/[gv_id]/page.tsx` returns `alternates.canonical` |
| OG title/description/image | `apps/web/src/app/card/[gv_id]/page.tsx:320` |
| Twitter card/image | `apps/web/src/app/card/[gv_id]/page.tsx:327` |
| Missing/noncanonical card behavior | `apps/web/src/app/card/[gv_id]/page.tsx:557` calls `notFound()` when card cannot resolve |

### Public Wall Page

Live logged-out probe:

```text
GET https://grookaivault.com/u/diegovzqz
status=200
length=42048
HTML contained: <title>, og:title, twitter:card, diegovzqz, Wall, Grookai Vault
```

Code evidence:

| Requirement | Evidence |
| --- | --- |
| Public wall route | `apps/web/src/app/u/[slug]/page.tsx` |
| Metadata | `apps/web/src/app/u/[slug]/page.tsx:32` |
| Logged-out public data path | `getPublicProfileBySlug` uses `createPublicServerClient` in `apps/web/src/lib/getPublicProfileBySlug.ts` |
| Non-public profile behavior | `getPublicProfileBySlug` returns `null` unless `public_profile_enabled`, `user_id`, `slug`, and `display_name` are present |
| Route 404 | `apps/web/src/app/u/[slug]/page.tsx:70` calls `notFound()` when profile is null |

Privacy probe:

```text
GET https://grookaivault.com/u/this-slug-should-not-exist-p0-404
status=404
```

Privacy note: if a profile is public but `vault_sharing_enabled=false`, the public profile route can still render the profile shell, but card wall data is not fetched (`profile.vault_sharing_enabled ? getPublicCollectorWallViewBySlug(...) : []`). Fully private/unresolved profiles 404.

### SEO / Crawl Controls

Live probes:

```text
GET https://grookaivault.com/robots.txt
status=200
Allow: /card/
Allow: /sitemaps/
Allow: /u/
Disallow: /ids
Disallow: /ids/cards
Disallow: /api/
Sitemap: https://grookaivault.com/sitemap.xml

GET https://grookaivault.com/sitemap.xml
status=200
locs include static, sets, profiles, cards/0, cards/1
```

Guard evidence: `apps/web/src/components/performance/publicRenderingCacheGuards.test.mjs:245` covers card sitemap/product identifier SEO, card sitemap page size, robots allows `/card/` and `/sitemaps/`, and robots disallows `/ids`, `/ids/cards`, and `/api/`.

E8 gap: wall pages expose title/description/Twitter summary, but no wall-specific `og:image` is currently set in `apps/web/src/app/u/[slug]/page.tsx`.

## 4. Set / Dex Completion Baseline For E1 Watch

### Dex Completion

Denominator view:

```sql
create or replace view public.v_grookai_dex_species_v1 as
select
  ps.id as species_id,
  ...
  count(distinct cps.card_print_id) filter (
    where cps.active = true
      and cps.counts_for_completion = true
  )::integer as total_print_count
from public.pokemon_species ps
left join public.card_print_species cps on cps.species_id = ps.id
group by ps.id, ...
```

Evidence: `supabase/migrations/20260518120000_grookai_dex_v1.sql:106`.

App/web computation today:

| Surface | File evidence | Formula |
| --- | --- | --- |
| Flutter Dex | `lib/services/grookai_dex/grookai_dex_service.dart:262`, `:290`, `:436` | Fetch `v_grookai_dex_species_v1`, fetch `v_grookai_dex_card_prints_v1` / `card_print_species` rows with `counts_for_completion=true`, join owned counts, compute `round(ownedPrintCount / totalPrintCount * 100)` |
| Web Dex list | `apps/web/src/lib/grookaiDex/getGrookaiDexSpecies.ts:76`, `:128`, `:171` | Same denominator and owned print count formula |
| Web Dex detail | `apps/web/src/lib/grookaiDex/getGrookaiDexSpeciesDetail.ts:132`, `:317`, `:373` | Filters `countsForCompletion`, then computes `round(ownedPrintCount / totalPrintCount * 100)` |

Exact E1 watch query for denominator health:

```sql
select
  species_id,
  display_name,
  national_dex_number,
  total_print_count
from public.v_grookai_dex_species_v1
where active = true
order by national_dex_number;
```

Exact E1 watch query for owned completion, parameterized by user:

```sql
select
  cps.species_id,
  count(distinct cps.card_print_id) filter (
    where cps.active = true and cps.counts_for_completion = true
  ) as total_print_count,
  count(distinct vii.card_print_id) filter (
    where vii.user_id = :user_id
      and vii.archived_at is null
  ) as owned_print_count
from public.card_print_species cps
left join public.vault_item_instances vii
  on vii.card_print_id = cps.card_print_id
where cps.active = true
  and cps.counts_for_completion = true
group by cps.species_id;
```

### Set Completion

App model:

| File | Formula |
| --- | --- |
| `lib/services/public/public_sets_service.dart:76` | `completionPercent = round(ownedVariantOptionCount / variantOptionCount * 100)` when signed in |

Web computation:

| File | Formula |
| --- | --- |
| `apps/web/src/lib/publicSetMasterSetStats.ts:188` | `variantOptionCount = printings.length + fallbackParentIds.length` |
| `apps/web/src/lib/publicSetMasterSetStats.ts:211` | `ownedVariantOptionCount = ownedPrintingIds.size + ownedFallbackParentIds.size` |
| `apps/web/src/lib/publicSetMasterSetStats.ts:215` | `completionPercent = round(ownedVariantOptionCount / variantOptionCount * 100)` |

Exact E1 watch shape for set completion:

```sql
-- Denominator: parent prints in set plus child printing options, falling back to parent when no child options exist.
-- Numerator: user's owned child printing IDs plus owned fallback parent IDs.
```

The production implementation is service-level rather than a single DB view today; E1 should watch `publicSetMasterSetStats.ts` and `PublicSetMasterSetStats` until a consolidated SQL view exists.

## Stop Point

P0 audit is complete. No code changes were made beyond this audit file. Recommended next gate: approve either a controlled live two-account messaging smoke test or move to the next product-evolution prompt with the messaging live-test gap explicitly carried forward.
