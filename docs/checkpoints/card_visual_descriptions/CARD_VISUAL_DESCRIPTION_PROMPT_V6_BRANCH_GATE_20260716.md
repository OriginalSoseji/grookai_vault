# Card Visual Description Prompt V6 Branch Gate

Date: 2026-07-16

Status: COMPLETE_DRY_RUN_COMPARISON_GATE

Branch: `feature/card-visual-description-agent`

## Context

Prompt V5 produced strong Pokemon descriptions, but the 25-card review showed a structural prompt flaw: every card was treated as if it needed a Pokemon-style character section.

Prompt V6 makes the visual description prompt card-type aware before image interpretation.

## Problem

Non-Pokemon cards needed different visual behavior:

- Trainer cards should describe visible humans as trainers, not generic humanoid creatures.
- Stadium cards should describe places and environments, not characters.
- Energy cards should describe symbols and abstract artwork, not invented creatures.
- Item, Tool, and Supporter cards need object/scene-aware behavior.

## Risk

The main risks were:

- turning card-type metadata into canonical identity authority
- changing schema when only prompt behavior was needed
- applying unreviewed V6 rows to the database
- generating embeddings before review
- hiding remaining speculation issues behind a successful branch test

## Decision

Implement `CARD_VISUAL_DESCRIPTION_PROMPT_V6` as a prompt-only architecture refinement.

The worker now resolves read-only prompt metadata from `card_print_traits` when available, using exact-card, source-card, and same-name trait fallbacks. If no trait metadata exists, conservative name fallbacks may select a branch for obvious Energy, Stadium, or Trainer cards.

The resolved branch and metadata source are written to local artifacts for auditability. They are not written to canonical card identity fields.

## Alternatives Rejected

- Schema migration for card visual branch metadata: rejected because this is prompt context only.
- Applying V6 rows: rejected because this gate was dry-run only.
- Generating embeddings from V6 output: rejected because semantic search remains a later gate.
- Building Grookai Visual Language Guide in this gate: rejected because it is a separate future documentation project after V6 architecture is reviewed.

## Migration Applied

No migration was created or applied.

## Dry-Run Proof

Successful dry run:

```text
docs/audits/card_visual_descriptions/2026-07-16T05-53-26-653Z_dry_run_4ac9cc1e9168
```

Permanent copied run artifacts:

```text
docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_plan.json
docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_eligible_cards.jsonl
docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_generated_outputs.jsonl
docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_review_sample.jsonl
docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_summary.json
```

Generated descriptions:

```text
docs/audits/card_visual_description_prompt_v6_refinement/PROMPT_V6_DRY_RUN_DESCRIPTIONS.md
```

Comparison report:

```text
docs/audits/card_visual_description_prompt_v6_refinement/PROMPT_V6_BRANCH_COMPARISON_REPORT.md
```

DB no-write readback:

```text
docs/audits/card_visual_description_prompt_v6_refinement/prompt_v6_no_db_write_readback.json
```

Readback showed:

- `v6_description_rows`: `0`
- `v6_run_rows`: `0`

## Current Truths

- Prompt V6 correctly routed the four-card dry-run sample through Pokemon, Trainer, Stadium, and Energy branches.
- `Chandelure VMAX` used `pokemon`.
- `Misty's Vitality` used `trainer`.
- `Fairy Garden` used `stadium`.
- `Psychic Energy` used `energy`.
- The Stadium row still received `potential_overconfident_ambiguous_setting`, so review gating remains necessary.
- No V6 database rows were inserted.
- No V6 run rows were inserted.
- No row was approved.
- No embeddings were generated.

## Invariants

Required invariants held:

- no canonical `card_prints` mutation
- no migration
- no database apply
- no automatic approval
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no public or app-facing read model integration

## Token And Cost Result

Successful V6 dry run:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `4`
- retry count: `0`
- input tokens: `119711`
- output tokens: `1661`
- total tokens: `121372`
- estimated cost: `$0.01895325`
- average estimated cost per validated description: `$0.00473831`

Projected costs at this pricing snapshot:

- 500 cards: `$2.369155`
- 1,000 cards: `$4.73831`

## Why The Visual Layer Remains Derived Intelligence

V6 improves how the model describes visible artwork. It does not define canonical identity, card type truth, image truth, rarity truth, market truth, or user preference truth.

The descriptions and tags remain private, review-gated annotations until a later gate explicitly approves downstream use.

## What Must Never Be Broken

- The prompt may use canonical metadata only as branch-selection context.
- Visual descriptions must not mutate canonical card rows.
- Generated descriptions must not approve themselves.
- Semantic tags must remain visible-artwork tags, not set, rarity, attack, or mechanic metadata.
- App-facing reads, embeddings, semantic search, Taste Engine, Listing Resolver, and Grookai Signature integrations remain gated separately.

## Tests

Focused checks passed:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
```

## Explicit Next Gate

Human-review the V6 four-card comparison artifacts.

If accepted, run a type-diverse 25-card V6 dry run only, with explicit coverage for Pokemon, Trainer, Stadium, Energy, Item, Tool, and Supporter cards. Do not approve rows, apply rows, generate embeddings, build semantic search, or integrate Grookai Signature before that gate is explicitly approved.
