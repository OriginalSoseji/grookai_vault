# Card Visual Description Prompt V3 Repair Checkpoint

Date: 2026-07-16

## Context

The first one-card OpenAI apply proved the agent path, but human review found the Mega Chandelure ex description was not approvable as written.

## Problem

The model confused Chandelure anatomy with a separate held object, overcommitted on an ambiguous background, and mixed metadata into semantic tags.

## Decision

Patch before any 25-card sample. The agent now uses `CARD_VISUAL_DESCRIPTION_PROMPT_V3`, exact card targeting, semantic tag sanitization, and deterministic review flags for the observed failure classes.

## Current Truths

- V1 description row `6723bfa5-f20a-409b-a191-a31c8e9af76a` is `needs_review`.
- V2 description row `5b106a2c-80f0-4881-a98b-6482a1a1d5f5` is `needs_review`.
- V3 description row `bdaa5df8-81d4-4251-898f-0728086b4b82` is current and `pending`.
- No row is approved.
- No row has embeddings.
- No app-facing view references the visual description tables.
- No canonical `card_prints` visual, semantic, description, or embedding columns were added.

## Invariants

- Visual descriptions remain derived intelligence.
- The worker does not mutate canonical identity.
- Review status gates trust.
- No automatic approval.
- No embeddings before a separate explicit gate.
- No Taste Engine, Listing Resolver, Grookai Signature, or app-facing integration in this gate.

## Token And Cost Result

V3 same-card regeneration:

- input tokens: `9260`
- output tokens: `336`
- total tokens: `9596`
- estimated cost: `$0.0015906`
- request count: `1`
- retry count: `0`

## Tests

Focused checks passed:

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs`

## Explicit Next Gate

Human-review the V3 pending row for `GV-PK-JPN-M5-113`.

Only after that review should the project proceed to a bounded 25-card OpenAI sample with cost ceiling, no auto-approval, no embeddings, and no app-facing exposure.
