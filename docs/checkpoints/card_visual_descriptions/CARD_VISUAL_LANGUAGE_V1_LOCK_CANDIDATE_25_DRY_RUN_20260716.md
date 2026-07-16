# CARD_VISUAL_LANGUAGE_V1_LOCK_CANDIDATE_25_DRY_RUN_20260716

Status: COMPLETE - VISUAL LANGUAGE V1 LOCKED

Date: 2026-07-16

## Context

The field-aware final repair was approved after offline replay cleared the prior likely false positive, routed both status-level false negatives to `needs_review`, preserved the known clean pending row, and passed `29/29` targeted contract tests.

The approved next gate was one final branch-stratified 25-card OpenAI dry run with code frozen for the full sample.

## Problem

The project needed one final lock candidate to determine whether Visual Language V1 was safe enough to move from prompt/validator tuning into a bounded database apply batch.

## Risk

If the system were locked too early, materially flawed descriptions could remain `pending`, clean rows could be forced into review without defensible reason, or unreviewed physical card-surface claims could leak into the apply lane.

## Decision

Run the final 25-card dry run and evaluate only the row-status trust boundary.

Do not patch during the sample.

## Alternatives Rejected

- Require every phrase inside already blocked rows to have a perfect flag: rejected because it would turn the validator into an endless language-classification project.
- Patch during the sample: rejected because it would invalidate the gate.
- Run a larger sample before lock: rejected because the controlled branch-stratified sample was the agreed freeze gate.
- Database apply during the dry run: rejected because lock and apply are separate gates.
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

- Code was frozen at commit `04cac33f736c0ad00ec8f135a041f625d1a90820` for the run.
- The dry run validated `25/25` rows.
- Branch coverage was exact: `5` Pokemon, `5` Trainer, `5` Stadium, `5` Energy, and `5` Item / Tool / Supporter.
- Review statuses were `23 needs_review` and `2 pending`.
- The two pending rows were `GV-PK-JPN-M5-096` and `GV-PK-JPN-M5-111`.
- First-pass row-status review found `0` false positives and `0` status-level false negatives.
- Database readback proved `0` run rows and `0` description rows were written for this run.
- Visual Language V1 is locked at the row-status trust boundary.

## Token And Cost Result

- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `10131`
- total tokens: `692259`
- cached input tokens: `0`
- reasoning output tokens: `0`
- estimated cost: `$0.1083978`
- average estimated cost per validated card: `$0.00433591`
- projected 500-card cost: `$2.167955`
- projected 1,000-card cost: `$4.33591`
- projected full eligible catalog cost, 53,227 cards: `$230.78748157`

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
- Do not reopen prompt architecture unless a future sample shows a true architectural failure.

## Tests And Readbacks

- Dry-run execution: pass, `25/25` validated.
- Dry-run DB boundary readback: pass, `0` run rows and `0` description rows written.
- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `29/29`.
- Full repository contract suite was not run for this isolated dry-run artifact gate.

## Artifacts

- Run directory: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a`
- Summary: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/summary.json`
- Generated outputs: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/generated_outputs.jsonl`
- Descriptions: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/CARD_VISUAL_LANGUAGE_V1_LOCK_CANDIDATE_25_DESCRIPTIONS.md`
- First-pass review buckets: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/first_pass_review_buckets.json`
- Dry-run DB boundary readback: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/dry_run_no_db_write_readback.json`
- Report: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/VISUAL_LANGUAGE_V1_LOCK_CANDIDATE_25_DRY_RUN_REPORT.md`
- Hashes: `docs/audits/card_visual_language_v1_lock_candidate_25_dry_run/2026-07-16T21-56-41-706Z_dry_run_5f2db4471e5a/permanent_artifact_hashes.json`

## Explicit Next Gate

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
