# Visual Language V1 Field-Aware Policy Repair Report

Date: 2026-07-16

## Objective

Implement the deterministic field-aware repair authorized after the final freeze-candidate 25-card dry run found `5` status-level false negatives.

No OpenAI run was performed.

## Scope Boundary

Performed:

- added a structured `policy_results` layer with `policy_rule`, `field`, `claim`, `supporting_evidence`, `decision`, and `quality_flag`
- evaluated claims by field and branch instead of relying only on flat phrase matching
- preserved the existing `quality_flags` review routing path
- added summary policy-rule counts for future runs
- replayed saved dry-run rows offline
- ran targeted syntax and contract tests

Not performed:

- no database writes
- no migrations
- no OpenAI calls
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production apply
- no 25-card resample

## Repair Summary

The repair adds deterministic policy evaluation over the existing visual payload.

The policy now evaluates:

- claim text
- output field
- prompt branch
- visible supporting evidence
- cross-field uncertainty contradictions

New policy classes:

- `surface_claim_requires_physical_evidence`
- `expression_claim_contradicts_unclear_face`
- `pokemon_personality_or_expression_requires_review`
- `trainer_personality_or_expression_requires_visible_support`
- `trainer_action_or_atmosphere_interpretation_requires_review`
- `type_like_visual_claim_requires_visible_support`
- `energy_branch_force_purpose_or_series_claim_requires_review`
- `energy_abstract_literalization_requires_structured_entity_evidence`
- `item_object_action_or_event_interpretation_requires_review`
- `branch_mood_vocabulary_requires_review`

The important behavioral distinction is field-aware:

- `glossy` in an illustrated-object description can remain allowed.
- `glossy finish` in `card_surface_and_printing_cues` forces review.
- trainer expression language can pass when supported by visible facial evidence.
- expression tags after unclear-face evidence force review.
- Energy literal environments require structured evidence instead of mood inference.

## Offline Replay Result

Replay artifact:

```text
docs/audits/card_visual_language_v1_field_aware_policy_repair/offline_field_aware_policy_replay.json
```

Saved final freeze-candidate false negatives replayed:

| Result | Count |
| --- | ---: |
| final freeze-candidate missed rows replayed | 5 |
| now routed to needs_review | 5 |
| still pending | 0 |
| model calls | 0 |
| database writes | 0 |

Previously clean pending regression rows replayed:

| Result | Count |
| --- | ---: |
| clean pending rows replayed | 3 |
| remained pending | 3 |
| became needs_review | 0 |

Rows now routed to `needs_review`:

| Card | GV-ID | Branch | New policy families |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Pokemon personality/expression, type-like visual claim |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | unsupported trainer personality/action/atmosphere |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | unsupported trainer personality/expression |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Energy purpose/series/force interpretation |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | inferred object action/event, branch mood vocabulary |

Regression rows that remained `pending`:

| GV-ID | Branch |
| --- | --- |
| `GV-PK-JPN-M5-096` | Pokemon |
| `GV-PK-JPN-M5-108` | Trainer |
| `GV-PK-JPN-M5-072` | Item / Tool / Supporter |

## Tests Run

| Command | Result |
| --- | --- |
| `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` | pass |
| `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` | pass, `28/28` |

The targeted contract suite covers the card-visual description schema boundary and agent guardrails relevant to this isolated validator repair. Full repository contract suite was not run because this gate changed no migration, schema, app surface, or database behavior.

## Token And Cost Result

- OpenAI request count: `0`
- retry count: `0`
- input tokens: `0`
- output tokens: `0`
- total tokens: `0`
- estimated cost: `$0`

## Boundary Proof

This gate used only local code changes, tests, and saved dry-run artifacts.

- No database writes were performed.
- No migration was created or applied.
- No generated row was approved.
- No embeddings were generated.
- No app-facing or downstream integration was touched.

## Decision

The field-aware policy repair gate is complete.

This repair should be reviewed before authorizing another OpenAI sample. If accepted, the next execution gate is one final branch-stratified 25-card OpenAI dry run only, with no database writes.

## Exact Next Gate

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
