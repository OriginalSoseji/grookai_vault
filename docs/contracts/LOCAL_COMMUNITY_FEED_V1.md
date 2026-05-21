# LOCAL_COMMUNITY_FEED_V1

Status: Draft contract  
Date: 2026-05-20

## Purpose

Define the governed path for local collector discovery: a feed where signed-in collectors can see public wall activity from nearby collectors, even when they are not already friends or follows.

This contract exists because Grookai already has public profiles, walls, follows, card intents, and network feeds. Local discovery must reuse those primitives without leaking precise location or turning every public wall into a local signal by default.

This contract does not authorize schema apply, DB writes, UI implementation, scanner changes, pricing changes, Species Dex changes, or public route changes.

## Product Goal

The feature should answer:

```text
What are collectors near me showing, trading, or selling right now?
```

The feed should feel fresh and community-driven:

- nearby wall posts
- nearby trade/sell/showcase cards
- nearby collectors worth following
- existing public wall/profile routes
- existing contact flows

The feed must not feel like:

- exact location tracking
- marketplace-only sorting
- a private vault leak
- a friend graph clone
- a card identity/search replacement

## Existing Authorities

The contract is grounded in:

- `docs/audits/local_community_feed_v1/local_community_feed_v1_audit_20260520.md`
- `public.public_profiles`
- `public.shared_cards`
- `public.wall_sections`
- `public.wall_section_memberships`
- `public.v_wall_cards_v1`
- `public.v_wall_sections_v1`
- `public.collector_follows`
- `public.v_card_stream_v1`
- `public.card_feed_events`
- `public.card_interactions`
- `public.card_comments`

## Non-Negotiable Privacy Rules

Local discovery is opt-in.

A collector is eligible for local discovery only when all are true:

- public profile is enabled
- vault sharing is enabled
- local discovery is explicitly enabled
- the card/copy is already public through wall or trade/sell/showcase intent
- the viewer is allowed to see the row after block/mute checks

Local discovery must never expose:

- exact latitude
- exact longitude
- street address
- raw GPS payload
- IP-derived location payload
- device location history
- home/work inference
- full geohash precision

App-facing local responses may expose only safe locality labels:

```text
Nearby
Within 10 mi
Within 25 mi
Denver area
Same region
```

Exact distance should be avoided in V1 unless it is bucketed and coarse.

## Visibility Layers

### Public Profile Visibility

Controlled by:

```text
public_profiles.public_profile_enabled
```

This only means the collector has a public profile.

### Public Vault/Wall Visibility

Controlled by:

```text
public_profiles.vault_sharing_enabled
shared_cards.is_shared
vault_item_instances.intent in ('trade', 'sell', 'showcase')
```

This only means the collector has chosen to show cards publicly.

### Local Discovery Visibility

Must be a separate setting.

Recommended future field/table concept:

```text
collector_local_discovery_settings.local_discovery_enabled
```

Public profile and wall sharing must not automatically opt a user into local discovery.

## Location Model

V1 must use coarse location only.

Recommended future fields:

```text
user_id
local_discovery_enabled
area_label
region_code
country_code
geohash_prefix
radius_miles
location_precision
updated_at
```

Allowed precision:

- city/metro/region label
- region/country
- truncated geohash or equivalent cell
- radius bucket

Disallowed precision:

- exact lat/lng in app-facing read models
- full geohash in app-facing read models
- client-side filtering over all collector locations
- public anonymous nearby results

## Feed Eligibility

A local feed row may include a card only when the source row is already public under existing rules.

Allowed source surfaces:

- `v_wall_cards_v1`
- future wall-section view helpers derived from `v_wall_cards_v1`
- `v_card_stream_v1` for trade/sell/showcase in-play cards

Not allowed as direct feed source:

- private `vault_item_instances`
- private `vault_items`
- private `user_card_intents`
- private `card_feed_events`
- private profile records where public profile is disabled
- exact user location rows

## Viewer Eligibility

Nearby feed requires an authenticated viewer.

Anonymous users may view normal public pages that already exist, such as:

```text
/u/[slug]
/network
```

Anonymous users must not receive local ordering or nearby labels.

## Block, Mute, And Safety

Before broad release, local discovery must support collector-level blocking or muting.

Minimum future controls:

- viewer blocks collector
- collector blocks viewer
- viewer mutes collector from feed
- reported content can be excluded from local feed if moderation state requires it

Local feed read models must exclude blocked relationships in both directions.

If block/mute schema is not implemented, local feed can be preview-only but must not be broadly enabled.

## Read Model Contract

Local feed should use a dedicated read model or RPC. It must not add location fields to globally readable views such as `v_card_stream_v1`.

Recommended future RPC shape:

```text
local_community_feed_v1(
  p_viewer_user_id uuid,
  p_radius_miles integer default null,
  p_limit integer default 40,
  p_cursor text default null
)
```

Required response concepts:

- source row id
- source type: wall_card, trade, sell, showcase, collector
- owner public slug
- owner display name
- owner avatar url when public
- card parent `gv_id`
- card display identity
- selected finish/variant label when public source has it
- image URL resolved through existing image rules
- safe locality label
- distance bucket
- relationship context: following, not_following, muted_allowed false
- created/update timestamp
- route target

Must not return:

- raw owner email
- raw private user metadata
- exact location
- raw coordinates
- private vault rows
- raw location provider payload

## Ranking Contract

Ranking should preserve Grookai interaction hierarchy:

1. card identity
2. selected finish/variant
3. ownership/public wall state
4. interaction/action
5. price
6. local context
7. cameo/search context
8. metadata
9. diagnostics

Local proximity is a feed relevance signal, not card identity.

Recommended rank order:

1. viewer-followed nearby collectors with fresh public wall activity
2. nearby trade/sell/showcase cards matching viewer interests
3. nearby public wall cards with recent activity
4. nearby collectors with strong wall completeness/activity
5. broader radius fallback

Ranking may use:

- existing `card_feed_events`
- existing follows
- existing trade/sell/showcase intent
- recency
- source diversity
- anti-repeat memory
- card identity/taste signals

Ranking must not use:

- hidden exact location
- private vault contents
- private want data from other users unless explicitly public
- pricing as the primary sort key

## UI Contract

### Web

Likely surfaces:

```text
/network?scope=nearby
/network/nearby
```

The final route can be decided later, but UI must make the privacy state clear.

Required UI states:

- local discovery off
- location not set
- no nearby collectors
- expand radius
- nearby wall activity
- nearby collector cards
- blocked/muted exclusion

Required copy principles:

- short
- calm
- privacy-forward
- no exact distance promises
- no "people are near your house" framing

### Mobile

Likely surface:

```text
Network -> Nearby
```

Mobile must reuse the same result contract as web. It must not implement a separate local discovery algorithm that can disagree with web.

## Routes And Navigation

Local feed rows should route to existing surfaces:

- card detail: `/card/<parent_gv_id>`
- public wall: `/u/<slug>`
- public wall section: `/u/<slug>/section/<section_id>`
- exact copy route where already supported and authorized
- existing contact owner flow

This contract does not create new public child-printing routes.

## Search Relationship

Local community feed is not semantic search.

Search may later include local filters such as:

```text
charizard near me
nearby collectors with pikachu
trade pikachu near me
```

But that requires a separate search integration contract. Local discovery data must remain supplemental context, not card identity.

## Schema Direction

Future schema should be additive and nullable.

Expected future tables:

```text
collector_local_discovery_settings
collector_local_blocks
collector_local_mutes
```

Optional future views/RPCs:

```text
v_local_community_feed_candidates_v1
local_community_feed_v1(...)
```

All future migrations must be replayable, gated, and audited before apply.

## Rollout Gates

Required before implementation:

- contract accepted
- no-write data model plan
- local privacy threat audit
- block/mute design
- dry-run feed candidate generation

Required before preview/staging:

- migration replay passes
- local feed RPC returns no raw coordinates
- blocked/muted collectors excluded
- anonymous access rejected
- mobile and web consume same response contract

Required before production:

- authenticated browser smoke
- Android smoke
- privacy copy reviewed
- local opt-in/off flows verified
- local off state hides user from feed
- no precise location visible in logs or UI

## Explicit Non-Goals

This contract does not approve:

- DB writes
- migrations
- location collection
- public launch
- pricing changes
- scanner changes
- Species Dex changes
- card identity changes
- public child-printing routes
- automatic matching of collectors by exact coordinates

## Success Definition

`LOCAL_COMMUNITY_FEED_V1` is successful when a signed-in collector can opt into local discovery and see fresh public wall/in-play cards from nearby opted-in collectors, while the system exposes only coarse locality context and preserves all existing public wall/profile privacy boundaries.

