# CARD_VISUAL_LANGUAGE_V1_FIELD_AWARE_POLICY_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The final Visual Language V1 freeze-candidate 25-card OpenAI dry run validated operationally but failed the freeze-quality threshold with `5` status-level false negatives.

The accepted next gate was a field-aware deterministic policy repair with offline replay and targeted tests only.

## Problem

The validator was still too phrase-centered. The same word can be acceptable in one output field and review-worthy in another:

- illustrated `glossy` appearance can be valid in artwork prose
- physical `glossy finish` claims in `card_surface_and_printing_cues` need review
- trainer expression claims require visible support
- expression tags can contradict unclear-face uncertainty notes
- abstract Energy artwork can be over-literalized as environments or purpose claims

## Risk

If the validator cannot evaluate claim, field, and supporting evidence together, future `pending` rows can contain unsupported physical-surface, personality, expression, identity-like, or purpose claims while appearing safe.

## Decision

Implement a deterministic field-aware policy layer and stop after offline replay, targeted tests, report, checkpoint, and hashes.

Do not run another OpenAI sample in this repair gate.

## Alternatives Rejected

- Another broad banned-word list: rejected because it would create noisy false positives and still miss context.
- Prompt rewrite: rejected because the failure was validator policy, not prompt architecture.
- Immediate 25-card resample: rejected because it would evaluate a known-broken validator.
- Immediate database apply: rejected because the freeze candidate had known review misses.
- Embeddings, semantic search, Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## One-Card Apply Proof

No one-card apply was performed in this repair gate.

The prior one-card apply proof remains the latest real database apply proof for this project.

## Current Truths

- Deterministic validator code changed.
- Prompt version did not change.
- Schema did not change.
- Review workflow did not change.
- `policy_results` are generated in local run artifacts and summary counts.
- Existing `quality_flags` still drive review routing.
- `0` OpenAI calls were made.
- `0` database writes were made.
- `28/28` targeted card-visual contract tests passed.
- Offline replay routes all `5` final freeze-candidate missed rows to `needs_review`.
- Offline replay preserves `3` previously clean pending rows as `pending`.

## Token And Cost Result

- request count: `0`
- retry count: `0`
- input tokens: `0`
- output tokens: `0`
- total tokens: `0`
- estimated cost: `$0`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.
- Claim review must consider field and support, not only raw phrase presence.
- Do not patch deterministic rules midway through a sample used for evaluation.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, attributes, flags, policy results, and confidence data. It can support future matching and semantic retrieval after review, but it does not define card identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.
- Do not collapse field-aware policy back into a flat phrase list.

## Tests

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `28/28`.
- Full repository contract suite was not run for this isolated deterministic validator repair.

## Artifacts

- Report: `docs/audits/card_visual_language_v1_field_aware_policy_repair/VISUAL_LANGUAGE_V1_FIELD_AWARE_POLICY_REPAIR_REPORT.md`
- Offline replay: `docs/audits/card_visual_language_v1_field_aware_policy_repair/offline_field_aware_policy_replay.json`
- Test output: `docs/audits/card_visual_language_v1_field_aware_policy_repair/targeted_test_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_field_aware_policy_repair/permanent_artifact_hashes.json`

## Explicit Next Gate

Review the field-aware policy repair, then authorize one final branch-stratified 25-card OpenAI dry run only.

Required stop conditions for that future run:

- `25/25` validated
- `0` operational failures
- `0` database writes
- `0` false positives in first-pass review
- `0-1` false negatives in first-pass review
- no subject-identity failures
- no unflagged physical-surface claims

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
