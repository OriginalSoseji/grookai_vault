# E7 Plan - North-Star Instrumentation

Status: draft for approval. No implementation has started.

Date: 2026-07-09

Branch: `engage/metrics`

Baseline: `main` includes E1 interest graph, E2 notification pipeline, E3 want-match engine, E4 Pulse, E5 Card Journeys, E6 retention onboarding, Scanner V5 production endpoint wiring, and the July 9 MEE/TCGCSV nightly worker repairs.

## Objective

Add founder-only instrumentation around the card-anchored product loop that already exists.

E7 must:

1. Define "meaningful interaction" once in a shared DB enum.
2. Map meaningful interactions from existing durable tables without creating new behavior.
3. Roll weekly metrics into durable aggregate tables.
4. Render a simple founder-only web dashboard and a matching founder-only app screen.
5. Flag weak instant notification types as `digest_only_candidate` for founder review only.

E7 must not change notification delivery, pricing, identity, ingestion, scanner identity, or canonical card data.

## Grounding From Repo Audit

Existing tables and surfaces to extend:

- `public.watches`
- `public.card_events`
- `public.card_events_feed_v1`
- `public.notification_outbox`
- `public.notifications_log`
- `public.want_matches`
- `public.collector_follows`
- `public.card_interactions`
- `public.card_interaction_group_states`
- `public.onboarding_ladder_state`
- `public.onboarding_ladder_events`
- Web founder routes under `apps/web/src/app/founder/*`
- Existing founder gate: `requireFounderAccess("/founder/...")`
- Existing app founder surface:
  - `lib/screens/founder/founder_card_signal_detail_screen.dart`
  - `lib/screens/founder/founder_set_signal_detail_screen.dart`
  - `lib/screens/account/account_screen.dart`
  - `FounderInsightService.isFounderUser`
  - service-role mobile edge-function pattern such as `founder-market-signals-mobile-v1`

## Hard Boundaries

- No pricing writes.
- No identity writes.
- No dispatcher behavior changes.
- No auto-demotion in E7.
- No new product notifications.
- No new wants/follows/location systems.
- No likes, streaks, generic impressions, synthetic activity, or infinite-scroll metrics.
- No public analytics pages.
- No raw user-level dashboard in v1.
- No write to `want_matches.acted_at`; that column/status is reserved for a later epic.

## Meaningful Interaction Enum

PR 1 creates a single DB enum:

```sql
create type public.meaningful_interaction_kind as enum (
  'message_about_card',
  'trade_intent_expressed',
  'trade_intent_answered',
  'want_match_acted_on',
  'wall_follow'
);
```

The DB enum is the source of truth. App/web may mirror it only for display typing.

Excluded by definition:

- scan
- vault add
- want add without later match action
- Pulse view
- notification send without tap/action
- search
- generic page view
- generic conversation volume after the first answer
- showcase-only conversation
- likes/streaks/non-card activity

## Source Mapping

PR 1 confirms these against live schema and seeded fixtures. It must not redesign them unless the audited schema proves a mapping impossible.

### `wall_follow`

Source:

- one row per `public.collector_follows` insert

Meaning:

- a collector followed another public collector/wall

### `trade_intent_expressed`

Source:

- `public.card_events`
- `event_type = 'vault_intent_changed'`
- `payload->>'next_intent' in ('trade', 'sell')`

Rules:

- excludes `showcase`
- uses E1 trigger payload keys `previous_intent` / `next_intent`
- requires `card_print_id`

### `message_about_card`

Source:

- opening `public.card_interactions` row per thread

Thread identity:

- partition by `card_print_id` plus unordered sender/receiver pair
- ordered by `created_at, id`
- row number `1`

Rules:

- always card-anchored via existing RLS/contact flow
- later replies in the same thread do not count as `message_about_card`

### `trade_intent_answered`

Source:

- first reply in the same card interaction thread
- row number `2`
- linked `vault_items.intent` was `trade` or `sell` at send time

Rules:

- first real answer to a trade/sale contact counts
- showcase-only replies do not count
- third and later replies do not count
- conversation volume is deliberately not the metric

This split must be documented in the mapping view comment.

### `want_match_acted_on`

Read-only derived source. No mutation and no write to `want_matches.acted_at`.

Counts the earliest of:

- `public.card_interactions` row from `want_user_id` to `owner_user_id` about `want_matches.card_print_id` at or after `want_matches.first_seen_available_at`
- `public.notifications_log` row where:
  - `event_type in ('want_match_available', 'want_match_digest')`
  - `tapped_at is not null`
  - recipient/card match the want match

Merely creating a want match does not count.

## Mapping View

### `public.v_meaningful_interactions_v1`

Founder/service-only mapping view.

Fields:

- `interaction_id text`
- `kind public.meaningful_interaction_kind`
- `actor_user_id uuid`
- `subject_user_id uuid null`
- `card_print_id uuid`
- `source_table text`
- `source_id uuid`
- `occurred_at timestamptz`
- `payload jsonb`

Rules:

- `interaction_id` is deterministic: `<source_table>:<source_id>:<kind>`
- payload is scrubbed to IDs/status fields only
- no card message text copied
- one source row maps to at most one kind by construction
- revoked from `anon` and normal `authenticated`
- founder/service access only through controlled RPC/view paths

## Weekly Rollup Tables

### `public.north_star_weekly_rollups`

Columns:

- `week_start date primary key`
- `week_end date not null`
- `generated_at timestamptz not null default now()`
- `source_window_start timestamptz not null`
- `source_window_end timestamptz not null`
- `wau_count integer not null`
- `meaningful_interaction_count integer not null`
- `meaningful_interactions_per_wau numeric(12,4) not null`
- `active_unmuted_watches_count integer not null`
- `watches_per_wau numeric(12,4) not null`
- `watch_matched_event_count integer not null`
- `events_per_watch numeric(12,4) not null`
- `ladder_started_count integer not null`
- `ladder_owned_count integer not null`
- `ladder_wanted_count integer not null`
- `ladder_followed_count integer not null`
- `ladder_completed_count integer not null`
- `input_row_counts jsonb not null default '{}'::jsonb`

Definitions:

- Week is UTC Monday 00:00 through next Monday 00:00.
- Store both:
  - raw `meaningful_interaction_count`
  - normalized `meaningful_interactions_per_wau`
- Dashboard shows normalized ratio primary, raw count secondary.

WAU:

Distinct authenticated users with at least one row in the UTC week from:

- `card_events` as actor or subject
- `card_interactions` as sender or receiver
- `notifications_log.tapped_at`
- `onboarding_ladder_events`

Passive notification sends do not make a user active.

### `public.north_star_weekly_breakdowns`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `week_start date not null references public.north_star_weekly_rollups(week_start) on delete cascade`
- `metric_name text not null`
- `dimension_name text not null`
- `dimension_value text not null`
- `metric_value numeric(16,4) not null`
- `row_count integer null`
- `created_at timestamptz not null default now()`
- unique `(week_start, metric_name, dimension_name, dimension_value)`

Initial breakdowns:

- meaningful interactions by kind
- notification tap-through by `event_type`
- notification tap-through by `tier`
- onboarding ladder conversion by rung
- watches by subject type

### `public.notification_type_delivery_recommendations`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `week_start date not null`
- `event_type text not null`
- `tier text not null`
- `sent_count integer not null`
- `tap_count integer not null`
- `tap_through_rate numeric(8,4) not null`
- `recommendation text not null check (recommendation in ('none','digest_only_candidate'))`
- `threshold numeric(8,4) not null`
- `reason text not null`
- `requires_founder_approval boolean not null default true`
- `founder_approved_at timestamptz null`
- `founder_approved_by_user_id uuid null references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- unique `(week_start, event_type, tier)`

Flag rule:

- `tier = 'instant'`
- `sent_count >= 20` for each of two consecutive completed weeks
- tap-through below `0.06` for both weeks
- failed/skipped/folded/unsent rows excluded from numerator and denominator

This table is advisory only. The E2 dispatcher ignores it in E7.

## Rollup RPC

### `public.run_north_star_weekly_rollup_v1(p_week_start date, p_dry_run boolean default true)`

Access:

- service-role/founder-only security definer
- anon denied
- normal authenticated denied

Behavior:

- validates `p_week_start` is a Monday
- uses UTC week window
- dry-run returns rows that would be written
- apply mode upserts idempotently
- writes only E7 rollup/breakdown/recommendation rows
- writes zero pricing/identity/card/vault/watch/notification/interaction/onboarding source rows

Schedule:

- use the same `pg_cron` + `pg_net` operational pattern already proven for want-match/notification jobs
- weekly after UTC week close
- disabled by default until seeded dev proof and founder approval

## Web Founder Dashboard

Route:

- `apps/web/src/app/founder/metrics/page.tsx`
- protected by `requireFounderAccess("/founder/metrics")`
- add a `FounderToolCard` link from `/founder`

Data boundary:

- server-side admin/founder path reads only:
  - `north_star_weekly_rollups`
  - `north_star_weekly_breakdowns`
  - `notification_type_delivery_recommendations`
- dashboard does not query `v_meaningful_interactions_v1` or raw behavior tables client-side

Panels:

1. North-star ratio plus raw count and trend.
2. Interaction breakdown by kind.
3. Watches/user and events/watch.
4. Notification tap-through by event type and tier.
5. Onboarding ladder rung conversion.
6. `digest_only_candidate` flags, display-only.

Visual rules:

- tables and sparklines only
- no chart library
- no vanity charts
- no public route
- no per-user drilldown in v1

## App Founder Metrics Parity

The app already has a founder-only surface. E7 mirrors that pattern.

### Edge Function

Add:

- `founder-metrics-mobile-v1`

Rules:

- service-role function
- same founder-email gate as `FounderInsightService`
- rejects non-founder tokens
- reads the same rollup/breakdown/recommendation tables as web
- returns one display-ready JSON payload
- no raw behavioral tables returned
- no mutation

### Flutter Surface

Add:

- `lib/screens/founder/founder_metrics_screen.dart`
- `FounderMetricsService` or a `FounderInsightService` method
- entry from `account_screen.dart` existing founder area, beside market signals/vendor tools

UI:

- same six panels as web
- plain widgets, no chart package
- reuse existing founder screen style: section cards, pills, trend rows
- founder-only visibility

## PR Breakdown

### PR 1 - Contracts And Mapping

Scope:

- add `meaningful_interaction_kind`
- add `v_meaningful_interactions_v1`
- add mapping comments documenting the message/reply split
- add seeded fixture tests for all five kinds

Gate:

- fresh local migration chain applies
- anon/authenticated cannot read the mapping view
- seeded fixture covers all five kinds
- seeded showcase reply is excluded
- seeded third-plus reply is excluded
- seeded vault add/scan/Pulse view/onboarding-only rows are excluded
- north-star count for one seeded week is reproducible by hand from raw rows
- zero pricing/identity writes

Rollback:

- drop mapping view
- drop enum after dependents are removed

### PR 2 - Weekly Rollups And Recommendation Flags

Scope:

- add `north_star_weekly_rollups`
- add `north_star_weekly_breakdowns`
- add `notification_type_delivery_recommendations`
- add `run_north_star_weekly_rollup_v1`
- add disabled-by-default schedule documentation

Gate:

- seeded dev data produces one weekly rollup
- dry-run returns expected rows
- apply is idempotent
- hand SQL reproduces north-star ratio for the seeded week
- notification tap-through by type matches `notifications_log`
- weak instant notification type is flagged only after the 2-week threshold
- dispatcher behavior unchanged
- RLS smoke: anon/auth users denied, founder/service allowed
- zero pricing/identity writes

Rollback:

- drop rollup RPC
- drop recommendation/breakdown/rollup tables

### PR 3 - Web Founder Dashboard

Scope:

- add `/founder/metrics`
- add `FounderToolCard` to `/founder`
- read only rollup/breakdown/recommendation tables
- render six panels

Gate:

- founder user can load dashboard
- non-founder cannot load dashboard
- seeded weekly rollup renders all panels
- dashboard does not query raw message/user/event tables client-side
- web typecheck/lint/build pass
- Flutter checks remain green if shared code touched

Rollback:

- remove route/link; rollup tables remain harmless

### PR 4 - App Founder Metrics Screen

Scope:

- add `founder-metrics-mobile-v1`
- add app service method
- add founder metrics screen
- add entry from existing founder account area

Gate:

- founder account `ccabrl@gmail.com` can load app metrics
- non-founder token rejected by edge function
- app screen renders same six panels as web
- no client-side raw-table queries
- `flutter analyze`
- `flutter test`
- edge function tests/smoke as available

Rollback:

- remove app entry/screen
- undeploy or disable edge function

### PR 5 - Production Backfill And Schedule Enablement

Scope:

- dry-run historical weekly rollups
- review row counts by week
- apply bounded backfill after approval
- enable weekly schedule after founder approval

Gate:

- dry-run summary reviewed
- no unexplained spikes
- apply idempotent
- dashboard reflects latest completed week
- recommendation flags visible but do not affect delivery

Rollback:

- delete rollup rows by week range
- disable schedule

## Approval Decisions Already Resolved

- Web route: `/founder/metrics`.
- Threshold: below 6% tap-through, two consecutive completed weeks, at least 20 sends per week.
- WAU: app-observed action WAU from existing durable tables.
- Auto-demotion: founder-approved flag only in E7; no dispatcher wiring.
- App parity: include founder-only app metrics screen and service-role edge function in this epic.

