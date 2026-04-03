# CHECKPOINT — Battle Academy Phase 9B Game FK Alignment V1

Date: 2026-04-02

Status: LOCKED
Scope: Resolve BA `card_prints.game_id` FK alignment against the actual `games` table and current `sets` schema
Phase: BA_PHASE9B_GAME_FK_ALIGNMENT_V1

---

## 1. Root Cause

The BA promotion path was not blocked by BA identity law.

It was blocked by parent-row FK alignment:

- `card_prints.game_id` is a real foreign key to `public.games(id)`
- `sets` does **not** currently store `game_id`
- `sets` stores a text `game` lane instead
- local replay had no canonical Pokemon row in `public.games`

Pre-fix inventory:

- `public.games` contained no Pokemon row
- BA sets were registered with `sets.game = 'pokemon'`
- BA promotion therefore had no lawful canonical `games.id` source to use for parent inserts

---

## 2. Fix Location

The lawful fix used the actual repo schema instead of inventing a `sets.game_id` column.

Fixes applied:

1. Added migration:

`20260402100008__games_seed_pokemon_for_card_print_fk.sql`

Purpose:

- ensure exactly one canonical Pokemon row exists in `public.games`
- fail closed if more than one Pokemon game row would exist

2. Updated BA promotion script:

`backend/pricing/ba_phase9_ba_canon_promote_v2.mjs`

Purpose:

- resolve BA parent `game_id` from the BA set’s `game` field through `public.games`
- stop if the set cannot resolve to exactly one canonical game row
- use the resolved `games.id` for `card_prints` inserts

No FK was disabled.
No UUID was hardcoded.
No constraint was bypassed.

---

## 3. Source-of-Truth Rule

Current schema truth:

- `sets.game` is the source lane
- `games.id` is the FK target

Current BA promotion rule:

```text
card_prints.game_id = resolve(public.games.id from public.sets.game for the BA set)
```

This is the lawful equivalent of “derive parent game from the set,” adapted to the actual repo schema.

---

## 4. Proof

Pre-fix:

- Pokemon game matches by `lower(name) like '%pokemon%'`: `0`
- BA set alignment status: unresolved for all three BA release sets

Post-fix after local replay:

- exactly one canonical Pokemon row exists in `public.games`
- all BA sets align to that row
- BA dry-run plans:
  - `328` parent inserts
  - `328` identity inserts
  - `0` blockers
  - `0` FK errors

---

## 5. Invariant

```text
All card_prints.game_id must reference a valid games.id derived from sets.
```

Under current schema this means:

```text
derive from sets.game via canonical lookup in public.games
```

---

## 6. Boundary

This phase did not promote BA canon rows.

It only:

- repaired the canonical game FK source
- removed the remaining BA parent insert blocker
- proved BA dry-run is now lawfully insertable

Next phase returns to:

`BA_PHASE9_BA_CANON_PROMOTION_V2`
