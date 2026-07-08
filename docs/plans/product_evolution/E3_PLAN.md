# E3 Plan - Want-Match Engine

Status: approved with amendments. PR 1 may proceed; stop for review before PR 2.

Date: 2026-07-08

Branch: `engage/want-match`

## Baseline

Main now includes:

- E1 interest graph, including `watches`, `card_events`, `completion_crossings`, and the full-user watch backfill.
- E1 backfill result: 385 watches across 19 users, all rollback-scoped with `origin='backfill_v1'`.
- E2 notification pipeline, live-proven through `notification_outbox` -> dispatcher -> FCM/APNs.
- E2 dispatcher schedule fixed through `pg_cron` -> `pg_net`, active every minute.

Delivery rule for E3: no client or job sends push directly. All delivery must flow through E2 dispatcher-owned `notification_outbox`.

## Objective

Promote the existing read-time wishlist match signal from `local_community_feed_v2.viewer_wishlist_match` into a proactive, deduped want-match engine.

The engine must:

1. Use the same match predicate as `local_community_feed_v2`.
2. Surface matches in durable state, not only at feed read time.
3. Emit `card_events` for both sides.
4. Use E2 dispatcher only for push delivery.
5. Avoid duplicate notifications for the same want-user/copy match.
6. Preserve honest low-density behavior: if the nearest available copy is only regional, say regional; do not imply nearby availability.

## Digest Decision

E2 does not include a general digest system. E3 will include the minimal want-match-only digest extension in PR 3.

Approved decision: option 1 - include `want_match_digest` in E3.

Minimal digest scope:

- Add `want_match_digest` support to the E2 dispatcher formatter.
- Create or update one `daily_pulse` outbox row per user per digest window, anchored to the strongest card match in that digest.
- Payload includes `match_count`, top card metadata, compact match ids, and the digest window key.
- The push copy remains card-anchored, for example: `Umbreon VMAX · 3 wanted-card matches near your collection`.
- It still uses `notification_outbox.tier = 'daily_pulse'`, the existing dispatcher, existing token path, existing delivery log, and the existing 3/day budget guard.
- It does not create a general digest framework beyond want matches.

Budget interplay:

- Instant want-match pushes consume one budget unit per outbox row.
- The `want_match_digest` daily-pulse row also consumes one budget unit when delivered.
- If the digest row is folded because the user's 3/day budget is already consumed, it is not terminal in E3. The dispatcher or digest helper must reschedule the folded `want_match_digest` row to the next digest window.
- Rescheduling is outbox re-enqueue logic only. The source of truth remains durable `want_matches`; folded digest rows must not create duplicate matches or duplicate card events.

## Existing Predicate To Reuse

Current source:

- `public.local_community_feed_v2(integer)`
- migration: `20260624120000_local_community_feed_wishlist_match_v2.sql`

Current read-time predicate:

- viewer has `collector_local_discovery_settings.local_discovery_enabled = true`
- owner also has local discovery enabled
- owner country matches viewer country
- distance bucket is:
  - `nearby` when geohash prefixes match
  - `same_region` when region matches
- owner is not viewer
- owner profile is public and vault sharing is enabled
- blocks and local mutes exclude the owner
- viewer has `wishlist_items.user_id = viewer` and `wishlist_items.card_id = source.card_print_id`
- source cards come from:
  - `v_wall_cards_v1`
  - `v_card_stream_v1`

E3 must extract this into one shared SQL function so the feed and engine cannot drift.

## Proposed Shared SQL Function

Add:

```sql
public.local_community_want_match_candidates_v1(
  p_viewer_user_id uuid,
  p_limit integer default 500
)
```

Returns one row per eligible want/copy candidate:

- `want_user_id`
- `owner_user_id`
- `owner_slug`
- `owner_display_name`
- `card_print_id`
- `gv_id`
- `card_name`
- `set_code`
- `set_name`
- `card_number`
- `source_type`
- `vault_item_id`
- `instance_id` when available
- `intent`
- `distance_bucket`
- `relationship_context`
- `locality_label`
- `display_image_url`
- `display_image_kind`
- `source_created_at`
- `score`
- `match_strength`
- `recommended_tier`
- `dedupe_key`

Security:

- `security definer`, `set search_path = public`.
- Authenticated viewer calls require `p_viewer_user_id = auth.uid()`.
- Service role/job may call for any user.
- No raw exact location, geohash, wishlist row id, or private collection data returned.
- Same blocks/mutes/profile/vault-sharing gates as `local_community_feed_v2`.
- `p_include_existing` is deliberately not in the signature. Existing durable match suppression belongs in the PR 2 upsert/job layer, not in the shared visibility predicate, so PR 1 can prove feed parity without durable table coupling.

Scoring:

- `match_strength` must be deterministic and documented in SQL comments inside the function.
- Formula:
  - distance base: `nearby = 0.70`, `same_region = 0.48`
  - intent bonus: `trade = +0.20`, `sell = +0.10`, `showcase/wall/default = +0.00`
  - relationship bonus: `following = +0.03`
  - recency decay: subtract up to `0.10` based on source age, with zero decay for sources seen inside 24 hours and max decay at 30 days or older
  - clamp to `0.00..1.00`
- Sorting still ensures distance beats intent: order by distance rank, intent rank, relationship, recency, then deterministic source id.
- The formula makes instant-tier eligibility auditable and testable; no hidden heuristic or random score is allowed.

Recommended tier:

- `instant` only when `distance_bucket = 'nearby'`, `intent = 'trade'`, and `match_strength >= 0.85`.
- `digest` otherwise.

## Feed Consistency Change

Refactor `local_community_feed_v2` so `viewer_wishlist_match` and `match_reason` are derived from `local_community_want_match_candidates_v1`, or from a smaller private helper used by both.

Gate:

- A seeded fixture must prove feed flag and engine candidate output agree for the same viewer/source cards.
- No duplicated privacy logic remains as independent predicate copies.
- The `local_community_feed_v2(integer)` signature and output shape must not change.
- No client changes are required in PR 1.

## New Table: `want_matches`

Purpose: dedupe and state machine for proactive want matches.

Proposed schema:

```sql
create table public.want_matches (
  id uuid primary key default gen_random_uuid(),
  want_user_id uuid not null references auth.users(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  vault_item_id uuid null,
  instance_id uuid null references public.vault_item_instances(id) on delete set null,
  distance_bucket text not null check (distance_bucket in ('nearby', 'same_region')),
  intent text null,
  match_strength double precision not null check (match_strength >= 0 and match_strength <= 1),
  notified_tier text null check (notified_tier in ('instant', 'digest', 'in_app')),
  surfaced_at timestamptz not null default now(),
  notified_at timestamptz null,
  acted_at timestamptz null,
  dismissed_at timestamptz null,
  last_seen_available_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint want_matches_no_self_match check (want_user_id <> owner_user_id),
  constraint want_matches_payload_object_check check (jsonb_typeof(payload) = 'object')
);
```

Unique dedupe:

```sql
create unique index want_matches_user_copy_unique_idx
on public.want_matches (want_user_id, owner_user_id, card_print_id, coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid));
```

RLS:

- Want user may select their own rows.
- Owner may select rows where they are `owner_user_id`, but only aggregate-safe fields if direct select is exposed. Prefer RPC for owner surfaces.
- No anon access.
- Service role/job owns inserts/updates.
- Users cannot directly insert/update/delete.

State rules:

- First sighting inserts.
- Re-runs update `last_seen_available_at` only.
- `acted_at` is set by explicit user action through a future/action RPC.
- If the source copy disappears or goes private, do not delete immediately; let a cleanup job mark stale after a grace window.
- Stale grace window is exactly 7 days from `last_seen_available_at`.
- Cleanup marks stale in state/payload or future status field; it must never hard-delete match rows.

## Event Emission

Each newly inserted match emits two `card_events`:

1. Wanter side:
   - `event_type = 'want_match_available'`
   - `actor_user_id = owner_user_id`
   - `subject_user_id = want_user_id`
   - `card_print_id = matched card`
   - `visibility = 'private'`
   - payload includes `want_match_id`, `distance_bucket`, `intent`, `owner_slug`, `recommended_tier`

2. Owner side:
   - `event_type = 'want_match_owner_count'`
   - `actor_user_id = want_user_id`
   - `subject_user_id = owner_user_id`
   - `card_print_id = matched card`
   - `visibility = 'private'`
   - payload includes `want_match_id`, `wanted_count_for_card`, `distance_bucket`

Dedup:

- PR 2 must verify `card_events.dedupe_key` exists before implementing event emission. If it does not exist, PR 2 must include the migration to add it.
- `card_events.dedupe_key` must be set for both sides.
- Example:
  - `want_match_available:<want_match_id>`
  - `want_match_owner_count:<want_match_id>`

Failure handling:

- Match insertion must not silently lose event emission.
- Non-trigger/job event failures write to `card_events_emit_failures`.
- A failed event insert must not duplicate the match on retry.

## Delivery Through E2

Instant:

- For `recommended_tier = 'instant'`, insert one `notification_outbox` row for the want user.
- `event_type = 'want_match_available'`
- `tier = 'instant'`
- `card_print_id = matched card`
- `actor_user_id = owner_user_id`
- `card_event_id = wanter-side card_event_id`
- `dedupe_key = 'want_match_available:' || want_match_id`
- Payload includes compact card/owner/distance context.
- Owner side is hard-boundary in-app/event only. `want_match_owner_count` must not enqueue an instant push in E3.

Digest:

- Non-instant matches produce or join one `want_match_digest` daily-pulse outbox row.
- PR 2 or PR 3 must verify `notification_outbox.dedupe_key` exists before enqueue logic. If it does not exist, the implementing PR must include the migration to add it.
- Folded `want_match_digest` rows are not terminal. They are rescheduled to the next digest window, preserving one digest candidate per user/window and relying on durable `want_matches` for match truth.

Do not:

- treat folded `want_match_digest` rows as terminal
- send from the job directly
- add client-side notification send logic

## Scheduled Job

Use pg_cron -> pg_net or Supabase scheduled Edge Function. Pick one during implementation based on operational fit, but the job must call server-side SQL/RPC and use service-role authorization.

Proposed job cadence:

- every 5 minutes for instant candidates
- daily digest aggregation only if the minimal digest extension is approved

Job behavior:

1. Select active users with want watches or wishlist rows.
2. Run shared match function for each user, bounded by limit and checkpoint cursor.
3. Insert `want_matches` with `on conflict do update last_seen_available_at`.
4. For newly inserted matches only:
   - emit two card events
   - enqueue instant notification when eligible
   - enqueue or update the want-match digest daily-pulse row for non-instant
5. Log failures durably.

Operational guardrails:

- batch size cap
- timeout cap
- resumable cursor
- dry-run mode
- no pricing/identity writes
- no mutation of `card_prints`, `sets`, `pokemon_species`, or identity tables

## In-App Surface

E3 should expose the durable matches without redesigning Pulse yet.

Minimum app/web read RPC:

```sql
public.want_matches_for_viewer_v1(p_limit integer default 50)
```

Returns authenticated user's own matches:

- card identity fields
- owner display/slug
- distance bucket/locality
- intent
- image display fields
- surfaced time
- route target

This supports honest low-density copy:

- `nearby`: "A nearby collector has this card available."
- `same_region`: "Nearest available copy is in your region."

No fake scarcity or inflated urgency.

## PR Breakdown

### PR 1 - Shared Predicate + Feed Refactor + Fixture Agreement Proof

Scope:

- Add `local_community_want_match_candidates_v1`.
- Refactor `local_community_feed_v2` to use the shared predicate or shared helper.
- Add SQL fixture test/proof that feed `viewer_wishlist_match` and engine candidates agree.
- Preserve the exact `local_community_feed_v2(integer)` signature and return shape.

Gate:

- Two dev accounts: A wants a card B owns publicly.
- `local_community_feed_v2` shows `viewer_wishlist_match = true`.
- Shared candidate function returns the same card/copy.
- Private profile/vault sharing off produces no candidate.
- Block/mute produces no candidate.
- No client changes required.

### PR 2 - Durable Match Engine

Scope:

- Add `want_matches`.
- Add insertion/upsert RPC/job SQL.
- Emit both card events.
- Add failure logging.
- Add `want_matches_for_viewer_v1`.
- Verify `card_events.dedupe_key` exists; add it in PR 2 if absent.
- Verify `notification_outbox.dedupe_key` exists before any enqueue prep; add it in PR 2 if absent.
- Implement the deterministic `match_strength` formula exactly as documented in the shared function.
- Implement 7-day stale marking based on `last_seen_available_at`; no hard deletes.

Gate:

- Run job once: A wants what B owns with intent set.
- One `want_matches` row created.
- Two `card_events` rows created.
- Rerun creates no duplicate match or duplicate notification.
- Source made private produces no new match.
- Existing match state remains auditable.
- Owner receives `want_match_owner_count` event only; no owner instant push.

### PR 3 - E2 Delivery Integration

Scope:

- Instant notification outbox rows for high-strength matches only.
- Dispatcher formatter support for `want_match_available`.
- Minimal `want_match_digest` daily-pulse support.
- No client-side sends.

Gate:

- Nearby + trade match enqueues instant outbox row.
- E2 dispatcher sends through FCM/APNs on device.
- Same match rerun does not enqueue duplicate.
- Non-instant same-region match enters one approved `want_match_digest` daily-pulse row.
- E2 budget still applies.
- Budget-exhausted `want_match_digest` rows reschedule to the next digest window instead of becoming terminal folds.
- Owner-side count events remain in-app/event only with no owner instant push.

## Required Manual Verification

- Two dev accounts, A wants what B owns with public trade intent.
- Match surfaces within one job cycle.
- Wanter gets correct card-anchored surface.
- Owner gets owner-side count/update event.
- Rerun is idempotent.
- Private collection produces no match.
- Feed flag and engine candidate agree on seeded fixtures.
- High-strength match uses E2 dispatcher, not direct send.
- Digest path behavior matches the approved E3 decision: minimal want-match digest included, folded digest rows rescheduled.

## Rollback

PR 1:

- Restore `local_community_feed_v2` to prior implementation.
- Drop shared candidate function.

PR 2:

- Disable scheduled job.
- Drop or leave dormant `want_matches` depending on whether any production matches have surfaced.
- Keep `card_events` rows for audit unless explicitly approved to remove test/dev rows.

PR 3:

- Disable want-match outbox enqueue.
- Leave E2 dispatcher in place.
- Existing undelivered outbox rows can be marked skipped by service role if needed.

## Hard Boundaries

- No pricing writes.
- No identity writes.
- No direct push sends outside E2 dispatcher.
- No synthetic activity.
- No like counts, streaks, or non-card-anchored notifications.
- No exact geohash or raw location exposure.
- No client-side delivery logic.
- No broad Pulse redesign in E3.

## Approval

Approved with amendments on 2026-07-08.

Digest decision: include minimal `want_match_digest` delivery inside E3 PR 3.
