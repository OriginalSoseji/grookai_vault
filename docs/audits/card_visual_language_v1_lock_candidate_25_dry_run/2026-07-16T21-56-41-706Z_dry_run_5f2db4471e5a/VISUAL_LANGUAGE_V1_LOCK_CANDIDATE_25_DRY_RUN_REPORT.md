# Visual Language V1 Lock Candidate 25-Card Dry Run Report

Date: 2026-07-16

## Objective

Run the final branch-stratified 25-card OpenAI dry run after the field-aware final repair, with code frozen for the full sample.

Frozen commit:

```text
04cac33f736c0ad00ec8f135a041f625d1a90820
```

No patches were made during the run.

## Scope Boundary

Performed:

- branch-stratified 25-card OpenAI dry run
- five cards each for Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter
- direct usage and cost recording
- dry-run database boundary readback
- row-status first-pass review
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
| Run key | `5f2db4471e5af06386febb2f8aff21c0d49b7b57c66ac16c602cc8c6d5da2268` |
| Run directory | `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a` |
| Provider/model | `openai` / `gpt-4o-mini` |
| Response model | `gpt-4o-mini-2024-07-18` |
| Prompt version | `CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR` |
| Image detail | `high` |
| Validated | `25/25` |
| Failed | `0` |
| Skipped | `0` |
| Review statuses | `23 needs_review`, `2 pending` |
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
| output tokens | 10131 |
| total tokens | 692259 |
| cached input tokens | 0 |
| reasoning output tokens | 0 |
| estimated cost | `$0.1083978` |
| average estimated cost per validated card | `$0.00433591` |
| projected 500 cards | `$2.167955` |
| projected 1,000 cards | `$4.33591` |
| projected full eligible catalog, 53,227 cards | `$230.78748157` |

The configured run ceiling was `$0.25` and `25` cards. The run did not stop before the next call.

## Boundary Proof

Artifact:

```text
docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/dry_run_no_db_write_readback.json
```

Readback result:

| Check | Count |
| --- | ---: |
| `card_visual_description_runs` rows for run key | 0 |
| `card_print_visual_descriptions` rows in run window for agent/model/prompt | 0 |

No approvals, embeddings, app-facing reads, or downstream integrations were performed.

## Row-Status Review

First-pass review artifact:

```text
docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/first_pass_review_buckets.json
```

Review standard:

This gate used the practical row-status trust boundary. It did not require every problematic phrase inside an already blocked row to receive a perfect individual flag.

Image review limitation:

Self-hosted image keys were present in generated outputs, but matching local image files were not found in the active checkout or `C:/grookai_vault` during this review. The first-pass review used generated payloads, canonical names, branches, statuses, and deterministic flags.

| Bucket | Count |
| --- | ---: |
| correctly left pending | 2 |
| correctly flagged needs_review | 23 |
| false positives | 0 |
| status-level false negatives | 0 |
| materially flawed pending rows | 0 |

Pending rows:

- `GV-PK-JPN-M5-096` - Mega Zeraora ex
- `GV-PK-JPN-M5-111` - Gwynn

Both pending rows were judged safe at row-status level for later human approval consideration.

## Lock Criteria

| Criterion | Result |
| --- | --- |
| `25/25` validated | pass |
| all five branches correctly routed | pass |
| no materially flawed description remains pending | pass |
| pending rows safe for later human approval | pass |
| no clean row forced to review without defensible reason | pass |
| subject identity and anatomy status safe | pass in payload review |
| physical card-surface claims review-routed | pass |
| no database writes, approvals, or embeddings | pass |

## Decision

Visual Language V1 is locked at the row-status trust boundary.

The validator is not expected to perfectly classify every phrase inside already blocked rows. Its job at this gate is to ensure generated rows are either safe as `pending` for later human approval consideration or safely routed to `needs_review`.

This sample met that standard.

## Exact Next Gate

Move to a bounded database apply batch.

Recommended apply gate:

- same frozen code lineage
- small bounded apply batch only
- `--max-cards=25`
- `--max-run-cost-usd=0.25`
- no approvals
- no embeddings
- no semantic search
- no app-facing reads
- no Taste Engine, Listing Resolver, or Grookai Signature integration
- verify run rows and description rows by DB readback
- verify all generated rows remain `pending` or `needs_review`, never `approved`

Stop after the bounded apply readback and checkpoint.
