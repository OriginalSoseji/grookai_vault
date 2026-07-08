# E4 Plan - Pulse Surface

Status: approved with amendments. PR 1 and PR 2 may proceed; PR 3 remains design-gated.

Date: 2026-07-08

Branch: `engage/pulse`

Baseline:

- Main includes E1 interest graph: `watches`, `card_events`, completion crossings, and full-user backfill.
- Main includes E2 notification pipeline: `notification_outbox` -> dispatcher -> FCM/APNs, live-proven.
- Main includes E3 want-match engine: durable `want_matches`, instant want-match delivery, and minimal `want_match_digest` with reschedule-on-fold.
- Main includes MEE/TCGCSV nightly hygiene: TCGCSV is a nightly reference-evidence lane only, not public pricing.

## Objective

Build Pulse as a finite, card-first surface for things that happened around a collector's actual interests.

E4 is not a discovery feed rewrite. It adds Pulse as a finite ranked segment inside the Feed surface and keeps the existing feed content backed by the current `local_community_feed_v2` behavior.

Implementation boundary:

- PR 1 and PR 2 may define SQL, RPC contracts, state, delivery, and tests.
- PR 3 app/web UI implementation may not begin until high-fidelity Pulse mockups are approved.
- No marketing hero, infinite feed, synthetic activity, or engagement-padding behavior belongs in Pulse.

## Product Contract

Pulse answers:

> "What actually changed around cards, sets, collectors, and collection goals I care about?"

It must be:

- finite
- ranked
- actionable
- card-first
- honest about why an item appears
- clearable
- separate from Discover

It must not:

- scroll forever
- insert filler/discovery padding
- invent urgency
- duplicate E3's daily want-match digest as a second push
- mutate pricing or identity tables

## Pulse State

Add a small viewer-owned state table:

```sql
create table public.pulse_viewer_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz null,
  last_seen_event_created_at timestamptz null,
  last_seen_event_id uuid null,
  last_opened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS:

- Authenticated users can select only their own row.
- Authenticated users cannot directly update rows.
- Service-role and security-definer RPCs own writes.

Semantics:

- `last_seen_event_created_at` + `last_seen_event_id` are the clear-through keyset cursor.
- `last_seen_at` is human/audit metadata.
- `last_opened_at` records when Pulse was opened, even if no item was cleared.
- A missing row means the user has never opened Pulse. The RPC should default to a conservative lookback window, proposed 30 days, not all historical events.
- Clearing Pulse is explicit through an RPC, but the clear-through cursor must not be derived from the newest visible item. Pulse display order is bucket-ranked while the clear cursor is chronological; clearing through a visible item can accidentally clear newer lower-ranked items that were not shown on page 1.
- Opening Pulse means seen-all for eligible items known at open time. The client first calls `pulse_unread_count_v1()`, stores `latest_event_created_at` and `latest_event_id`, renders the first page, then calls `pulse_mark_seen_v1()` with that latest eligible event cursor.

## Ranked Pulse RPC

Add:

```sql
public.pulse_items_v1(
  p_limit integer default 30,
  p_after_created_at timestamptz default null,
  p_after_event_id uuid default null
)
```

Security:

- `security definer`, `set search_path = public`.
- Uses `auth.uid()` internally; no user id parameter.
- No anon access.
- Same E1/E3 pattern: authenticated caller sees only their own Pulse.

Source model:

- Join `card_events` to the viewer's unmuted `watches`.
- Only include rows newer than the viewer's clear-through cursor.
- A card event is eligible when at least one unmuted watch maps to the event:
  - `watches.subject_type = 'card'` and `subject_id = card_events.card_print_id`
  - `watches.subject_type = 'collector'` and `subject_id = card_events.actor_user_id`
  - `watches.subject_type = 'set'` and event payload/set context maps to the watched set
  - `watches.subject_type = 'character'` and event card maps to that character/species identity
- Muted watches are excluded with `muted_at is null`.
- Respect existing privacy gates embedded in `card_events` RLS/read rules:
  - visibility
  - public profile and vault sharing where applicable
  - blocks and mutes
  - private event boundaries

Ranking order:

1. `want_match_available`
2. Followed/watched collector activity
3. Value moves on cards the viewer owns or watches, only if value-move `card_events` already exist
4. Set and Dex completion crossings

Value-move amendment:

- PR 1 must verify whether value-move `card_events` exist.
- If absent, E4 ships with three active rank buckets:
  1. `want_match_available`
  2. followed/watched collector activity
  3. set and Dex completion crossings
- A pricing-adjacent value-move event emitter is explicitly deferred to a separate bounded epic if the events do not already exist.
- Keep nullable `value_delta_amount` and `value_delta_percent` in the RPC return shape so the value bucket can be added later without a signature change.

Within each bucket:

- newer first
- higher strength/importance first when the event payload provides a numeric score
- deterministic tie-breaker by `card_events.created_at desc, card_events.id desc`

Recommended score expression:

```text
bucket_rank
freshness_rank
event_strength
created_at desc
id desc
```

Keyset pagination:

- The RPC returns `next_cursor_created_at` and `next_cursor_event_id`.
- For page 2, pass both cursor values.
- Cursor predicate:
  - `(created_at, id) < (p_after_created_at, p_after_event_id)` after applying the same ranked order tie-breaker.
- No offset pagination.

Finite cap:

- Default view cap: 30 items.
- Hard RPC cap: 50 items.
- App should request at most 30 for the first E4 surface.
- If fewer than requested items are returned, the UI shows a caught-up state.
- If 30 are returned, the UI may show "Show older Pulse" once, but still no infinite scroll. A second page is allowed for auditability, capped at 50 total visible items in one session.

Return fields:

```sql
pulse_item_id text
card_event_id uuid
event_type text
rank_bucket text
created_at timestamptz
actor_user_id uuid null
actor_slug text null
actor_display_name text null
actor_avatar_path text null
card_print_id uuid null
gv_id text null
card_name text null
set_code text null
set_name text null
card_number text null
display_image_url text null
display_image_kind text null
ownership_context text null
distance_bucket text null
locality_label text null
value_delta_amount numeric null
value_delta_percent numeric null
completion_subject_type text null
completion_subject_label text null
completion_threshold numeric null
primary_action text
primary_action_label text
primary_action_route text
payload jsonb
next_cursor_created_at timestamptz
next_cursor_event_id uuid
```

Fields to validate before implementation:

- `card_events` currently has card id, actor/subject ids, payload, visibility, created timestamp, and dedupe key.
- Actor display fields require joining `public_profiles`.
- Card display fields require joining `card_prints` and display-image sources.
- Value move events require existing `card_events` with a value-move type. If absent, E4 ships without the value bucket. E4 must not add a pricing-adjacent emitter.
- Completion crossing fields come from E1 `completion_crossings`-backed `card_events`.

## Unread Count

Add:

```sql
public.pulse_unread_count_v1()
```

Returns:

```sql
unread_count integer
latest_event_created_at timestamptz null
latest_event_id uuid null
```

Semantics:

- Count eligible Pulse rows newer than the viewer's clear-through cursor.
- Cap returned count display at `99+` in clients, but the RPC returns the real count capped internally at a safe max such as 500.
- Uses the same eligibility predicate as `pulse_items_v1`.
- No client-side count derivation.
- `latest_event_created_at` and `latest_event_id` are the chronological latest eligible event at open time. They are the only approved clear-through cursor for "opened Pulse = seen all currently eligible items."

Clear RPC:

```sql
public.pulse_mark_seen_v1(
  p_seen_through_created_at timestamptz,
  p_seen_through_event_id uuid
)
```

Rules:

- `auth.uid()` only.
- Upserts `pulse_viewer_state`.
- Refuses to move the cursor backwards.
- Sets `last_opened_at = now()` and updates clear-through fields.
- If called with null cursor, it records `last_opened_at` only and does not clear unread items.
- The client must pass the latest eligible cursor returned by `pulse_unread_count_v1()` after the first page renders, not a cursor from visible page contents.

Tab behavior:

- The Pulse segment shows unread count from `pulse_unread_count_v1`.
- Count clears after Pulse renders and the client calls `pulse_mark_seen_v1` with the latest eligible event cursor captured from `pulse_unread_count_v1` at open time.
- If the user opens Pulse and no items exist, call mark-seen with null cursor to record the open.

## Low-Fidelity Item Layouts

These are data/layout descriptions only. Final visual composition waits for approved mockups.

### Want Match

Purpose: a wanted card is available from a relevant collector.

Layout:

- Left: card image.
- Primary line: `<Card> is available from <Collector>`.
- Secondary line: distance/intent context such as `Nearby · For trade`.
- Meta: time since event.
- Primary action: `View card`.
- Secondary action, if allowed: `Message collector`.

Required fields:

- `gv_id`
- `card_name`
- `display_image_url`
- `actor_display_name`
- `actor_slug`
- `distance_bucket`
- `locality_label`
- `intent`
- `primary_action_route` with card + owner context

### Collector Activity

Purpose: a watched/followed collector listed, showcased, traded, or added a card.

Layout:

- Left: card image.
- Primary line: `<Collector> added <Card>` or `<Collector> marked <Card> for trade`.
- Secondary line: set/number, ownership intent, or collection context.
- Primary action: `View card`.
- Optional action: `View collector`.

Required fields:

- `actor_display_name`
- `actor_slug`
- `event_type`
- `card_name`
- `set_code`
- `card_number`
- `display_image_url`
- `intent` from payload when relevant

### Value Move

Purpose: a watched or owned card moved meaningfully in Grookai Value.

Layout:

- Left: card image.
- Primary line: `<Card> moved <+/-X%>`.
- Secondary line: `Grookai Value updated from recent market evidence`.
- Meta: absolute delta if available.
- Primary action: `View value`.

Required fields:

- `card_name`
- `gv_id`
- `display_image_url`
- `value_delta_amount`
- `value_delta_percent`
- `ownership_context`
- route to card detail or value view

Open dependency:

- E4 must verify whether value-move `card_events` already exist. If absent, PR 1 records the absence and ships E4 with the three active buckets. A bounded value-move emitter is deferred to a separate follow-up epic.

### Completion Crossing

Purpose: a set, Dex, or collection threshold changed.

Layout:

- Left: representative card or compact progress mark.
- Primary line: `<Set/Dex subject> reached <threshold>`.
- Secondary line: concise progress context.
- Primary action: `View progress`.

Required fields:

- `completion_subject_type`
- `completion_subject_label`
- `completion_threshold`
- `card_print_id` or representative image when available
- route to set, Dex, or collection progress

## Caught-Up State

Pulse must end.

When the RPC returns no unseen rows:

- Show a quiet caught-up state.
- No discovery cards.
- No fake prompts.
- Switching to Discover is a segment change, not content appended below the caught-up Pulse state.

Suggested low-fi copy:

```text
Caught up
Nothing new around your collection right now.
```

## Feed Split

The Feed screen becomes the app home surface and keeps the existing top-level segment control. E4 changes the segment model to three segments:

1. `Pulse` - new, leftmost segment. This is the finite ranked surface backed by `pulse_items_v1`.
2. `Discover` - label-only rename of the current `Collectors` segment. It remains backed by existing `local_community_feed_v2` behavior.
3. `Following` - unchanged.

Rules:

- Pulse is not stacked above Discover.
- No ranking changes to `local_community_feed_v2` in E4.
- No rewrite of existing Discover cards.
- No new discovery source.
- No coupling between Pulse unread state and Discover or Following.
- The unread badge belongs to the Pulse segment only.
- `Collectors` -> `Discover` is a label change only in E4.
- Future Discover roadmap ideas, including rotating high-end catalog cards or additional algorithmic slots, are explicitly out of scope for E4.

Implementation waits for high-fi mockups. This plan only defines the split contract.

## Daily Pulse Push

E4 adds one daily Pulse push through E2's existing `daily_pulse` tier.

Copy:

```text
N things happened around your collection
```

Rules:

- Send only when at least one real Pulse item exists.
- Maximum one Pulse daily push per user per day.
- Uses `notification_outbox.tier = 'daily_pulse'`.
- Delivery goes through E2 dispatcher only.
- Budget still applies.
- If budget is exhausted, use the same reschedule-on-fold pattern as E3 digest, not a terminal fold.
- Payload contains compact top item ids and counts by item type.

Coexistence with E3 `want_match_digest`:

- E4 must produce one merged daily push, not both `want_match_digest` and `pulse_daily`.
- Recommended migration path:
  1. Keep durable E3 `want_matches` and instant want-match delivery unchanged.
  2. Stop E3 daily digest enqueue from creating standalone `want_match_digest` rows once E4 Pulse daily aggregation is active.
  3. Pulse daily aggregation includes digest-tier want matches as Pulse items under the `want_match_available` bucket.
  4. Existing undelivered `want_match_digest` rows are marked skipped with reason `superseded_by_pulse_daily` at cutover. Do not drain legacy digest rows, because draining risks a legacy digest and a Pulse daily landing in the same window.
  5. The E2 dispatcher gets one formatter path for `pulse_daily`; it may retain `want_match_digest` formatter only as legacy compatibility for rows created before cutover, but cutover marks undelivered legacy rows skipped instead of draining them.
- The Pulse daily dedupe key should be:

```text
pulse_daily:<user_id>:<window_key>
```

Routing:

- Daily Pulse push routes to the Pulse root.
- Payload includes top-card context for preview/rendering, but routing remains Pulse-root because the push summarizes multiple items.

## Device Gate

E2's manual cold-start/background tap proofs were not explicitly closed. E4 absorbs them.

Required device verification before E4 is fully closed:

- iOS killed app -> tap Pulse push -> opens Pulse or correct top item context.
- iOS backgrounded app -> tap Pulse push -> opens Pulse or correct top item context.
- Android killed app -> tap Pulse push -> opens Pulse or correct top item context.
- Android backgrounded app -> tap Pulse push -> opens Pulse or correct top item context.
- Tap tracking RPC records `tapped_at`; routing must not wait on tap tracking.

## PR Breakdown

### PR 1 - Pulse State + Ranked Read RPC

Scope:

- Add `pulse_viewer_state`.
- Add shared eligibility/ranking SQL helper if needed.
- Add `pulse_items_v1`.
- Add `pulse_unread_count_v1`.
- Add `pulse_mark_seen_v1`.
- Add contract tests for RLS, keyset pagination, finite cap, muted watches, and backwards cursor rejection.
- Verify whether value-move `card_events` exist. If absent, ship the RPC with three active buckets and nullable value fields.

Gate:

- Seed events and watches for a dev user.
- `want_match_available` ranks ahead of collector activity.
- Collector activity ranks ahead of completion crossings.
- If value-move events exist, value moves rank between collector activity and completion crossings; if absent, contract tests assert no pricing-adjacent emitter is added in E4 and nullable value fields remain in the RPC shape.
- Muted watch rows do not surface.
- Private/non-visible events do not surface.
- RPC hard cap works.
- Keyset pagination returns stable non-overlapping pages.
- `pulse_unread_count_v1` returns the latest eligible event cursor.
- `pulse_mark_seen_v1` clears unread count when passed that latest eligible event cursor captured at open time and refuses backwards movement.

Rollback:

- Drop RPCs.
- Drop `pulse_viewer_state`.
- No event data is deleted.

### PR 2 - Daily Pulse Aggregator + E3 Digest Cutover

Scope:

- Add SQL/job to aggregate one daily Pulse outbox row per user/window.
- Include digest-tier E3 want matches in Pulse daily payload.
- Prevent standalone E3 `want_match_digest` daily rows after Pulse daily is active.
- Add dispatcher formatter for `pulse_daily`.
- Preserve E3 instant want-match delivery.
- Add reschedule-on-fold behavior for `pulse_daily`.

Gate:

- User with one real Pulse item receives exactly one `pulse_daily` outbox row.
- User with zero Pulse items receives no row.
- E3 digest-tier want match appears in Pulse daily payload.
- No standalone `want_match_digest` row is created after cutover.
- Existing undelivered `want_match_digest` rows are marked skipped with reason `superseded_by_pulse_daily`; no drain path.
- Budget-exhausted Pulse daily row reschedules to the next window.
- Dispatcher sends through E2 path only.

Rollback:

- Disable Pulse daily cron/job.
- Re-enable E3 `want_match_digest` job if needed.
- Leave `pulse_viewer_state` and read RPCs intact.
- Mark undelivered `pulse_daily` outbox rows skipped by service role if necessary.

### PR 3 - Design-Gated Pulse UI Integration

Scope:

- Implement only after high-fi mockups are approved.
- Add Pulse as the leftmost segment in the existing Feed screen.
- Add unread count to the Pulse segment.
- Add caught-up state.
- Rename the current Collectors segment to Discover using unchanged `local_community_feed_v2`.
- Keep Following unchanged.
- Add tap routes for item actions.

Gate:

- Visual implementation matches approved mockups.
- No infinite scroll.
- No discovery padding inside Pulse.
- Pulse catches up.
- Discover remains a separate segment and unchanged in ranking.
- Unread count clears only after rendered items are marked seen.
- Device push tap gates pass for killed/background app states on iOS and Android.

Rollback:

- Hide Pulse UI behind feature flag.
- Keep RPCs and daily aggregator disabled if needed.
- Existing Discover feed remains available.

## Hard Boundaries

- No pricing table writes.
- No identity table writes.
- No synthetic activity.
- No infinite scroll.
- No discovery padding inside Pulse.
- No client-side push delivery.
- No direct FCM/APNs sends outside E2 dispatcher.
- No exact geohash or raw location exposure.
- No changes to `local_community_feed_v2` ranking in E4.
- No UI implementation before approved high-fi mockups.

## Approval

Approved with amendments on 2026-07-08.

Implementation sequencing:

- PR 1 and PR 2 may proceed before high-fi mockups.
- PR 3 is blocked until approved high-fi mockups are provided.
