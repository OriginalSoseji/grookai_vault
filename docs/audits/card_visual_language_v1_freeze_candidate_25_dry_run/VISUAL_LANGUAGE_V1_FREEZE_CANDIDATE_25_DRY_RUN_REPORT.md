# Visual Language V1 Freeze Candidate 25-Card Dry Run Report

Date: 2026-07-16

Status: FREEZE CANDIDATE FAILED

## Objective

Evaluate one final branch-stratified 25-card OpenAI dry run as the Visual Language V1 freeze candidate.

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
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749
```

Descriptions:

```text
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/CARD_VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/dry_run_no_db_write_readback.json
```

Raw outputs:

```text
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/generated_outputs.jsonl
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/review_sample.jsonl
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/summary.json
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/run_plan.json
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/command_metadata.json
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/targeted_test_output.txt
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 7 |
| needs_review by agent | 18 |
| database run rows written | 0 |
| database description rows written during run window | 0 |

Operational result: pass. Freeze-quality result: fail because first-pass review found 4 status-level false negatives.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10018`
- cached input tokens: `0`
- total tokens: `692146`
- estimated cost: `$0.10833`
- average estimated cost per validated description: `$0.0043332`
- projected 500 cards: `$2.1666`
- projected 1,000 cards: `$4.3332`
- projected full eligible catalog: `$230.6432364` for `53227` eligible cards

Pricing snapshot:

```json
{
  "input_per_million": 0.15,
  "output_per_million": 0.6,
  "cached_input_per_million": 0.075,
  "image_cost_rule_version": "gpt-4o-mini-standard-2026-07-16",
  "recorded_at": "2026-07-16T18:47:35.745Z",
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
| Pokemon | `potential_metadata_or_identity_language` | 1 |
| Pokemon | `potential_primary_subject_anatomy_overclaim` | 1 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 1 |
| Pokemon | `potential_speculative_setting_language` | 2 |
| Pokemon | `potential_unsupported_personality_or_species_interpretation` | 1 |
| Trainer | `potential_semantic_tag_nonvisual_concept` | 2 |
| Trainer | `potential_speculative_setting_language` | 1 |
| Trainer | `potential_unsupported_personality_or_species_interpretation` | 1 |
| Stadium | `potential_generic_filler` | 1 |
| Stadium | `potential_interpretive_claim` | 1 |
| Stadium | `potential_semantic_tag_nonvisual_concept` | 2 |
| Stadium | `potential_surface_overclaim` | 1 |
| Stadium | `semantic_tags_metadata_or_generic_removed` | 1 |
| Energy | `potential_canonical_metadata_in_visual_output` | 1 |
| Energy | `potential_creature_language_on_non_pokemon_branch` | 1 |
| Energy | `potential_interpretive_claim` | 2 |
| Energy | `potential_interpretive_mood_language` | 3 |
| Energy | `potential_metadata_or_identity_language` | 1 |
| Energy | `potential_object_material_or_card_surface_confusion` | 2 |
| Energy | `potential_purpose_or_lore_interpretation` | 1 |
| Energy | `potential_speculative_setting_language` | 1 |
| Energy | `potential_visual_material_vs_surface_confusion` | 2 |
| Item / Tool / Supporter | `potential_canonical_metadata_in_visual_output` | 1 |
| Item / Tool / Supporter | `potential_interpretive_claim` | 1 |
| Item / Tool / Supporter | `potential_metadata_or_identity_language` | 1 |
| Item / Tool / Supporter | `potential_object_material_or_card_surface_confusion` | 2 |
| Item / Tool / Supporter | `potential_semantic_tag_nonvisual_concept` | 1 |
| Item / Tool / Supporter | `potential_visual_material_vs_surface_confusion` | 2 |

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material status-level issue during first-pass review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | Motion, pose, color, and light claims are visually grounded enough for pending; no status-level surface or metadata issue found. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | Expression, pose, and aquatic context are plausible visual observations with uncertainty wording; no status-level routing miss found. |
| 古びたたての化石 | `GV-PK-JPN-M5-072` | Item / Tool / Supporter | Fossil, cracks, rocks, foliage, and earth-tone palette are visually grounded; mild age wording remains a low-risk review note, not a status-level miss. |

Count: `3`.

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged and should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | `ethereal` |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `ethereal`, `mysterious`, `atmosphere` |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | `Mega Zeraora`, `Mega Zeraora`, `suggests electrical power`, `confident expression` |
| Gwynn | `GV-PK-JPN-M5-117` | Trainer | `ethereal`, `atmosphere` |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Trainer | `atmosphere` |
| Gwynn | `GV-PK-JPN-M5-111` | Trainer | `contemplation`, `thoughtful expression` |
| Turffield Stadium | `GV-PK-JPN-S6A-100` | Stadium | `stadium`, `evoking` |
| Cinnabar City Gym | `GV-PK-JPN-PMCG6-085` | Stadium | `printing quality appears`, `printing quality appears` |
| High Pressure System | `GV-PK-JPN-TCGCOLLECTOR11525-019` | Stadium | `atmosphere` |
| Dimension Valley | `GV-PK-JPN-SMG-039` | Stadium | `atmosphere` |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | Energy | `intrigue` |
| Rainbow Energy | `GV-PK-JPN-L1BSS-070` | Energy | `evoke`, `tranquil`, `tranquil`, `creature` |
| Water Energy | `GV-PK-JPN-TCGCOLLECTOR11194-057` | Energy | `essence of` |
| Dark Metal Energy | `GV-PK-JPN-TCGCOLLECTOR11515-020` | Energy | `dark metal energy`, `dark metal energy`, `glossy finish`, `glossy finish` |
| Basic Grass Energy | `GV-PK-JPN-SM1PLUS-069` | Energy | `ethereal`, `evokes`, `tranquility`, `tranquil` |
| Dark Bell | `GV-PK-JPN-M5-105` | Item / Tool / Supporter | `dark bell`, `dark bell`, `shiny surface`, `shiny surface` |
| リトライバッジ | `GV-PK-JPN-M5-074` | Item / Tool / Supporter | `evoking` |
| ごうかいボム | `GV-PK-JPN-M5-073` | Item / Tool / Supporter | `shiny surface`, `shiny surface`, `theme` |

Count: `18`.

## Bucket 3: False Positives

No status-level false positives were found in the first-pass review.

Count: `0`.

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but first-pass review found they should likely have been routed to `needs_review`.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | Unflagged unsupported action/personality and mood language: `menacing grin`, `aggressive expression`, `intimidating presence`, `about to drill into the ground`, and `aggressive`/`intense` mood. |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Trainer | Unflagged trainer body-language/personality claims: `serious and determined`, `calling or directing`, `determined expression`, `action and determination`, and semantic tag `determined expression`. |
| Magnetic Storm | `GV-PK-JPN-TCGCOLLECTOR11526-019` | Stadium | Unflagged interpretive mood/critique language on a Stadium branch: `awe-inspiring`, `natural awe`, and `sense of power`. |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Item / Tool / Supporter | Unflagged object-material/action/mood drift: `glossy black surface`, `spark indicating ignition`, `explosion or heightened action`, and `urgency and excitement`. |

Count: `4`.

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 3 |
| correctly flagged needs_review | 18 |
| false positives | 0 |
| false negatives found during first-pass review | 4 |
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
| `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` | pass, 25/25 |
| `git diff --check` | pass |

The first targeted contract test is the relevant migration/RLS smoke for this gate: it asserts the card visual description migration creates private versioned tables, enables RLS, revokes public/anon/authenticated access, grants service-role access, preserves current-row uniqueness, and does not mutate `card_prints`.

Full repository contract suite was not run because this gate made no schema or runtime integration changes and the relevant card-visual contract suite passed.

## Decision

Do not freeze Visual Language V1 yet.

The system is operationally stable and the deterministic review layer remains useful, but the freeze threshold was not met. The current sample has `4` status-level false negatives, above the accepted `0-1` lock threshold.

## Next Gate

Implement one narrow deterministic repair that generalizes the remaining false-negative classes without expanding into a broad banned-word list:

- Pokemon action/personality and mood overclaims, especially aggressive/intimidating/readiness language when not strictly visible
- Trainer body-language/personality claims across prose, mood, and semantic tags
- Stadium interpretive mood/critique language such as awe, power, excitement, or ambiance claims not tied to visible features
- Item/Object illustrated-material and action/mood drift, especially glossy/shiny object language and implied ignition/explosion state

Run targeted fixture and contract tests only after that repair. Do not run another OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, or integrate Taste Engine, Listing Resolver, or Grookai Signature until that repair gate is accepted.
