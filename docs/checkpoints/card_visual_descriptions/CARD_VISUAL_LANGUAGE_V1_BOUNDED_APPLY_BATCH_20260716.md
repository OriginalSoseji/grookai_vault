# CARD_VISUAL_LANGUAGE_V1_BOUNDED_APPLY_BATCH_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

Visual Language V1 was locked after the final branch-stratified 25-card dry run passed at the row-status trust boundary with `25/25` validated outputs, `0` false positives, `0` status-level false negatives, no database writes, no approvals, and no embeddings.

The approved next gate was a bounded database apply batch with maximum `25` cards, maximum `$0.25`, no approvals, no embeddings, no public reads, and full DB readback.

## Problem

The project needed to prove that locked Visual Language V1 behavior could safely write a small private batch to the database while preserving review status boundaries, telemetry reconciliation, and canonical identity separation.

## Risk

The apply path could have approved generated rows, overwritten an existing approved/current human-reviewed row, created embeddings before review, drifted from the dry-run plan, or written rows that did not reconcile with artifacts and cost telemetry.

## Decision

Run one bounded branch-stratified apply batch only, using the same locked code lineage, with `--max-cards=25` and `--max-run-cost-usd=0.25`. Stop after DB readback, tests, report, and checkpoint.

## Alternatives Rejected

- Larger apply batch: rejected because the first database population gate should be bounded.
- Auto-approve generated rows: rejected because all generated descriptions remain derived intelligence requiring human review.
- Generate embeddings immediately: rejected because unreviewed descriptions must not feed semantic search.
- Use `--force-version`: rejected because existing approved/current human-reviewed rows must not be overwritten.
- Patch during or after apply before readback: rejected because this gate needed frozen behavior evidence.
- Integrate Taste Engine, Listing Resolver, or Grookai Signature: rejected as later projects.

## Migration Applied

No new migration was applied in this gate. The existing applied migration remained the active schema:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

The bounded apply wrote to `public.card_visual_description_runs` and `public.card_print_visual_descriptions` using that private visual-description schema.

## One-Card Apply Proof

The prior one-card apply proof remains valid and was not repeated in this gate. This gate supersedes it operationally by proving a bounded 25-card private apply with DB readback.

## Current Truths

- Frozen commit at run start: `c28e0bc0d615cedea5758a2af6d2ccff02442e74`.
- Run key: `fede8846074f414722b0a967e52fff7ba1eaeee18d2fe4bea6c8686f9712f1c8`.
- Run ID: `3e7f390a-e372-41ac-be73-b33e94918a8b`.
- Validated count: `25/25`.
- Description rows written: `25`.
- Review statuses: `22 needs_review`, `3 pending`, `0 approved`.
- Branch coverage was exact: `5` Pokemon, `5` Trainer, `5` Stadium, `5` Energy, and `5` Item / Tool / Supporter.
- DB readback reconciled all generated outputs to database rows: `true`.
- Artifact hashes reconciled with the run row: `true`.
- Embedding boundary preserved: `true`.
- No approvals, embeddings, semantic search, public/app-facing reads, Taste Engine integration, Listing Resolver integration, or Grookai Signature integration were performed.

## Token And Cost Result

- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9974`
- total tokens: `692102`
- cached input tokens: `0`
- reasoning output tokens: `0`
- estimated cost: `$0.1083036`
- average estimated cost per validated card: `$0.00433214`
- projected 500-card cost: `$2.16607`
- projected 1,000-card cost: `$4.33214`
- projected full eligible catalog cost, 53227 cards: `$230.58681578`

## Invariants

- Every written description is `pending` or `needs_review`.
- No written description is `approved`.
- No existing approved/current human-reviewed row was overwritten.
- Written row count matches generated outputs.
- Run telemetry reconciles with the run row.
- Artifact hashes reconcile with the run row.
- Generated fingerprints reconcile with database rows.
- Embedding fields remain null on the written visual-description rows.
- No `card_embeddings` rows exist for the written card prints.
- Canonical `card_prints` identity rows were not mutated.

## Why The Visual Layer Remains Derived Intelligence

The visual layer records model-generated observations, semantic tags, visual attributes, quality flags, policy results, usage, and review state. It can help future matching after review, but it does not define canonical card identity, printing truth, rarity, pricing, finish, lore, market value, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not overwrite existing approved/current human-reviewed rows without an explicit later force-version gate.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in public or app-facing surfaces.
- Do not treat illustrated material as physical card finish.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.
- Keep usage and cost telemetry attached to every future generated row.

## Tests And Readbacks

- Bounded apply execution: pass, `25/25` validated and `25` rows inserted.
- DB apply readback: pass, all required invariants true.
- Embedding boundary readback: pass, no embedding fields or `card_embeddings` rows for written cards.
- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `29/29`.
- `git diff --check` - pass.
- Full repository contract suite was not run for this isolated bounded Node/database gate.

## Artifacts

- Run directory: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f`
- Summary: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/summary.json`
- Generated outputs: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/generated_outputs.jsonl`
- DB apply readback: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/db_apply_readback.json`
- Embedding boundary readback: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/embedding_boundary_readback.json`
- Command metadata: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/command_metadata.json`
- Row status summary: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/apply_row_status_summary.json`
- Descriptions: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/CARD_VISUAL_LANGUAGE_V1_BOUNDED_APPLY_BATCH_DESCRIPTIONS.md`
- Report: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/VISUAL_LANGUAGE_V1_BOUNDED_APPLY_BATCH_REPORT.md`
- Test output: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/targeted_test_output.txt`
- Diff check output: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/diff_check_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_bounded_apply_batch/2026-07-16T22-12-37-388Z_apply_fede8846074f/permanent_artifact_hashes.json`

## Explicit Next Gate

Human review of the 25 written rows in an admin/review context. Do not approve rows, generate embeddings, expose app-facing reads, build semantic search, or integrate downstream systems until that review gate explicitly accepts a bounded next action.
