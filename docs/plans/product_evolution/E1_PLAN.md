# E1 Plan - Interest Graph Schema + Event Emission

Date: 2026-07-06  
Branch: `codex/product-evolution-v2`  
Status: approved for implementation. PR 1 schema and PR 2 emission triggers + slim wrappers have passed their local gates. PR 3 backfill worker is implemented for dry-run/dev-user apply; full-user apply still requires separate approval.

Migration-chain note: the blocked pricing compat migration was repaired as a standalone non-E1 chain fix by guarding `20260629120000_mee_reference_anchored_pricing_compat_view_v1.sql` when the out-of-band reference-anchored pricing bridge view is absent locally. This is not an E1 pricing change; it only lets a fresh local/staging migration chain reach the E1 migrations.

## Goal

Build the first durable interest graph layer without touching pricing or identity internals:

1. Add `watches` as the user's durable interest index, with backfill rollback provenance.
2. Add append-only `card_events` as the canonical event stream for future surfaces.
3. Emit most events from DB triggers at the write boundary, not from repeated app/web call-site wrappers.
4. Use slim app/web wrappers only where DB triggers cannot know the full context: completion crossings and Scanner V5 payload enrichment.
5. Backfill implicit watches from real production tables.
6. Add a secure keyset-paginated read RPC modeled on `local_community_feed_v2`.

## Approved Amendments Integrated

| Amendment | Integrated design |
| --- | --- |
| 1. Visibility pinned | `vault_added` and public `vault_intent_changed` are `public` iff the actor has `public_profile_enabled=true` and `vault_sharing_enabled=true` at write time; otherwise `private`. `collector_followed` is always `followers`. |
| 2. Trigger-first emission | DB triggers emit from `wishlist_items`, `collector_follows`, instance-intent writes, vault item writes, and wall section/membership writes. Wrappers only handle completion crossings and Scanner V5 enrichment. |
| 3. No silent event loss | Non-trigger emitters write durable failures to `card_events_emit_failures`; not dev/test-only logging. |
| 4. Watch rollback marker | `watches.origin text not null default 'live'`, with `live` and `backfill_v1`. Backfill rollback deletes by `origin='backfill_v1'`. |
| 5. Import/want/crossing rules | Imports create exactly one `vault_import` summary event per run; per-card watches still upsert through the vault trigger. `want_removed` downgrades to `owned` if still owned, else deletes. Completion crossings are upward-only and deduped by `completion_crossings`. |

## Existing Evidence To Reuse

| Existing system | Evidence | E1 use |
| --- | --- | --- |
| Local feed privacy | `supabase/migrations/20260624120000_local_community_feed_wishlist_match_v2.sql` | Copy the `security definer`, `auth.uid()`, public profile/vault sharing, block, mute, and non-leakage pattern |
| Block helper | `public.local_community_collectors_are_blocked_v1` | Reuse for event visibility filters |
| Local mutes | `collector_local_mutes` | Exclude muted actors/subjects in event read RPC |
| Public profile gates | `public_profiles.public_profile_enabled`, `vault_sharing_enabled` | Pin write-time public/private visibility |
| Vault add | `vault_item_instances` writes and `VaultCardService.addOrIncrementVaultItem` call sites | Trigger emits `vault_added`; wrappers only add scanner/import/completion context where needed |
| Intent changes | `vault_item_instances.intent` / current instance intent write path feeding `v_card_stream_v1` | Trigger emits `vault_intent_changed` and applies public/private rule |
| Wants | `wishlist_items` and current want surfaces | Trigger emits `want_added` / `want_removed`; trigger mutates card watches |
| Follows | `collector_follows` | Trigger emits `collector_followed` / `collector_unfollowed`; trigger mutates collector watches |
| Wall updates | `wall_sections`, `wall_section_memberships` | Triggers emit `wall_updated` |
| Dex completion | `v_grookai_dex_species_v1` and P0 owned joins | Slim wrapper computes crossings after vault write |
| Set completion | `publicSetMasterSetStats.ts`, `public_sets_service.dart` | Add consolidated SQL helper so crossings use one denominator |
| Scanner V5 | `scanner_v5_scan/card` session log and confirmed add flow | Base `vault_added` comes from DB trigger; Scanner V5 wrapper writes enrichment event/failure separately |

## PR Breakdown

Implement in no more than 3 PRs after this rewritten plan is approved:

| PR | Scope | Verification |
| --- | --- | --- |
| PR 1 - Schema/RPC | `watches`, `card_events`, `card_events_emit_failures`, `completion_crossings`, visibility helpers, set completion helper, read RPC, append-only guards, RLS | SQL lint/apply in dev; no pricing/identity writes |
| PR 2 - Emission triggers + slim wrappers | DB trigger migration for write-boundary emission and watch updates; slim wrappers for completion crossings, Scanner V5 enrichment, and one import summary event | `flutter analyze`, `flutter test`; perform each app action once on dev and show `card_events` rows |
| PR 3 - Backfill job | Idempotent watch backfill from real tables using `origin='backfill_v1'` | Dev-account backfill produces sane watch counts; one-line rollback works |

## PR 1 - Schema And Read RPC

### `watches`

Proposed table:

```sql
create table public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('card', 'set', 'character', 'collector')),
  subject_id uuid not null,
  reason text not null check (reason in ('owned', 'want', 'inferred', 'manual')),
  strength double precision not null default 1.0 check (strength >= 0 and strength <= 1),
  muted_at timestamptz,
  origin text not null default 'live' check (origin in ('live', 'backfill_v1')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, subject_type, subject_id)
);
```

Subject mapping:

| Subject type | `subject_id` |
| --- | --- |
| `card` | `card_prints.id` |
| `set` | `sets.id` |
| `character` | `pokemon_species.id` |
| `collector` | `auth.users.id` |

Indexes:

```sql
create index watches_user_subject_idx on public.watches (user_id, subject_type, created_at desc);
create index watches_subject_lookup_idx on public.watches (subject_type, subject_id);
create index watches_user_active_idx on public.watches (user_id, muted_at) where muted_at is null;
```

RLS:

- Owner-only select/insert/update/delete.
- Service role all.
- No anon access.

Strength defaults:

| Reason | Strength |
| --- | --- |
| `manual` | `1.0` |
| `want` | `0.95` |
| `owned` | `0.80` |
| `inferred` | `0.35` |

Reason precedence:

```text
manual > want > owned > inferred
```

### `card_events`

Proposed table:

```sql
create table public.card_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  card_print_id uuid references public.card_prints(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  visibility text not null check (visibility in ('public', 'followers', 'private')),
  dedupe_key text,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);
```

Notes:

- `card_print_id` is nullable for collector, wall-level, set, character, and summary events.
- `payload.subject_type` and `payload.subject_id` carry non-card subjects.
- `dedupe_key` is optional and unique where not null for idempotent one-shot events.

Append-only:

- Block update.
- Block delete.
- Inserts only.

RLS:

- Insert: authenticated users may insert only when `actor_user_id = auth.uid()`; trigger functions may insert as security definer where appropriate.
- Select: uses the same visibility helper as the read RPC.
- Direct anon select is not granted.
- Service role all.

### `card_events_emit_failures`

Durable production failure log for non-trigger emitters:

```sql
create table public.card_events_emit_failures (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text,
  card_print_id uuid references public.card_prints(id) on delete set null,
  source text not null,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);
```

Rules:

- Non-trigger emitters must write here on failure.
- Failure logging is not dev/test-only.
- Append-only.
- Owner can select own failures; service role all.

### `completion_crossings`

Small dedup table for upward-only set/Dex completion crossings:

```sql
create table public.completion_crossings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('set', 'character')),
  subject_id uuid not null,
  threshold integer not null check (threshold in (25, 50, 75, 90, 100)),
  previous_percent integer not null check (previous_percent >= 0 and previous_percent <= 100),
  crossed_percent integer not null check (crossed_percent >= 0 and crossed_percent <= 100),
  card_event_id uuid references public.card_events(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, subject_type, subject_id, threshold)
);
```

Rules:

- Crossings fire only when `previous_percent < threshold and next_percent >= threshold`.
- Crossings never fire downward.
- Unique key prevents duplicate events for the same threshold.
- RLS owner-only select; inserts via service role/security-definer crossing helper.

### Visibility Helpers

Add SQL helpers, reused by RLS and RPC:

| Helper | Purpose |
| --- | --- |
| `interest_graph_collector_public_v1(user_id)` | true iff `public_profile_enabled=true` and `vault_sharing_enabled=true` |
| `interest_graph_collectors_visible_to_viewer_v1(viewer, actor, subject)` | applies profile/vault gates, blocks, and mutes |
| `interest_graph_card_event_visible_to_viewer_v1(viewer, actor, subject, visibility)` | final event visibility predicate |
| `card_events_resolve_visibility_v1(event_type, actor_user_id, requested_visibility)` | pins write-time visibility |

Pinned write-time rules:

| Event | Visibility |
| --- | --- |
| `vault_added` | `public` iff actor has public profile and vault sharing enabled at write time; else `private` |
| `vault_intent_changed` with trade/sell/showcase | `public` iff actor has public profile and vault sharing enabled at write time; else `private` |
| `vault_intent_changed` with hold/private intent | `private` |
| `collector_followed` | `followers` |
| `collector_unfollowed` | `private` |
| `want_added` / `want_removed` | `private` |
| `wall_updated` | `public` iff actor has public profile and vault sharing enabled at write time; else `private` |
| `set_completion_crossed` / `dex_completion_crossed` | `private` |
| `vault_import` | `private` |
| `scanner_v5_vault_add_enriched` | `private` |

No "candidate" visibility language remains.

### Read RPC

Create `public.card_events_feed_v1` modeled on `local_community_feed_v2`:

```sql
create or replace function public.card_events_feed_v1(
  p_limit integer default 40,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  event_id uuid,
  event_type text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  actor_slug text,
  actor_display_name text,
  subject_slug text,
  subject_display_name text,
  payload jsonb,
  visibility text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public;
```

Keyset order:

```sql
order by created_at desc, id desc
```

Cursor:

- Client stores the last row's `created_at` and `event_id`.
- Next page sends `p_before_created_at`, `p_before_id`.

Privacy:

- Requires `auth.uid()`.
- Applies `interest_graph_card_event_visible_to_viewer_v1`.
- Does not expose private wishlist metadata, exact location, private wall rows, or raw private card IDs.

### Set Completion Helper

Pick: add consolidated SQL helper in PR 1.

Reason: set completion is currently service-level in both app and web. Completion-crossing wrappers and backfill need one denominator/numerator source to avoid app/web drift.

Proposed helper:

```sql
create or replace function public.user_set_completion_v1(
  p_user_id uuid,
  p_set_id uuid
)
returns table (
  set_id uuid,
  parent_print_count integer,
  variant_option_count integer,
  owned_variant_option_count integer,
  missing_variant_option_count integer,
  completion_percent integer
);
```

Rules:

- Denominator = `card_printings` child options plus parent fallback for cards with no child options.
- Numerator = active `vault_item_instances` owned by `p_user_id`, using `card_printing_id` when present and fallback parent ownership otherwise.
- Authenticated calls require `p_user_id = auth.uid()` unless service role.
- Aggregate only; no private instance detail leaks.

### PR 1 Rollback Notes

Rollback order:

1. Revoke/drop `card_events_feed_v1`.
2. Revoke/drop `user_set_completion_v1`.
3. Revoke/drop visibility helper functions.
4. Drop `completion_crossings`.
5. Drop `card_events_emit_failures`.
6. Drop `card_events` triggers/policies/table.
7. Drop `watches` triggers/policies/table.

No pricing or identity table rollback is needed because PR 1 must not alter those tables.

## PR 2 - Emission Triggers + Slim Wrappers

PR 2 is trigger-first.

### Trigger Migration

Add security-definer trigger functions and AFTER triggers on:

| Source table | Trigger timing | Events/watches |
| --- | --- | --- |
| `vault_item_instances` | AFTER INSERT | `vault_added`; upsert `watch(card, owned, 0.80)` |
| `vault_item_instances` intent column or current instance-intent table | AFTER UPDATE of intent | `vault_intent_changed`; public iff profile/vault sharing and trade/sell/showcase; watch remains owned |
| `wishlist_items` | AFTER INSERT | `want_added`; upsert `watch(card, want, 0.95)` |
| `wishlist_items` | AFTER DELETE | `want_removed`; if user still owns the card downgrade watch to `owned/0.80`, else delete card watch unless manual reason exists |
| `collector_follows` | AFTER INSERT | `collector_followed`; upsert `watch(collector, manual, 1.0)` |
| `collector_follows` | AFTER DELETE | `collector_unfollowed`; delete/mute collector watch only if reason is manual and no stronger future reason exists |
| `wall_sections` | AFTER INSERT/UPDATE/DELETE | `wall_updated` |
| `wall_section_memberships` | AFTER INSERT/DELETE | `wall_updated`, with `card_print_id` when resolvable from `vault_item_instances` |

Trigger principles:

- Use `security definer`, `set search_path=public`.
- Do not write pricing tables.
- Do not write identity tables.
- Do not call pricing or identity functions.
- Trigger emits should be idempotent where natural, using `dedupe_key`.
- Trigger failures should fail the originating write only when data integrity is impossible. Otherwise write an event failure row if the trigger can safely do so.

### Slim Wrappers

Wrappers are allowed only for:

1. Completion crossings.
2. Scanner V5 payload enrichment.
3. One summarized import event per import run.

They are not allowed to duplicate basic vault/want/follow/wall event emission.

### Event Types

| Event type | Trigger/wrapper | Visibility | Payload |
| --- | --- | --- | --- |
| `vault_added` | DB trigger on active vault item insert | `public` iff actor profile+vault sharing enabled at write time; else `private` | `gvvi_id`, `source` when available, optional `card_printing_id` |
| `vault_intent_changed` | DB trigger on intent change | trade/sell/showcase: `public` iff actor profile+vault sharing enabled at write time; else `private`; hold/private intent: `private` | `previous_intent`, `next_intent`, `gvvi_id` |
| `want_added` | DB trigger on `wishlist_items` insert | `private` | no private wishlist metadata |
| `want_removed` | DB trigger on `wishlist_items` delete | `private` | no private wishlist metadata |
| `collector_followed` | DB trigger on `collector_follows` insert | `followers` | `subject_type=collector`, `subject_id` |
| `collector_unfollowed` | DB trigger on `collector_follows` delete | `private` | `subject_type=collector`, `subject_id` |
| `wall_updated` | DB triggers on wall section/membership writes | `public` iff actor profile+vault sharing enabled at write time; else `private` | `operation`, `section_id`, optional `gvvi_id` |
| `vault_import` | Import wrapper once per run | `private` | import id/source, inserted count, updated count, skipped count |
| `scanner_v5_vault_add_enriched` | Scanner V5 wrapper after confirmed add | `private` | session id, confirmed rank, response mode, candidate list summary, base `gvvi_id` |
| `set_completion_crossed` | Completion wrapper | `private` | subject set id, previous percent, next percent, threshold |
| `dex_completion_crossed` | Completion wrapper | `private` | subject species id, previous percent, next percent, threshold |

### Scanner V5 Enrichment Mechanism

Pick: post-insert enrichment event.

Mechanism:

1. Scanner V5 confirmed add still calls the normal vault-add path.
2. The `vault_item_instances` trigger emits the base `vault_added` event even if Scanner V5 enrichment never runs.
3. After the add returns `gvvi_id`, the Scanner V5 wrapper inserts a second private event: `scanner_v5_vault_add_enriched`.
4. The enrichment event payload includes:
   - `session_id`
   - `confirmed_rank`
   - `response_mode`
   - `gv_id`
   - `card_id`
   - `gvvi_id`
   - compact response candidates
5. If enrichment insert fails, the wrapper writes `card_events_emit_failures` with source `scanner_v5_enrichment`.

Justification:

- The base `vault_added` event must be guaranteed by the DB trigger.
- Scanner payload is client/session context that DB triggers cannot infer from `vault_item_instances`.
- A second event avoids fragile session variables and avoids blocking the vault add on optional scanner metadata.

### Import Summary Mechanism

Imports must not emit one summary event per card.

Rules:

- `vault_item_instances` trigger still upserts per-card `watch(card, owned)`.
- Import wrapper emits exactly one `vault_import` event per run.
- Payload includes run/source/counts only, not every private card detail.
- If the import summary event fails, write `card_events_emit_failures` with source `vault_import_summary`.

### Want Removed Rule

On `wishlist_items` delete:

1. Emit `want_removed`.
2. If the user still owns the card, update `watches` to:

```text
reason = 'owned'
strength = 0.80
origin = existing origin unless null
```

3. If the user does not own the card, delete the card watch unless the existing reason is `manual`.
4. Never downgrade `manual`.

### Completion Crossings

Thresholds:

```text
25, 50, 75, 90, 100
```

Rules:

- Upward-only.
- Compare `previous_percent` to `next_percent`.
- Insert into `completion_crossings` first.
- The unique key `(user_id, subject_type, subject_id, threshold)` dedupes.
- Emit `set_completion_crossed` or `dex_completion_crossed` only if the crossing insert succeeds.
- If event insert fails after crossing insert, log `card_events_emit_failures`; do not retry blindly without inspecting dedupe state.

### Reference Surfaces To Verify

These are not individual wrapper targets anymore. They are surfaces the trigger design must cover:

| User action surface | Expected coverage |
| --- | --- |
| Card detail add to vault | `vault_item_instances` trigger |
| Search/explore add to vault | `vault_item_instances` trigger |
| Vault add/increment | `vault_item_instances` trigger |
| Public GVVI add | `vault_item_instances` trigger |
| Scanner V5 confirmed add | base trigger + scanner enrichment wrapper |
| Collection import | per-card watches via trigger + one import summary wrapper |
| Single/bulk intent set | intent trigger |
| Want added/removed | `wishlist_items` triggers |
| Follow/unfollow | `collector_follows` triggers |
| Wall section/membership edits | wall triggers |

### PR 2 Rollback Notes

Rollback order:

1. Drop triggers added in PR 2.
2. Drop trigger functions added in PR 2.
3. Disable slim wrappers in app/web.
4. Leave PR 1 schema in place.

Existing user actions continue through original services because triggers/wrappers sit beside existing writes.

## PR 3 - Backfill Job

### Backfill Inputs

Use real tables only:

| Source | Watch |
| --- | --- |
| Active owned cards | `vault_item_instances where archived_at is null and card_print_id is not null` -> `watch(card, owned, origin='backfill_v1')` |
| Wants | `wishlist_items` -> `watch(card, want, origin='backfill_v1')` |
| Sets with >=3 owned | Active `vault_item_instances` joined to `card_prints.set_id`, grouped by user/set -> `watch(set, inferred, origin='backfill_v1')` |
| Collector follows | `collector_follows` -> `watch(collector, manual, origin='backfill_v1')` |

Do not source backfill from staging, pricing, identity candidate, scanner artifacts, or audit files.

### Backfill Script

Node script:

```text
backend/engagement/backfill_interest_graph_watches_v1.mjs
```

Modes:

```text
--dry-run
--apply
--user-id <uuid>
--limit-users <n>
```

Reports:

```text
docs/audits/product_evolution/e1_watch_backfill_<timestamp>.json
docs/audits/product_evolution/e1_watch_backfill_<timestamp>.md
```

Conflict behavior:

- Upsert by `(user_id, subject_type, subject_id)`.
- Preserve stronger reason/strength.
- Do not overwrite `manual` with lower-strength backfill reason.
- Do not unmute existing muted watches.
- Set `origin='backfill_v1'` only for rows created by the backfill.
- Existing live rows keep `origin='live'`.

### PR 3 Rollback Notes

Dev rollback:

```sql
delete from public.watches
where user_id = :dev_user_id
  and origin = 'backfill_v1';
```

Production rollback, if needed:

```sql
delete from public.watches
where origin = 'backfill_v1';
```

Use production rollback only with explicit approval and after preserving the backfill audit report.

## Tests And Checks

Each PR must pass:

```text
flutter analyze
flutter test
```

Web checks for touched web code:

```text
npm test --workspace apps/web
```

Migration/schema checks:

```text
supabase db lint
supabase migration up --local
```

If local Supabase is blocked by unrelated prior migrations, report the blocker with the exact migration/function/table and verify against a clean dev database before apply approval.

## Manual Gate After Implementation

Perform each action once on a dev build and show resulting `card_events` rows:

| Action | Expected event |
| --- | --- |
| Add card manually | `vault_added` |
| Add card from Scanner V5 confirmed candidate | `vault_added` plus `scanner_v5_vault_add_enriched` |
| Change copy intent to trade/sell/showcase | `vault_intent_changed` |
| Add want | `want_added` |
| Remove want | `want_removed` and watch downgrade/delete rule applied |
| Follow collector | `collector_followed` |
| Unfollow collector | `collector_unfollowed` |
| Add/remove wall section membership | `wall_updated` |
| Run import | exactly one `vault_import` summary event |
| Cross set threshold | `set_completion_crossed`, deduped in `completion_crossings` |
| Cross Dex/species threshold | `dex_completion_crossed`, deduped in `completion_crossings` |

Example event verification:

```sql
select
  id,
  event_type,
  card_print_id,
  actor_user_id,
  subject_user_id,
  visibility,
  dedupe_key,
  payload,
  created_at
from public.card_events
where actor_user_id = :dev_user_id
order by created_at desc
limit 50;
```

Backfill verification:

```sql
select subject_type, reason, origin, count(*)
from public.watches
where user_id = :dev_user_id
group by subject_type, reason, origin
order by subject_type, reason, origin;
```

Crossing dedup verification:

```sql
select subject_type, subject_id, threshold, count(*)
from public.completion_crossings
where user_id = :dev_user_id
group by subject_type, subject_id, threshold
having count(*) > 1;
```

Expected result: zero rows.

Failure log verification:

```sql
select source, event_type, count(*)
from public.card_events_emit_failures
where actor_user_id = :dev_user_id
group by source, event_type
order by source, event_type;
```

Expected result during normal test run: zero rows. Forced failure tests must show rows here.

## Hard Gate

- Zero writes to pricing tables.
- Zero writes to identity tables.
- No changes to pricing workers.
- No changes to identity resolvers.
- No direct mutation of `card_prints`, `sets`, `pokemon_species`, or `card_print_species` except read-only joins.
- Base events from trigger-backed writes must still emit even if optional wrapper enrichment fails.

## Approval Needed

This integrated E1 plan is not approved yet. After approval, start PR 1 from this amended design.
