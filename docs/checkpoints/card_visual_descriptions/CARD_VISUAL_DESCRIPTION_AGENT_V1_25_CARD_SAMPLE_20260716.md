# CARD_VISUAL_DESCRIPTION_AGENT_V1_25_CARD_SAMPLE_20260716

Date: 2026-07-16

Status: COMPLETE_25_CARD_SAMPLE_GATE

Branch: `feature/card-visual-description-agent`

Commit for this gate: recorded in the final Codex response.

## Context

The Canonical Card Visual Description Agent V1 creates detailed, blind-person-style card artwork descriptions as private, review-gated, derived intelligence.

The one-card database apply gate had already proven the schema, RLS posture, OpenAI provider path, cost telemetry, and non-approved review workflow. Prompt V5 was accepted for a bounded 25-card sample after adding explicit character-first and face/feature-location instructions.

## Problem

The next gate needed real diversity: Pokemon, trainer, special art, vintage, modern, energy/stadium-like cards, and self-hosted canonical images.

The first exact-list 25-card apply exposed two operational issues:

- TCGdex URLs without file extensions needed the same `/high.webp` normalization used by the web app.
- Self-hosted canonical images were being fetched as public storage HTTP URLs, causing `image_http_400`, even though Grookai owns the storage paths and API routes already resolve them server-side.

## Risk

The main risks were:

- spending model calls before measuring actual usage
- replacing self-hosted cards with easier public-image cards, reducing sample value
- exposing generated visual intelligence to app users too early
- treating generated prose as canonical identity or image truth
- auto-approving rows
- generating embeddings before review quality was accepted
- silently breaking RLS or app-facing boundaries

## Decision

Proceed with the same diverse 25-card sample, but repair the worker image resolver before completing the run.

The worker now resolves canonical self-hosted images directly from Supabase storage using the same constrained warehouse prefixes as the app image API:

- `warehouse-derived/self-hosted-images-v1/`
- `warehouse-derived/image-truth-v1/`

The worker requires `image_source = identity` before using those storage paths and downloads only from bucket `user-card-images`.

## Alternatives Rejected

- Replacing self-hosted sample cards with public HTTP cards: rejected because it would avoid the real Grookai image path and weaken the sample.
- Calling the Next web API from the worker: rejected because the audit worker should not require a running app server when it can apply the same constrained storage rule directly.
- Making arbitrary storage paths readable: rejected because only canonical warehouse prefixes are allowed.
- Approving generated rows automatically: rejected because human review remains the quality gate.
- Generating embeddings after the 25-card run: rejected because semantic search is a later gate.
- Exposing visual descriptions in app-facing views: rejected because the layer remains private derived intelligence.

## Migration Applied

No new migration was created or applied in this 25-card sample gate.

The existing applied migration remains:

```text
20260715120000_card_visual_description_agent_v1.sql
```

Schema/RLS/grants were re-read from the database after the 25-card sample.

## Apply Proof

The sample used a preselected diverse 25-card manifest:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/03_diverse_sample_manifest.json
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/04_diverse_sample_ids.txt
```

Initial exact-list apply:

- run key: `ca1c3bd33785259e20d708b0fb933b13af00fddbfb0e91f8c1115222419d9e5f`
- validated: `3`
- failed: `1`
- skipped: `21`
- inserted: `3`

Final remaining 22-card apply after storage resolver repair:

- run key: `12bc4fc1b986107daea29ee9b445e46150a148bc0e308432499a0f24141a8df3`
- validated: `22`
- failed: `0`
- skipped: `0`
- inserted: `22`

DB readback proved:

- current rows for sample: `25`
- status counts: `24 pending`, `1 needs_review`
- approved rows: `0`
- embedding rows: `0`
- `image_path` rows: `22`
- `image_url` rows: `3`

## Current Truths

- Prompt V5 is the active prompt for the sample.
- The 25-card sample exists as private current rows only.
- Generated rows remain review-gated and non-approved.
- `Fairy Garden` is current and `needs_review` because of `potential_overconfident_ambiguous_setting`.
- Self-hosted canonical image resolution works in the worker.
- The full eligible catalog from the unbiased plan is `53227` cards.
- The visual layer is still private derived intelligence.

## Invariants

Required invariants held:

- no canonical `card_prints` mutation by the worker
- no automatic approval
- no embeddings generated
- no semantic search generated
- no Taste Engine integration
- no Listing Resolver integration
- no Grookai Signature integration
- no public or app-facing read model integration
- no unauthenticated or authenticated table grants
- no new schema migration for this sample gate

## Token And Cost Result

Combined sample usage:

- model requested: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `26`
- retry count: `0`
- input tokens: `715573`
- output tokens: `12913`
- total tokens: `728486`
- estimated cost: `$0.11508375`

Average per validated description:

- input tokens: `28622.92`
- output tokens: `516.52`
- total tokens: `29139.44`
- estimated cost: `$0.00460335`

Projected costs:

- 500 cards: `$2.301675`
- 1,000 cards: `$4.60335`
- 53,227-card eligible catalog: `$245.02251045`

## Why The Visual Layer Remains Derived Intelligence

The model describes visible artwork and proposes semantic tags. It does not establish identity, printing truth, rarity truth, market truth, or user preference truth.

Its outputs can help matching, search, review, and later Grookai Signature work, but only after separate review and integration gates. Until then, visual descriptions are private annotations attached to canonical card rows, not canonical facts.

## What Must Never Be Broken

- Generated descriptions must not override canonical identity fields.
- Generated descriptions must not approve themselves.
- Generated descriptions must not become app-facing without a read-model and permission gate.
- Embeddings must not be generated until a later explicit semantic-search gate.
- Self-hosted image access must remain constrained to canonical warehouse prefixes.
- Cost telemetry must remain recorded per card and per run.
- Failed or skipped cards must be visible in artifacts.

## Evidence

Final report:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/CARD_VISUAL_DESCRIPTION_25_CARD_SAMPLE_REPORT.md
```

DB/RLS/boundary readback:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/10_prompt_v5_25_db_rls_boundary_readback.json
```

Focused test outputs:

```text
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/11_node_check_output.txt
docs/audits/card_visual_description_25_card_sample_v1/2026-07-16Tprompt_v5_25_apply/12_card_visual_contract_test_output.txt
```

## Explicit Next Gate

Human-review the 25 generated current rows.

Do not approve rows, generate embeddings, build semantic search, expose app-facing reads, or integrate Grookai Signature until that review gate explicitly accepts quality and chooses the next bounded action.
