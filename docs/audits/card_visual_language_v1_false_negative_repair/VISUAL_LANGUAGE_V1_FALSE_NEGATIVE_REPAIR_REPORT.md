# Visual Language V1 False-Negative Repair Report

Date: 2026-07-16

## Objective

Repair the remaining deterministic false negatives found in the subject-repair 25-card dry run.

This is a validator-only repair.

## Scope Boundary

Performed:

- added focused flags for unsupported personality/species interpretation
- added focused flags for dramatic inferred action language
- added focused flags for object-material wording that can be confused with physical card finish
- added generic filler detection for `standard card border visible`
- expanded semantic-tag nonvisual detection for `celebratory`, `uplifting`, and `theme`
- added fixture/contract coverage for the exact missed phrases

Not performed:

- no OpenAI calls
- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production sample
- no schema changes
- no migration changes
- no prompt text changes

## Implementation Repairs

New deterministic flags:

- `potential_unsupported_personality_or_species_interpretation`
- `potential_dramatic_inferred_action_language`
- `potential_object_material_or_card_surface_confusion`

Expanded existing flags:

- `potential_generic_filler` now catches `standard card border visible`
- `potential_semantic_tag_nonvisual_concept` now catches `celebratory`, `uplifting`, and `theme`

Exact dry-run misses now covered:

- `aggressive demeanor`
- `strength and aggression`
- `characteristic of its species`
- `concentration or contemplation`
- `serious demeanor`
- `introspection and determination`
- `contemplative pose`
- `impending action`
- `excitement and tension`
- `something dramatic is about to occur`
- `glossy, reflective surface`
- `standard card border visible`
- `celebratory theme`

## Prompt Version

The prompt version remains:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR
```

No prompt text changed. This repair changes deterministic post-generation review routing only.

## Validation

Commands run:

```powershell
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

Results:

- syntax check passed
- targeted contract suite passed
- `19` tests passed
- `0` tests failed

## Boundary Proof

No model run was executed.

No database connection was opened for apply.

No rows were written to:

- `public.card_visual_description_runs`
- `public.card_print_visual_descriptions`
- `public.card_prints`

No embeddings or app-facing reads were created.

## Current Decision

The deterministic false-negative repair gate has passed targeted contract validation.

The next safe gate is human review of whether this rule set is strict enough to run another branch-stratified dry run. Do not run another OpenAI sample until that review decision is accepted.
