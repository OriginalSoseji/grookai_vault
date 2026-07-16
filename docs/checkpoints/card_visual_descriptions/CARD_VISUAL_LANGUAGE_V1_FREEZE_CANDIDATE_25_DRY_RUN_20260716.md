# CARD_VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_25_DRY_RUN_20260716

Status: COMPLETE - FREEZE CANDIDATE FAILED

Date: 2026-07-16

## Context

The final false-negative repair passed targeted fixtures. The accepted next gate was one branch-stratified 25-card OpenAI dry run, no database writes, no approvals, no embeddings, and no downstream integrations, to determine whether Visual Language V1 could be frozen.

## Problem

The freeze candidate needed to prove that the deterministic review layer catches remaining status-level issues without becoming noisy across Pokemon, Trainer, Stadium, Energy, and Item / Tool / Supporter branches.

## Risk

If `pending` rows still contain unsupported subject, action, personality, mood, or material claims, the system cannot safely proceed to a bounded apply batch. The risk is not operational failure; it is unreviewed visual output being treated as reliable derived intelligence.

## Decision

Do not freeze Visual Language V1 yet. Stop after the dry run, report, checkpoint, and tests.

The run validated operationally, but first-pass review found `4` status-level false negatives, which exceeds the freeze threshold.

## Alternatives Rejected

- Freeze Visual Language V1: rejected because false negatives remain above threshold.
- Database apply: rejected because unflagged status-level issues remain in pending rows.
- Another immediate OpenAI sample: rejected because known deterministic review gaps should be repaired before spending another sample.
- Prompt rewrite: rejected because the misses are narrow enforcement gaps, not architectural prompt failures.
- Embeddings and semantic search: rejected because unapproved descriptions remain private derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied in this gate.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## One-Card Apply Proof

No one-card apply was performed in this freeze-candidate gate. The prior one-card apply proof remains the latest real database apply proof for this project, and this gate intentionally preserved the no-write dry-run boundary.

Current no-write proof is:

```text
docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/dry_run_no_db_write_readback.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly five rows per branch.
- `25` rows validated.
- `0` rows failed.
- `0` rows skipped.
- `18` rows were routed to `needs_review`.
- `7` rows remained `pending`.
- First-pass review found `0` status-level false positives.
- First-pass review found `4` status-level false negatives.
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
- output tokens: `10018`
- total tokens: `692146`
- cached input tokens: `0`
- estimated cost: `$0.10833`
- average cost per validated description: `$0.0043332`
- projected 500 cards: `$2.1666`
- projected 1,000 cards: `$4.3332`
- projected full eligible catalog: `$230.6432364`

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
- `node --test tests\contracts\card_visual_description_agent_v1.test.mjs` - pass, `25/25`.
- `git diff --check` - pass.
- Full repository contract suite was not run for this isolated dry-run gate.

## Artifacts

- Report: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_25_DRY_RUN_REPORT.md`
- Description packet: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/CARD_VISUAL_LANGUAGE_V1_FREEZE_CANDIDATE_25_DESCRIPTIONS.md`
- Summary: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/summary.json`
- Generated outputs: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/generated_outputs.jsonl`
- No-write readback: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/dry_run_no_db_write_readback.json`
- Command metadata: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/2026-07-16T18-47-35-745Z_dry_run_0cdc213cc749/command_metadata.json`
- Test output: `docs/audits/card_visual_language_v1_freeze_candidate_25_dry_run/targeted_test_output.txt`

## Explicit Next Gate

Implement one narrow deterministic repair for the remaining false-negative classes:

- Pokemon action/personality and mood overclaims, including aggressive/intimidating/readiness phrasing.
- Trainer body-language/personality claims across prose, mood, and semantic tags.
- Stadium interpretive mood/critique language such as awe, power, excitement, or ambiance claims not tied to visible features.
- Item/Object illustrated-material and action/mood drift, especially glossy/shiny object language and implied ignition/explosion state.

Run targeted fixture and contract tests only. Do not run another OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until that repair gate is accepted.
