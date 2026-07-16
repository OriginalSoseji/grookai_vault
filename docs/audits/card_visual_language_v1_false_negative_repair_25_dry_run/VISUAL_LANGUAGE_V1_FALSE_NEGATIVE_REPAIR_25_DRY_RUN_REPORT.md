# Visual Language V1 False-Negative Repair 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Evaluate the deterministic false-negative repair with one branch-stratified 25-card OpenAI dry run.

This was dry-run only.

## Scope Boundary

Performed:

- ran one branch-stratified OpenAI dry run
- generated a review markdown with all 25 descriptions
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
- no prompt rewrite during the sample
- no mid-run rule patching

## Run Artifacts

Run directory:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6
```

Descriptions:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/CARD_VISUAL_LANGUAGE_V1_FALSE_NEGATIVE_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/dry_run_no_db_write_readback.json
```

Raw outputs:

```text
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/generated_outputs.jsonl
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/review_sample.jsonl
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/summary.json
docs/audits/card_visual_language_v1_false_negative_repair_25_dry_run/2026-07-16T16-32-48-212Z_dry_run_9cf0bba256e6/run_plan.json
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
- output tokens: `10041`
- cached input tokens: `0`
- total tokens: `692169`
- estimated cost: `$0.1083438`
- average estimated cost per validated description: `$0.00433375`
- projected 500 cards: `$2.166875`
- projected 1,000 cards: `$4.33375`
- projected full eligible catalog: `$230.67251125`

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
| Pokemon | `potential_body_part_as_separate_held_object` | 1 |
| Pokemon | `potential_interpretive_claim` | 2 |
| Pokemon | `potential_speculative_setting_language` | 1 |
| Trainer | `potential_generic_filler` | 1 |
| Stadium | `potential_interpretive_claim` | 1 |
| Stadium | `potential_interpretive_mood_language` | 1 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 2 |
| Energy | `potential_creature_language_on_non_pokemon_branch` | 1 |
| Energy | `potential_interpretive_claim` | 1 |
| Energy | `potential_speculative_setting_language` | 1 |
| Item / Tool / Supporter | `potential_interpretive_mood_language` | 1 |

The newly added exact-phrase false-negative flags did not fire in this run because the model produced variant wording rather than the previously observed exact phrases.

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material status-level issue during first-pass review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | Determination is tied to visible brow and focused eyes; no face-unclear contradiction. |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Energy/power language is branch-appropriate and symbolic. |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | Symbolic description is mostly grounded; mild mood language did not cross status threshold in first pass. |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | Object and environment are visually grounded; surface cue remains conservative. |

Count: `4`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | Describes Chandelure arms as `holding a unique flame`. |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `ethereal` and `evoke`. |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | `evokes`. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | `print quality appears`. |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | `evoking` and nonvisual `atmosphere` tag. |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | nonvisual `inviting` tag. |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | `tranquility`. |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | `mystical`. |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | Claims a creature or Pokemon-like silhouette on a non-Pokemon branch. |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | `evoking`. |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | `intrigue`. |

Count: `11`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | Uses unsupported interpretation such as `predatory nature`, `exudes a sense of agility and strength`, and `speed and power`. |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Uses metadata/interpretive language such as `Electric-type nature`, `ready to spring into action`, and `excitement associated with this Pokemon`. |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | Uses `summoning power or command`, strong emotion claims, and says the final battle is `suggested by the name of the card`. |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | Uses determination/focus, `positive emotional tone`, and `inviting tone` style interpretation. |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | Uses `contemplative or calculated demeanor`, `reflective and serious`, and interpretive mood language. |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | Repeats metadata as a tag and uses `hot, energetic atmosphere` and `aggressive mood`. |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | Uses `fantastical`, `cheerful mood`, `playful atmosphere`, and `whimsical` tag language. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | Uses object/material and action inference variants: `glossy black body`, `energetic theme`, `imminent action`, and `dramatic background`. |
| `リトライバッジ` | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | Uses `shiny, reflective surface`, `smooth silver appearance`, `achievement and honor`, and `shiny badge`. |
| `ごうかいボム` | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | Uses `glossy black exterior`, `imminent detonation`, `shiny surfaces`, and `intense and dramatic`. |

Count: `10`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 4 |
| correctly flagged needs_review | 11 |
| false positives | 0 |
| false negatives found during first-pass review | 10 |
| total reviewed | 25 |

## Boundary Proof

`dry_run_no_db_write_readback.json` confirms:

- `card_visual_description_runs_rows_for_run_key`: `0`
- `card_print_visual_descriptions_rows_between_run_window_for_agent_model_prompt`: `0`

No database rows were written.

## Decision

Do not apply rows yet.

The exact-phrase repair was not enough. The model changed wording while continuing the same underlying drift: unsupported personality claims, interpretive mood language, object-material overclaims, and metadata-like language in descriptions/tags.

## Exact Next Gate

Replace exact-phrase-only repairs with broader deterministic families and fixture tests:

- broader personality and emotion nouns/adjectives across artwork description, mood attributes, and tags
- broader object-material/card-finish confusion terms such as `glossy black body`, `shiny reflective surface`, `smooth silver appearance`, and `polished surface`
- broader dramatic inference terms such as `imminent action`, `imminent detonation`, `ready to spring`, `summoning power`, `about to occur`, and `final battle suggested by name`
- broader metadata pollution detection in descriptions and semantic tags, including `Electric-type`, card names, and franchise/card-name reasoning
- branch-specific allowances so Energy cards can still use `energy` objectively without allowing generic mood or lore drift

Then run targeted fixture/contract validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair gate is accepted.
