# CARD_VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The false-negative repair 25-card dry run showed the exact-phrase repair was too brittle.

The model varied the wording while preserving the same conceptual drift: unsupported personality/emotion claims, object-material/card-finish confusion, dramatic inferred action, metadata pollution, and generic mood language.

## Problem

Exact string matching caught the previous sample's phrases but missed equivalent variants in the next sample.

The review gate needed broader deterministic families with representative fixture coverage.

## Risk

If the gate only catches memorized phrases, plausible new variants will continue to remain `pending`.

If the gate is too broad, it can become noisy and route too many useful descriptions to `needs_review`.

## Decision

Broaden the deterministic review families while preserving an explicit allowance for objective Energy-card wording.

New or expanded detection covers:

- unsupported personality/species interpretation
- dramatic inferred action
- object-material/card-finish confusion
- metadata/identity language in prose and semantic tags
- speculative `fantastical` setting language
- nonvisual semantic tags such as `award` and `whimsical`

## Alternatives Rejected

- Another immediate 25-card OpenAI sample: rejected until the broader deterministic repair was fixture-proven.
- Database apply: rejected because the prior sample had `10` status-level false negatives.
- Prompt V7 rewrite: deferred because this gate is deterministic review routing.
- Embeddings and semantic search: rejected because generated output remains unapproved derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Current Truths

- Broader conceptual variants are covered by fixture tests.
- Exact card-name semantic tags are flagged as metadata/identity language.
- Objective Energy-card wording remains allowed.
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
- Objective Energy-symbol language must remain allowed for Energy cards.

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
- `21` tests passed
- `0` tests failed

## Artifacts

Audit report:

```text
docs/audits/card_visual_language_v1_broad_family_repair/VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_REPORT.md
```

Checkpoint:

```text
docs/checkpoints/card_visual_descriptions/CARD_VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_20260716.md
```

## Explicit Next Gate

Human review this broad-family deterministic repair and decide whether to run another branch-stratified 25-card OpenAI dry run.

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until a later gate explicitly approves it.
