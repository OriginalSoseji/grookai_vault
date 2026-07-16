# CARD_VISUAL_LANGUAGE_V1_SUBJECT_CORRECTNESS_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The branch-stratified 25-card dry run proved the agent now works structurally across Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter branches.

Human review found the next quality risk was not broad prompt architecture. It was deterministic enforcement around subject correctness, expression contradictions, surface overclaims, and suspicious fallback routing.

## Problem

The sample showed repeatable weaknesses:

- interpretive mood language such as `intrigue`, `tranquil`, and `enchantment`
- unsupported expression claims after face-not-visible language
- surface overclaims such as `reflective finish` and `clear gloss finish`
- wrong subject recognition, including Mew-like and multi-subject failures
- generic franchise language on non-Pokemon branches being mixed with creature-language flags
- `Cynthia's Feelings` being routed suspiciously by fallback text

## Risk

A schema-valid visual description can still be unusable if it describes the wrong subject.

Subject correctness is now the highest-priority quality gate because a polished description of the wrong Pokemon is worse than a slightly conservative or awkward description of the right one.

## Decision

Add narrow deterministic review checks before any further OpenAI sample:

- language and surface overclaim repairs
- expression contradiction detection
- canonical-name visual-conflict checks
- subject-count mismatch checks
- multi-subject prompt guidance
- non-Pokemon generic franchise-language flagging
- Cynthia fallback routing repair

Prompt V6 remains the architecture, but the concrete prompt version is now:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR
```

## Alternatives Rejected

- Prompt V7 rewrite: rejected because the architecture is stable and the problem is enforcement.
- Database apply: rejected because subject-correctness review must pass first.
- Embeddings and semantic search: rejected because unapproved descriptions remain private derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.
- Mid-run patching: rejected because the next dry run must evaluate one fixed rule set.

## Migration Applied

No migration was applied.

No schema file was changed.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Apply Proof

No database apply was performed in this checkpoint.

This checkpoint proves only deterministic fixture and contract repair.

## Current Truths

- `potential_primary_subject_mismatch` exists.
- `potential_subject_count_mismatch` exists.
- `potential_canonical_name_visual_conflict` exists.
- `potential_generic_franchise_language_on_non_pokemon_branch` exists.
- `Mew ex` described as mushroom-like creatures is forced to review.
- `Gengar` described without limbs is forced to review.
- `Lucario & Melmetal-GX` collapsed into a hybrid creature is forced to review.
- `Cynthia's Feelings (Temple of Anger No. 064)` resolves as trainer/supporter fallback, not stadium fallback.
- Targeted contracts pass.
- No OpenAI call was made.
- No database row was written.

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Canonical metadata remains branch-selection context, not visual proof.
- Deterministic checks may force review but may not approve rows.
- No generated row may become approved without human review.
- Subject mismatch flags are review gates, not identity corrections.
- The visual layer must not mutate `card_prints`.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.

## Token And Cost Result

No model calls were made in this checkpoint.

Token usage:

```text
input_tokens: 0
output_tokens: 0
total_tokens: 0
estimated_cost_usd: 0
```

The previous branch-stratified 25-card dry-run economics remain the latest OpenAI cost truth until the next sample runs.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and creates reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define card identity, printing truth, rarity, market value, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not process production batches before the next dry-run review gate.
- Do not patch quality rules midway through a sample used for evaluation.
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
- `18` tests passed
- `0` tests failed

## Artifacts

Audit report:

```text
docs/audits/card_visual_language_v1_subject_correctness_repair/SUBJECT_CORRECTNESS_REPAIR_REPORT.md
```

Checkpoint:

```text
docs/checkpoints/card_visual_descriptions/CARD_VISUAL_LANGUAGE_V1_SUBJECT_CORRECTNESS_REPAIR_20260716.md
```

## Explicit Next Gate

Run one final branch-stratified 25-card OpenAI dry run only, using the repaired prompt and deterministic rules.

Required report buckets:

- correctly left pending
- correctly flagged needs_review
- false positives
- false negatives found during human review

Also report flag frequency by branch:

- Pokemon
- Trainer
- Stadium
- Energy
- Item / Tool / Supporter

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process additional cards, or enable an unattended timer.

