# E2 Plan - Notification Infra

Status: PR 1, PR 2, and PR 3 implemented and live-verified on July 7, 2026. E2 is merge-ready with two remaining manual tap-state checks tracked below; those checks are required before E2 is declared fully closed, but they are not merge-blocking.

Date: 2026-07-06

## Live Verification - July 7, 2026

- Push delivery was received on two real iPhones: the owner device and an external tester device.
- Card messaging was proven end to end: card message insert -> `public.card_interactions` -> `public.notification_outbox` -> notification dispatcher -> FCM HTTP v1 -> APNs-via-FCM -> iPhone notification.
- The `pg_cron` -> `pg_net` dispatcher schedule was initially misconfigured/disabled, then fixed and proven live. The active schedule now runs every minute.
- The E2 budget cap was observed live: after the 3/day notification budget was consumed, additional eligible notifications folded terminally. This is expected E2 behavior because digest delivery is not built yet; folded rows are terminal by design until a future digest epic.
- Messaging side-fixes were applied so public vault/wall cards are contactable:
  - `20260707173500_card_contact_targets_all_public_vault_items_v1.sql` widens `v_card_contact_targets_v1` to all active public vault items gated by public profile and vault sharing.
  - `20260707175500_card_contact_targets_security_definer_v1.sql` makes the contact target view resolve across RLS for public contact eligibility.

## Remaining Manual Verification

These checks are required before E2 is declared fully closed. They are not merge-blocking for the July 7 integration baseline.

- Cold-start tap: killed app -> tap push -> correct card detail on iOS.
- Cold-start tap: killed app -> tap push -> correct card detail on Android.
- Background tap: backgrounded app -> tap push -> correct card detail on iOS.
- Background tap: backgrounded app -> tap push -> correct card detail on Android.

## Objective

Build greenfield notification infrastructure for Grookai Vault after E1. The system must support FCM on Android and APNs-via-FCM on iOS, but all sends must flow through a server-side dispatcher. No app or web client may send push notifications directly.

The E1 pattern carries forward: writes happen at durable database boundaries first, dispatcher work is drained from an outbox, and user-facing preferences/logs use strict RLS.

## Non-Goals

- No broad notification content beyond a dev-only test push and message-received push plumbing.
- No likes, streaks, "we miss you" pushes, synthetic activity, or non-card-anchored copy.
- No client-side push send calls.
- No changes to pricing, identity resolution, ingestion, or Scanner V5 internals.
- No rebuild of the existing card messaging UI.

## Current Evidence

There is no existing push notification infrastructure to extend.

Existing message entry points already insert `public.card_interactions`:

- App: `lib/services/network/card_interaction_service.dart`
  - `CardInteractionService.sendMessage`
  - `CardInteractionService.replyToThread`
- Web: `apps/web/src/lib/network/createCardInteractionAction.ts`
  - `createCardInteractionAction`
- Web: `apps/web/src/lib/network/replyToCardInteractionGroupAction.ts`
  - `replyToCardInteractionGroupAction`

Existing DB boundary:

- `supabase/migrations/20260324143000_add_card_interaction_group_states_v1.sql`
- Trigger: `trg_sync_card_interaction_group_states_v1`
- Function: `public.sync_card_interaction_group_states_v1()`

E2 should add a neighboring `AFTER INSERT` trigger on `public.card_interactions` that writes to a notification outbox. App and web both get push coverage because they already share the same insert boundary.

## Schema Plan

### `public.device_tokens`

Purpose: registered device endpoints for push delivery.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `token text not null`
- `platform text not null check (platform in ('android', 'ios'))`
- `app_build text null`
- `device_label text null`
- `last_seen_at timestamptz not null default now()`
- `disabled_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints and indexes:

- unique `(token)` globally. A token must belong to only one user at a time.
- index `(user_id, disabled_at, last_seen_at desc)`.

RLS:

- Owner-only select/insert/update for authenticated users where `auth.uid() = user_id`.
- No anon access.
- Service role can read/write for dispatcher and token cleanup.
- Users may mark their own token disabled, but cannot read or mutate another user's token.

Registration rule:

- Token registration uses `insert ... on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, disabled_at = null, last_seen_at = now(), updated_at = now()`.
- This intentionally moves a shared/reused device token from the previous signed-in user to the current signed-in user. Sign-out cleanup remains best-effort, but sign-in registration is the authoritative eviction mechanism.
- Dispatcher disables tokens inline when FCM returns `UNREGISTERED`, `NOT_FOUND`, or equivalent 404/unregistered responses.
- A cleanup job disables active tokens whose `last_seen_at` is older than 270 days.

### `public.notification_prefs`

Purpose: owner-only notification tier preferences.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `instant_enabled boolean not null default true`
- `daily_pulse_enabled boolean not null default true`
- `weekly_enabled boolean not null default true`
- `quiet_hours_start time null`
- `quiet_hours_end time null`
- `timezone text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

RLS:

- Owner-only select/insert/update.
- No anon access.
- Service role read allowed for dispatcher.

Per-watch mutes:

- Reuse E1 `public.watches.muted_at`.
- If a watch is muted, its events are excluded from all push tiers and digests.
- E2 does not create a separate per-subject mute table.

### `public.notification_outbox`

Purpose: durable dispatcher input queue. This is the only write boundary the dispatcher drains.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `recipient_user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `tier text not null check (tier in ('instant', 'daily_pulse', 'weekly'))`
- `card_print_id uuid null references public.card_prints(id)`
- `actor_user_id uuid null references auth.users(id)`
- `card_event_id uuid null references public.card_events(id)`
- `card_interaction_id uuid null references public.card_interactions(id)`
- `payload jsonb not null default '{}'::jsonb`
- `dedupe_key text not null`
- `attempts integer not null default 0`
- `available_at timestamptz not null default now()`
- `next_attempt_at timestamptz not null default now()`
- `claimed_at timestamptz null`
- `claim_expires_at timestamptz null`
- `send_started_at timestamptz null`
- `sent_at timestamptz null`
- `folded_into_digest_at timestamptz null`
- `failed_at timestamptz null`
- `failure_reason text null`
- `created_at timestamptz not null default now()`

Constraints and indexes:

- unique `(recipient_user_id, dedupe_key)`.
- partial drain index: `(available_at, next_attempt_at) where sent_at is null and failed_at is null and folded_into_digest_at is null`.
- index `(recipient_user_id, created_at desc)`.
- check that pushable rows contain `card_print_id is not null`. The dispatcher also validates and rejects invalid rows defensively.

RLS:

- No anon access.
- No normal authenticated direct writes.
- Authenticated users may not select the outbox directly.
- Service-role-only insert/select/update for triggers and dispatcher.
- Trigger functions use `security definer` and handle exceptions without failing the originating user action.

State rules:

- Pending rows have `sent_at is null`, `failed_at is null`, and `folded_into_digest_at is null`.
- Folded rows are terminal in E2. They are logged as `send_status='folded'`, set `folded_into_digest_at`, and are not delivered until a future digest epic explicitly reopens that scope.
- Instant-drain queries must exclude folded rows.
- Future digest work may reclaim rows by a digest-specific scope, but E2 does not ship a digest sender.
- Max attempts: 3. Failed attempts set `attempts = attempts + 1`, `next_attempt_at` using backoff, and clear claim fields. After the third failure, set `failed_at` and `failure_reason`.
- Claim lease: dispatcher claims rows with `for update skip locked`, setting `claimed_at = now()` and `claim_expires_at = now() + interval '5 minutes'`. Rows with an expired lease and no `send_started_at`, `sent_at`, `failed_at`, or `folded_into_digest_at` are reclaimable.
- Idempotency: `dedupe_key` prevents duplicate queue rows, and `notifications_log.outbox_id` is unique for non-failed terminal sends. Once `send_started_at` is set, the row is not automatically redelivered after a crash; ambiguous rows go to dead-letter/manual review rather than risking a double push.

### `public.notifications_log`

Purpose: durable send/tap audit and future KPI source.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `recipient_user_id uuid not null references auth.users(id) on delete cascade`
- `event_type text not null`
- `tier text not null`
- `card_print_id uuid null references public.card_prints(id)`
- `actor_user_id uuid null references auth.users(id)`
- `outbox_id uuid null references public.notification_outbox(id)`
- `device_token_id uuid null references public.device_tokens(id)`
- `title text not null`
- `body text not null`
- `deep_link text not null`
- `send_status text not null check (send_status in ('sent', 'folded', 'failed', 'skipped'))`
- `failure_reason text null`
- `sent_at timestamptz null`
- `tapped_at timestamptz null`
- `created_at timestamptz not null default now()`

RLS:

- Participant/owner read only: `auth.uid() = recipient_user_id`.
- No user insert/update/delete.
- Service-role dispatcher writes send rows and updates `tapped_at`.
- No anon access.

Constraints and indexes:

- unique `(outbox_id)` where `send_status in ('sent', 'folded', 'skipped')`.
- index `(recipient_user_id, sent_at desc)`.
- index `(recipient_user_id, created_at desc)`.

### `public.notification_delivery_budgets`

Purpose: enforce the hard push cap.

Columns:

- `user_id uuid not null references auth.users(id) on delete cascade`
- `budget_date date not null`
- `push_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- primary key `(user_id, budget_date)`

Rule:

- Budget semantics are calendar-day, not rolling 24h.
- `budget_date` is computed in `notification_prefs.timezone`; if no prefs row or timezone exists, use UTC.
- This accepts boundary bursts at local midnight in exchange for clear user-facing "per day" behavior.
- Hard cap: max 3 push notifications per user per budget day, including instant pushes.
- One outbox row consumes one budget unit regardless of device fan-out. A user with multiple device tokens still spends one unit when one logical notification is sent.
- Atomic guard: the dispatcher must reserve budget with a single statement, not check-then-send:

```sql
insert into public.notification_delivery_budgets as budgets (
  user_id,
  budget_date,
  push_count
)
values (
  <recipient_user_id>,
  <computed_budget_date>,
  1
)
on conflict (user_id, budget_date)
do update set
  push_count = budgets.push_count + 1,
  updated_at = now()
where budgets.push_count < 3
returning push_count;
```

- If the statement returns no row, the outbox row is folded terminally for E2.
- If FCM fails before provider acceptance, the budget reservation can be reversed in the same failure-handling transaction. If provider acceptance is ambiguous, keep the budget consumed to avoid over-sending.

RLS:

- No anon access.
- Owner may select own budget for transparency if needed.
- Service role owns insert/update.

### `public.notification_emit_failures`

Purpose: durable failure log for trigger enqueue failures and dispatcher validation failures that do not belong in `notifications_log`.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `source text not null`
- `source_id uuid null`
- `recipient_user_id uuid null`
- `event_type text null`
- `error_message text not null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

RLS:

- No anon access.
- No authenticated direct access in E2.
- Service role can select/insert for audit.
- Security-definer trigger functions insert here on enqueue failure and never fail the originating user write.

## Message Push Outbox Trigger

Add one E2 migration near the existing group-state trigger:

- Function: `public.enqueue_card_interaction_notification_v1()`
- Trigger: `trg_enqueue_card_interaction_notification_v1`
- Table: `public.card_interactions`
- Timing: `after insert`
- Function must set `search_path = public`.

Behavior:

1. Recipient is `new.receiver_user_id`.
2. Actor is `new.sender_user_id`.
3. Card is `new.card_print_id`.
4. Tier is `instant`.
5. Event type is `message_received`.
6. Payload includes:
   - `card_interaction_id`
   - `vault_item_id`
   - `card_print_id`
   - `sender_user_id`
   - `receiver_user_id`
   - a short message preview, trimmed server-side
7. Dedupe key: `message_received:<card_interaction_id>`.
8. Trigger writes to `notification_outbox`.
9. Insert uses `on conflict (recipient_user_id, dedupe_key) do nothing`.
10. Trigger catches exceptions, writes to `notification_emit_failures`, and never fails the original `card_interactions` insert.

This replaces any client-side send idea. App and web keep inserting messages as they do today.

## Dispatcher Plan

### Runtime

Implement as a Supabase Edge Function:

- `supabase/functions/notification-dispatcher/index.ts`
- Service-role environment only.
- Invoked manually for dev tests.
- Production drain uses a scheduled trigger: pg_cron -> pg_net HTTP call to the Supabase Edge Function every 1-2 minutes. If Supabase Scheduled Functions are already available in the deployed project, that can replace pg_cron, but PR 2 must ship one concrete scheduled drain path.

The dispatcher:

1. Claims eligible `notification_outbox` rows with `available_at <= now()`, `next_attempt_at <= now()`, and no terminal timestamp.
2. Loads recipient prefs, unmuted watch state, delivery budget, and active device tokens.
3. Rejects payloads without a card anchor.
4. Formats copy in one shared formatter.
5. Enforces hard budget.
6. Sends via FCM HTTP v1.
7. Writes `notifications_log`.
8. Marks outbox row `sent_at`, `folded_into_digest_at`, or `failed_at`.

Claim query:

- Use `for update skip locked`.
- Eligible rows:
  - `sent_at is null`
  - `failed_at is null`
  - `folded_into_digest_at is null`
  - `available_at <= now()`
  - `next_attempt_at <= now()`
  - and either `claimed_at is null` or the lease expired with no `send_started_at`.
- On claim, set `claimed_at`, `claim_expires_at`, and increment `attempts`.

Retry/dead-letter:

- Transient FCM/network failures retry up to 3 attempts with backoff.
- Permanent validation failures are terminal immediately and logged.
- FCM `UNREGISTERED` / 404 disables that token inline and does not fail the whole logical outbox row if another active token succeeds.
- If all tokens fail permanently, mark the outbox failed and log the reason.
- If the edge function crashes after `send_started_at`, do not auto-retry that row. Mark it for dead-letter/manual review on the next maintenance pass to avoid double-push.

Fan-out:

- A logical outbox row may send to multiple active device tokens for the same user.
- It creates one logical `notifications_log` row and consumes one budget unit, regardless of token count.

### Copy Formatter

One formatter owns all notification text.

Pattern:

```text
<Card name> · <Actor display name> <action>
```

Message example:

```text
Umbreon VMAX · Alex sent you a message
```

Future intent example:

```text
Umbreon VMAX · Alex marked their copy for trade
```

The formatter rejects:

- rows with no `card_print_id`
- rows with no recipient
- rows where card lookup fails
- rows where actor lookup is required but missing
- rows where `gv_id` cannot be resolved from `card_print_id`

No notification can be generic or engagement-bait copy.

Deep-link construction:

- Dispatcher resolves `card_print_id -> gv_id` during formatting.
- Deep links are generated only after successful card lookup.
- Lookup failure rejects the row and logs a failed/skipped result instead of sending malformed payloads.

## FCM Credential Strategy

Credentials do not live in git.

Plan:

1. Create or use the Grookai Firebase project.
2. Enable FCM for Android.
3. Configure iOS APNs auth key or certificate in Firebase Console so iOS delivery flows through FCM.
4. Generate a Firebase service account JSON for the dispatcher.
5. Store it as a Supabase Edge Function secret:

```text
FCM_SERVICE_ACCOUNT_JSON=<full service account json>
```

Alternative if Supabase secret size becomes awkward:

```text
FCM_PROJECT_ID
FCM_CLIENT_EMAIL
FCM_PRIVATE_KEY
```

The edge function reads the secret at runtime, creates an OAuth2 access token for FCM HTTP v1, and sends through:

```text
https://fcm.googleapis.com/v1/projects/<project_id>/messages:send
```

Rotation:

1. Create new Firebase service account key.
2. Update Supabase secret.
3. Redeploy edge function.
4. Disable old Firebase key.

No service account JSON, private key, APNs key, or Firebase admin credential is committed.

## Dispatcher Runtime Configuration

The scheduled dispatcher does not store its URL or shared secret in git. Runtime values live in two places:

- Supabase Edge Function secrets hold the dispatcher authorization secret and FCM credentials.
- `public.notification_dispatcher_runtime_config` stores the active schedule configuration for `public.notification_dispatcher_scheduled_http_v1()`.

Fresh environment setup:

1. Deploy `supabase/functions/notification-dispatcher`.
2. Set Edge Function secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NOTIFICATION_DISPATCHER_SHARED_SECRET`
   - `FCM_SERVICE_ACCOUNT_JSON`, or the split `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY` values.
3. Insert or update runtime config rows as service role:

```sql
insert into public.notification_dispatcher_runtime_config (key, value)
values
  ('enabled', 'true'),
  ('url', 'https://<project-ref>.supabase.co/functions/v1/notification-dispatcher'),
  ('shared_secret', '<same value as NOTIFICATION_DISPATCHER_SHARED_SECRET>')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
```

4. Verify the cron job exists and is active:

```sql
select jobname, schedule, active
from cron.job
where jobname = 'notification-dispatcher-every-minute-v1';
```

5. Verify dispatch with a controlled outbox row or a real card message. The expected path is `card_interactions` -> `notification_outbox` -> `notification-dispatcher` -> `notifications_log`.

## App Integration Plan

### Token Registration

Add a small notification registration service in Flutter:

- Ask permission only at the appropriate signed-in moment.
- Register FCM token after sign-in.
- Upsert into `device_tokens`.
- Refresh token on FCM token rotation.
- Disable token on sign-out if possible.

Platform setup:

- Android: Firebase Messaging config.
- iOS: APNs via FCM, push capability enabled in Xcode, device testing required.

### Deep Links

Notification payload deep link should open:

```text
grookai://card/<gv_id>?owner=<owner_user_id>&source=notification&notification_id=<id>
```

Fallback web URL:

```text
https://grookaivault.com/card/<gv_id>
```

App route must land on Card Detail with owner context when present.

Flutter handling must cover:

- Foreground: `onMessage` shows an in-app affordance only; it must not auto-navigate while the user is active.
- Background tap: `onMessageOpenedApp` routes to card detail.
- Killed/cold start: `getInitialMessage` is read during app launch, stored, and navigation is deferred until the navigator/root shell is mounted.
- Tap tracking is fire-and-forget and must never block navigation.
- iOS FCM v1 payload must include an `apns` block so killed-state delivery works through APNs-via-FCM.

### Tap Tracking

On notification tap:

- Parse `notification_id`.
- Call `public.mark_notification_tapped_v1(notification_id uuid)`.
- Then route to card detail.

RPC spec:

- `security definer`
- `set search_path = public`
- guard `auth.uid() = notifications_log.recipient_user_id`
- set-once: update only where `tapped_at is null`
- return a boolean or void

The log update is service-controlled or recipient-controlled only; users cannot mutate other users' notification logs.

## Preference Rules

- Missing prefs row: treat as default enabled prefs.
- `instant_enabled = false`: message-received rows are folded terminally in E2 and logged as `send_status='folded'`.
- `daily_pulse_enabled = false`: no daily digest push.
- `weekly_enabled = false`: no weekly push.
- `watches.muted_at is not null`: suppress events for that watch across all tiers.
- Quiet hours: if an instant row is otherwise sendable but falls inside quiet hours, update `available_at` to the next quiet-hours end in the user's timezone, clear claim fields, and do not consume budget until actual send.
- No preference failure should fail the originating app action.

## PR Breakdown

### PR 1 - Schema and Outbox Trigger

Migration only:

- `device_tokens`
- `notification_prefs`
- `notification_outbox`
- `notifications_log`
- `notification_delivery_budgets`
- `notification_emit_failures`
- RLS policies
- append-only / dispatcher-only guards
- `enqueue_card_interaction_notification_v1`
- `trg_enqueue_card_interaction_notification_v1`

Gate:

- RLS smoke:
  - anon denied on all tables.
  - user A cannot see or write user B tokens/prefs/logs.
  - user A cannot insert outbox rows directly.
  - service role can claim/update outbox.
- Insert one `card_interactions` row on dev and show exactly one outbox row.
- Reinsert/replay the same interaction id path and show `on conflict ... do nothing` prevents duplicate outbox rows.
- Trigger failure path logs and does not fail message insert.

### PR 2 - Dispatcher Edge Function and Dev Test Push

Server-only:

- Supabase Edge Function dispatcher.
- Concrete scheduled drain path: pg_cron -> pg_net HTTP call, or Supabase Scheduled Function if available in the deployed project.
- FCM HTTP v1 sender.
- budget enforcement.
- claim lease, retry, dead-letter handling.
- copy formatter.
- log writes.
- dev-only test push RPC/function or command.

Gate:

- Real device receives a dev test push.
- Payload with no card anchor is rejected and logged.
- Attempt 5 eligible sends for one user in one day: 3 sent, 2 folded.
- Concurrent dispatcher invocation cannot exceed 3 sends for one user/day.
- Reclaimable lease rows retry; rows with `send_started_at` are not double-sent.
- FCM unregistered/404 disables the token.
- Disabled prefs suppress sends.
- Muted watch suppresses send.

### PR 3 - App Token Registration, Deep Link, Tap Tracking

Flutter only plus minimal RPC if needed:

- Permission request flow.
- FCM token registration/upsert.
- Token refresh handling.
- Deep link route to card detail with owner context.
- foreground/background/killed notification handling.
- Notification tap tracking.

Gate:

- Android real device token appears in `device_tokens`.
- iPhone real device token appears in `device_tokens`.
- Message-received push opens the correct card detail.
- Cold-start notification tap opens the correct card detail after the app shell mounts.
- Tap sets `notifications_log.tapped_at`.
- Tap tracking failure does not block navigation.
- Sign-out does not leak another user's token.

## Verification Matrix

Required before E2 complete:

- `supabase migration up --local`
- RLS smoke tests for all new tables.
- `flutter analyze`
- `flutter test`
- Edge function unit tests for formatter, budget, prefs, and invalid payload rejection.
- Real Android device push.
- Real iPhone push via APNs-via-FCM.
- Deep link card route confirmed on device.
- Budget proof: 5 attempted sends -> 3 sent, 2 folded.
- Budget proof under concurrent drain: still max 3 sent.
- Retry proof: transient failure retries up to 3 attempts, then terminal failure.
- Token hygiene proof: same token re-registers to the latest user; FCM unregistered disables the token.
- Cold-start proof: killed app -> tap push -> card detail after shell mount.
- Message push proof: app and web both insert `card_interactions`; trigger creates outbox without client send logic.

## Rollback Plan

PR 1 rollback:

- Drop E2 trigger first.
- Drop E2 trigger function.
- Drop notification tables if no production sends have occurred.
- If sends have occurred, keep `notifications_log` for audit and disable the trigger/dispatcher instead.

PR 2 rollback:

- Disable scheduled dispatcher.
- Revoke or unset FCM Edge Function secrets.
- Leave outbox rows unsent for later replay or cleanup.

PR 3 rollback:

- Disable app registration flag.
- Stop upserting new tokens.
- Existing tokens can be disabled by service-role cleanup.

Emergency stop:

```sql
drop trigger if exists trg_enqueue_card_interaction_notification_v1 on public.card_interactions;
```

and disable the dispatcher schedule.
