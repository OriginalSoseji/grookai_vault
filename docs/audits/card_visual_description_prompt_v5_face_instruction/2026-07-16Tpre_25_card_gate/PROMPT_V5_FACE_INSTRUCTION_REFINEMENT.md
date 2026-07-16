# Card Visual Description Prompt V5 Face Instruction Refinement

Date: 2026-07-16

## Scope

Prompt-quality refinement only before any 25-card sample.

No database schema, migration behavior, review workflow, embeddings, semantic search, Taste Engine, Listing Resolver, canonical identity, OpenAI generation, or database write changed in this gate.

## Decision

Bumped the prompt version to `CARD_VISUAL_DESCRIPTION_PROMPT_V5` because the prompt text changed and future generated rows must preserve prompt provenance.

Added this instruction:

```text
When visible, explicitly describe where the face, eyes, and defining species features are located. If they cannot be confidently identified, state that explicitly rather than implying they do not exist.
```

## Why

Human review of the V4 Mega Chandelure dry-run found that the output was strong enough for the next 25-card learning gate, but the prompt still needed a clearer rule for subtle or unclear faces. The model should distinguish between:

- a face integrated into a central body,
- a face visible but subtle,
- and no confidently identifiable face.

It should not imply the species lacks a face simply because the face is difficult to identify from the artwork.

## Validation

Focused checks passed:

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - `9/9`

No OpenAI call was made for this refinement. No row was inserted. No row was approved. No embeddings were generated. No 25-card sample was run.

## Exact Next Gate

Run the explicitly approved bounded 25-card OpenAI sample with cost ceiling, no automatic approval, no embeddings, and no app-facing exposure.
