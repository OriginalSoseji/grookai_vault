# Card Visual Description Prompt V6 Branch Comparison

Date: 2026-07-16

## Context

The 25-card Prompt V5 review showed that the visual description agent produced strong Pokemon descriptions, but used one universal "Character / Artwork" structure for every card. That caused non-Pokemon cards to be described as if they had characters or creatures.

Prompt V6 changes the prompt architecture so canonical card-type metadata is passed before image interpretation. The metadata is used only to choose a description strategy. It is not canonical identity authority, and it does not permit the model to describe details that are not visible.

## Scope

Changed:

- Prompt version advanced to `CARD_VISUAL_DESCRIPTION_PROMPT_V6`.
- Prompt now resolves one branch per card: Pokemon, Trainer, Stadium, Energy, or Item / Tool / Supporter.
- Eligible-card artifacts now include read-only prompt metadata: `prompt_branch`, metadata source, supertype, subtype, card category, Pokemon name, and trainer name.
- The eligible-card query now reads `card_print_traits` when available, including exact-card, source-card, and same-name trait fallbacks.
- Contract tests now guard the V6 branch architecture.

Not changed:

- No schema change.
- No migration change.
- No DB apply.
- No approvals.
- No embeddings.
- No semantic search.
- No Taste Engine integration.
- No Listing Resolver integration.
- No canonical identity mutation.

## Runs

First dry-run attempt:

- Console artifact: `docs/audits/card_visual_description_prompt_v6_refinement/prompt_v6_four_branch_dry_run_console.txt`
- Permanent copied artifacts:
  - `docs/audits/card_visual_description_prompt_v6_refinement/failed_transport_run_plan.json`
  - `docs/audits/card_visual_description_prompt_v6_refinement/failed_transport_eligible_cards.jsonl`
  - `docs/audits/card_visual_description_prompt_v6_refinement/failed_transport_validation_failures.jsonl`
  - `docs/audits/card_visual_description_prompt_v6_refinement/failed_transport_summary.json`
- Local raw run artifact directory: `docs/audits/card_visual_descriptions/2026-07-16T05-52-36-462Z_dry_run_1a1978f4e0c0`
- Result: 4 eligible, 0 validated, 4 failed.
- Cause: local Node TLS certificate verification failed before OpenAI usage was recorded.
- Usage: 0 input tokens, 0 output tokens, $0.00000000 estimated cost.

Successful dry run:

- Console artifact: `docs/audits/card_visual_description_prompt_v6_refinement/prompt_v6_four_branch_dry_run_console_tls_workaround.txt`
- Permanent copied artifacts:
  - `docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_plan.json`
  - `docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_eligible_cards.jsonl`
  - `docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_generated_outputs.jsonl`
  - `docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_review_sample.jsonl`
  - `docs/audits/card_visual_description_prompt_v6_refinement/successful_dry_run_summary.json`
- Local raw run artifact directory: `docs/audits/card_visual_descriptions/2026-07-16T05-53-26-653Z_dry_run_4ac9cc1e9168`
- Review-format descriptions artifact: `docs/audits/card_visual_description_prompt_v6_refinement/CARD_VISUAL_DESCRIPTION_V6_BRANCH_DESCRIPTIONS.md`
- Raw generated descriptions artifact: `docs/audits/card_visual_description_prompt_v6_refinement/PROMPT_V6_DRY_RUN_DESCRIPTIONS.md`
- DB no-write readback: `docs/audits/card_visual_description_prompt_v6_refinement/prompt_v6_no_db_write_readback.json`
- Result: 4 eligible, 4 validated, 0 skipped, 0 failed.
- Note: this command used process-local `NODE_TLS_REJECT_UNAUTHORIZED=0` due the local certificate-chain issue. This was an execution-environment workaround only, not a code change.

## Branch Results

| Card | GV-ID | V6 branch | Metadata source | Result |
|---|---|---:|---|---|
| Chandelure VMAX | `GV-PK-JPN-S8-116` | `pokemon` | `same_name_trait` | Correctly used `Character:` and `Artwork:`. |
| Misty's Vitality | `GV-PK-JPN-M5-108` | `trainer` | `name_fallback_trainer` | Correctly used `Trainer:` and did not call the person a humanoid creature. |
| Fairy Garden | `GV-PK-WCD-2014-CRAZY_PUNCH-13-XY-117-FAIRY_GARDEN` | `stadium` | `source_trait+same_name_trait` | Correctly used `Environment:` and no character section. Still flagged for speculative light/background wording. |
| Psychic Energy | `GV-PK-JPN-TCGCOLLECTOR11541-013` | `energy` | `same_name_trait` | Correctly used `Symbolic Artwork:` and did not invent a creature. |

## V5 To V6 Comparison

Pokemon:

- V5 was already strong for Pokemon cards.
- V6 preserved the Pokemon character-first behavior.
- Chandelure remained a creature/object-anatomy description rather than a generic card description.

Trainer:

- V5 treated Misty's Vitality under the same universal `Character:` layer.
- V6 used the `Trainer:` branch, named the visible trainer as a person, and focused on hair, expression, pose, clothing, and motion.
- The semantic tags shifted toward search-useful trainer tags such as `trainer portrait`, `dynamic pose`, and `cheerful expression`.

Stadium:

- V5 described Fairy Garden as a "character" and gave it no face or limbs.
- V6 removed the character layer and described the visible environment directly.
- Remaining weakness: the output still said scattered glowing lights resembled stars and created a magical feel. The existing review flag caught this as `potential_overconfident_ambiguous_setting`, so the row remained `needs_review`.

Energy:

- V5 described Psychic Energy as a creature represented by an eye.
- V6 treated the card as symbolic artwork, centered on the eye symbol, purple gradients, abstract forms, and radiating lines.
- No invented creature section appeared.

## Usage And Cost

Successful V6 dry run:

- Model requested: `gpt-4o-mini`
- Response model: `gpt-4o-mini-2024-07-18`
- Image detail: `high`
- Request count: 4
- Retry count: 0
- Input tokens: 119,711
- Output tokens: 1,661
- Total tokens: 121,372
- Cached input tokens: 0
- Estimated cost: $0.01895325
- Average estimated cost per validated description: $0.00473831
- Projected 500-card cost at this snapshot: $2.369155
- Projected 1,000-card cost at this snapshot: $4.73831

Pricing snapshot:

- Input per million: 0.15
- Output per million: 0.60
- Cached input per million: 0.075
- Image cost rule version: `gpt-4o-mini-standard-2026-07-16`

## Boundary Proof

`prompt_v6_no_db_write_readback.json` shows:

- `v6_description_rows`: 0
- `v6_run_rows`: 0

This confirms the V6 validation phase produced local run artifacts only. It did not insert description rows or run rows.

## Tests

Passed:

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs`
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs`

Contract result:

- 9 tests passed.
- 0 failed.

## Current Truths

- Prompt V6 fixes the major architecture issue: non-Pokemon cards no longer use the Pokemon character template.
- `card_print_traits` is sufficient for branch routing on the tested Pokemon, Stadium, and Energy cards.
- Misty's Vitality still required a conservative name fallback because no exact trait row was available.
- The visual layer remains derived intelligence. It is stored and reviewed separately from canonical card identity.
- The review workflow is still needed because grounded branch routing does not eliminate all speculative wording.

## Invariants

Must not break:

- V6 artifacts may use canonical metadata as prompt context only.
- Visual descriptions must not mutate `card_prints`.
- Generated rows must remain non-approved by default.
- Semantic tags must describe visible artwork only.
- Embeddings and semantic search remain out of scope until explicitly gated.
- The Taste Engine, Listing Resolver, and canonical identity systems remain out of scope.

## Decision

Prompt V6 is successful as an architecture refinement. It should be treated as the stable branch-aware foundation for the card visual description agent.

Do not immediately approve or apply V6 rows. The next gate should be human review of this four-card comparison, especially the Stadium row's speculative background language.

## Next Gate

Human-review the V6 four-card artifacts. If accepted, run a type-diverse 25-card V6 dry run only, with explicit coverage for Pokemon, Trainer, Stadium, Energy, Item, Tool, and Supporter cards.

Future, separate project:

- Create the Grookai Visual Language Guide as the long-term constitution for description style, review rules, and semantic tag language. Do not fold that into this prompt-refinement gate.
