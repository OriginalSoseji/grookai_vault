# CARD_VISUAL_DESCRIPTIONS_CHECKPOINT_INDEX

## Purpose

This checkpoint pack preserves the architectural and operational memory for canonical card visual descriptions.

The visual description layer exists to create detailed, reviewable, derived intelligence for matching and future semantic search. It must not become canonical identity truth, image truth, pricing truth, or an app-facing surface until later gates explicitly approve those boundaries.

## Checkpoints

- `CARD_VISUAL_DESCRIPTION_AGENT_V1_ONE_CARD_APPLY_20260716.md` - `2026-07-16` - COMPLETE - Records that the card visual description migration was applied, schema/RLS/grants were verified, exactly one real OpenAI-backed description was inserted for `GV-PK-JPN-M5-113`, the row remained `pending`, and embeddings/app-facing integrations were not performed.
- `CARD_VISUAL_DESCRIPTION_PROMPT_V3_REPAIR_20260716.md` - `2026-07-16` - COMPLETE - Records the first human review repair: V1/V2 Mega Chandelure rows moved to `needs_review`, prompt V3 added object-like anatomy rules, semantic tag sanitization, exact card targeting, deterministic review flags, and a V3 current `pending` row.
- `CARD_VISUAL_DESCRIPTION_AGENT_V1_APPLY_GATE_BLOCKED_20260715.md` - `2026-07-15` - BLOCKED - Records that the OpenAI-backed agent dry-run path and cost telemetry were proven, but the one-card database apply was stopped before migration apply because strict migration prepush found remote-only migration IDs in the linked Supabase ledger.

## Current State

- Agent implementation: local branch `feature/card-visual-description-agent`.
- Migration: `supabase/migrations/20260715120000_card_visual_description_agent_v1.sql` applied.
- Remote apply: complete for the private visual description schema.
- One-card database apply proof: produced for `GV-PK-JPN-M5-113`.
- Current review truth: V1 and V2 rows are `needs_review`; V3 row is current and `pending`.
- Next gate: human-review the V3 generated description. If accepted, explicitly approve a bounded 25-card OpenAI production sample with cost ceiling, no automatic approval, no embeddings, and no app-facing exposure.
