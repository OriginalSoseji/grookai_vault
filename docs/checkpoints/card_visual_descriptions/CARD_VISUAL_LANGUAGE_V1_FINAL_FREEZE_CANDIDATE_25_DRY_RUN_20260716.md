# CARD_VISUAL_LANGUAGE_V1_FINAL_FREEZE_CANDIDATE_25_DRY_RUN_20260716

Status: COMPLETE - FREEZE CANDIDATE FAILED

Date: 2026-07-16

## Context

The freeze-candidate deterministic repair passed targeted fixtures and offline replay. The accepted next gate was one final branch-stratified 25-card OpenAI dry run, no database writes, no approvals, no embeddings, and no downstream integrations.

## Problem

The final freeze candidate needed to prove that Visual Language V1 could safely proceed toward a bounded apply batch.

## Risk

If `pending` rows still contain unsupported personality, mood, action, material, or interpretation claims, those descriptions are not safe to apply or use downstream without additional review routing.

## Decision

Do not freeze Visual Language V1 yet. Stop after the dry run, report, checkpoint, tests, and hashes.

The run validated operationally, but strict first-pass review found `5` status-level false negatives, exceeding the `0-1` threshold.

## Alternatives Rejected

- Freeze Visual Language V1: rejected because false negatives remain above threshold.
- Database apply: rejected because unflagged status-level issues remain in pending rows.
- Another exact-phrase patch as the only repair: rejected because the miss pattern has moved to field-level claim classes.
- Embeddings and semantic search: rejected because unapproved descriptions remain private derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied in this gate.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## One-Card Apply Proof

No one-card apply was performed in this gate. The prior one-card apply proof remains the latest real database apply proof for this project, and this gate intentionally preserved the no-write dry-run boundary.

Current no-write proof is:

```text
docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/dry_run_no_db_write_readback.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly five rows per branch.
- `25` rows validated.
- `0` rows failed.
- `0` rows skipped.
- `20` rows were routed to `needs_review`.
- `5` rows remained `pending`.
- Strict first-pass review found `0` status-level false positives.
- Strict first-pass review found `5` status-level false negatives.
- `0` database run rows were written for the dry-run key.
- `0` visual description rows were written during the run window for this agent/model/prompt.
- The dry run used self-hosted image paths from `warehouse-derived/self-hosted-images-v1`.
- Visual Language V1 is not frozen.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `682128`
- output tokens: `9701`
- total tokens: `691829`
- cached input tokens: `0`
- estimated cost: `$0.1081398`
- average cost per validated description: `$0.00432559`
- projected 500 cards: `$2.162795`
- projected 1,000 cards: `$4.32559`
- projected full eligible catalog: `$230.23817893`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.
- Do not patch deterministic rules midway through a sample used for evaluation.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, attributes, flags, and confidence data. It can support future matching and semantic retrieval after review, but it does not define card identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not run more OpenAI samples to compensate for known deterministic review gaps.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Tests

- `node --check backend\card_descriptions\card_visual_description_agent_v1.mjs` - pass.
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `26/26`.
- Full repository contract suite was not run for this isolated dry-run gate.

## Artifacts

- Report: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/VISUAL_LANGUAGE_V1_FINAL_FREEZE_CANDIDATE_25_DRY_RUN_REPORT.md`
- Description packet: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/CARD_VISUAL_LANGUAGE_V1_FINAL_FREEZE_CANDIDATE_25_DESCRIPTIONS.md`
- Summary: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/summary.json`
- Generated outputs: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/generated_outputs.jsonl`
- No-write readback: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/dry_run_no_db_write_readback.json`
- Command metadata: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/2026-07-16T19-18-32-732Z_dry_run_10c9e7d1ed82/command_metadata.json`
- Test output: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/targeted_test_output.txt`
- Hashes: `docs/audits/card_visual_language_v1_final_freeze_candidate_25_dry_run/permanent_artifact_hashes.json`

## Explicit Next Gate

Implement a field-aware review policy repair rather than another exact-phrase patch.

Required scope:

- branch-specific allowed vocabulary for `visual_attributes.mood`
- relationship-aware checks for personality/expression claims in Pokemon and Trainer descriptions
- action/event interpretation checks for Item/Object outputs
- Energy branch checks for force/purpose/theme language
- type-like visual claim checks when wording appears to derive from canonical metadata rather than visible artwork

Run targeted fixture and contract tests only. Do not run another OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until that repair gate is accepted.
