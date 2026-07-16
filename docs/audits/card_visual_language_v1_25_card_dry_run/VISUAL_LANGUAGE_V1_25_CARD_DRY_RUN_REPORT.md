# Visual Language V1 25-Card Dry Run Report

Date: 2026-07-16

Baseline commit before run:

```text
bf51e62ba49a92dff3596a84e92abb0399e3e76a
```

## Objective

Run a 25-card OpenAI dry run using the current Visual Language V1 enforcement rules without changing the rule set during the run.

This was a dry-run-only learning sample.

## Scope Boundary

Performed:

- ran one 25-card OpenAI dry run
- reviewed all 25 generated rows
- separated results into four review buckets
- reported flag frequency by branch
- confirmed no database writes

Not performed:

- no prompt changes
- no enforcement-rule changes during the run
- no schema changes
- no migrations
- no database writes
- no approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production apply

## Run Artifact

```text
docs/audits/card_visual_language_v1_25_card_dry_run/2026-07-16T13-31-44-941Z_dry_run_4b2b45e0a4e3
```

Console output:

```text
docs/audits/card_visual_language_v1_25_card_dry_run/visual_language_25_card_dry_run_console.txt
```

Review extract:

```text
docs/audits/card_visual_language_v1_25_card_dry_run/visual_language_25_card_review_extract.txt
docs/audits/card_visual_language_v1_25_card_dry_run/visual_language_25_card_review_short_extract.txt
```

## Run Summary

| Metric | Value |
| --- | ---: |
| eligible | 25 |
| attempted | 25 |
| validated | 25 |
| failed | 0 |
| skipped | 0 |
| pending by agent | 10 |
| needs_review by agent | 15 |

## Token And Cost Result

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `652906`
- output tokens: `11379`
- total tokens: `664285`
- estimated cost: `$0.10476330`
- average estimated cost per validated description: `$0.00419053`

Projected costs at this pricing snapshot:

- 500 cards: `$2.095265`
- 1,000 cards: `$4.19053`
- full eligible catalog count: `53227`
- projected full eligible catalog: `$223.04934031`

## Branch Distribution

The sample was not branch-balanced.

| Requested branch bucket | Cards in sample | Agent needs_review rows | Agent pending rows |
| --- | ---: | ---: | ---: |
| Pokemon | 24 | 15 | 9 |
| Trainer | 1 | 0 | 1 |
| Stadium | 0 | 0 | 0 |
| Energy | 0 | 0 | 0 |
| Item / Tool / Supporter | 0 | 0 | 0 |

Important finding: `card_type_metadata_source` was `unavailable` for 24 of 25 cards. This caused the sample to collapse into the Pokemon prompt branch, even for rows whose names and artwork appear to be Trainer, Item, Tool, or Fossil-like object cards.

This run is useful for enforcement stress-testing, but it is not sufficient to measure branch-noise balance across all card types.

## Flag Frequency By Branch

| Branch | Flag | Count |
| --- | --- | ---: |
| Pokemon | `potential_speculative_setting_language` | 7 |
| Pokemon | `potential_interpretive_claim` | 6 |
| Pokemon | `potential_semantic_tag_nonvisual_concept` | 3 |
| Pokemon | `potential_overconfident_ambiguous_setting` | 2 |
| Pokemon | `low_resolution` | 1 |
| Trainer | none | 0 |
| Stadium | none | 0 |
| Energy | none | 0 |
| Item / Tool / Supporter | none | 0 |

All deterministic flags came from the Pokemon branch because the sample was almost entirely routed there.

## Bucket 1: Correctly Left Pending

These rows were left `pending` and did not show a material Visual Language enforcement issue during review.

| Card | GV-ID | Branch | Review note |
| --- | --- | --- | --- |
| Misty's Vitality | `GV-PK-JPN-M5-108` | Trainer | Human trainer description is grounded in visible smile, pose, hair, clothing, and blue water-like background. |
| Mega Zeraora ex | `GV-PK-JPN-M5-112` | Pokemon | Mostly concrete creature and artwork description; no strong enforcement issue found. |

## Bucket 2: Correctly Flagged Needs Review

These rows were flagged by the agent and the flag should require human review.

| Card | GV-ID | Branch | Trigger evidence |
| --- | --- | --- | --- |
| Mega Chandelure ex | `GV-PK-JPN-M5-113` | Pokemon | `ethereal` |
| Mega Darkrai ex | `GV-PK-JPN-M5-118` | Pokemon | `mystical`; also carried `low_resolution` |
| Mega Zeraora ex | `GV-PK-JPN-M5-096` | Pokemon | `evokes`; semantic tag `atmosphere` |
| Mega Darkrai ex | `GV-PK-JPN-M5-114` | Pokemon | semantic tag `atmosphere` |
| Gladion's Final Battle | `GV-PK-JPN-M5-116` | Pokemon | `evoking` |
| Mega Darkrai ex | `GV-PK-JPN-M5-099` | Pokemon | `ethereal` |
| Mega Chandelure ex | `GV-PK-JPN-M5-097` | Pokemon | `ethereal` |
| Rust Syndicate Grunt | `GV-PK-JPN-M5-110` | Pokemon | `evokes` |
| `カスミの元気` | `GV-PK-JPN-M5-075` | Pokemon | `embodies` |
| `メガドリュウズex` | `GV-PK-JPN-M5-063` | Pokemon | semantic tag `atmosphere` |
| `サビ組のしたっぱ` | `GV-PK-JPN-M5-077` | Pokemon | `evoking` |
| `メガダークライex` | `GV-PK-JPN-M5-046` | Pokemon | `ethereal` |
| `ごうかいボム` | `GV-PK-JPN-M5-073` | Pokemon | `embodies` |
| `メガシャンデラex` | `GV-PK-JPN-M5-036` | Pokemon | `stars`, `ethereal` |

## Bucket 3: False Positives

These rows were flagged, but human review found the trigger too broad.

| Card | GV-ID | Branch | Flag | Review note |
| --- | --- | --- | --- | --- |
| `リトライバッジ` | `GV-PK-JPN-M5-074` | Pokemon | `potential_overconfident_ambiguous_setting`, `potential_speculative_setting_language` | The trigger was `star`, but the output described a literal star-shaped symbol on a badge. This should not be treated like a celestial or ambiguous-background claim. |

Recommended later repair:

- allow literal-object uses such as `star-shaped symbol`, `star symbol`, and `central star` without celestial-setting flags
- keep `stars`, `starry`, and background `star-like` claims review-gated unless explicit uncertainty is present

## Bucket 4: False Negatives Found During Review

These rows were left `pending`, but human review found material issues that should have required review.

| Card | GV-ID | Branch | Missed issue |
| --- | --- | --- | --- |
| Tremendous Bomb | `GV-PK-JPN-M5-106` | Pokemon | Likely Item/object row routed through Pokemon branch; also uses interpretive phrases such as `imminent energy release`, `urgency`, and `excitement`. |
| Gladion's Final Battle | `GV-PK-JPN-M5-109` | Pokemon | Human/trainer-like row routed through Pokemon branch; uses narrative language such as `role in the narrative` and `essence of the character's resolve`. |
| Gwynn | `GV-PK-JPN-M5-117` | Pokemon | Human-like row routed through Pokemon branch; `symbolizing guidance or invitation` was not caught because the rule catches `symbolizes` but not `symbolizing`. |
| Mega Excadrill ex | `GV-PK-JPN-M5-101` | Pokemon | Uses base-form `evoke` in `radiating lines that evoke energy and action`; current rule catches `evokes` and `evoking` but not `evoke`. |
| Dark Bell | `GV-PK-JPN-M5-105` | Pokemon | Object-like row likely belongs in Item/Tool/Object handling; mood phrase `introspective` is not grounded in visible evidence for an object. |
| Gwynn | `GV-PK-JPN-M5-111` | Pokemon | Surface overclaim and generic filler: `layer of gloss`, `higher quality print`, and `printing quality appears clear and well-defined`. |
| `ムク` | `GV-PK-JPN-M5-078` | Pokemon | Human-like row routed through Pokemon branch; speculative light-source language mentions unseen `candles or torches`. |
| `古びたたての化石` | `GV-PK-JPN-M5-072` | Pokemon | Uses base-form `evoke` in `evoke an earthy ambiance`; current rule does not catch base-form `evoke`. |

## Review Totals

| Bucket | Count |
| --- | ---: |
| correctly left pending | 2 |
| correctly flagged needs_review | 14 |
| false positives | 1 |
| false negatives found during review | 8 |
| total reviewed | 25 |

## Boundary Proof

`visual_language_25_card_no_db_write_readback.json` confirms:

- `dry_run_25_artifact_run_rows`: `0`
- `dry_run_25_prompt_description_rows_since_run_start`: `0`

No database rows were written.

## Decision

Do not proceed to database apply.

The enforcement layer is useful, but this 25-card run exposed two blockers before any production apply:

1. Branch routing is not reliable when card-type metadata is unavailable.
2. The deterministic vocabulary needs a small post-run repair pass.

## Recommended Narrow Repairs

Do not change the architecture. Apply only narrow enforcement and sampling repairs:

1. Add base-form interpretive claim detection for `evoke` and `symbolizing`.
2. Add card-surface overclaim detection for `layer of gloss`, `higher quality print`, and `printing quality appears`.
3. Add a literal-star exception for visible object phrases such as `star-shaped symbol`.
4. Add a review flag for `card_type_metadata_source = unavailable` when the row is forced into the Pokemon branch and the name/artwork suggests Trainer, Item, Tool, Supporter, Fossil, or object-only content.
5. Build the next 25-card dry run as a branch-stratified sample rather than relying on the default eligible ordering.

## Exact Next Gate

Implement the narrow post-run enforcement repair and branch-stratified sampling gate.

Then run a new dry-run-only validation sample with explicit branch coverage:

- Pokemon
- Trainer
- Stadium
- Energy
- Item / Tool / Supporter

Do not apply rows, approve rows, generate embeddings, build semantic search, or integrate downstream systems before that gate is reviewed.
