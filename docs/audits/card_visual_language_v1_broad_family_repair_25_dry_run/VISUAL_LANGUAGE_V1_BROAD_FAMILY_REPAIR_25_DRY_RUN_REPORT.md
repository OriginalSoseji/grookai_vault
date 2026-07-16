# Visual Language V1 Broad-Family Repair 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Evaluate the broad-family deterministic Visual Language repair with one branch-stratified 25-card OpenAI dry run.

This was dry-run only.

## Scope Boundary

Performed:

- ran one branch-stratified OpenAI dry run
- generated a review markdown with all 25 descriptions
- performed read-only no-write DB boundary readback
- completed a first-pass quality bucket review
- recalculated priced usage from actual token usage because the sandbox process did not load pricing env vars

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
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59
```

Descriptions:

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

Raw outputs:

```text
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/generated_outputs.jsonl
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/review_sample.jsonl
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/summary.json
docs/audits/card_visual_language_v1_broad_family_repair_25_dry_run/2026-07-16T17-56-39-352Z_dry_run_2b1abe301d59/run_plan.json
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 9 |
| needs_review by agent | 16 |
| database run rows written | 0 |
| database description rows written during run window | 0 |

## Token And Cost Result

The Responses API returned actual usage data. The raw run `summary.json` preserved token usage but recorded pricing fields as `null` because the sandbox process did not load `OPENAI_INPUT_COST_PER_MILLION`, `OPENAI_OUTPUT_COST_PER_MILLION`, or `OPENAI_CACHED_INPUT_COST_PER_MILLION`.

Cost below is recalculated from actual usage using the same versioned pricing snapshot used in the previous gated dry run:

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10154`
- cached input tokens: `0`
- total tokens: `692282`
- recalculated estimated cost: `$0.1084116`
- average estimated cost per validated description: `$0.004336464`
- projected 500 cards: `$2.168232`
- projected 1,000 cards: `$4.336464`
- projected full eligible catalog: `$230.816969328`

Pricing snapshot used for recalculation:

```json
{
  "input_per_million": 0.15,
  "output_per_million": 0.6,
  "cached_input_per_million": 0.075,
  "image_cost_rule_version": "gpt-4o-mini-standard-2026-07-16"
}
```

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
| Pokemon | `potential_interpretive_claim` | 1 |
| Pokemon | `potential_interpretive_mood_language` | 1 |
| Pokemon | `potential_metadata_or_identity_language` | 1 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 1 |
| Pokemon | `potential_speculative_setting_language` | 2 |
| Pokemon | `potential_unsupported_personality_or_species_interpretation` | 1 |
| Trainer | `potential_interpretive_claim` | 1 |
| Trainer | `potential_unsupported_emotion_or_personality_claim` | 1 |
| Stadium | `potential_interpretive_claim` | 3 |
| Stadium | `potential_interpretive_mood_language` | 1 |
| Stadium | `potential_metadata_or_identity_language` | 1 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 4 |
| Stadium | `potential_speculative_setting_language` | 1 |
| Stadium | `potential_surface_overclaim` | 1 |
| Stadium | `potential_unsupported_personality_or_species_interpretation` | 1 |
| Energy | `potential_creature_language_on_non_pokemon_branch` | 1 |
| Energy | `potential_interpretive_claim` | 3 |
| Energy | `potential_metadata_or_identity_language` | 1 |
| Energy | `potential_speculative_setting_language` | 1 |
| Item / Tool / Supporter | `potential_dramatic_inferred_action_language` | 1 |
| Item / Tool / Supporter | `potential_metadata_or_identity_language` | 1 |
| Item / Tool / Supporter | `potential_object_material_or_card_surface_confusion` | 2 |
| Item / Tool / Supporter | `potential_semantic_tag_nonvisual_concept` | 1 |

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material status-level issue during first-pass review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | Determination is tied to visible focused eyes and furrowed brow; status can remain pending. |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | Object, rocky setting, cracks, and foliage are visually grounded enough for pending. |

Count: `2`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | `ethereal`, `otherworldliness`, and metadata-like `ghost-type Pokémon` language. |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `evokes`, `mystique`, `ethereal`, and nonvisual `mysterious atmosphere` tags. |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | `predatory nature` and `electric-type` identity language. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | `evoking`, age inference, and water-lighting interpretation deserve review. |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | Face is not determined but the description assigns confidence/intent. |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | `evokes` and nonvisual `electric atmosphere` tag. |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | Metadata tag `Turffield Stadium` and nonvisual `atmosphere` tag. |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | `standard printing treatment`, `visible foil`, `evoke`, and nonvisual `theme`. |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | `evoking`, `tranquil`, and mood-heavy language. |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | `dreamy`, `magical`, `whimsical mood`, and nonvisual tag language. |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | `mystical` and `evoking`. |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | `embodies`, possible `creature` language on Energy branch, and metadata tag `rainbow energy`. |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | `evokes` growth/vitality interpretation. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | `impending action` and `shiny surface`. |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | Metadata tag `dark bell` and object-material `polished surface`. |
| `リトライバッジ` | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | `celebratory mood` tag and object-material description merit review. |

Count: `16`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | Uses `aggressive stance`, `readiness for action or attack`, `aggressive` mood, and semantic tag `Mega Excadrill`. |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | Uses non-hyphen metadata `electric type`, personality/action language such as `determination`, `ready for action`, `hinting at its power`, and `excitement`. |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | Uses `concentration`, `commanding gesture`, and `emotional charge of the moment`. |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | Uses `calm, contemplative expression`, `quiet confidence`, and `contemplation`. |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | Uses `glossy finish`, `uniform finish`, and `embodying the essence of Water Energy`. |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Uses `reflective dark orb`, `glossy finish`, `matte textures`, and mood interpretation. |
| `ごうかいボム` | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | Uses `shiny finish`, `smooth and reflective`, `potential for detonation`, and `explosive atmosphere`. |

Count: `7`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 2 |
| correctly flagged needs_review | 16 |
| false positives | 0 |
| false negatives found during first-pass review | 7 |
| total reviewed | 25 |

## Boundary Proof

`dry_run_no_db_write_readback.json` confirms:

- `card_visual_description_runs_rows_for_run_key`: `0`
- `card_print_visual_descriptions_rows_between_run_window_for_agent_model_prompt`: `0`

No database rows were written.

## Decision

Do not apply rows yet.

The broad-family repair improved routing. It raised `needs_review` from `11` to `16` on the same branch-stratified sample shape and caught more conceptual drift, especially Stadium and object-material issues.

The gate is still not stable enough for database apply because first-pass review found `7` status-level false negatives. The remaining misses are mostly wording variants, not architecture failures.

## Exact Next Gate

Do a narrow deterministic repair only. Candidate repairs:

- extend metadata detection to non-hyphen forms such as `electric type`
- flag partial canonical identity tags such as `Mega Excadrill` when the card name is `Mega Excadrill ex`
- expand object-material/card-finish confusion for `glossy finish`, `shiny finish`, `smooth and reflective`, `reflective dark orb`, `matte textures`, and `uniform finish`
- expand dramatic/action inference for `readiness for action`, `ready for action`, `potential for detonation`, and similar variants
- expand unsupported personality/emotion language for `emotional charge`, `quiet confidence`, `contemplative expression`, and `contemplation`
- preserve objective Energy branch allowances for `energy symbol`, `radiating lines`, and visible symbolic forms

Run targeted fixture/contract validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair gate is accepted.
