# CARD_INTERACTION_CONTRACT_V1

Status: DRAFT  
Type: Product + Data Contract  
Scope: Defines the first interaction layer for Grookai Vault

## Objective
Define how Grookai supports:
- Card Talk
- Want / wishlist signals

while preserving the rule:  
Card is truth. Interaction orbits the card.

## Product Principle
Card is truth.  
Conversation, desire, and action must remain anchored to the card.

Grookai is not adding generic social comments.

Grookai is adding card-centered interaction:
- comments exist to deepen understanding of a card shown on Grookai
- desire signals exist to express demand for a card
- interaction must stay subordinate to the card object
- interaction must not become profile chatter, generic posting, or feed-first social behavior

## Existing Surface Boundaries

This contract must coexist cleanly with existing repo surfaces:

- `card_prints`
  - canonical card identity
  - correct anchor for card-level desire
- `shared_cards`
  - public card surface shown on wall/profile/feed
  - correct anchor for public card-centered discussion in owner context
- `vault_item_instances`
  - ownership truth for a specific owned object
  - not the right V1 anchor for public Card Talk
- `card_interactions`
  - owner-to-owner contact / negotiation / execution lane
  - must remain separate from Card Talk
- `wishlist_items`
  - legacy wishlist product surface
  - must not be treated as the canonical V1 interaction model
- `card_signals`
  - legacy coarse signal/event surface
  - too broad for explicit durable Want state

Result:
- V1 Card Talk must not reuse `card_interactions`
- V1 Want must not rely on `wishlist_items` or generic `card_signals`

## Anchor Decisions

### Want signal anchor
- chosen anchor: canonical card via `card_prints.id`
- rationale:
  - Want expresses desire for the card itself, not for a specific owner, listing, or shared wall tile
  - one user should have one Want state per canonical card
  - the signal should survive feed, wall, and detail-surface changes
  - `gv_id` is the display/read alias, but `card_print_id` is the correct write anchor

### Card Talk anchor
- chosen anchor: hybrid
  - primary anchor: `shared_cards.id`
  - required canonical shadow: `card_print_id`
- rationale:
  - Card Talk is about a specific public card surface in owner context, not about the abstract card across all collectors
  - anchoring only to canonical card would collapse all collectors into one thread and destroy context
  - anchoring only to a profile would drift into profile comments
  - anchoring only to a vault item instance would drift into private object chat / trade execution
  - `shared_cards.id` preserves public owner/card context
  - `card_print_id` preserves card-first analytics, filtering, and future cross-surface counts

## V1 Feature Rules

### Want
- explicit toggle only
- one user can mark or unmark Want
- no folders
- no ranked lists
- no notes
- no collaborative wishlist behavior
- no social exposure in V1
- signal exists primarily for future ranking, personalization, and demand intelligence

### Card Talk
- public
- card-anchored
- tied to the specific public shared-card surface
- top-level messages plus one level of replies only
- replies to replies are not allowed
- owner can reply
- non-owners can post top-level messages and replies
- everyone can read when the shared card is public
- no likes
- no reactions
- no nested threading beyond one level
- no media attachments
- no moderation suite in V1
- no generic profile commenting

## Proposed V1 Schema

### user_card_signals
- purpose:
  - durable per-user card-level signal state
- fields:
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `card_print_id uuid not null references public.card_prints(id) on delete cascade`
  - `signal_type text not null`
  - `created_at timestamptz not null default now()`
- constraints:
  - unique `(user_id, card_print_id, signal_type)`
  - `signal_type in ('want')` for V1
- recommended indexes:
  - `(user_id, created_at desc)`
  - `(card_print_id, signal_type, created_at desc)`
- notes:
  - canonical write anchor is `card_print_id`
  - do not store `gv_id` as the primary FK substitute
  - do not reuse `wishlist_items`
  - do not reuse `card_signals`
  - future signals can extend this table only if they remain explicit user-to-card state, not event spam

### card_talk_messages
- purpose:
  - public card-centered discussion on a shared/public card surface
- fields:
  - `id uuid primary key default gen_random_uuid()`
  - `shared_card_id uuid not null references public.shared_cards(id) on delete cascade`
  - `card_print_id uuid not null references public.card_prints(id) on delete cascade`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `parent_message_id uuid null references public.card_talk_messages(id) on delete restrict`
  - `body text not null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz null`
  - `deleted_at timestamptz null`
- constraints:
  - `char_length(btrim(body)) between 1 and 2000`
  - top-level message: `parent_message_id is null`
  - reply: `parent_message_id` must point to a top-level message only
  - reply and parent must share the same `shared_card_id`
  - reply and parent must share the same `card_print_id`
- recommended indexes:
  - `(shared_card_id, created_at desc)`
  - `(card_print_id, created_at desc)`
  - `(parent_message_id, created_at asc)`
  - `(user_id, created_at desc)`
- notes:
  - top-level and reply rows share the same table
  - `shared_card_id` is the public-surface anchor
  - `card_print_id` is required to keep the system card-first
  - `deleted_at` is included because public threads need soft-delete to preserve reply structure without a full moderation suite
  - no separate reactions, attachments, or thread metadata tables in V1

## Behavioral Constraints

### Want constraints
- exactly one `want` per user per canonical card
- V1 toggle model is create/delete, not archive
- rationale:
  - Want is lightweight state, not historical event logging
  - create/delete keeps the write path simple
  - if historical demand events are needed later, add a separate append-only event layer instead of overloading V1 state

### Card Talk constraints
- replies allowed only to top-level messages
- replies to replies are forbidden
- reply parent must belong to the same `shared_card_id`
- reply parent must belong to the same `card_print_id`
- if a message is soft-deleted, replies remain visible and the deleted row is rendered as unavailable/deleted text
- author may soft-delete their own message in V1
- author may edit their own message in V1 only if the product team chooses to ship edit UI; the schema permits it, V1 UI does not require it
- shared-card owner is visually distinguished in UI, but owner moderation over other users is out of scope for V1

## Visibility Rules

### Want
- private only in V1
- readable only by the owning user
- writable only by the owning user
- not shown publicly on wall/profile/feed in V1
- not exposed as named user lists in V1
- future aggregate demand can be computed later, but no public Want count is required in V1

### Card Talk
- public read when the underlying `shared_card` is publicly visible
- authenticated users may write
- anonymous users may read if the shared card is public
- messages are tied to the card surface, not to the poster's profile
- if a collector turns off profile sharing or unshares the card, public reads should disappear with the `shared_card` visibility gate

## V1 UI Placement

### Want
- feed card affordance: compact toggle action
- card detail affordance: compact toggle action in the primary action cluster
- optional later placement on public/shared card surfaces, but not required for V1
- control should read like a small signal, not a full wishlist manager

### Card Talk
- public/shared card tile shows a small count affordance such as `Talk (3)`
- tapping opens a Card Talk sheet or dedicated page for that specific shared card
- thread is ordered newest-first at the top level or oldest-first if the product wants conversational stability; choose one and keep it consistent
- replies render directly under the top-level message
- owner messages carry a visible owner badge
- Card Talk belongs on the card surface, not on a profile tab called "Posts"

## Public/Private Policy Direction

### user_card_signals
- RLS target:
  - owner-only select
  - owner-only insert
  - owner-only delete

### card_talk_messages
- RLS target:
  - public read only when joined `shared_cards` row is publicly visible under existing `public_profiles` + `shared_cards` rules
  - authenticated insert only
  - author-only update/delete in V1

## Why These Choices

### Why Want is not anchored to `shared_cards`
- a user wants the card, not this owner's copy of the card
- otherwise the same user could create duplicate wants across multiple public owners

### Why Card Talk is not anchored only to `card_prints`
- one canonical card can appear on many different public owner surfaces
- collapsing all public discussion into one card-global thread would erase collector context

### Why Card Talk is not anchored to `vault_item_instances`
- that would move V1 toward owned-object conversation and overlap with the existing interaction network
- public Card Talk should remain lighter than negotiation/execution flows

### Why V1 does not reuse `card_interactions`
- `card_interactions` is participant-scoped, private, and tied to owner-contact / execution behavior
- Card Talk must be public, read-first, and wall-surface anchored

### Why V1 does not reuse `wishlist_items`
- `wishlist_items` is legacy wishlist product framing
- V1 needs a simpler signal model, not a full wishlist subsystem
- new work should treat `user_card_signals` as the canonical future-facing surface

## Out of Scope
- generic comments
- profile comments
- likes
- reactions
- deep threading
- media attachments
- moderation suite
- notifications
- ranking algorithm implementation
- collaborative filtering
- public wants list
- wishlist folders
- trade negotiation
- owner-to-owner DMs
- execution / sale / trade outcome logic
- per-message reputation systems
- card-global public forum threads

## Next PC Pass
Implement:
1. migration(s) for `user_card_signals`
2. migration(s) for `card_talk_messages`
3. RLS/policies
4. minimal read/write service surfaces
5. feed/card UI affordances

Do not implement:
- ranking engine
- notifications
- advanced moderation

## Implementation Notes for PC
- preserve card-first naming in service APIs
- use `card_print_id` as the canonical Want write key
- use `shared_card_id` as the Card Talk route/write key
- return `card_print_id`, `gv_id`, and `shared_card_id` together from Card Talk reads so UI always knows the card context
- treat `shared_cards.public_note` as owner-authored card caption and `card_talk_messages` as public conversation beneath it
- do not merge Card Talk into `card_interactions`

## Related Artifacts
- [GV_VAULT_INSTANCE_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/GV_VAULT_INSTANCE_CONTRACT_V1.md)
- [APP_FACING_DB_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/APP_FACING_DB_CONTRACT_V1.md)
- [2026-03-24_card_interaction_network_execution_layer_p3.md](/c:/grookai_vault/docs/checkpoints/2026-03-24_card_interaction_network_execution_layer_p3.md)
- [WALL_MOBILE_CATCHUP_AUDIT_V1.md](/c:/grookai_vault/docs/audits/WALL_MOBILE_CATCHUP_AUDIT_V1.md)
