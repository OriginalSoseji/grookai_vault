# E2 Plan - Notification Infra

Status: pending approval. Do not implement until approved.

Date: 2026-07-06

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

- unique token, or unique `(user_id, token)` if Firebase can recycle tokens across installs in testing.
- index `(user_id, disabled_at, last_seen_at desc)`.

RLS:

- Owner-only select/insert/update for authenticated users where `auth.uid() = user_id`.
- No anon access.
- Service role can read/write for dispatcher and token cleanup.
- Users may mark their own token disabled, but cannot read or mutate another user's token.

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
- `available_at timestamptz not null default now()`
- `claimed_at timestamptz null`
- `sent_at timestamptz null`
- `folded_into_digest_at timestamptz null`
- `failed_at timestamptz null`
- `failure_reason text null`
- `created_at timestamptz not null default now()`

Constraints and indexes:

- unique `(recipient_user_id, dedupe_key)`.
- index `(available_at, claimed_at, sent_at, failed_at)`.
- index `(recipient_user_id, created_at desc)`.
- check that pushable rows contain either `card_print_id` or both `actor_user_id` and `card_print_id`; the dispatcher will also reject invalid payloads defensively.

RLS:

- No anon access.
- No normal authenticated direct writes.
- Authenticated users may not select the outbox directly.
- Service-role-only insert/select/update for triggers and dispatcher.
- Trigger functions use `security definer` and handle exceptions without failing the originating user action.

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

- Hard cap: max 3 pushes per user per day, including instant pushes.
- When cap is reached, eligible instant rows are folded into the daily digest instead of sent immediately.

RLS:

- No anon access.
- Owner may select own budget for transparency if needed.
- Service role owns insert/update.

## Message Push Outbox Trigger

Add one E2 migration near the existing group-state trigger:

- Function: `public.enqueue_card_interaction_notification_v1()`
- Trigger: `trg_enqueue_card_interaction_notification_v1`
- Table: `public.card_interactions`
- Timing: `after insert`

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
9. Trigger catches exceptions, writes a failure record, and never fails the original `card_interactions` insert.

This replaces any client-side send idea. App and web keep inserting messages as they do today.

## Dispatcher Plan

### Runtime

Implement as a Supabase Edge Function:

- `supabase/functions/notification-dispatcher/index.ts`
- Service-role environment only.
- Invoked manually for dev tests and later by scheduled job/cron.

The dispatcher:

1. Claims eligible `notification_outbox` rows with `available_at <= now()`.
2. Loads recipient prefs, unmuted watch state, delivery budget, and active device tokens.
3. Rejects payloads without a card anchor.
4. Formats copy in one shared formatter.
5. Enforces hard budget.
6. Sends via FCM HTTP v1.
7. Writes `notifications_log`.
8. Marks outbox row `sent_at`, `folded_into_digest_at`, or `failed_at`.

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

No notification can be generic or engagement-bait copy.

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

### Tap Tracking

On notification tap:

- Parse `notification_id`.
- Call a small RPC or direct owner-authorized endpoint to set `notifications_log.tapped_at = now()`.
- Then route to card detail.

The log update is service-controlled or recipient-controlled only; users cannot mutate other users' notification logs.

## Preference Rules

- `instant_enabled = false`: message-received rows fold into daily digest or remain logged as skipped, depending on tier plan approved in implementation.
- `daily_pulse_enabled = false`: no daily digest push.
- `weekly_enabled = false`: no weekly push.
- `watches.muted_at is not null`: suppress events for that watch across all tiers.
- No preference failure should fail the originating app action.

## PR Breakdown

### PR 1 - Schema and Outbox Trigger

Migration only:

- `device_tokens`
- `notification_prefs`
- `notification_outbox`
- `notifications_log`
- `notification_delivery_budgets`
- optional `notification_emit_failures`
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
- Trigger failure path logs and does not fail message insert.

### PR 2 - Dispatcher Edge Function and Dev Test Push

Server-only:

- Supabase Edge Function dispatcher.
- FCM HTTP v1 sender.
- budget enforcement.
- copy formatter.
- log writes.
- dev-only test push RPC/function or command.

Gate:

- Real device receives a dev test push.
- Payload with no card anchor is rejected and logged.
- Attempt 5 eligible sends for one user in one day: 3 sent, 2 folded.
- Disabled prefs suppress sends.
- Muted watch suppresses send.

### PR 3 - App Token Registration, Deep Link, Tap Tracking

Flutter only plus minimal RPC if needed:

- Permission request flow.
- FCM token registration/upsert.
- Token refresh handling.
- Deep link route to card detail with owner context.
- Notification tap tracking.

Gate:

- Android real device token appears in `device_tokens`.
- iPhone real device token appears in `device_tokens`.
- Message-received push opens the correct card detail.
- Tap sets `notifications_log.tapped_at`.
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

