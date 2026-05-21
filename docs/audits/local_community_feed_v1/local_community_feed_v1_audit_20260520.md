# LOCAL_COMMUNITY_FEED_V1 Audit

Date: 2026-05-20  
Status: AUDIT_ONLY  
Scope: nearby collectors, nearby wall/feed freshness, and community discovery readiness.

## Executive Summary

Grookai already has enough social and wall infrastructure to support a future "collectors near me" lane, but it does not yet have the privacy/location layer required to do it safely.

The current system has:

- public collector profiles
- public wall/vault sharing
- wall sections
- follow graph
- trade/sell/showcase card intents
- global network stream views
- mobile network feed ranking/session freshness
- public comments/interactions/feed events

The current system does not have:

- collector location opt-in
- coarse location storage
- radius/privacy preferences
- local feed eligibility rules
- distance buckets
- block/mute safety controls
- local community read model or RPC
- local feed contract separating public wall visibility from local discoverability

Recommendation: proceed to contract. Do not add location fields directly to existing public views. Build a separate opt-in local discovery layer that reads already-public wall/in-play objects but never exposes precise coordinates.

## Repository Evidence

### Public Profile + Shared Wall Cards

Source:

- `supabase/migrations/20260313021000_public_profiles_shared_cards_v1.sql`
- `lib/services/public/public_collector_service.dart`
- `apps/web/src/lib/wallSections/getPublicWallCardsBySlug.ts`
- `apps/web/src/app/u/[slug]/page.tsx`

Findings:

- `public_profiles` supports `public_profile_enabled` and `vault_sharing_enabled`.
- `shared_cards` supports public card presentation with `share_intent`, public notes, personal-image flags, quantity/condition visibility, and wall category.
- Public read is allowed only when the card is shared and the owner profile is public with vault sharing enabled.
- This is a good source of "what a collector has chosen to show," but it is not a local discovery model.

### Wall Sections

Source:

- `supabase/migrations/20260422133000_wall_sections_data_model_v1.sql`
- `supabase/migrations/20260423000000_wall_sections_remove_public_gating_v1.sql`
- `apps/web/src/lib/wallSections/*`
- `lib/screens/public_collector/public_collector_screen.dart`

Live views:

- `v_wall_cards_v1`
- `v_wall_sections_v1`

Findings:

- Wall sections exist and are active.
- `v_wall_cards_v1` exposes public wall/in-play card data from `vault_item_instances` where owner profile and vault sharing are enabled.
- `v_wall_sections_v1` exposes public active sections.
- These views can be reused as source material for local feed cards, but should not be extended with precise location fields.

### Collector Follows

Source:

- `supabase/migrations/20260325143000_add_collector_follows_v1.sql`
- `lib/services/public/following_service.dart`
- `lib/services/public/collector_follow_service.dart`
- `apps/web/src/app/following/page.tsx`

Findings:

- `collector_follows` exists with no-self-follow and unique pair constraints.
- RLS allows authenticated users to see and manage only their own following rows.
- This is appropriate for "following" mode and future local personalization.
- It does not replace nearby discovery because the feed should show nearby public wall activity even without a follow relationship.

### Global Network Stream

Source:

- `supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql`
- `supabase/migrations/20260324171000_rebuild_card_stream_from_instance_intent_v1.sql`
- `supabase/migrations/20260324173000_fix_card_stream_slab_identity_resolution_v1.sql`
- `supabase/migrations/20260422120000_display_image_read_model_unification_v1.sql`
- `apps/web/src/lib/network/getCardStreamRows.ts`
- `lib/services/network/network_stream_service.dart`

Live view:

- `v_card_stream_v1`

Findings:

- The stream is global and currently based on `vault_item_instances.intent in ('trade', 'sell', 'showcase')`.
- It only includes owners with `public_profile_enabled = true` and `vault_sharing_enabled = true`.
- Web uses this view for `/network`.
- Mobile uses this view through `NetworkStreamService` and already supports `collectors` and `following` feed modes.
- The current view is granted to anon and authenticated clients. Local discovery should not add private location output to this view.

### Smart Feed Signals

Source:

- `supabase/migrations/20260414164857_ai_feed_intent_comments_v1.sql`
- `lib/services/network/smart_feed_service.dart`
- `lib/services/network/network_stream_service.dart`

Findings:

- `user_card_intents` stores durable per-card intent signals.
- `card_feed_events` stores append-only feed behavior such as impressions, opens, shares, add-to-vault, and wants.
- Mobile `SmartFeedService` uses wanted cards and recent events for ranking and anti-repeat behavior.
- Mobile `NetworkStreamService` already has session freshness, source diversity, following mode, and collector/discovery source buckets.
- These ranking primitives should be reused for local feed ordering, but they currently have no geography inputs.

### Interactions and Comments

Source:

- `supabase/migrations/20260324091500_card_interaction_network_phase1_v1.sql`
- `supabase/migrations/20260414164857_ai_feed_intent_comments_v1.sql`

Findings:

- `card_interactions` supports collector-to-collector contact around public trade/sell/showcase cards.
- `card_comments` supports public card-anchored comments.
- The contact model is already tied to public discoverable ownership.
- A local feed can route into existing contact/profile/card flows without inventing a new messaging layer.

## Live Schema Snapshot

Read-only linked DB checks were run through `supabase db query --linked`.

### Live Counts

| Metric | Count |
| --- | ---: |
| `public_profiles` | 26 |
| public enabled profiles | 26 |
| public + vault sharing profiles | 26 |
| public `shared_cards` | 45 |
| `collector_follows` | 5 |
| `user_card_intents` | 3 |
| public `user_card_intents` | 0 |
| `card_feed_events` | 214 |
| public `card_comments` | 1 |
| `v_card_stream_v1` rows | 23 |
| `wall_sections` | 3 |
| `wall_section_memberships` | 9 |
| `v_wall_cards_v1` rows | 26 |
| `v_wall_sections_v1` rows | 2 |

### Stream Intent Distribution

| Source | Value | Count |
| --- | --- | ---: |
| `shared_cards.share_intent` | shared | 45 |
| `v_card_stream_v1.intent` | sell | 17 |
| `v_card_stream_v1.intent` | showcase | 6 |

### Feed Event Distribution

| Event | Count |
| --- | ---: |
| impression | 152 |
| open_detail | 57 |
| want_on | 3 |
| add_to_vault | 1 |
| share | 1 |

### Location / Privacy Gaps

Live schema search found no collector-facing local discovery columns.

Location-like fields exist only in non-profile contexts:

- `listings.location_city`
- `listings.location_region`
- `listings.location_country`
- `price_observations.seller_location`

No active collector/public-profile fields were found for:

- latitude
- longitude
- geohash
- locality/city/region on profile
- radius preference
- nearby opt-in

Block/mute schema search found no current social blocking/muting surface for collectors.

## Current App/Web Surface Readiness

### Web

Already present:

- `/network` global card stream
- `/network/discover` collector search by display name or slug
- `/following`
- `/wall`
- `/u/[slug]`
- public wall sections
- profile follow controls

Missing for local feed:

- nearby feed entry point
- authenticated "near me" mode
- local opt-in/profile setting
- coarse area display
- distance bucket display
- block/mute controls
- local feed empty state

### Mobile

Already present:

- `NetworkScreen`
- `NetworkDiscoverScreen`
- `PublicCollectorScreen`
- following service
- follow/unfollow service
- wall card rendering
- smart feed session ranking and anti-repeat behavior

Missing for local feed:

- explicit local feed tab/mode
- location permission/entry flow
- privacy copy
- local opt-in toggle
- local area/radius preference
- block/mute controls
- local feed telemetry separation

## Risk Assessment

| Risk | Severity | Evidence | Required Contract Rule |
| --- | --- | --- | --- |
| Precise location leak | High | Current public views are anon-readable. | Never expose lat/lng or exact address in public views. |
| Public wall equals local opt-in | High | Profiles can be public today without local intent. | Local discoverability must be a separate opt-in. |
| Nearby feed harassment/spam | High | No block/mute schema found. | Add block/mute/report gating before broad local feed. |
| Admin-client overexposure | Medium | Web collector discover uses admin client. | Local read helpers must project only safe fields. |
| Feed ranking drift | Medium | Existing ranking mixes collector and discovery rows. | Local rows need an explicit source bucket and lower/clear priority rules. |
| Empty local markets | Medium | Only 26 public sharing profiles today. | Include graceful "expand radius/follow collectors" empty states. |
| Privacy expectation mismatch | Medium | Existing profile settings mention public/vault sharing, not locality. | Add clear UX copy and reversible local visibility setting. |

## Reusable Building Blocks

Recommended reuse:

- `public_profiles` for profile identity and public profile gate.
- `shared_cards` and `v_wall_cards_v1` for wall card source material.
- `vault_item_instances.intent` for trade/sell/showcase availability.
- `collector_follows` for followed collectors and personalization.
- `card_feed_events` for anti-repeat and ranking memory.
- `card_interactions` for contact flows.
- existing profile/wall routes for navigation targets.

Do not reuse directly:

- `v_card_stream_v1` as the final local feed surface if it would require adding location columns.
- legacy `listings.location_*` for collector locality.
- `price_observations.seller_location` for user location.

## Contract Requirements For Next Phase

The next contract should define:

1. Local visibility is a separate opt-in from public profile and vault sharing.
2. Store only coarse location for discovery, preferably geohash/cell plus public area label.
3. Never expose exact lat/lng, address, IP-derived location, or raw location provider payloads.
4. Nearby feed must require authenticated viewer access.
5. Public anonymous pages may show public walls but must not show "near me" ordering.
6. Nearby results should expose only safe labels such as "nearby", "within 25 mi", or "Denver area".
7. Add collector block/mute before public local feed expansion.
8. Local feed source should be a dedicated read model/RPC, not direct client filtering over all collectors.
9. Feed rows should preserve identity hierarchy: card identity first, owner/local context second.
10. No Species Dex, scanner, pricing, or card identity changes.

## Proposed Phases

### Phase 1: Contract

Create `LOCAL_COMMUNITY_FEED_V1` contract with privacy, data model, read model, and UI rules.

### Phase 2: No-Write Location Readiness Audit

Audit profile settings, existing user metadata, and possible location providers. No writes.

### Phase 3: Schema Draft

Draft nullable, opt-in tables:

- collector local settings
- coarse location cell
- radius preference
- block/mute controls

No apply until replay and privacy gates pass.

### Phase 4: Local Feed Dry Run

Generate feed candidates from existing wall/in-play rows using mock/coarse locality evidence. No app integration.

### Phase 5: Apply + Private Preview

Enable for authenticated preview/staging only, with manual opt-in accounts.

### Phase 6: Web/Mobile UI

Add local feed surfaces after privacy and ranking are proven.

## Audit Decision

Proceed to contract.

Current state is not ready for implementation because locality, opt-in, and block/mute safety are missing. It is ready for a focused contract because the social/wall/feed primitives already exist and should be reused.

## No-Write Confirmation

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No public route behavior changes.
- No local feed implementation.
