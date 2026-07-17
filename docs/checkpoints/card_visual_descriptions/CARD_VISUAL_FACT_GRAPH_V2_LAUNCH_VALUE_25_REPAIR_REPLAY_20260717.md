# CARD_VISUAL_FACT_GRAPH_V2_LAUNCH_VALUE_25_REPAIR_REPLAY_20260717

Status: OFFLINE REPAIR PASSED; LIVE LOCK NOT CLAIMED

Date: 2026-07-17

## Context

After `CARD_VISUAL_FACT_GRAPH_V2_DETERMINISTIC_CLEANUP_20260717`, the next gate was a launch-value 25-card OpenAI dry run with Energies excluded.

The plan selected exactly:

- 10 Pokemon
- 7 Trainer
- 4 Stadium
- 4 Item / Tool / Supporter
- 0 Energy

The broad branch-stratified live query hit a Postgres statement timeout during eligibility fetch, so the already-written plan was reused with explicit `card_print_id` targets. This preserved the planned 25-card scope while avoiding the broad database scan.

## Problem

Two paid explicit-ID 25-card dry runs exposed validator brittleness around V2 model variance:

- evidence-only semantic labels such as colored eyes and neutral mouth
- unsupported intention labels such as `ready for attack`
- generic semantic labels such as `stance`
- factual but previously unsupported labels such as bridges, stairs, fences, tables, windows, plants, electricity effects, aurora light bands, and hands clasped
- stale count ranges on exact counts
- interpreted expression text surviving inside normalized human appearance fields
- unreadable card UI observations without matching abstention rows

These were deterministic normalization/validation issues, not a schema, prompt-architecture, migration, or database-write issue.

## Risk

If left unfixed, structurally useful Fact Graph V2 payloads would fail validation for wording variance rather than actual graph defects. If repaired too broadly, the validator could hide unsupported story, emotion, lore, or hallucinated facts.

## Decision

Implement a narrow deterministic repair:

- drop evidence-only semantic labels from `semantic_visual_facts`
- drop generic/unsupported semantic labels such as `ready for attack`, `stance`, and `pose`
- allow directly visible, evidence-backed semantic facts for winking, gestures, bridges, stairs, fences, tables, windows, plants, electricity/lightning effects, aurora light bands, and explosion/impact effects
- normalize exact counts by clearing stale estimated range values
- preserve invalid `many` count conflicts as validation failures
- normalize human appearance/facial rows through objective visual cleanup
- derive a card UI abstention when a referenced UI observation already says unreadable, weak, or cannot determine

## Alternatives Rejected

- Rejected another prompt rewrite: the failure classes were deterministic output variance.
- Rejected accepting all semantic labels: that would allow subjective expression/personality labels back into the graph.
- Rejected another paid rerun after offline repair: two paid runs had already shown the variance class, and both saved payload sets replayed cleanly after repair.
- Rejected database apply: this gate is dry-run/artifact-only.

## Current Truths

- Active prompt version: `CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2`.
- Active schema version: `CARD_VISUAL_FACT_GRAPH_SCHEMA_V2`.
- Controlled vocabulary version: `CARD_VISUAL_CONTROLLED_VOCABULARY_V1`.
- Energies remain deferred/excluded.
- `visual_attributes.fact_graph` remains source truth.
- `artwork_description` remains deterministic compatibility digest only.
- No database rows were written.
- No rows were approved or rejected.
- No embeddings, semantic search, Taste Engine, Listing Resolver, Grookai Signature, or story generation were run.
- Local TLS certificate verification was disabled for OpenAI calls in this Windows environment.

## Invariants

- Raw observations remain audit evidence.
- Normalization may remove or normalize unsupported accepted facts, but it must not invent observations.
- Every retained meaningful fact must remain evidence-backed.
- Scene subjects, depicted subjects, and character representations remain separate.
- Card UI / print-marker evidence stays separate from artwork facts.
- Human review is still required before approval or downstream use.

## Live Run Results

Plan artifact:

```text
docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T21-04-42-507Z_plan_2b8622923b54/
```

First explicit-ID paid run:

```text
docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T21-26-04-988Z_dry_run_7626a76c2d3d/
attempted: 25
validated: 14
failed: 11
estimated_cost_usd: 0.2480872
input_tokens: 220006
output_tokens: 105381
total_tokens: 325387
db_writes: 0
```

Second explicit-ID paid run after the first deterministic repair:

```text
docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T21-56-45-176Z_dry_run_3a11bae7e273/
attempted: 25
validated: 11
failed: 14
estimated_cost_usd: 0.2520328
input_tokens: 220006
output_tokens: 108903
total_tokens: 328909
db_writes: 0
```

Earlier transport-only failures:

```text
2026-07-17T21-06-10-044Z_dry_run_495c890104d3: 25 generation_exception rows, 0 tokens, 0 cost, OpenAI TLS certificate verification failure.
2026-07-17T21-21-42-638Z run log: Postgres statement timeout during broad eligibility fetch, no model artifact.
```

One-card connectivity probe:

```text
docs/audits/card_visual_fact_graph_v2_launch_value_25_probe/2026-07-17T21-20-36-080Z_dry_run_81946c406575/
validated: 1
failed: 0
```

## Offline Replay

Final deterministic repair replay artifact:

```text
docs/audits/card_visual_fact_graph_v2_launch_value_25_dry_run/2026-07-17T22-28-00-000Z_deterministic_repair_replay/
```

Replay result:

```text
replayed_payloads: 50
valid_after_repair: 50
failed_after_repair: 0
recovered_previous_failures: 25
previously_valid_rows_newly_failed: 0
openai_calls_for_replay: 0
db_writes: 0
```

Artifact hashes:

```text
replay_results.json: 25832efd0e565f766fb83764580e916362d67210f488751cc280abd07b9fd65d
REPAIR_REPLAY_REPORT.md: 4d3f694cb82f2f12f6f676380c9673bde922db603ba79d03efaccf3ca73cbf30
```

## Tests

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs

Tests: 40/40 passing
```

Regression coverage now includes:

- evidence-only semantic label dropping
- visible winking semantic fact acceptance
- factual gesture/environment/object/effect semantic labels
- unsupported attack-intent and generic pose semantic label dropping
- exact count stale-range cleanup
- invalid `many` count preservation
- invented uncertainty observation reference cleanup
- derived card UI abstention for unreadable/weak UI observations

## Token And Cost Result

Paid model usage for the two explicit-ID live runs:

```text
request_count: 50
input_tokens: 440012
output_tokens: 214284
total_tokens: 654296
estimated_cost_usd: 0.50012
```

The deterministic replay spent no model tokens.

## Why The Visual Layer Remains Derived Intelligence

This repair improves deterministic acceptance of AI-derived Fact Graph V2 payloads. It does not make any row human-approved, canonical, embedded, public, or downstream-authoritative.

## What Must Never Be Broken

- No approved/current human-reviewed row may be overwritten by dry-run work.
- Energy cards remain deferred until explicitly reintroduced.
- Fact graph source truth must remain separate from optional prose/story generation.
- Card UI/print markers must not pollute artwork modules.
- Canonical metadata may guide expected subjects but must not create visual facts.
- A valid graph may be sparse when the image is sparse; completeness is module-reviewed, not quota-based.

## Explicit Next Gate

Run one fresh paid launch-value 25-card OpenAI dry run with this repaired code frozen.

Acceptance target:

```text
25/25 structurally validated
Energies excluded
no DB writes
no approvals/rejections
no embeddings
no downstream integrations
semantic cleanliness reviewed from the packet
```

Do not run 125 cards, apply rows, approve rows, generate embeddings, or integrate downstream systems before that fresh 25-card live proof passes.
