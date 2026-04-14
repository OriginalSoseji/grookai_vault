# CONTRACT: AI_FEED_AND_INTENT_FOUNDATION_V1

Status: ACTIVE
Type: System Contract
Scope: Feed Memory + Intent + Card Comments (Interaction Layer)

---

# PURPOSE

This contract defines the canonical foundation for:

- Feed memory (anti-repeat)
- Collector intent (Want, Trade, etc.)
- Card-anchored interaction (comments)
- Matching primitives
- Future AI ranking signals

This is a production-grade, one-pass schema foundation designed to avoid future migrations.

---

# CORE PRINCIPLE

Grookai is a:

-> card interaction network

NOT:
- social feed
- content platform
- engagement app

All interactions must follow:

-> card -> owner -> action

---

# TABLE 1 - user_card_intents

## Purpose
Durable collector intent per canonical card.

## Definition

One row per:
- user_id
- card_print_id

## Schema

```sql
CREATE TABLE IF NOT EXISTS public.user_card_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  card_print_id UUID NOT NULL,

  -- Intent Layer (future-proof)
  want BOOLEAN DEFAULT FALSE,
  trade BOOLEAN DEFAULT FALSE,
  sell BOOLEAN DEFAULT FALSE,
  showcase BOOLEAN DEFAULT FALSE,

  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,

  -- Future-safe expansion
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT user_card_intents_unique UNIQUE (user_id, card_print_id)
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_user_card_intents_user
ON public.user_card_intents (user_id);

CREATE INDEX IF NOT EXISTS idx_user_card_intents_card
ON public.user_card_intents (card_print_id);

CREATE INDEX IF NOT EXISTS idx_user_card_intents_public_want
ON public.user_card_intents (card_print_id)
WHERE want = true AND is_public = true;
```

---

# TABLE 2 - card_feed_events

## Purpose
Append-only event + feed memory system.

## Rules
- INSERT ONLY
- NO UPDATES
- NO DELETES

## Schema

```sql
CREATE TABLE IF NOT EXISTS public.card_feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  card_print_id UUID NOT NULL,

  event_type TEXT NOT NULL,

  -- Context
  surface TEXT,
  source_bucket TEXT,
  feed_request_id UUID,
  position INT,

  -- Flexible signal storage
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_feed_events_user_time
ON public.card_feed_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_events_user_card
ON public.card_feed_events (user_id, card_print_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_events_type
ON public.card_feed_events (user_id, event_type, created_at DESC);
```

---

# TABLE 3 - card_comments

## Purpose
Card-anchored interaction layer.

NOT a social system.

## Rules
- MUST reference card_print_id
- NO standalone comments
- NO profile comments
- NO feed-post comments

## Schema

```sql
CREATE TABLE IF NOT EXISTS public.card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  card_print_id UUID NOT NULL,
  user_id UUID NOT NULL,

  body TEXT NOT NULL,

  -- Optional structure
  intent_type TEXT,
  parent_comment_id UUID,

  is_public BOOLEAN DEFAULT TRUE,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_card_comments_card
ON public.card_comments (card_print_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_card_comments_user
ON public.card_comments (user_id);
```

---

# EVENT TYPES (LOCKED V1)

Allowed event_type values:

- impression
- click
- open_detail
- share
- want_on
- want_off
- add_to_vault
- hide
- dismiss

---

# PRODUCT BEHAVIOR

## FEED

- suppress recently seen cards
- downrank repeated dismiss/hide
- boost:
  - want_on
  - add_to_vault
  - share

---

## WALL (WANTED)

Render cards where:

want = true
AND is_public = true

---

## MATCHING

Allowed queries:

- users who want cards I own
- users who own cards I want

Must use:

is_public = true

---

## COMMENTS

Comments must:

- be attached to card_print_id
- represent real collector interaction

Example:

"Bro this is badass, trade?"

NOT:

- generic engagement
- social chatter
- profile comments

---

# RLS (REQUIRED)

## user_card_intents

- owner can read/write own rows
- public read allowed ONLY where is_public = true

## card_feed_events

- owner-only read
- service role insert allowed

## card_comments

- public read where is_public = true
- owner can write

---

# ANTI-DRIFT RULES

Do NOT create:
- wishlist_items (new)
- feed_impressions table
- social comments system
- duplicate intent tables

ALL must route through:

- user_card_intents
- card_feed_events
- card_comments

---

# FUTURE EXTENSIONS (NO SCHEMA CHANGE REQUIRED)

Supported by design:

- AI ranking
- demand aggregation
- trade matching engine
- vendor insights
- recommendation systems

---

# MIGRATION FILE NAME

supabase/migrations/YYYYMMDDHHMMSS_ai_feed_intent_comments_v1.sql

---

# APPLY STEPS

1. supabase db push
2. supabase db reset --local
3. verify tables exist
4. verify indexes
5. verify RLS policies
6. run sample inserts

---

# GIT COMMIT

```bash
git add .
git commit -m "feat: add AI feed + intent + card comments foundation (V1 contract + schema)"
git push
```

---

# FINAL PRINCIPLE

This system enables:

- non-repetitive feed
- real collector intent
- card-level interaction
- future AI learning

WITHOUT:

- social noise
- schema churn
- architectural drift
