# CARD_VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The Visual Language V1 freeze-candidate 25-card OpenAI dry run validated operationally but failed the freeze-quality threshold with `4` status-level false negatives.

The accepted next gate was a narrow deterministic validator repair with targeted fixture/contract tests only.

## Problem

The validator missed adjacent phrase families for action/personality, body-language/personality, interpretive stadium mood, and object material/action/mood drift.

## Risk

If these phrases remain unflagged, future `pending` rows can contain review-worthy claims while appearing safe for apply or downstream evaluation.

## Decision

Implement the narrow deterministic repair and stop after tests, offline replay, report, checkpoint, and hashes.

Do not run another OpenAI sample in this repair gate.

## Alternatives Rejected

- Broad banned-word expansion: rejected to preserve the low false-positive rate.
- Prompt rewrite: rejected because the failure was deterministic enforcement, not prompt architecture.
- Immediate database apply: rejected because the freeze candidate had known validator misses.
- Immediate 25-card resample before repair: rejected because it would evaluate a known-broken gate.
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
- `0` OpenAI calls were made.
- `0` database writes were made.
- `26/26` targeted card-visual contract tests passed.
- Offline replay of the failed freeze-candidate pending rows now routes the `4` missed rows to `needs_review`.
- The `3` rows judged correctly pending remain `pending`.

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
- Do not patch deterministic rules midway through a sample used for evaluation.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, attributes, flags, and confidence data. It can support future matching and semantic retrieval after review, but it does not define card identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Tests

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `26/26`.
- Full repository contract suite was not run for this isolated deterministic repair.

## Artifacts

- Report: `docs/audits/card_visual_language_v1_freeze_candidate_repair/VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_REPAIR_REPORT.md`
- Offline replay: `docs/audits/card_visual_language_v1_freeze_candidate_repair/offline_freeze_candidate_pending_replay.json`
- Test output: `docs/audits/card_visual_language_v1_freeze_candidate_repair/targeted_test_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_freeze_candidate_repair/permanent_artifact_hashes.json`

## Explicit Next Gate

Run one final branch-stratified 25-card OpenAI dry run only.

Required stop conditions:

- `25/25` validated
- `0` operational failures
- `0` database writes
- `0` false positives in first-pass review
- `0-1` false negatives in first-pass review
- no subject-identity failures
- no unflagged physical-surface claims

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
