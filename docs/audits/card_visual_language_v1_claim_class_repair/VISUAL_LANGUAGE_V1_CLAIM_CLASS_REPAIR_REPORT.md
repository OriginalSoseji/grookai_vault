# Visual Language V1 Claim-Class Repair Report

Date: 2026-07-16

## Objective

Implement the narrow deterministic repair requested after the broad-family 25-card dry run.

This is validator-only work.

## Scope Boundary

Performed:

- added deterministic review checks for the `7` first-pass false-negative families
- added claim-class flags that preserve the matched phrase and field
- added cross-field expression contradiction detection
- added targeted contract fixtures
- ran targeted syntax and contract validation

Not performed:

- no OpenAI calls
- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no prompt rewrite
- no production sample

## Implemented Claim Classes

New or strengthened deterministic checks:

- `potential_visual_material_vs_surface_confusion`
- `potential_canonical_metadata_in_visual_output`
- `potential_unsupported_personality_or_species_interpretation`
- `potential_cross_field_expression_contradiction`
- `potential_primary_subject_anatomy_overclaim`
- `potential_abstract_shape_literalization`
- `potential_purpose_or_lore_interpretation`

Existing flags remain in place for compatibility with previous artifacts and review workflows.

## False-Negative Coverage

The repair covers the missed phrase families from the broad-family 25-card dry run:

- non-hyphen metadata language: `electric type`
- partial canonical identity tags: `Mega Excadrill`
- object-material/card-finish confusion: `glossy finish`, `shiny finish`, `smooth and reflective`, `reflective dark orb`, `matte textures`, `uniform finish`
- dramatic/action inference: `readiness for action or attack`, `ready for action`, `potential for detonation`, `explosive atmosphere`
- unsupported personality/emotion language: `emotional charge of the moment`, `quiet confidence`, `contemplative expression`, `contemplation`
- purpose/lore interpretation: `essence of`, `connection to history`, `supportiveness`, character-theme claims
- Energy abstract literalization: `night cityscape`, `buildings`, `leaf-shaped object`

## Relationship Checks

The repair adds a cross-field expression contradiction rule:

```text
face or expression cannot be determined
+
emotion/personality claim in prose, attributes, or semantic tags
=
potential_cross_field_expression_contradiction
```

This catches cases such as:

```text
facial expression cannot be determined
+
semantic tag: confident expression
```

## Validation

Commands run:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
git diff --check
```

Results:

- syntax check passed
- targeted contract suite passed: `23/23`
- whitespace check passed

## Boundary Proof

No model run was executed.

No database connection was opened.

No rows were written to:

- `public.card_visual_description_runs`
- `public.card_print_visual_descriptions`
- `public.card_prints`

No embeddings or app-facing reads were created.

## Current Decision

The narrow claim-class deterministic repair has passed targeted validation.

The next safe gate is human review of this repair and then a decision on whether to run another branch-stratified 25-card OpenAI dry run. Do not apply rows yet.
