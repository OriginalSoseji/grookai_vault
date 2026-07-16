# CARD_VISUAL_LANGUAGE_V1_FIELD_AWARE_FINAL_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The field-aware final 25-card OpenAI dry run was operationally successful but failed freeze lock with `1` likely false positive, `2` status-level false negatives, and `3` flag-level misses inside already review-routed rows.

The accepted next gate was a narrow deterministic offline repair against that exact artifact.

## Problem

The remaining failures were not prompt architecture failures. They were deterministic policy gaps:

- legacy Trainer expression flags could overrule visible expression support
- physical surface overclaims escaped in `card_surface_and_printing_cues`
- branch-specific interpretive language escaped in Energy and Item / Tool / Supporter rows
- one Pokemon expression phrase remained unflagged inside an already review-routed row

## Risk

If unrepaired, the validator would remain too noisy for supported Trainer expressions while still missing some physical-surface and interpretive claims.

## Decision

Implement the narrow deterministic repair and stop after offline replay, targeted tests, report, checkpoint, and hashes.

Do not run another OpenAI sample in this repair gate.

## Alternatives Rejected

- Broad prompt rewrite: rejected because the prompt architecture is stable.
- Broad banned-word expansion: rejected because this gate protects false-positive behavior.
- Immediate new OpenAI run: rejected because the known policy gaps needed offline repair first.
- Database apply: rejected because Visual Language V1 has not passed freeze lock.
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
- `29/29` targeted card-visual contract tests passed.
- Offline replay of the failed field-aware final 25-card run changes only the intended status-level rows:
  - Misty's Vitality: `needs_review` to `pending`
  - Dark Metal Energy: `pending` to `needs_review`
  - `古びたたての化石`: `pending` to `needs_review`
- Magnetic Storm remains `pending`.
- Known surface-policy misses are now explicitly flagged.

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
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `29/29`.
- Full repository contract suite was not run for this isolated deterministic validator repair.

## Artifacts

- Report: `docs/audits/card_visual_language_v1_field_aware_final_repair/VISUAL_LANGUAGE_V1_FIELD_AWARE_FINAL_REPAIR_REPORT.md`
- Offline replay: `docs/audits/card_visual_language_v1_field_aware_final_repair/offline_field_aware_final_repair_replay.json`
- Test output: `docs/audits/card_visual_language_v1_field_aware_final_repair/targeted_test_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_field_aware_final_repair/permanent_artifact_hashes.json`

## Explicit Next Gate

Human review this offline repair.

If accepted, run one final branch-stratified 25-card OpenAI dry run only, with code frozen for the duration of the sample.

Required stop conditions:

- `25/25` validated
- exact five-branch coverage
- `0` operational failures
- `0` database writes
- `0` false positives in first-pass review
- `0-1` false negatives in first-pass review
- no subject-identity failures
- no unflagged physical-surface claims

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
