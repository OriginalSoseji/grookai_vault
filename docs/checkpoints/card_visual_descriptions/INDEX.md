# CARD_VISUAL_DESCRIPTIONS_CHECKPOINT_INDEX

## Purpose

This checkpoint pack preserves the architectural and operational memory for canonical card visual descriptions.

The visual description layer exists to create detailed, reviewable, derived intelligence for matching and future semantic search. It must not become canonical identity truth, image truth, pricing truth, or an app-facing surface until later gates explicitly approve those boundaries.

## Checkpoints

- `CARD_VISUAL_DESCRIPTION_AGENT_V1_25_CARD_SAMPLE_20260716.md` - `2026-07-16` - COMPLETE - Records the Prompt V5 25-card OpenAI sample, self-hosted canonical image resolver repair, 25 current private rows, `24 pending`/`1 needs_review`, zero approved rows, zero embeddings, cost telemetry, schema/RLS/boundary readback, and the next human-review gate.
- `CARD_VISUAL_DESCRIPTION_AGENT_V1_ONE_CARD_APPLY_20260716.md` - `2026-07-16` - COMPLETE - Records that the card visual description migration was applied, schema/RLS/grants were verified, exactly one real OpenAI-backed description was inserted for `GV-PK-JPN-M5-113`, the row remained `pending`, and embeddings/app-facing integrations were not performed.
- `CARD_VISUAL_DESCRIPTION_PROMPT_V3_REPAIR_20260716.md` - `2026-07-16` - COMPLETE - Records the first human review repair: V1/V2 Mega Chandelure rows moved to `needs_review`, prompt V3 added object-like anatomy rules, semantic tag sanitization, exact card targeting, deterministic review flags, and a V3 current `pending` row.
- `CARD_VISUAL_DESCRIPTION_AGENT_V1_APPLY_GATE_BLOCKED_20260715.md` - `2026-07-15` - BLOCKED - Records that the OpenAI-backed agent dry-run path and cost telemetry were proven, but the one-card database apply was stopped before migration apply because strict migration prepush found remote-only migration IDs in the linked Supabase ledger.

## Current State

- Agent implementation: local branch `feature/card-visual-description-agent`.
- Migration: `supabase/migrations/20260715120000_card_visual_description_agent_v1.sql` applied.
- Remote apply: complete for the private visual description schema.
- One-card database apply proof: produced for `GV-PK-JPN-M5-113`.
- 25-card Prompt V5 sample: complete, with `25` current private rows, `24 pending`, `1 needs_review`, `0 approved`, and `0 embedded`.
- Current review truth: visual descriptions remain private derived intelligence and require human review before approval or downstream use.
- Next gate: human-review the 25 generated current rows. Do not approve rows, generate embeddings, build semantic search, expose app-facing reads, or integrate Grookai Signature until that gate explicitly accepts quality and selects the next bounded action.
