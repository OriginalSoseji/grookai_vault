# CARD_VISUAL_LANGUAGE_V1_FIELD_AWARE_FINAL_25_DRY_RUN_20260716

Status: COMPLETE - FREEZE CANDIDATE FAILED

Date: 2026-07-16

## Context

The field-aware Visual Language policy repair was approved after offline replay proved `5/5` known false negatives now routed to `needs_review` and `3/3` clean pending rows remained pending.

The approved next gate was one final branch-stratified 25-card OpenAI dry run with current code frozen for the duration of the test.

## Problem

The run was needed to evaluate whether the repaired policy layer could meet the Visual Language V1 freeze criteria on fresh model outputs across Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter branches.

## Risk

If this gate were skipped, Visual Language V1 could be frozen while still allowing unsupported physical-surface claims, unsupported interpretive language, or noisy false positives into the review workflow.

## Decision

Run the final 25-card dry run and stop after review/report/checkpoint.

Do not repair during the run.

## Alternatives Rejected

- Patch during the sample: rejected because it would invalidate the gate.
- Run a larger sample: rejected because the lock candidate must first pass a controlled 25-card sample.
- Database apply: rejected because the freeze candidate had not passed quality lock.
- Embeddings, semantic search, Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## One-Card Apply Proof

No one-card apply was performed in this dry-run gate.

The prior one-card apply proof remains the latest real database apply proof for this project.

## Current Truths

- Code was frozen at commit `a85af90923f5a20ae6387696030c374da4d03399` for the run.
- The dry run validated `25/25` rows.
- Branch coverage was exact: `5` Pokemon, `5` Trainer, `5` Stadium, `5` Energy, and `5` Item / Tool / Supporter.
- Review statuses were `22 needs_review` and `3 pending`.
- Database readback proved `0` run rows and `0` description rows were written for this run.
- First-pass review found `1` correctly pending row, `21` correctly flagged `needs_review` rows, `1` likely false positive, and `2` status-level false negatives.
- First-pass review also found `3` flag-level false negatives inside already `needs_review` rows.
- The freeze lock failed.

## Token And Cost Result

- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9854`
- total tokens: `691982`
- cached input tokens: `0`
- reasoning output tokens: `0`
- estimated cost: `$0.1082316`
- average estimated cost per validated card: `$0.00432926`
- projected 500-card cost: `$2.16463`
- projected 1,000-card cost: `$4.32926`
- projected full eligible catalog cost, 53,227 cards: `$230.43352202`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.
- Claim review must consider field and support, not only raw phrase presence.
- Do not patch deterministic rules midway through a sample used for evaluation.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, attributes, flags, policy results, and confidence data. It can support future matching and semantic retrieval after review, but it does not define card identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.
- Do not collapse field-aware policy back into a flat phrase list.

## Tests And Readbacks

- Dry-run execution: pass, `25/25` validated.
- Dry-run DB boundary readback: pass, `0` run rows and `0` description rows written.
- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `28/28`.
- Full repository contract suite was not run for this isolated dry-run artifact gate.

## Artifacts

- Run directory: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803`
- Summary: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/summary.json`
- Generated outputs: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/generated_outputs.jsonl`
- Descriptions: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/CARD_VISUAL_LANGUAGE_V1_FIELD_AWARE_FINAL_25_DESCRIPTIONS.md`
- First-pass review buckets: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/first_pass_review_buckets.json`
- Dry-run DB boundary readback: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/dry_run_no_db_write_readback.json`
- Report: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/VISUAL_LANGUAGE_V1_FIELD_AWARE_FINAL_25_DRY_RUN_REPORT.md`
- Hashes: `docs/audits/card_visual_language_v1_field_aware_final_25_dry_run/2026-07-16T19-58-13-037Z_dry_run_024ea0f3b803/permanent_artifact_hashes.json`

## Explicit Next Gate

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
