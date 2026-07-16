# CARD_VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_25_DRY_RUN_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The deterministic false-negative repair added exact-phrase checks for the four missed issues from the previous 25-card sample.

The next gate was to evaluate that repair with one branch-stratified OpenAI dry run.

## Problem

The dry run proved the exact-phrase repair is too brittle. The model avoided or varied the specific phrases while producing the same underlying classes of Visual Language drift.

## Risk

If review routing depends on exact phrase memories, model wording variance will keep producing `pending` rows that still need review.

The risk is systematic: the failure mode is conceptual drift, not just individual bad words.

## Decision

Stop after the dry run and checkpoint the result.

Do not apply rows.

The next repair should broaden deterministic families and test representative variants, not run another model sample immediately.

## Alternatives Rejected

- Database apply: rejected because first-pass review found `10` status-level false negatives.
- Another immediate OpenAI sample: rejected because the deterministic gate is not stable.
- Prompt V7 rewrite: deferred; the immediate finding is that review routing needs broader concepts.
- Embeddings and semantic search: rejected because unapproved outputs remain private derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Dry Run Proof

Run directory:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6
```

Report:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_25_DRY_RUN_REPORT.md
```

Description packet:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/CARD_VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/dry_run_no_db_write_readback.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly five rows per branch.
- `25` rows validated.
- `0` rows failed.
- `0` rows skipped.
- `11` rows were routed to `needs_review`.
- `14` rows remained `pending`.
- `0` database run rows were written for the dry-run key.
- `0` visual description rows were written during the run window for this agent/model/prompt.
- First-pass review found `10` status-level false negatives.
- First-pass review found `0` status-level false positives.
- Exact-phrase false-negative flags did not fire because the model produced variant wording.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10041`
- total tokens: `692169`
- cached input tokens: `0`
- estimated cost: `$0.1083438`
- average cost per validated description: `$0.00433375`
- projected 500 cards: `$2.166875`
- projected 1,000 cards: `$4.33375`
- projected full eligible catalog: `$230.67251125`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.

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

## Explicit Next Gate

Implement broader deterministic review families for the remaining conceptual false negatives:

- unsupported personality/emotion language
- object-material/card-finish confusion
- dramatic inferred action language
- metadata pollution in descriptions and semantic tags
- branch-specific allowances for objective Energy wording

Run targeted fixture/contract tests only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until that repair is accepted.
