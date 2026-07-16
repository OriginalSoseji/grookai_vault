# CARD_VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_25_DRY_RUN_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The previous gate implemented broad deterministic review families after exact-phrase checks proved too brittle.

The accepted next gate was one branch-stratified 25-card OpenAI dry run with no database writes.

## Problem

The broad-family repair needed to be evaluated against model wording variation across Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter branches.

## Risk

If the deterministic review layer still misses conceptual drift, unapproved descriptions may remain `pending` even when they need human review.

The primary risk remains status routing, not schema or write-boundary behavior.

## Decision

Stop after the dry run and checkpoint the result.

Do not apply rows.

The next gate should be a narrow deterministic repair for remaining false-negative wording variants.

## Alternatives Rejected

- Database apply: rejected because first-pass review found `7` status-level false negatives.
- Another immediate OpenAI sample: rejected because the current issue is validator coverage, not sample size.
- Prompt V7 rewrite: rejected because the current architecture and prompt are stable enough; remaining misses are deterministic review phrases.
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
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59
```

Report:

```text
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_25_DRY_RUN_REPORT.md
```

Description packet:

```text
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/CARD_VISUAL_LANGUAGE_V1_BROAD_FAMILY_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/dry_run_no_db_write_readback.json
```

Priced usage recalculation:

```text
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/priced_usage_recalculation.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly five rows per branch.
- `25` rows validated.
- `0` rows failed.
- `0` rows skipped.
- `16` rows were routed to `needs_review`.
- `9` rows remained `pending`.
- `0` database run rows were written for the dry-run key.
- `0` visual description rows were written during the run window for this agent/model/prompt.
- First-pass review found `7` status-level false negatives.
- First-pass review found `0` status-level false positives.
- The broad-family repair improved routing but still needs a narrow deterministic follow-up.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10154`
- total tokens: `692282`
- cached input tokens: `0`
- raw `summary.json` estimated cost: `$0` because pricing env vars were not loaded in this sandbox process
- recalculated estimated cost: `$0.1084116`
- average recalculated cost per validated description: `$0.004336464`
- projected 500 cards: `$2.168232`
- projected 1,000 cards: `$4.336464`
- projected full eligible catalog: `$230.816969328`

The recalculation used:

```json
{
  "input_per_million": 0.15,
  "output_per_million": 0.6,
  "cached_input_per_million": 0.075,
  "image_cost_rule_version": "gpt-4o-mini-standard-2026-07-16"
}
```

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

The visual layer observes artwork and produces reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define identity, printing truth, finish, rarity, pricing, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not run more OpenAI samples to compensate for known deterministic review gaps.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Explicit Next Gate

Implement a narrow deterministic review repair for the `7` first-pass false negatives:

- non-hyphen metadata language such as `electric type`
- partial canonical identity tags such as `Mega Excadrill`
- object-material/card-finish confusion such as `glossy finish`, `shiny finish`, `smooth and reflective`, `reflective dark orb`, `matte textures`, and `uniform finish`
- dramatic/action inference such as `readiness for action`, `ready for action`, and `potential for detonation`
- unsupported personality/emotion language such as `emotional charge`, `quiet confidence`, `contemplative expression`, and `contemplation`

Run targeted fixture/contract validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until that repair gate is accepted.
