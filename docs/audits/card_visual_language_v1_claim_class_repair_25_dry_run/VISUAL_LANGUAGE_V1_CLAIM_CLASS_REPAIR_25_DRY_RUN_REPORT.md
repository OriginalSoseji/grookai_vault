# Visual Language V1 Claim-Class Repair 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Evaluate the claim-class deterministic repair with one branch-stratified 25-card OpenAI dry run.

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
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29
```

Descriptions:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/CARD_VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/dry_run_no_db_write_readback.json
```

Raw outputs:

```text
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/generated_outputs.jsonl
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/review_sample.jsonl
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/summary.json
docs/audits/card_visual_language_v1_claim_class_repair_25_dry_run/2026-07-16T18-27-39-543Z_dry_run_2165c9200f29/run_plan.json
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 8 |
| needs_review by agent | 17 |
| database run rows written | 0 |
| database description rows written during run window | 0 |

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9915`
- cached input tokens: `0`
- total tokens: `692043`
- estimated cost: `$0.1082682`
- average estimated cost per validated description: `$0.00433073`
- projected 500 cards: `$2.165365`
- projected 1,000 cards: `$4.33073`
- projected full eligible catalog: `$230.51176571`

Pricing snapshot:

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
| Pokemon | `potential_overconfident_ambiguous_setting` | 1 |
| Pokemon | `potential_primary_subject_anatomy_overclaim` | 1 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 1 |
| Pokemon | `potential_speculative_setting_language` | 2 |
| Trainer | `glare prevents determination` | 1 |
| Trainer | `potential_interpretive_claim` | 1 |
| Trainer | `potential_interpretive_mood_language` | 1 |
| Trainer | `potential_semantic_tag_nonvisual_concept` | 1 |
| Trainer | `potential_unsupported_personality_or_species_interpretation` | 2 |
| Stadium | `potential_purpose_or_lore_interpretation` | 1 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 3 |
| Stadium | `potential_speculative_setting_language` | 1 |
| Stadium | `potential_surface_overclaim` | 1 |
| Stadium | `potential_unsupported_personality_or_species_interpretation` | 2 |
| Stadium | `semantic_tags_metadata_or_generic_removed` | 1 |
| Energy | `potential_abstract_shape_literalization` | 1 |
| Energy | `potential_creature_language_on_non_pokemon_branch` | 1 |
| Energy | `potential_interpretive_claim` | 1 |
| Energy | `potential_speculative_setting_language` | 1 |
| Item / Tool / Supporter | `potential_canonical_metadata_in_visual_output` | 1 |
| Item / Tool / Supporter | `potential_dramatic_inferred_action_language` | 1 |
| Item / Tool / Supporter | `potential_metadata_or_identity_language` | 1 |
| Item / Tool / Supporter | `potential_object_material_or_card_surface_confusion` | 2 |
| Item / Tool / Supporter | `potential_semantic_tag_nonvisual_concept` | 2 |
| Item / Tool / Supporter | `potential_visual_material_vs_surface_confusion` | 2 |

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material status-level issue during first-pass review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | Subject and action read visually grounded enough; no material surface or metadata issue found. |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | Environment and molten platform description are mostly grounded; no status-level routing miss found. |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | Symbol, gradients, radiating lines, and blue palette are visually grounded enough for pending. |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Symbolic Energy description is mostly grounded; no material surface claim survived. |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | Fossil object, cracks, rocky ground, and vegetation are visually grounded enough for pending. |

Count: `5`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | Anatomy overclaim, ambiguous star language, and speculative `ethereal`/`enchanting` mood. |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `ethereal`, `twilight`, `evokes`, and `intrigue`. |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Status correctly routed; output includes a surface overclaim even though the active trigger was semantic `theme`. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | `playful atmosphere` and `cheerful mood`, plus surface-quality wording. |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | `intrigue`, plus inviting/determined expression language that benefits from review. |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | `evoke` and strong focus/determination claims. |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | `contemplation`, nonvisual `atmosphere` tag, and raw model quality flag. |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | Physical surface overclaim: `embossed`. |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | `essence of`, nonvisual `atmosphere`, and generic `stadium` tag removal. |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | `cheerful mood` and nonvisual `peaceful atmosphere`. |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | `ethereal`, `enchanting`, `fantastical`, `whimsical`, and nonvisual tags. |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | `ethereal`, `mystical`, `evoke`, and `embodies`. |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | Creature/urban literalization on an abstract Energy card. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | `imminent action`. |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | Metadata tag `dark bell` and nonvisual `mysterious atmosphere`. |
| `リトライバッジ` | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | `metallic badge` and nonvisual `award` tag. |
| `ごうかいボム` | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | `glossy finish` material/surface confusion. |

Count: `17`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | Uses unsupported action/personality language: `readiness to burrow or attack`, `theme of excavation and speed`, `formidable appearance`, and `intimidating mood`. |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | Uses unsupported or overconfident body-language/personality claims: `confident stance`, `determination or focus`, `readiness`, `assertive posture`, and semantic tag `confident expression`. |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | Uses purpose/theme language: `fitting for a Grass Energy card` and `elemental qualities associated with grass`. |

Count: `3`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 5 |
| correctly flagged needs_review | 17 |
| false positives | 0 |
| false negatives found during first-pass review | 3 |
| total reviewed | 25 |

## Boundary Proof

`dry_run_no_db_write_readback.json` confirms:

- `card_visual_description_runs_rows_for_run_key`: `0`
- `card_print_visual_descriptions_rows_between_run_window_for_agent_model_prompt`: `0`

No database rows were written.

## Decision

Do not apply rows yet.

The claim-class repair improved status routing. First-pass false negatives dropped from `7` to `3`, and the sample showed better handling of abstract Energy literalization, material/surface confusion, and canonical metadata leakage.

The gate is still not stable enough for database apply because remaining `pending` rows still contain unsupported action/personality and purpose/theme claims.

## Exact Next Gate

Do one narrow deterministic repair only:

- flag action/personality variants such as `readiness to burrow or attack`, `formidable appearance`, and `intimidating mood`
- flag trainer body-language/personality variants such as `confident stance`, `assertive posture`, and `confident expression` when used as personality claims
- flag purpose/theme variants such as `fitting for a Grass Energy card` and `elemental qualities associated with grass`
- add a surface-overclaim phrase for `foil treatment is present`
- add a generic surface-quality phrase for `card surface quality appears clear`
- prevent raw non-problem model quality phrases such as `glare prevents determination` from becoming review flags unless paired with a real issue

Run targeted fixture/contract validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair gate is accepted.
