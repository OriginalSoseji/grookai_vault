# CARD_VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_25_DRY_RUN_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The claim-class deterministic repair added relationship-aware review checks after the broad-family 25-card dry run found `7` status-level false negatives.

The accepted next gate was one branch-stratified 25-card OpenAI dry run with no database writes.

## Problem

The repair needed proof against fresh model wording across Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter branches.

## Risk

If the claim-class gate still misses unsupported subject truth, personality, purpose, or surface claims, pending rows cannot safely be applied or used downstream.

## Decision

Stop after the dry run and checkpoint the result.

Do not apply rows.

The next gate should be one narrow deterministic repair for the remaining `3` first-pass false negatives.

## Alternatives Rejected

- Database apply: rejected because first-pass review found `3` status-level false negatives.
- Another immediate OpenAI sample: rejected because known validator gaps should be repaired before sampling again.
- Prompt rewrite: rejected because the failures are narrow deterministic review gaps.
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
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29
```

Report:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_25_DRY_RUN_REPORT.md
```

Description packet:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/CARD_VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/dry_run_no_db_write_readback.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly five rows per branch.
- `25` rows validated.
- `0` rows failed.
- `0` rows skipped.
- `17` rows were routed to `needs_review`.
- `8` rows remained `pending`.
- `0` database run rows were written for the dry-run key.
- `0` visual description rows were written during the run window for this agent/model/prompt.
- First-pass review found `3` status-level false negatives.
- First-pass review found `0` status-level false positives.
- The claim-class repair improved routing but still needs a narrow deterministic follow-up.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9915`
- total tokens: `692043`
- cached input tokens: `0`
- estimated cost: `$0.1082682`
- average cost per validated description: `$0.00433073`
- projected 500 cards: `$2.165365`
- projected 1,000 cards: `$4.33073`
- projected full eligible catalog: `$230.51176571`

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

The visual layer observes artwork and produces reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not run more OpenAI samples to compensate for known deterministic review gaps.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Explicit Next Gate

Implement one narrow deterministic review repair for the remaining `3` first-pass false negatives:

- action/personality variants such as `readiness to burrow or attack`, `formidable appearance`, and `intimidating mood`
- trainer body-language/personality variants such as `confident stance`, `assertive posture`, and `confident expression`
- purpose/theme variants such as `fitting for a Grass Energy card` and `elemental qualities associated with grass`

Also add targeted guards for:

- `foil treatment is present`
- `card surface quality appears clear`
- raw non-problem model quality phrases such as `glare prevents determination`

Run targeted fixture/contract validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until that repair gate is accepted.
