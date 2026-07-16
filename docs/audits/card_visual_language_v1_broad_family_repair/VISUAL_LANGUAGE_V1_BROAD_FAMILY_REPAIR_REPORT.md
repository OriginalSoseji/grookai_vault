# Visual Language V1 Broad-Family Repair Report

Date: 2026-07-16

## Objective

Replace brittle exact-phrase checks with broader deterministic review families for the conceptual false negatives found in the latest 25-card dry run.

This is a validator-only repair.

## Scope Boundary

Performed:

- broadened unsupported personality/species interpretation detection
- broadened dramatic inferred action detection
- broadened object-material/card-finish confusion detection
- added metadata/identity language detection in prose and semantic tags
- added `fantastical` to speculative-setting detection
- expanded nonvisual semantic-tag detection
- added an explicit Energy branch allowance fixture for objective `energy symbol` wording

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

Expanded conceptual families:

- `potential_unsupported_personality_or_species_interpretation`
- `potential_dramatic_inferred_action_language`
- `potential_object_material_or_card_surface_confusion`
- `potential_metadata_or_identity_language`
- `potential_speculative_setting_language`
- `potential_semantic_tag_nonvisual_concept`

Representative covered variants include:

- `predatory nature`
- `exudes a sense of agility and strength`
- `speed and power`
- `excitement associated with this Pokemon`
- `Electric-type`
- `ready to spring into action`
- `summoning power or command`
- `final battle is suggested by the name of the card`
- `contemplative or calculated demeanor`
- `positive emotional tone`
- `hot, energetic atmosphere`
- `aggressive mood`
- `fantastical`
- `cheerful mood`
- `playful atmosphere`
- `whimsical touch`
- `glossy black body`
- `glossy black exterior`
- `shiny surfaces`
- `imminent detonation`
- `shiny reflective surface`
- `smooth silver appearance`
- exact card-name semantic tags such as `Cinnabar City Gym`
- nonvisual tags such as `award` and `whimsical`

## Energy Branch Allowance

The repair does not ban objective Energy-card wording such as:

```text
energy symbol
abstract energy
radiating lines
```

The fixture `card visual language enforcement preserves objective Energy branch wording` verifies that these terms do not create metadata/nonvisual flags by themselves.

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
- `21` tests passed
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

The broad-family deterministic repair has passed targeted fixture/contract validation.

The next safe gate is human review of whether this rule set is appropriate to test with another branch-stratified 25-card dry run. Do not run another OpenAI sample until that review decision is accepted.
