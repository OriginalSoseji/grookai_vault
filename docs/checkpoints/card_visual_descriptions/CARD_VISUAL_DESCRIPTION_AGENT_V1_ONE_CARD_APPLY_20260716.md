# CARD_VISUAL_DESCRIPTION_AGENT_V1_ONE_CARD_APPLY_20260716

Date: 2026-07-16

Status: COMPLETE_ONE_CARD_APPLY_GATE

Branch: `feature/card-visual-description-agent`

Commit at checkpoint: `312c74bbf592b3fc232d2a1429654678007e894d`

## Context

The Canonical Card Visual Description Agent V1 creates detailed, blind-person-style descriptions for canonical card artwork. The output is private, review-gated, derived intelligence for matching, future semantic search, and later personalization work.

The approved gated phase was to apply only `20260715120000_card_visual_description_agent_v1.sql`, verify schema/security, run exactly one real OpenAI-backed description apply, read the rows back, prove the row stayed non-approved, and stop before any production sample or downstream integration.

## Problem

Earlier gates were blocked by migration ledger drift. That drift was resolved before this checkpoint:

- 12 schema-present/superseded local-only IDs were repaired after explicit approval.
- `20260523183000_printing_truth_review_sidecar_v1.sql` was applied.
- `20260713190000_trust_safety_block_report_v1.sql` was applied.
- `20260715120000_card_visual_description_agent_v1.sql` became the only remaining local-only migration.

The one-card apply also initially failed before any model call because Node's bundled CA store could not verify the TCGCollector image host. The successful proof used `NODE_OPTIONS=--use-system-ca`, preserving TLS verification while using the Windows system certificate store.

## Risk

The main risks were:

- breaking migration history cleanliness
- exposing generated descriptions to app roles too early
- letting model output become canonical identity authority
- accidentally approving a generated row
- generating embeddings or starting semantic search before the review boundary is proven
- processing more than the one-card gate

## Decision

Proceed with the isolated card visual migration after strict prepush passed with only `20260715120000` expected.

Use the existing agent with:

- `--apply`
- `--provider=openai`
- `--model=gpt-4o-mini`
- `--limit=1`
- `--max-cards=1`
- `--max-run-cost-usd=0.01`
- `--image-detail=high`
- `--max-retries=0`

Keep the generated row `pending`; do not approve it.

## Alternatives Rejected

- Skipping the two earlier schema-absent migrations: rejected because clean migration history was required before this migration.
- Applying schema outside Supabase migration governance: rejected because it would break auditability.
- Disabling TLS verification for image fetch: rejected because the Windows system CA store fixed the issue without weakening TLS.
- Running a 25-card sample after the one-card success: rejected because this gate explicitly stops after one real apply.
- Generating embeddings now: rejected because embeddings are a later gate after review quality is accepted.
- Exposing the visual description layer in app-facing views: rejected because the layer remains private derived intelligence.

## Migration Applied

Applied migration:

```text
20260715120000_card_visual_description_agent_v1.sql
```

Apply artifact:

```text
docs/audits/card_visual_description_apply_gate_v1/2026-07-16Tcard_visual_schema_apply_one_card/04_supabase_db_push_card_visual_output.txt
```

Post-apply migration ledger:

- remote-only IDs: none
- local-only IDs: none
- strict prepush after apply: passed with expected pending set `none`

Post-apply strict prepush proof:

```text
docs/audits/card_visual_description_apply_gate_v1/2026-07-16Tcard_visual_schema_apply_one_card/17_strict_prepush_no_pending_after_empty_set_fix.txt
```

The strict linked schema diff audit was also run, but it failed because of broad pre-existing remote/local schema drift unrelated to this migration. That output is preserved and must not be treated as a card visual migration failure.

## One-Card Apply Proof

Selected card:

- name: `Mega Chandelure ex`
- GV-ID: `GV-PK-JPN-M5-113`
- set code: `jpn-m5`
- number: `113`
- card_print_id: `2412563a-c73d-5970-a389-f4c1dc35d8c6`

Successful run:

- run key: `784c680b0d1f30269a89d2973408dece9f9b06beca7ffe614621f8ef75413292`
- run row id: `31bd79dc-8e5e-4ad7-acda-896ae05bab38`
- description row id: `6723bfa5-f20a-409b-a191-a31c8e9af76a`
- artifact directory: `docs/audits/card_visual_descriptions/2026-07-16T02-37-43-986Z_apply_784c680b0d1f`

DB readback proved:

- target run rows: `1`
- target description rows: `1`
- total description rows in the new table: `1`
- review status: `pending`
- approved descriptions for target run: `0`
- current descriptions for target card: `1`
- embedded descriptions for target run: `0`
- `approved_at`, `approved_by`, `embedding`, `embedding_model`, `embedding_dimensions`, and `embedded_at` all remained null

## Current Truths

- The migration is applied remotely and recorded in the linked migration ledger.
- The feature worktree has no remaining local-only migrations after the apply.
- The new tables are private service-role tables.
- RLS is enabled on both new tables.
- `anon` and `authenticated` have no privileges on the new tables.
- No app-facing views reference the new visual description tables.
- `card_prints` has no visual, semantic, description, or embedding columns added by this work.
- Exactly one OpenAI-backed description row exists in `card_print_visual_descriptions`.
- One earlier apply-mode run exists with zero validated rows due to an image TLS failure before any model call; it inserted no description and cost `$0`.
- A pre-commit shipcheck attempt failed later at the existing `apps/web` typecheck phase; this did not invalidate the isolated Node/database gate, and Flutter did not run.

## Invariants

Required invariants held:

- no canonical `card_prints` mutation by the worker
- no automatic approval
- no embeddings generated
- no semantic search built
- no Taste Engine integration
- no Listing Resolver integration
- no 25-card production sample
- no unattended timer
- no app-facing exposure

Schema/security verification passed for:

- `card_visual_description_runs`
- `card_print_visual_descriptions`
- expected indexes
- expected triggers
- expected constraints
- RLS enabled
- zero `anon`/`authenticated` grants
- service-role access present

## Token And Cost Result

Successful one-card OpenAI apply:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `1`
- retry count: `0`
- input tokens: `9022`
- output tokens: `297`
- total tokens: `9319`
- cached input tokens: `0`
- reasoning output tokens: `0`
- estimated cost: `$0.0015315`

Pricing snapshot:

- input per million: `$0.15`
- output per million: `$0.60`
- cached input per million: `$0.075`
- image cost rule version: `gpt-4o-mini-standard-2026-07-15`
- source: `cli_or_environment`

Projected from the one-card apply:

- estimated cost per validated card: `$0.0015315`
- projected 500 cards: `$0.76575`
- projected 1,000 cards: `$1.5315`
- projected full eligible catalog, `53227` cards: `$81.5171505`

## Why The Visual Layer Remains Derived Intelligence

The visual description is model-generated evidence about an image. It can help matching, review, search, and future recommendation features, but it cannot decide identity truth.

It remains derived intelligence because:

- representative images can differ from exact physical variants
- model descriptions can be wrong or over-specific
- semantic tags are retrieval aids, not canonical facts
- review status must gate product trust
- canonical identity remains owned by the existing card identity system

## What Must Never Be Broken

- Do not mutate `card_prints`, GV-ID assignment, canonical identity, image truth, pricing, vault, or app-facing views/functions from this worker.
- Do not approve generated descriptions automatically.
- Do not expose generated descriptions to users without an explicit product gate.
- Do not generate embeddings until the review boundary and quality gate approve it.
- Do not run a 25-card production sample without an explicit next-gate approval.
- Do not integrate Taste Engine, Listing Resolver, or Grookai Signature in this v1 apply gate.
- Do not use visual descriptions as canonical identity authority.

## Explicit Next Gate

Human-review the one generated `pending` description for `GV-PK-JPN-M5-113`.

If quality is accepted, the next gated execution may be a bounded 25-card OpenAI production sample with:

- explicit cost ceiling
- actual token/cost telemetry
- no automatic approval
- no embeddings
- no app-facing exposure
- no Taste Engine, Listing Resolver, or Grookai Signature integration

Stop again after that bounded sample and quality/cost review.
