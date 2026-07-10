# E9 Plan - Collector Memories

Status: draft for approval. No implementation has started.

Date: 2026-07-10

Branch: `engage/collector-memories`

Baseline: `main` includes E1 interest graph, E2 notifications, E3 want-match, E4 Pulse, E5 Card Journeys, E6 onboarding, E7 founder metrics, E8 public pages, Scanner V5 production endpoint wiring, and the July 9 pricing worker repairs.

## Objective

Collector Memories is private emotional infrastructure for the exact copy a collector owns.

E9 adds a private, card-instance-anchored memory layer keyed to `public.vault_item_instances`. A memory belongs to one authenticated owner and one owned object. It can store a note, one optional photo, optional coarse place/occasion labels, and an optional memory date.

This is not a social surface. It is not public. It is not a feed. It is not part of Pulse, Wall, Card Journeys, discovery, notifications, search, SEO, or sharing.

## Hard Boundaries

- No public read path.
- No anon read path.
- No sharing in v1.
- No writes to `card_events`.
- No writes to feeds, Wall, Pulse, Journey, public profile, public vault, notification, pricing, identity, scanner identity, or ingestion tables.
- No automatic memory creation. The system may suggest a prompt, but a user action must create the memory.
- No retroactive location inference.
- No exact location capture in v1.
- No streaks, gamification, guilt copy, or engagement pressure.
- No broad “year in cards” implementation in v1; only card-instance detail surfaces.
- No automatic exposure of memory photos through existing public exact-copy media policies.

## Current Foundation

Relevant existing surfaces:

- Exact-copy authority is `public.vault_item_instances`.
- Private exact-copy app screen is `lib/screens/vault/vault_gvvi_screen.dart`.
- Exact-copy mobile service is `lib/services/vault/vault_gvvi_service.dart`.
- Private/public exact-copy read functions already distinguish owner and public surfaces:
  - `vault_mobile_instance_detail_v1`
  - `public_vault_instance_detail_v1`
- Existing exact-copy media uses `user-card-images`, but that bucket has a public-select policy for discoverable uploaded exact-copy card media only. E9 should not rely on that public media lane for memory photos.

## Data Model

### `public.collector_memory_type`

Enum:

```sql
create type public.collector_memory_type as enum (
  'added_place',
  'occasion',
  'first',
  'note'
);
```

Meanings:

- `added_place`: user-created memory from an add flow or exact-copy screen, with a coarse place label supplied or confirmed by the user.
- `occasion`: user-entered date/occasion anchor, such as a birthday, show, trip, gift, trade night, or local shop visit.
- `first`: user-accepted prompt for a computed first, such as first PSA 10, first completed set, or first card above a configured value threshold.
- `note`: free private card-copy note that does not fit the other buckets.

### `public.collector_memories`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `vault_item_instance_id uuid not null references public.vault_item_instances(id) on delete cascade`
- `memory_type public.collector_memory_type not null`
- `note text null`
- `photo_path text null`
- `place_label text null`
- `occasion_label text null`
- `memory_date date null`
- `prompt_key text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null`

Constraints:

- `note` length capped, proposed `<= 1200` characters.
- `place_label` length capped, proposed `<= 80`.
- `occasion_label` length capped, proposed `<= 80`.
- `photo_path` must be null or under the owner's private memory path prefix.
- `prompt_key` is optional, but unique for active prompt-created memories: unique `(user_id, prompt_key)` where `prompt_key is not null and archived_at is null`.
- `vault_item_instance_id` must belong to `user_id`. Enforce in write RPCs and with trigger/check helper because SQL check constraints cannot reference another table.

Indexes:

- `(user_id, vault_item_instance_id, created_at desc) where archived_at is null`
- `(user_id, memory_date desc nulls last, created_at desc) where archived_at is null`
- `(user_id, prompt_key) where prompt_key is not null and archived_at is null`

RLS:

- Enable RLS.
- Owner-only select/insert/update/archive/delete by `auth.uid() = user_id`.
- No `anon` grants.
- No public views.
- Service-role has normal maintenance access.

### `public.collector_memory_prompt_state`

Purpose: track quiet one-tap prompts and dismissals without creating memories automatically.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `vault_item_instance_id uuid not null references public.vault_item_instances(id) on delete cascade`
- `prompt_key text not null`
- `prompt_type public.collector_memory_type not null check (prompt_type = 'first' or prompt_type = 'added_place')`
- `prompt_payload jsonb not null default '{}'::jsonb`
- `offered_at timestamptz not null default now()`
- `accepted_memory_id uuid null references public.collector_memories(id) on delete set null`
- `dismissed_at timestamptz null`
- `dismissed_forever boolean not null default false`
- unique `(user_id, prompt_key)`

Rules:

- A dismissed-forever prompt never reappears.
- Accepting a prompt creates a `collector_memories` row and sets `accepted_memory_id`.
- Prompt payload is display metadata only. It cannot contain private note text or public feed payloads.
- Prompt rows are owner-only.

## Memory Photos

Create a dedicated private bucket:

- `collector-memory-images`

Path shape:

```text
<user_id>/memories/<memory_id>/photo
```

Policies:

- Owner can insert/select/update/delete only paths under their own `auth.uid()` folder.
- No public select policy.
- No integration with `public_vault_instance_detail_v1`, Wall, public GVVI, Journey, Pulse, or Open Graph surfaces.

Reason for a dedicated bucket:

- Existing `user-card-images` has a deliberately narrow public select policy for uploaded exact-copy display images when an instance is discoverable. Memory photos must never depend on that bucket's public media lane, even if the current policy would not expose unrelated paths.

## RPC Contracts

Prefer RPCs over direct app writes so ownership, path validation, prompt idempotency, and archive behavior stay centralized.

### `public.collector_memories_for_gvvi_v1(p_gv_vi_id text, p_limit integer default 20, p_before_created_at timestamptz default null, p_before_id uuid default null)`

Returns active memories for the signed-in owner and exact copy.

Fields:

- `id`
- `vault_item_instance_id`
- `gv_vi_id`
- `memory_type`
- `note`
- `photo_path`
- `place_label`
- `occasion_label`
- `memory_date`
- `prompt_key`
- `created_at`
- `updated_at`
- cursor fields

Security:

- Security definer.
- Requires `auth.uid()`.
- Resolves `p_gv_vi_id` to `vault_item_instances` with `user_id = auth.uid()` and `archived_at is null`.
- Returns zero rows for non-owned or archived copies.

### `public.collector_memory_create_v1(...)`

Creates a memory for a signed-in owner.

Inputs:

- `p_gv_vi_id text`
- `p_memory_type public.collector_memory_type`
- `p_note text default null`
- `p_photo_path text default null`
- `p_place_label text default null`
- `p_occasion_label text default null`
- `p_memory_date date default null`
- `p_prompt_key text default null`

Rules:

- Resolves the GVVI to an active owned `vault_item_instances` row.
- Validates text limits.
- Validates `photo_path` is null or under `<auth.uid()>/memories/<new-or-existing-memory-id>/photo`.
- If `p_prompt_key` is supplied, the RPC must either atomically create the memory and set prompt state accepted, or fail without partial prompt mutation.
- No `card_events` write.

### `public.collector_memory_update_v1(...)`

Updates owner-owned memory fields.

Rules:

- Owner-only.
- Cannot move a memory to a different `vault_item_instance_id`.
- Cannot change `user_id`.
- Can replace or clear `photo_path` after path validation.

### `public.collector_memory_archive_v1(p_memory_id uuid)`

Soft-archives a memory.

Rules:

- Owner-only.
- Sets `archived_at`.
- Does not delete storage object automatically in PR 1. App service may remove the object first, then call archive.

### `public.collector_memory_prompt_state_v1(p_gv_vi_id text)`

Returns currently eligible prompts for an owned exact copy.

Fields:

- `prompt_key`
- `prompt_type`
- `prompt_title`
- `prompt_body`
- `suggested_place_label`
- `suggested_occasion_label`
- `suggested_memory_date`
- `card display fields needed by UI`

Rules:

- Owner-only.
- Dismissed-forever and accepted prompts are excluded.
- Does not create memories.

### `public.collector_memory_prompt_dismiss_v1(p_prompt_key text)`

Marks a prompt dismissed forever for the signed-in user.

Rules:

- Owner-only.
- Idempotent.
- Does not affect a memory that already exists.

## Prompt Sources

E9 prompts are quiet, dismissible, and never automatic memory rows.

### Added-In-Place

Source:

- Vault add completion flow that already returns a GVVI.

Behavior:

- App may show a one-tap memory prompt after add if the user opted into coarse place labeling.
- Place label is user-confirmed text, such as `Tokyo`, `Dallas card show`, or `Local shop`.
- No background location capture.
- No retroactive place inference from old vault rows.

Implementation note:

- If no reliable location permission/design exists yet, PR 2 ships the prompt surface with manual place entry only. The plan must not block on location APIs.

### Occasion Anchors

Source:

- User action from the exact-copy memory composer.

Behavior:

- User adds occasion label and optional date to an old or new copy.
- No automatic occasion inference from contacts/calendar/photos.

### Computed Firsts

Prompt candidates:

- First PSA 10.
- First completed set.
- First card over a configured visible value threshold.

Rules:

- Offered once per user/prompt key.
- Never auto-created.
- Never fires again after dismiss or accept.
- If the underlying fact later changes, the original prompt remains dismissed/accepted.

Open implementation questions for PR 1 audit:

- Exact grade representation for "PSA 10" should use current `vault_item_instances.grade_company` / `grade_value` / `grade_label` normalization. PR 1 must name the exact predicate.
- "First completed set" should reuse E3/E4 set completion helper lineage if available. If no reusable helper exists, defer this prompt to a follow-up and ship the table/RPC path first.
- "First card over $X" must use existing app-visible pricing read layer only. No pricing writes or new pricing computation. Threshold default needs founder approval before implementation; proposed starting point is `$100`.

## App Surface

UI is design-gated and waits for approved high-fi mockups.

V1 surface:

- Private `VaultGvviScreen` only.
- Section label: `MEMORIES` or approved mockup copy.
- Shows active memories for this exact copy.
- Memory creation/editing is private owner-only.
- Prompt rows are quiet and dismissible.

Out of scope:

- Public GVVI screen.
- Card detail grouped page.
- Wall.
- Pulse.
- Feed.
- Search.
- "Your year in cards" chronological view.

## Service Layer

Add a `CollectorMemoryService` or extend `VaultGvviService` only if the local pattern strongly favors it.

Required behavior:

- Load memories by GVVI through `collector_memories_for_gvvi_v1`.
- Create/update/archive through RPCs.
- Upload one photo to `collector-memory-images` using the dedicated private path.
- Remove replaced/archived photo objects when the app has the path and operation succeeds.
- Surface honest errors without implying sharing or public visibility.

## Privacy Proof Plan

PR 1 must prove:

- Anon cannot read `collector_memories`.
- User A cannot read User B's memories.
- User A cannot create a memory for User B's GVVI.
- User A cannot attach a memory to an archived/non-owned GVVI.
- User A cannot select User B's memory photo from Storage.
- Public GVVI RPC output does not include memory fields.
- E5 Journey RPCs do not include memory fields.
- E4 Pulse RPCs do not include memory fields.
- E1 card event feeds do not include memory fields.
- Wall/public profile views do not include memory fields.

## PR Breakdown

### PR 1 - Memory Contracts And Privacy Gates

Scope:

- Add `collector_memory_type`.
- Add `collector_memories`.
- Add `collector_memory_prompt_state`.
- Add dedicated private `collector-memory-images` bucket and owner-only policies.
- Add owner-only RPCs for list/create/update/archive/dismiss.
- Add RLS and storage smoke tests.
- Add contract tests proving memories are absent from public/event/feed/Journey/Pulse surfaces.

Gate:

- Fresh local migration chain applies.
- Anon denied on tables/RPCs/storage.
- User A cannot read/write User B rows.
- User A cannot attach a memory to non-owned or archived GVVI.
- Create/update/archive are idempotent where expected.
- A memory created with a place label is visible only to the owner on the private RPC.
- Public GVVI, Wall, Journey, Pulse, and card events expose no memory fields.
- No pricing/identity/notification/ingestion/scanner writes.

Rollback:

- Drop RPCs.
- Drop storage policies and bucket if empty.
- Drop `collector_memory_prompt_state`.
- Drop `collector_memories`.
- Drop enum after dependents are removed.

### PR 2 - App Service Behind Feature Flag

Scope:

- Add service methods for load/create/update/archive/upload photo/dismiss prompt.
- Add no visible UI except optional test harness or hidden feature-flag route if needed for automated tests.
- Integrate add-flow prompt hook only as data/service plumbing; no visible prompt until PR 3 mockups.

Gate:

- `flutter analyze`.
- `flutter test`.
- Service tests cover empty memory list, create memory, update memory, archive memory, photo path validation, prompt dismiss, RPC failure, and private suppression.
- App does not query memory tables directly if RPC is the chosen boundary.

Rollback:

- Remove service methods and feature flag; DB contracts remain harmless.

### PR 3 - Design-Gated Exact-Copy Memories UI

Status: blocked until high-fi mockups are approved.

Scope:

- Add Memories section to private `VaultGvviScreen`.
- Add memory composer/editor.
- Add one-photo attachment flow.
- Add quiet prompt row/card behavior for added-place, occasion, and any computed-first prompt that PR 1 proves supportable.
- Add dismiss-forever prompt action.

Gate:

- Device screenshots/video for:
  - memory created at vault-add with place label
  - occasion memory attached to an old card
  - computed first prompt accepted once
  - computed first prompt dismissed forever and not shown again
  - one-photo memory
  - empty memories state
- Anon and another user cannot read memory row or photo.
- Memories absent from every public/event/feed/Journey/Pulse output.
- `flutter analyze`, `flutter test`, full shipcheck green.

Rollback:

- Feature-flag off the UI and remove navigation entry. DB rows remain private.

### PR 4 - Prompt Computation Hardening

Only if PR 1 audit shows computed firsts need more than simple app-side checks.

Scope:

- Add bounded helper RPCs or service-layer checks for first PSA 10, first completed set, and first card over approved value threshold.
- No automatic memory creation.
- No pricing writes.

Gate:

- Each prompt fires once.
- Each prompt remains dismissed forever after dismissal.
- No public/event/feed output.

## Open Questions For Approval

1. Should the dedicated memory photo bucket be named `collector-memory-images` as proposed?
2. What initial value threshold should qualify for "first card over $X"? Proposed: `$100`.
3. Should PR 1 defer "first completed set" if the reusable completion helper is not clean enough, or should it extract the helper immediately?
4. Should memory notes allow multiline text up to `1200` chars, or should v1 be shorter?
5. Should an archived exact copy hide memories entirely or show them read-only in the owner's archive view later? Proposed v1: hide with active GVVI only; archived-copy memories remain in DB but are not surfaced.

