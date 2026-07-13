# E6 Plan - Retention-Ladder Onboarding

Status: approved for PR 1 after amendments. PR 4 UI is design-gated; no visible onboarding UI until high-fidelity mockups are approved.

Date: 2026-07-09

Branch: `engage/retention-onboarding`

Baseline: `main` includes E1 interest graph, E2 notifications, E3 want-match engine, E4 Pulse, E5 Card Journeys, Scanner V5 production endpoint wiring, and the July 9 MEE/TCGCSV nightly worker repairs.

## Objective

Add a skippable day-1 onboarding ladder that helps a new collector do three concrete things:

1. Own something: scan a card as the primary path, with search-add as fallback.
2. Want something: add a card to the canonical want system through search or set browsing.
3. Follow relevant collectors: suggest 2-3 collectors ranked by set overlap and proximity bucket, never popularity.

Once the user has at least one owned card and at least one wanted card, the app states the loop plainly:

> We'll tell you when a copy of <card> appears near you or for trade.

The flow must be quiet, premium, and non-coercive. No streaks, guilt checklists, synthetic social activity, infinite feeds, or "we miss you" messaging.

## Current Foundation

### Available Primitives

- Scanner V5 app path exists and defaults to `https://scanner-identity.grookaivault.com/scanner-v5/identify`.
- Scan-confirmed vault adds call `VaultCardService.addOrIncrementVaultItem`.
- Search/card-detail vault adds call the same `VaultCardService.addOrIncrementVaultItem`.
- E1 DB triggers emit base `vault_added` events and watch rows from `vault_item_instances`.
- E1 completion wrappers emit set/Dex completion crossings after vault adds.
- E2 notification dispatcher is live-proven.
- E3 want-match engine and Pulse delivery are live-proven.
- Follows write to `collector_follows` through `CollectorFollowService`.
- Follow insert/delete triggers already emit E1 follow events and watch rows.

### Important Gap Found During Planning

The Product Evolution prompt names `wishlist_items` as the want source, and E1/E3 matching is built on `wishlist_items`.

The current visible app want control in `CardEngagementService.setWant` writes `user_card_intents.want`, not `wishlist_items`.

E6 must not pretend these are the same. PR 1 resolves this with the approved bridge approach:

- add a DB trigger that keeps `wishlist_items` in sync with `user_card_intents.want=true/false`
- make the bridge idempotent so repeated `want=true` writes do not create duplicate wishlist rows or duplicate E1 `want_added` events
- keep existing E1 `wishlist_items` triggers as the only source of `want_added` / `want_removed` card events and watches
- preserve the app's existing want actions everywhere: search, card detail, set browse, and any current surface using `CardEngagementService.setWant`
- Not acceptable: recording an onboarding rung as "wanted" from `user_card_intents` while E3 cannot match from it.

The gate is explicit: after any existing app want action, the user has a `wishlist_items` row, a `watches(reason='want')` row, and the E3 want-match predicate can see the want.

## Hard Boundaries

- No pricing writes or pricing worker changes.
- No identity writes, scanner identity changes, or image/storage writes.
- No notification type changes unless routed through the existing E2 dispatcher.
- No new generic social mechanics.
- No raw popularity ranking.
- No onboarding surfaces that block normal app usage.
- No repeated onboarding after a user has completed or permanently skipped the ladder.
- No visible onboarding UI until high-fidelity mockups are approved.
- Scanner V5 service/crop/identity behavior is out of scope; E6 only routes users into the existing scanner path.

## Proposed Schema

### 1. `public.onboarding_ladder_state`

Owner-only state for each user.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `owned_completed_at timestamptz null`
- `owned_card_print_id uuid null references public.card_prints(id) on delete set null`
- `owned_source text null check in ('scan','search','manual_existing')`
- `wanted_completed_at timestamptz null`
- `wanted_card_print_id uuid null references public.card_prints(id) on delete set null`
- `wanted_source text null check in ('search','set_browse','manual_existing')`
- `loop_promise_shown_at timestamptz null`
- `suggestions_shown_at timestamptz null`
- `first_followed_at timestamptz null`
- `first_followed_user_id uuid null references auth.users(id) on delete set null`
- `first_pulse_with_item_at timestamptz null`
- `first_message_at timestamptz null`
- `first_match_acted_at timestamptz null`
- `skipped_at timestamptz null`
- `dismissed_forever_at timestamptz null`
- `completed_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS:

- authenticated users can select their own state
- authenticated users can update only skip/dismiss fields through RPC, not direct table writes
- service-role/security-definer RPCs update rung fields
- anon denied

### 2. `public.onboarding_ladder_events`

Append-only private analytics/event log for E6 and E7 conversion rollups.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `card_print_id uuid null references public.card_prints(id) on delete set null`
- `collector_user_id uuid null references auth.users(id) on delete set null`
- `source text null`
- `payload jsonb not null default '{}'::jsonb`
- `dedupe_key text null`
- `created_at timestamptz not null default now()`

Allowed event types:

- `rung_1_owned`
- `rung_1_wanted`
- `rung_2_followed`
- `rung_2_first_pulse_with_item`
- `rung_3_first_message`
- `rung_3_first_match_acted`
- `onboarding_skipped`
- `onboarding_dismissed`
- `loop_promise_shown`
- `collector_suggestions_shown`

Rules:

- append-only: no update/delete for authenticated users
- owner-only select
- service-role can read for E7 rollups
- unique partial index on `dedupe_key where dedupe_key is not null`
- event payload must be an object

Why a separate table instead of `card_events`:

- onboarding events are private product-conversion telemetry, not public card activity
- E7 needs ladder conversion without mixing onboarding state into Pulse/Card Journeys
- rung events can still be card-anchored where applicable through `card_print_id`

### 3. RPCs

`public.onboarding_ladder_state_v1()`

- authenticated only
- returns current state plus derived booleans:
  - `needs_owned`
  - `needs_wanted`
  - `should_show_loop_promise`
  - `should_show_collector_suggestions`
  - `is_complete`
  - `is_dismissed`
- if no row exists, creates or returns a virtual empty state through security-definer logic
- must also detect existing users:
  - if they already own a card, backfill `owned_completed_at` with source `manual_existing`
  - if they already have a canonical `wishlist_items` want, backfill `wanted_completed_at` with source `manual_existing`

`public.onboarding_record_rung_v1(p_event_type text, p_card_print_id uuid default null, p_collector_user_id uuid default null, p_source text default null, p_payload jsonb default '{}')`

- authenticated only
- validates event type and ownership of the event
- upserts the corresponding state column only once
- inserts an `onboarding_ladder_events` row with a deterministic dedupe key
- never marks `completed_at` until owned + wanted + either followed or skipped suggestions

`public.onboarding_skip_v1(p_scope text)`

- authenticated only
- `p_scope` values:
  - `step` for current prompt only
  - `all` for permanent dismissal
- writes `onboarding_skipped` or `onboarding_dismissed`
- lands the user in the usable app immediately

`public.onboarding_collector_suggestions_v1(p_limit int default 3)`

- authenticated only
- returns 2-3 collectors, if available
- excludes self, blocked/muted relationships, already-followed collectors, and non-public profiles
- uses the same shared public-collector gate lineage as local feed/E3/E5
- ranks by:
  1. set overlap between viewer owned/wanted cards and candidate public owned cards
  2. proximity bucket from `collector_local_discovery_settings.area_label` / local feed source
  3. recent public card activity as a tie-breaker
- never ranks by raw follower count or global popularity
- returns display-safe fields: collector user id, public profile id, display name, avatar url, area/proximity label, overlap summary, sample card images

## App Flow

### Entry Conditions

Show E6 onboarding on the first Pulse/Search landing only when all are true:

- signed in
- `onboarding_ladder_state_v1().is_complete=false`
- `dismissed_forever_at is null`
- user is not still in the immediate signup/auth transition
- user is not deep-linking into a specific card/message/pulse destination
- scanner route is reachable in the current build config

The onboarding may appear as a first-run sheet or first home segment, not a blocking full-screen wall. Users can close it and continue using the app.

### Step 1 - Own Something

Primary action: `Scan a card`.

- opens Scanner V5
- successful confirmed add returns through existing scanner add path
- after `VaultCardService.addOrIncrementVaultItem` succeeds, app calls `onboarding_record_rung_v1('rung_1_owned', card, source='scan')`
- if scanner fails with honest offline/HTTP/protocol copy, user can pick `Search instead`

Fallback action: `Search and add`.

- uses existing search/card-detail add path
- after successful add, calls `onboarding_record_rung_v1('rung_1_owned', card, source='search')`

### Step 2 - Want Something

Entry points are the existing app want actions everywhere:

- search result card action
- card detail action
- set browse card action

The action must create a canonical `wishlist_items` row or trigger a proven bridge to it.

After the canonical want exists, app calls:

`onboarding_record_rung_v1('rung_1_wanted', card, source='search'|'set_browse')`

When owned + wanted both exist, show the loop promise once:

`We'll tell you when a copy of <card> appears near you or for trade.`

Then record `loop_promise_shown`.

### Step 3 - Follow Relevant Collectors

After owned + wanted:

- call `onboarding_collector_suggestions_v1`
- show 2-3 compact collector suggestions
- each suggestion includes one card-first overlap reason, e.g. `Collects Japanese SV8` or `Has cards from your wanted sets`
- tapping follow uses `CollectorFollowService.followCollector`
- after success, call `onboarding_record_rung_v1('rung_2_followed', collector_user_id, payload: overlap summary)`

Users may skip suggestions. Skipping suggestions can complete day-1 onboarding if owned + wanted are done.

Users who already have owned + wanted state but no follows should see only collector suggestions. E6 must not auto-complete the ladder merely because owned and wanted are already true.

### Later Rungs

These are not day-1 blocking UI, but E6 instruments them for E7:

- `rung_2_first_pulse_with_item`: first time Pulse returns at least one real item for the user after onboarding started
- `rung_3_first_message`: either participant's first card message sent or received after onboarding started
- `rung_3_first_match_acted`: first want-match push/card action or message from a want-match context

These can be recorded by small wrappers around existing Pulse/message/want-match action boundaries. They must not create new notification behavior.

## PR Breakdown

### PR 1 - Contracts, State, and Want Canonicalization

Scope:

- migration for `onboarding_ladder_state`
- migration for `onboarding_ladder_events`
- RPCs:
  - `onboarding_ladder_state_v1`
  - `onboarding_record_rung_v1`
  - `onboarding_skip_v1`
- bridge `user_card_intents.want` to `wishlist_items` through a DB trigger
- add tests proving canonical wants are visible to E3

Gate:

- fresh local migration chain applies
- anon denied on state/events/RPCs
- user A cannot read/write user B state or events
- rung events append, update/delete denied
- existing owner/want bootstrap detects prior data
- after any existing app want action, `wishlist_items`, `watches(reason='want')`, and E3 predicate all see the want
- repeated `user_card_intents.want=true` writes do not duplicate wishlist rows or E1 events
- duplicate rung calls are idempotent
- no pricing/identity writes

Rollback:

- drop RPCs
- drop tables
- remove any bridge trigger added for want canonicalization

### PR 2 - App Service Layer Behind Feature Flag

Scope:

- `OnboardingLadderService`
- feature flag: `ONBOARDING_LADDER_ENABLED`, default false until device-reviewed
- methods:
  - load state
  - record owned
  - record wanted
  - skip/dismiss
  - mark loop promise shown
- wire non-visible calls after successful scan/search-add/want actions
- no visible onboarding UI yet

Gate:

- `flutter analyze`
- `flutter test`
- service tests for empty state, existing user bootstrap, record owned, record wanted, skip, duplicate calls, RPC failure
- manual dev proof: scan-add/search-add/want emits rung rows
- skipping does not block app use

Rollback:

- disable flag
- remove service calls

### PR 3 - Collector Suggestions RPC and Service

Scope:

- `onboarding_collector_suggestions_v1`
- app service method to load suggestions
- ranking by set overlap + proximity bucket + recent activity
- no UI beyond tests/dev debug hooks

Gate:

- fixture with viewer owned/wanted cards and candidate collectors
- already-followed/self/private/blocked collectors excluded
- candidates with set overlap outrank nearby-only candidates
- proximity bucket breaks ties
- no follower-count/popularity ordering used
- shared gate function reused, not reimplemented
- `flutter analyze`
- `flutter test`

Rollback:

- drop RPC
- remove service method

### PR 4 - Onboarding UI

Status: design-gated. Stop after PR 3 until high-fidelity mockups are approved.

Scope:

- premium, card-first first-run ladder surface
- no marketing hero
- step cards are compact, skippable, and action-led
- scanner primary, search fallback
- want action from search/set browse/card detail
- loop promise shown only once
- collector suggestions sheet/list
- no reappearance after complete/dismiss

Design direction:

- dark app vocabulary
- restrained surfaces
- card art first
- no large explanatory blocks
- no gamified progress bar
- copy is direct and quiet

Gate:

- fresh-account walkthrough screenshots/video:
  - own via scan
  - own via search fallback
  - want via search or set browse
  - loop promise
  - collector suggestions
  - follow one collector
  - skip all and land in usable app
- rung events visible in `onboarding_ladder_events`
- `collector_follows` row created through existing service
- E1 follow event/watch created by trigger
- `flutter analyze`
- `flutter test`
- shipcheck

Rollback:

- disable feature flag
- UI no longer appears; state/events can remain harmlessly

### PR 5 - Later-Rung Instrumentation

Scope:

- record `rung_2_first_pulse_with_item` when Pulse first returns at least one real item
- record `rung_3_first_message` from existing card messaging boundaries
- record `rung_3_first_match_acted` from existing want-match action context
- no notification or dispatcher changes

Gate:

- seeded dev user produces each later rung once
- duplicate events are idempotent
- no silent failures; failures logged/debug-visible
- E7 can aggregate ladder conversion from events
- `flutter analyze`
- `flutter test`

Rollback:

- remove wrappers; existing product behavior unchanged

## Verification Plan

Required before E6 merge:

- local migration chain applies
- RLS smoke tests with anon, user A, user B
- scanner health check for production endpoint:
  - `curl https://scanner-identity.grookaivault.com/scanner-v5/health`
  - expected service: `scanner_v5_identity_service_v1`
- Android or iPhone fresh-account walkthrough
- screenshots/video for scan path and search fallback
- rung rows shown in `onboarding_ladder_events`
- canonical want visible to E3 want-match predicate
- follow suggestion creates `collector_follows` and E1 follow event
- skipping all steps still lands in the normal app

## Approval Decisions

1. PR 1 uses the bridge approach: `user_card_intents.want` syncs to `wishlist_items` through a DB trigger.
2. PR 4 UI is design-gated like E4/E5.
3. Onboarding appears on the first Pulse/Search landing with no owned/wanted state, not immediately at signup.
4. Users with owned + wanted but no follows see collector suggestions only.
5. `rung_3_first_message` counts on either participant's first card message.
