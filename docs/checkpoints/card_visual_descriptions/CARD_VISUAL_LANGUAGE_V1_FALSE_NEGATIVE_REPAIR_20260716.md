# CARD_VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The subject-repair 25-card dry run validated all 25 cards and wrote no database rows, but first-pass review found four status-level false negatives.

Those misses were concentrated in narrow, repeatable language patterns rather than broad prompt architecture.

## Problem

The remaining false negatives were:

- personality/species interpretation on Pokemon descriptions
- trainer emotion and demeanor language not safely grounded in visible expression
- dramatic inferred action language on object cards
- object-material wording that can be confused with physical card finish
- generic card-border filler
- nonvisual semantic-tag terms such as `celebratory theme`

## Risk

If these phrases remain ungated, visually polished descriptions can remain `pending` while still violating Grookai Visual Language V1.

The risk is not schema failure. It is review-routing failure.

## Decision

Add narrow deterministic review checks for the exact false-negative families and stop after targeted fixture/contract validation.

New flags:

- `potential_unsupported_personality_or_species_interpretation`
- `potential_dramatic_inferred_action_language`
- `potential_object_material_or_card_surface_confusion`

Expanded flags:

- `potential_generic_filler`
- `potential_semantic_tag_nonvisual_concept`

## Alternatives Rejected

- Prompt V7 rewrite: rejected because this is deterministic enforcement, not prompt architecture.
- Immediate database apply: rejected because review-routing still needed repair.
- Another 25-card OpenAI run in the same gate: rejected because this gate is fixture/contract validation only.
- Embeddings and semantic search: rejected because generated descriptions remain unapproved derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Current Truths

- `potential_unsupported_personality_or_species_interpretation` exists.
- `potential_dramatic_inferred_action_language` exists.
- `potential_object_material_or_card_surface_confusion` exists.
- The exact phrases from the four false negatives are covered by contract fixtures.
- Prompt text did not change.
- Prompt version remains `CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR`.
- Targeted contracts pass.
- No OpenAI call was made.
- No database row was written.

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.

## Token And Cost Result

No model calls were made in this checkpoint.

Token usage:

```text
input_tokens: 0
output_tokens: 0
total_tokens: 0
estimated_cost_usd: 0
```

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define identity, printing truth, finish, rarity, pricing, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not patch rules midway through a sample used for evaluation.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Validation

Commands run:

```powershell
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

Results:

- syntax check passed
- contract suite passed
- `19` tests passed
- `0` tests failed

## Artifacts

Audit report:

```text
docs/audits/card_visual_language_v1_false_negative_repair/VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_REPORT.md
```

Checkpoint:

```text
docs/checkpoints/card_visual_descriptions/CARD_VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_20260716.md
```

## Explicit Next Gate

Human review this deterministic repair and decide whether to run another branch-stratified 25-card OpenAI dry run.

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until a later gate explicitly approves it.
