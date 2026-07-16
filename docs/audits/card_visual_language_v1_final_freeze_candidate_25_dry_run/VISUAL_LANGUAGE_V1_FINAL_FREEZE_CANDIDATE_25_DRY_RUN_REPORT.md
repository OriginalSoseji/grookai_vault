# Visual Language V1 Final Freeze Candidate 25-Card Dry Run Report

Date: 2026-07-16

Status: FREEZE CANDIDATE FAILED

## Objective

Run the final branch-stratified 25-card OpenAI dry run after the freeze-candidate deterministic repair.

This was dry-run only.

## Scope Boundary

Performed:

- ran one branch-stratified OpenAI dry run
- generated a review markdown with all 25 descriptions
- performed read-only no-write DB boundary readback
- completed a first-pass quality bucket review
- ran targeted card-visual syntax and contract checks

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
- full repository contract suite not run for this isolated dry-run gate

## Run Artifacts

Run directory:

```text
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82
```

Descriptions:

```text
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/CARD_VISUAL_LANGUAGE_V1_FINAL_FREEZE_CANDIDATE_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/dry_run_no_db_write_readback.json
```

Raw outputs:

```text
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/generated_outputs.jsonl
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/review_sample.jsonl
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/summary.json
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/run_plan.json
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/command_metadata.json
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/targeted_test_output.txt
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/permanent_artifact_hashes.json
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 5 |
| needs_review by agent | 20 |
| database run rows written | 0 |
| database description rows written during run window | 0 |

Operational result: pass. Freeze-quality result: fail because strict first-pass review found 5 status-level false negatives.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9701`
- cached input tokens: `0`
- total tokens: `691829`
- estimated cost: `$0.1081398`
- average estimated cost per validated description: `$0.00432559`
- projected 500 cards: `$2.162795`
- projected 1,000 cards: `$4.32559`
- projected full eligible catalog: `$230.23817893` for `53227` eligible cards

Pricing snapshot:

```json
{
  "input_per_million": 0.15,
  "output_per_million": 0.6,
  "cached_input_per_million": 0.075,
  "image_cost_rule_version": "gpt-4o-mini-standard-2026-07-16",
  "recorded_at": "2026-07-16T19:18:32.732Z",
  "source": "cli_or_environment",
  "formula": "((input_tokens - cached_input_tokens) * input_per_million + cached_input_tokens * cached_input_per_million + output_tokens * output_per_million) / 1000000; if cached_input_per_million is null, cached input is priced at input_per_million; image costs are assumed to be represented in input_tokens under image_cost_rule_version."
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
| Pokemon | `potential_canonical_metadata_in_visual_output` | 1 |
| Pokemon | `potential_interpretive_claim` | 1 |
| Pokemon | `potential_metadata_or_identity_language` | 1 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 1 |
| Pokemon | `potential_speculative_setting_language` | 2 |
| Pokemon | `potential_unsupported_personality_or_species_interpretation` | 1 |
| Trainer | `potential_generic_filler` | 1 |
| Trainer | `potential_semantic_tag_nonvisual_concept` | 1 |
| Trainer | `potential_speculative_setting_language` | 1 |
| Trainer | `potential_unsupported_personality_or_species_interpretation` | 2 |
| Stadium | `potential_canonical_metadata_in_visual_output` | 1 |
| Stadium | `potential_interpretive_claim` | 2 |
| Stadium | `potential_interpretive_mood_language` | 1 |
| Stadium | `potential_metadata_or_identity_language` | 1 |
| Stadium | `potential_overconfident_ambiguous_setting` | 1 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 2 |
| Stadium | `potential_speculative_setting_language` | 1 |
| Stadium | `semantic_tags_metadata_or_generic_removed` | 1 |
| Energy | `potential_abstract_shape_literalization` | 1 |
| Energy | `potential_interpretive_claim` | 3 |
| Energy | `potential_interpretive_mood_language` | 1 |
| Item / Tool / Supporter | `potential_canonical_metadata_in_visual_output` | 1 |
| Item / Tool / Supporter | `potential_interpretive_claim` | 1 |
| Item / Tool / Supporter | `potential_interpretive_mood_language` | 1 |
| Item / Tool / Supporter | `potential_metadata_or_identity_language` | 1 |
| Item / Tool / Supporter | `potential_object_material_or_card_surface_confusion` | 1 |
| Item / Tool / Supporter | `potential_semantic_tag_nonvisual_concept` | 1 |
| Item / Tool / Supporter | `potential_visual_material_vs_surface_confusion` | 1 |

## Bucket 1: Correctly Left Pending

No rows were confidently accepted as correctly left `pending` under strict first-pass review.

Count: `0`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | `ethereal`, `evokes`, `ethereal` |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `ethereal`, `atmosphere` |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | `aggressive`, `confident expression` |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | `Electric type`, `Electric type` |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | `theme` |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | `determined`, `confident stance`, `confident expression`, `print quality appears` |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | `dreamy`, `whimsical`, `determined expression` |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | `evoking` |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | `stadium`, `symbolizing` |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | `Cinnabar City Gym`, `Cinnabar City Gym` |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | `atmosphere` |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | `cosmic`, `cosmic`, `dreamlike`, `ethereal`, `intrigue` |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | `evoking`, `intrigue` |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | `buildings`, `cityscape`, `buildings` |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | `evokes` |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | `evokes` |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | `dark bell`, `dark bell` |
| リトライバッジ | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | `celebratory` |
| ごうかいボム | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | `shiny surface`, `shiny surface` |
| 古びたたての化石 | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | `evoking`, `tranquil`, `tranquil` |

Count: `20`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but strict first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Unflagged personality/action and type-like claims: `determined stance`, `intense eye expression`, and `electrically charged body`. |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | Unflagged trainer personality/action claims: `confidence`, `focused`, `perhaps invoking or directing energy`, `intense action`, `dramatic atmosphere`, and `urgency`. |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | Unflagged trainer personality/mood claims: `focused`, `thoughtful`, `confidence and poise`, `calm atmosphere`, and semantic tag `focused expression`. |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | Unflagged Energy interpretation: `importance`, `powerful, energetic force`, and series-comparison language `unique within the series`. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | Unflagged object/action/mood drift: `spark ... indicating a sense of action`, `explosion ... energetic atmosphere`, `anticipation and excitement`, and semantic tag `explosive device`. |

Count: `5`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 0 |
| correctly flagged needs_review | 20 |
| false positives | 0 |
| false negatives found during first-pass review | 5 |
| total reviewed | 25 |

## Boundary Proof

`dry_run_no_db_write_readback.json` confirms:

- `card_visual_description_runs_rows_for_run_key`: `0`
- `card_print_visual_descriptions_rows_between_run_window_for_agent_model_prompt`: `0`

No generated descriptions were applied, approved, embedded, exposed, or used downstream.

## Tests Run

| Command | Result |
| --- | --- |
| `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` | pass |
| `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` | pass, 26/26 |

The first targeted contract test is the relevant migration/RLS smoke for this gate: it asserts the card visual description migration creates private versioned tables, enables RLS, revokes public/anon/authenticated access, grants service-role access, preserves current-row uniqueness, and does not mutate `card_prints`.

Full repository contract suite was not run because this gate made no schema or runtime integration changes and the relevant card-visual contract suite passed.

## Decision

Do not freeze Visual Language V1 yet.

The system remains operationally stable, but this run shows that exact phrase-family repairs are no longer the right lever. The remaining misses are field-level claim-class issues: mood, expression, action, type-like visual language, and object/event interpretation can reappear in new wording.

## Next Gate

Implement a field-aware review policy repair rather than another exact-phrase patch. The repair should focus on branch-specific allowed vocabularies and claim classes:

- restrict `visual_attributes.mood` to a small objective vocabulary by branch
- flag personality/expression claims in Trainer and Pokemon prose unless tied to visible facial features
- flag action/event interpretation for Item/Object branches unless explicitly visible and non-speculative
- flag Energy branch force/purpose/theme language unless it describes visible shapes, palette, lighting, or composition
- flag type-like visual claims such as electrically charged body when they derive from canonical knowledge rather than visible marks

Run targeted fixture and contract tests only after that repair. Do not run another OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, or integrate Taste Engine, Listing Resolver, or Grookai Signature until that repair gate is accepted.
