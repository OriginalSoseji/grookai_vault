# Visual Language V1 Subject-Correctness Repair Report

Date: 2026-07-16

## Objective

Close the deterministic review gaps found in the branch-stratified 25-card dry run before running another OpenAI sample.

This was a code and fixture-contract repair only.

## Scope Boundary

Performed:

- expanded narrow Visual Language flag patterns
- added canonical-name contradiction checks
- added multi-subject prompt guidance for Tag Team-style Pokemon cards
- separated generic franchise language from creature language on non-Pokemon branches
- repaired fallback routing for `Cynthia's Feelings (Temple of Anger No. 064)`
- ran syntax and targeted contract validation

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

## Implementation Repairs

### Narrow Language And Surface Repairs

The deterministic review rules now flag:

- `evocative`
- `enchantment`
- `intrigue`
- `tranquil` / `tranquility`
- `clear gloss finish`
- `reflective finish`
- `clean, reflective finish`
- `glossy surface`
- `metallic finish`
- `smooth silver finish`
- printing-quality overclaims such as `without visible errors` and `imperfections`

These flags force `needs_review` through existing review-status behavior.

### Unsupported Expression Claims

The validator now catches a contradiction where a description says face or facial features are not visible, then assigns emotion or intent such as:

- `determination`
- `determined`
- `focused`
- `serious`
- `contemplative`
- `thoughtfulness`
- `introspection`
- `anticipation`
- `enthusiasm`

### Subject-Correctness Flags

New deterministic flags:

- `potential_primary_subject_mismatch`
- `potential_subject_count_mismatch`
- `potential_canonical_name_visual_conflict`
- `potential_generic_franchise_language_on_non_pokemon_branch`

The canonical-name checks do not redefine identity. They only compare expected visible subjects from canonical name context against generated structured subjects and obvious contradiction phrases.

Covered fixtures:

- `Mew ex` described as mushroom-like creatures
- `Gengar` described as having no limbs
- `Lucario & Melmetal-GX` collapsed into one hybrid creature

### Multi-Subject Prompt Support

Prompt V6 remains the active architecture, with a versioned repair suffix:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR
```

The prompt now includes:

- `expected_visible_subjects_from_name`
- instruction to describe multiple canonical Pokemon as separate visible subjects
- instruction not to merge Tag Team-style subjects into one hybrid creature unless the artwork literally shows a fused body
- instruction for `visual_attributes.subjects.primary` to include each visible canonical Pokemon subject on multi-subject Pokemon cards

### Cynthia Metadata Audit

The suspicious routing for `Cynthia's Feelings (Temple of Anger No. 064)` came from fallback name heuristics, not canonical database truth.

Previous fallback order could route the row as Stadium because the parenthetical text contained `Temple`.

The fallback order now checks item/trainer cues before stadium cues and includes `feelings` as a trainer/supporter cue.

Fixture proof:

```text
resolveCardPromptMetadata({ name: "Cynthia's Feelings (Temple of Anger No. 064)" }).prompt_branch === "trainer"
resolveCardPromptMetadata({ name: "Cynthia's Feelings (Temple of Anger No. 064)" }).card_type_metadata_source === "name_fallback_trainer"
```

This is still a deterministic fallback. Real canonical metadata remains the preferred branch authority.

## Validation

Commands run:

```powershell
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

Results:

- syntax check passed
- targeted contract suite passed
- `18` tests passed
- `0` tests failed

## Boundary Proof

No model run was executed.

No run artifact was created by the agent.

No database connection was opened for apply.

No rows were written to:

- `public.card_visual_description_runs`
- `public.card_print_visual_descriptions`
- `public.card_prints`

No embeddings or app-facing reads were created.

## Current Decision

The deterministic repair gate has passed targeted contract validation.

The next safe gate is one final branch-stratified 25-card OpenAI dry run using the repaired prompt/version and unchanged repaired rule set.

That next dry run must still be read-only:

- no database writes
- no approvals
- no embeddings
- no semantic search
- no downstream integrations
- no mid-run patching

