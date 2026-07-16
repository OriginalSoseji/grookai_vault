# Visual Language V1 Subject-Repair 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Run the final branch-stratified 25-card OpenAI dry run after the deterministic subject-correctness repair.

This run evaluates one fixed rule set. No rules were patched during the run or review.

## Scope Boundary

Performed:

- loaded the repaired prompt version
- ran one branch-stratified OpenAI dry run with five rows per branch
- generated a review markdown containing all 25 descriptions
- performed read-only no-write DB boundary readback
- completed a first-pass quality bucket review

Not performed:

- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production apply
- no unattended timer

## Run Artifacts

Run directory:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63
```

Descriptions:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/CARD_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/dry_run_no_db_write_readback.json
```

Raw outputs:

```text
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/generated_outputs.jsonl
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/review_sample.jsonl
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/summary.json
docs/audits/card_visual_language_v1_subject_repair_final_25_dry_run/2026-07-16T15-40-04-865Z_dry_run_bb08ea020d63/run_plan.json
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 14 |
| needs_review by agent | 11 |
| database run rows written | 0 |
| database description rows written during run window | 0 |

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10029`
- cached input tokens: `0`
- total tokens: `692157`
- estimated cost: `$0.1083366`
- average estimated cost per validated description: `$0.00433346`
- projected 500 cards: `$2.16673`
- projected 1,000 cards: `$4.33346`
- projected full eligible catalog: `$230.65707542`

## Branch Distribution

| Branch | Validated rows |
| --- | ---: |
| Pokemon | 5 |
| Trainer | 5 |
| Stadium | 5 |
| Energy | 5 |
| Item / Tool / Supporter | 5 |

## Flag Frequency By Branch

| Branch | Flag | Count |
| --- | --- | ---: |
| Pokemon | `potential_interpretive_mood_language` | 1 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 1 |
| Pokemon | `potential_speculative_setting_language` | 2 |
| Trainer | `potential_interpretive_claim` | 1 |
| Trainer | `potential_semantic_tag_nonvisual_concept` | 1 |
| Trainer | `potential_speculative_setting_language` | 1 |
| Stadium | `potential_interpretive_claim` | 2 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 1 |
| Stadium | `potential_speculative_setting_language` | 1 |
| Stadium | `semantic_tags_metadata_or_generic_removed` | 1 |
| Energy | `potential_interpretive_claim` | 1 |
| Energy | `potential_interpretive_mood_language` | 2 |
| Item / Tool / Supporter | `potential_interpretive_mood_language` | 2 |

No subject-correctness flags fired in this sample:

- `potential_primary_subject_mismatch`: `0`
- `potential_subject_count_mismatch`: `0`
- `potential_canonical_name_visual_conflict`: `0`

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material status-level issue during first-pass review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | Subject and pose are clear; no material subject or surface issue found. |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Strong creature-first description; action language appears visually grounded. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | Expression and pose claims are supported by visible smile and raised arm; minor style drift only. |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | Serious expression and pose are visibly described; no face-unclear contradiction. |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | Stadium branch is correct; speculative wording is qualified with `possibly`. |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | Environment description is grounded enough for pending, though mood language should be watched. |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | Clean symbolic artwork description. |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | Clean symbolic artwork description with useful tags. |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Symbolic branch is coherent; power/energy language is expected for this branch. |
| `ごうかいボム` | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | Object description is specific and visually grounded. |

Count: `10`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | `mystical` in artwork description and mood attributes. |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `ethereal`, `intrigue`, and nonvisual semantic tag pollution. |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | `evokes` in artwork description. |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | `ethereal` and nonvisual `atmosphere` tag; also contains face-unclear expression drift. |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | Nonvisual `atmosphere` semantic tag. |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | `evoking` and generic metadata tag removal. |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | `ethereal` and `evoking`. |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | `intrigue`. |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | `embodies`, `tranquility`, and `tranquil`. |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | `intrigue`. |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | `tranquil`. |

Count: `11`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | Uses personality/species interpretation such as `aggressive demeanor`, `strength and aggression`, and `characteristic of its species`. |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | Uses interpretive emotion language: `concentration or contemplation`, `serious demeanor`, `introspection and determination`, and `contemplative pose`. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | Uses dramatic inferred action and mood: `impending action`, `excitement and tension`, and `something dramatic is about to occur`. |
| `リトライバッジ` | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | Uses object/surface overclaim and interpretive mood: `glossy, reflective surface`, `celebratory and uplifting`, `celebratory theme`, and generic `Standard card border visible`. |

Count: `4`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 10 |
| correctly flagged needs_review | 11 |
| false positives | 0 |
| false negatives found during first-pass review | 4 |
| total reviewed | 25 |

## Boundary Proof

`dry_run_no_db_write_readback.json` confirms:

- `card_visual_description_runs_rows_for_run_key`: `0`
- `card_print_visual_descriptions_rows_between_run_window_for_agent_model_prompt`: `0`

No database rows were written.

All generated rows used the repaired prompt version:

```text
CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR
```

## Decision

Do not apply rows yet.

The subject-correctness repair did not introduce new subject-count or canonical-name contradiction problems in this sample, but the output still has status-level false negatives around interpretive personality/mood language and object/material wording.

## Exact Next Gate

Do a narrow deterministic repair only. Candidate repairs:

- flag unsupported personality/species interpretation such as `aggressive demeanor`, `characteristic of its species`, and `strength and aggression`
- flag interpretive trainer mood language such as `introspection`, `contemplation`, `serious demeanor`, and `determination` when it is not grounded in a clearly visible expression
- flag dramatic inferred action language such as `impending action`, `excitement and tension`, and `dramatic is about to occur`
- add an object-material caution path for `glossy, reflective surface` when it risks being mistaken for physical card finish
- flag generic `standard card border visible`

Do not run another 25-card sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair gate is accepted.
