# E5 Plan - Card Journeys

Status: approved for PR 1 after amendments. UI remains design-gated; no visible Flutter Card Journey work until high-fidelity mockups are approved.

Date: 2026-07-08

Branch: `engage/card-journeys`

Baseline: `main` includes E1 interest graph, E2 notifications, E3 want-match engine, and E4 Pulse. E4 was merged at `06a493a7`. The non-blocking push-tap carry-forward remains open: killed-app and background push tap to Pulse on iOS and Android, including E2's cold-start proof.

## Objective

Add a Card Journeys section to card detail that explains what is happening around this exact card print without exposing private collectors or inventing activity.

The section is app-only/authenticated in v1 and is fed by `card_events` plus current public vault and wishlist aggregates:

- Ownership snapshot: `15 collectors own this · 4 for trade · 2 for sale · 8 want a copy`.
- Moments: newest public added/completion events, max 5 in the initial card detail section, with a `See all` expansion.
- Recent geography: aggregate city/area activity from public collector locality labels, never named individual movement.
- Value context: read-only reuse of the existing price trend spark and pricing surface.
- Honest empty state copy lives in the app: `You could be the first to vault this card`.

## Hard Boundaries

- No pricing writes, pricing worker changes, or pricing model changes.
- No identity writes or card-family promotion changes.
- No synthetic activity.
- No private copy exposure.
- No named individual movement or collector-level geography trail.
- No anon/public web Journey RPCs in v1.
- No Flutter UI implementation until high-fidelity mockups are approved.
- Card Journeys v1 is scoped to the exact `card_print_id` shown on card detail. Family-level journeys are out of scope for v1.
- No new pulled event type. V1 moments are added moments plus set/Dex completion crossings only.

## Data Sources

### Reused Sources

- `card_events`: persistent event stream for public `vault_added`, `set_completion_crossed`, and `dex_completion_crossed` moments.
- Public vault/current-copy sources: used for current ownership and public intent counts.
- Public profile visibility: used to gate aggregate want counts because no public-want gate exists.
- `collector_local_discovery_settings`: source for the same public area/proximity label used by the feed's proximity buckets.
- Existing card detail pricing read layer: source for value spark and trend context.

### New Aggregate Layer

E5 adds read-only query contracts. It does not add new emitters in PR 1. The snapshot is current-state truth, so it is derived from live public copy/want sources instead of replaying events. Moments are event history, so they are derived from `card_events`.

The privacy gate must reuse the shared E3 predicate lineage used by `local_community_feed_v2` and want-match. `card_journey_public_copy_sources_v1` must build on those shared gate function(s). If a required gate building block is not reusable yet, PR 1 extracts it first and proves the existing feed signature and output shape are unchanged, following the E3 PR 1 pattern.

If performance requires precomputation later, a cache can be proposed as a follow-up. E5 v1 starts with security-definer RPCs and indexed views/functions before adding persisted aggregate state.

## Proposed SQL Contracts

All client-facing RPCs use the E1/E4 pattern:

- `security definer`
- `set search_path = public`
- viewer is `auth.uid()`, not a caller-supplied user id
- authenticated users only
- keyset pagination for lists
- no direct table grants beyond required `execute`
- RLS and privacy gates tested with two authenticated users plus anon denial

The snapshot RPC should be structured so a future E8 anon counts-only wrapper can reuse the internal aggregate without exposing viewer-specific lists or moments.

### 1. `public.card_journey_public_copy_sources_v1`

Internal helper function, not directly granted to clients.

Purpose: normalize all public current-copy rows for one `card_print_id`.

Rules:

- build on the shared E3 privacy-gate function(s), not a third implementation
- collector profile is public
- vault sharing is enabled
- copy/intent is public
- viewer has not blocked or muted the collector
- collector has not blocked the viewer
- private copies are excluded
- exact card print only

Expected internal fields:

- `card_print_id`
- `collector_user_id`
- `public_profile_id`
- `display_name`
- `copy_count`
- `intent` (`trade`, `sale`, `showcase`, or null)
- `public_copy_created_at`
- `area_label`

PR 1 must name the exact `collector_local_discovery_settings` column used for `area_label`, and it must match the feed's proximity bucket label source.

The function must return only what downstream Journey RPCs need. It must not expose private vault item ids.

### 2. `public.card_journey_snapshot_v1(p_card_print_id uuid)`

Client-facing RPC.

Returns one row for the exact card print:

- `card_print_id`
- `owner_collector_count`
- `trade_collector_count`
- `sale_collector_count`
- `want_collector_count`
- `moment_count`
- `geography_area_count`
- `has_public_activity`

Rules:

- ownership, trade, and sale counts are distinct public collectors, not raw copies
- trade and sale counts come only from public intents
- private copies count as zero
- want count is aggregate-only in v1
- wants are gated by public profile because no public-want gate exists
- the RPC does not return `empty_state_copy`; empty-state copy lives in the app

### 3. `public.card_journey_collectors_v1(...)`

Client-facing RPC for expandable owner and intent lists.

Parameters:

- `p_card_print_id uuid`
- `p_kind text` constrained to `owners`, `trade`, or `sale`
- `p_limit int default 20`
- `p_after_created_at timestamptz default null`
- `p_after_user_id uuid default null`

Returns:

- collector display fields already safe for public collector surfaces
- `public_profile_id`
- `display_name`
- `avatar_url`
- `intent`
- `copy_count`
- `created_at`
- keyset cursor fields

Rules:

- same shared privacy gates as the snapshot
- no private vault item ids
- no `want` collector list in v1 because no public-want gate exists
- owners list includes all public owners
- intent is returned as a chip
- contact affordance is UI-only and appears only on trade/sale rows
- keyset order: newest public activity first, tie-breaker by collector user id

### 4. `public.card_journey_moments_v1(...)`

Client-facing RPC for persistent one-line events.

Parameters:

- `p_card_print_id uuid`
- `p_limit int default 5`
- `p_after_created_at timestamptz default null`
- `p_after_event_id uuid default null`

Returns display-safe fields only:

- `event_id`
- `event_type`
- `created_at`
- `actor_display_name`
- `actor_public_profile_id`
- `card_print_id`
- `moment_line`
- keyset cursor fields

Rules:

- no raw `payload jsonb` is returned
- newest first
- initial card detail call asks for max 5
- `See all` can request additional pages with the keyset cursor
- hard cap per page: 50
- only public events that pass viewer privacy gates
- no private actor/event leakage
- no pulled moments in v1
- consume the base public `vault_added` event only
- repeated `vault_added` events by the same actor for the same exact card collapse into one counted moment, e.g. `added 3 copies of <card>`
- scanner's private enriched twin must never produce a second moment
- dedupe fixture test must prove base `vault_added` plus scanner-enriched twin sharing a `gvvi_id` yields one moment

V1 event mapping:

- `vault_added` -> added moment
- `set_completion_crossed` -> completed moment if payload references this card or set context is card-relevant
- `dex_completion_crossed` -> completed moment if payload references this card or species context is card-relevant

### 5. `public.card_journey_geography_v1(p_card_print_id uuid)`

Client-facing RPC.

Returns aggregate city/area context only:

- `area_label`
- `collector_count`
- `last_public_activity_at`
- `rank`

Rules:

- source is public copies from `card_journey_public_copy_sources_v1`
- use the same area label source as the feed's proximity buckets
- never returns collector names, collector ids, profile ids, avatars, or copy ids
- never returns a sequence that implies an individual person's movement
- no per-row k-threshold because area labels are already public through the feed
- the geography block is returned/shown only when there are at least 2 distinct areas
- framing is recent public activity, not card movement

### 6. Value Context

Default: reuse the existing pricing read layer from the app service. Do not add a new RPC in PR 1 unless reuse proves impossible.

If PR 1 proves reuse impossible, add `public.card_journey_value_context_v1(p_card_print_id uuid)` only with the documented reason and as a read-only wrapper over existing pricing surfaces.

V1 behavior:

- current Grookai Value or display value comes from existing app pricing reads
- spark/trend points come from existing app pricing reads when already exposed
- no pricing tables are written
- no pricing logic is changed
- no pricing worker is changed
- no authoritative completed-trade source exists, so `hand_change_count` is null in v1 and the UI hides that line

## RLS and Privacy Strategy

E5 is privacy-first. The same card can have public and private copies; only public copies may influence Journey surfaces.

Proof requirements:

- anon cannot execute Journey RPCs in v1
- user A cannot see user B's private copy in snapshot counts
- user A cannot see user B's private copy in expandable collectors
- user A cannot see user B's private `card_events` as moments
- base `vault_added` plus scanner enriched private twin produces one moment, never two
- blocks and mutes remove the blocked/muted collector from counts, lists, moments, and geography
- a private owner cannot affect geography aggregation
- private wants do not affect want count
- want count is aggregate-only and never returns a want collector list
- geography rows never contain a user id, public profile id, display name, avatar, or copy id
- `local_community_feed_v2` signature and output shape are unchanged if PR 1 extracts a reusable gate helper

## UI Contract

UI is design-gated. PR 1 and PR 2 can build data contracts and app services, but visible Flutter work waits for approved mockups.

The planned Journey section should support these content blocks:

- compact ownership snapshot line
- expandable public collector lists for owners, trade, and sale
- max 5 moments plus `See all`
- recent geography aggregate only when at least 2 distinct areas exist
- read-only value context spark from the existing pricing read layer
- app-owned empty state copy

No final layout, spacing, iconography, or card-detail placement is approved by this plan.

## PR Breakdown

### PR 1 - Query Contracts and Privacy Tests

Scope:

- reuse or extract shared E3 privacy-gate function(s)
- prove `local_community_feed_v2` signature and output shape unchanged if extraction is needed
- add `card_journey_public_copy_sources_v1`
- add `card_journey_snapshot_v1`
- add `card_journey_collectors_v1`
- add `card_journey_moments_v1`
- add `card_journey_geography_v1`
- reuse the app's existing pricing read layer; add `card_journey_value_context_v1` only if reuse proves impossible and document why
- add contract tests and local fixtures

Gate:

- fresh local migration chain applies
- snapshot counts public owners/trade/sale correctly
- want count is aggregate-only and gated by public profile
- private copy never appears in count, list, moment, or geography
- block/mute fixture suppresses rows everywhere
- moments return newest first, max 5 by default, and keyset pagination works
- scanner base/enriched `gvvi_id` fixture yields one public moment
- duplicate same-actor `vault_added` events for the same exact card yield one counted moment, not repeated lines
- moments return no raw payload jsonb
- geography returns aggregate area rows only and only when at least 2 distinct areas exist
- PR 1 names and proves the area label source matches the feed proximity bucket source
- value context proves no new pricing RPC unless app-service reuse is impossible
- no Flutter UI changes

### PR 2 - App Service Integration Behind Feature Flag

Scope:

- add Flutter service/models for Card Journey RPCs
- add repository/provider wiring behind a feature flag
- add loading/error/empty data states at the service layer only
- reuse existing app pricing read service for value context
- no visible Card Detail UI unless approved mockups already exist

Gate:

- `flutter analyze`
- `flutter test`
- service tests cover empty state, public snapshot, private suppression, aggregate-only wants, and RPC failure
- no card detail visual changes without design approval

### PR 3 - Design-Gated Card Detail UI

Scope:

- build the approved Card Journey section on card detail
- use the service contracts from PR 2
- keep pricing context read-only
- keep private data invisible
- show contact affordance only on trade/sale owner rows

Gate:

- approved high-fidelity mockups attached or referenced
- screenshots for empty, low-activity, and active Journey states
- expandable list screenshots for owners/trade/sale
- no private fixture data visible in UI
- `flutter analyze`
- `flutter test`
- shipcheck if the repo convention requires it before merge

## Rollback Notes

PR 1 migration rollback:

- drop Journey RPC grants
- drop `card_journey_value_context_v1` if added
- drop `card_journey_geography_v1`
- drop `card_journey_moments_v1`
- drop `card_journey_collectors_v1`
- drop `card_journey_snapshot_v1`
- drop `card_journey_public_copy_sources_v1`
- drop only newly extracted helper functions if no existing surface uses them; otherwise leave shared helpers in place and roll them back in a coordinated migration

No data rows should be created by E5 PR 1. Rollback is function/view removal only.

PR 2 rollback:

- disable the feature flag
- remove service/model calls
- no database rollback required

PR 3 rollback:

- disable the feature flag to hide Journey UI
- keep read RPCs available unless a separate database rollback is requested

## Resolved Spec Decisions

1. V1 is app-only/authenticated. No anon paths. `snapshot_v1` should be structured so a future E8 anon counts-only wrapper can reuse it.
2. No public-want gate exists. `want_collector_count` is aggregate-only, gated by public profile. `want` is removed from `card_journey_collectors_v1` kinds in v1.
3. No pulled event type exists. V1 moments are added plus set/Dex completion crossings only.
4. Geography has no per-row k-threshold because area labels are already public through the feed. The block returns/shows only when at least 2 distinct areas exist and never links areas to a specific copy.
5. PR 1 must name the exact `collector_local_discovery_settings` area label column used by the feed's proximity buckets.
6. No authoritative completed-trade source exists. `hand_change_count` is null in v1 and the UI hides the line.
7. Owners list includes all public owners with intent as a chip. Contact affordance appears only on trade/sale rows.
8. Exact `card_print_id` only. Family-level journeys are out of scope for v1.

## Non-Blocking Carry-Forward

These remain open from E2/E4 and are not part of E5 implementation:

- killed-app push tap -> Pulse proof on iOS and Android
- background push tap -> Pulse proof on iOS and Android
- E2 cold-start push-open proof
