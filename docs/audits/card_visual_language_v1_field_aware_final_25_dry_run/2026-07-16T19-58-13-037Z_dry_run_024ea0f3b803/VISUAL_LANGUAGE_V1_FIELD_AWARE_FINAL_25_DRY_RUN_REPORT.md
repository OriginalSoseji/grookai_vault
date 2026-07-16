# Visual Language V1 Field-Aware Final 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Run the final branch-stratified 25-card OpenAI dry run after the field-aware policy repair.

The code was frozen at commit:

```text
a85af90923f5a20ae6387696030c374da4d03399
```

No repairs were made during the run.

## Scope Boundary

Performed:

- branch-stratified 25-card OpenAI dry run
- five cards each for Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter
- direct usage and cost recording
- dry-run database boundary readback
- first-pass review bucket classification
- description markdown generation

Not performed:

- no database writes
- no row approvals
- no embeddings
- no semantic search
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no production apply
- no validator repair during the sample

## Run Summary

| Field | Value |
| --- | --- |
| Run key | `024ea0f3b803f336d9fc9c6b4f663bea1227b18717f506eca45d5beaab95f50a` |
| Run directory | `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803` |
| Provider/model | `openai` / `gpt-4o-mini` |
| Response model | `gpt-4o-mini-2024-07-18` |
| Prompt version | `CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR` |
| Image detail | `high` |
| Validated | `25/25` |
| Failed | `0` |
| Skipped | `0` |
| Review statuses | `22 needs_review`, `3 pending` |
| DB writes | `0` |

## Branch Coverage

| Branch | Count |
| --- | ---: |
| Pokemon | 5 |
| Trainer | 5 |
| Stadium | 5 |
| Energy | 5 |
| Item / Tool / Supporter | 5 |

## Token And Cost Result

| Metric | Value |
| --- | ---: |
| request count | 25 |
| retry count | 0 |
| input tokens | 682128 |
| output tokens | 9854 |
| total tokens | 691982 |
| cached input tokens | 0 |
| reasoning output tokens | 0 |
| estimated cost | `$0.1082316` |
| average estimated cost per validated card | `$0.00432926` |
| projected 500 cards | `$2.16463` |
| projected 1,000 cards | `$4.32926` |
| projected full eligible catalog, 53,227 cards | `$230.43352202` |

The configured run ceiling was `$0.25` and `25` cards. The run did not stop before the next call.

## Boundary Proof

Artifact:

```text
docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/dry_run_no_db_write_readback.json
```

Readback result:

| Check | Count |
| --- | ---: |
| `card_visual_description_runs` rows for run key | 0 |
| `card_print_visual_descriptions` rows in run window for agent/model/prompt | 0 |

No approvals, embeddings, app-facing reads, or downstream integrations were performed.

## Quality Review Buckets

First-pass review artifact:

```text
docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/first_pass_review_buckets.json
```

Image review limitation:

Self-hosted image keys were present in generated outputs, but matching local image files were not found in the active checkout or `C:/grookai_vault` during this review. The first-pass review used generated payloads, canonical names, branches, statuses, and deterministic flags.

| Bucket | Count |
| --- | ---: |
| correctly left pending | 1 |
| correctly flagged needs_review | 21 |
| likely false positives | 1 |
| status-level false negatives | 2 |
| flag-level false negatives inside needs_review rows | 3 |

Correctly left pending:

- `GV-PK-JPN-TCGCOLLECTOR11526-019` - Magnetic Storm

Likely false positive:

- `GV-PK-JPN-M5-108` - Misty's Vitality: trainer confidence/expression language appears supported by visible smile and gesture evidence in the generated description, but legacy non-field-aware review flags still forced `needs_review`.

Status-level false negatives:

- `GV-PK-JPN-TCGCOLLECTOR11515-020` - Dark Metal Energy: unflagged interpretive language such as `mood invokes a sense of intensity` and `abstract representation of dark energy`.
- `GV-PK-JPN-M5-072` - `古びたたての化石`: unflagged interpretive/purpose language such as `sense of discovery and ancient history` and fossil `significance`.

Flag-level false negatives inside already `needs_review` rows:

- `GV-PK-JPN-M5-101` - Mega Excadrill ex: card-surface field says `smooth surface` and printing treatment `appears to show muted colors` without a surface-policy flag.
- `GV-PK-JPN-L1BSS-070` - Rainbow Energy: card-surface field overclaims standard surface, absence of texturing/gloss, edge wear, and print quality without a surface-policy flag.
- `GV-PK-JPN-M5-112` - Mega Zeraora ex: unsupported expression/personality language remained secondary to other review flags.

## Lock Criteria

| Criterion | Result |
| --- | --- |
| `25/25` validated | pass |
| all five branches correctly routed | pass |
| zero false positives | fail |
| zero or one false negative | fail |
| no unflagged subject-identity or anatomy failure | pass in payload review |
| no unflagged physical card-surface claim | fail |
| no database writes, approvals, or embeddings | pass |

## Decision

The final field-aware 25-card dry run is operationally successful but does not pass the Visual Language V1 freeze lock.

This is not a prompt-architecture failure. The remaining issues are narrow validator policy issues:

- legacy non-field-aware Trainer expression flags can overrule visible support
- surface-overclaim detection needs broader field-aware phrases
- interpretive `invokes/conveys/sense of/significance` language still escapes some pending rows

## Exact Next Gate

Do not run another OpenAI sample yet.

Implement one narrow deterministic repair gate only:

- make legacy Trainer expression/personality flags respect visible support or defer to `policy_results`
- expand `card_surface_and_printing_cues` policy for `standard surface`, `smooth surface`, `no visible texturing`, `edge wear`, and print-quality judgments
- add branch-aware interpretive checks for `invokes`, `conveys a sense`, `sense of discovery`, `significance`, and `abstract representation of ... energy`
- replay this exact 25-card run offline
- confirm the likely false positive is cleared
- confirm the two status-level false negatives route to `needs_review`
- confirm already clean pending rows are not dirtied
- run targeted contract tests only

Do not patch during a sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, process production cards, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature.
