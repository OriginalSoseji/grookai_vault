# CARD_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR_25_CARD_DRY_RUN_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The deterministic subject-correctness repair added canonical-name contradiction checks, multi-subject guidance, Cynthia fallback routing repair, and narrower language/surface flags.

The next gate was to evaluate that fixed rule set with one final branch-stratified 25-card OpenAI dry run.

## Problem

The prior sample showed that prompt architecture was stable, but quality enforcement still needed proof after the subject-correctness repair.

The risk was that the repair could still leave plausible but review-worthy interpretive language in `pending` rows.

## Risk

The visual layer is only useful if it describes the right subject and stays objective enough for search and matching.

A visually polished but interpretive or materially overclaimed description can still mislead downstream systems if it is approved too early.

## Decision

Run exactly one 25-card branch-stratified OpenAI dry run:

- `5` Pokemon
- `5` Trainer
- `5` Stadium
- `5` Energy
- `5` Item / Tool / Supporter

Use repaired prompt:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR
```

Do not write database rows.

## Alternatives Rejected

- Database apply: rejected because this was still a quality gate.
- Immediate embeddings: rejected because generated output is not approved.
- Prompt V7 rewrite: rejected because the repair needed fixed-rule evaluation, not prompt architecture churn.
- Mid-run patching: rejected because it would invalidate the sample.
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
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63
```

Report:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/VISUAL_LANGUAGE_V1_SUBJECT_REPAIR_25_CARD_DRY_RUN_REPORT.md
```

Description packet:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/CARD_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/dry_run_no_db_write_readback.json
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
- `0` subject-correctness flags fired in this sample.
- First-pass review found `4` status-level false negatives.
- First-pass review found `0` status-level false positives.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10029`
- total tokens: `692157`
- cached input tokens: `0`
- estimated cost: `$0.1083366`
- average cost per validated description: `$0.00433346`
- projected 500 cards: `$2.16673`
- projected 1,000 cards: `$4.33346`
- projected full eligible catalog: `$230.65707542`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Canonical metadata remains branch-selection context, not visual proof.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unapproved output.
- No app-facing reads may expose unreviewed descriptions.
- No generated description may mutate `card_prints`.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and generates reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define card identity, card finish, rarity, price, or collector preference.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat physical card finish as proven from a stock image unless directly visible and reliable.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not patch rules midway through a sample used for evaluation.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Explicit Next Gate

Do a narrow deterministic repair for the remaining false negatives:

- unsupported personality/species interpretation
- trainer emotion language not grounded in clearly visible expression
- dramatic inferred action language
- object-material wording that risks being confused with physical card finish
- generic `standard card border visible`

Then run targeted fixture/contract tests only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair is accepted.
