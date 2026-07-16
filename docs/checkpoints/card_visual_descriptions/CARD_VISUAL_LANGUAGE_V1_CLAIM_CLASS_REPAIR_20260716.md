# CARD_VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The broad-family 25-card dry run proved the validator now routes many known language problems, but first-pass review still found `7` status-level false negatives.

The accepted next gate was a narrow deterministic repair with fixture/contract validation only.

## Problem

Remaining failures were not prompt architecture failures. They were truthfulness and relationship-check gaps:

- visual material versus physical card surface confusion
- canonical metadata leaking into visual output
- unsupported personality and mood claims
- cross-field expression contradictions
- subject anatomy overclaims
- abstract Energy shapes literalized as scenes or creatures
- purpose, lore, or thematic interpretation

## Risk

If these claims remain unflagged, generated descriptions can look polished while still encoding unsupported subject truth, metadata, or material assumptions.

This risk is higher than ordinary wording drift because it can corrupt review confidence before semantic search or matching ever exists.

## Decision

Implement claim-class deterministic review checks.

Stop after targeted contract validation.

Do not run another OpenAI sample or apply rows in this gate.

## Alternatives Rejected

- Prompt rewrite: rejected because the branch architecture and prompt are stable enough; the missing behavior is deterministic review enforcement.
- Another immediate OpenAI sample: rejected because known validator misses should be repaired before sampling again.
- Database apply: rejected because the previous run still had `7` false negatives.
- Embeddings and semantic search: rejected because outputs remain private derived intelligence.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later gates.

## Migration Applied

No migration was applied.

Existing migration remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Implementation

Code:

```text
backend/card_descriptions/card_visual_description_agent_v1.mjs
```

Tests:

```text
tests/contracts/card_visual_description_agent_v1.test.mjs
```

Audit report:

```text
docs/audits/card_visual_language_v1_claim_class_repair/VISUAL_LANGUAGE_V1_CLAIM_CLASS_REPAIR_REPORT.md
```

## Current Truths

- Claim-class review flags were added or strengthened.
- Partial canonical identity tags such as `Mega Excadrill` now route to review.
- Non-hyphen type metadata such as `electric type` now routes to review.
- Material and finish variants such as `glossy finish`, `shiny finish`, `smooth and reflective`, `reflective dark orb`, `matte textures`, and `uniform finish` now route to review.
- Cross-field face/expression contradictions now route to review.
- Energy branch literalization such as `night cityscape`, `buildings`, and `leaf-shaped object` now routes to review.
- Objective Energy wording such as `energy symbol`, `abstract energy`, and `radiating lines` remains allowed.
- No OpenAI call was made.
- No database write was made.

## Token And Cost Result

- request count: `0`
- retry count: `0`
- input tokens: `0`
- output tokens: `0`
- total tokens: `0`
- estimated cost: `$0`

## Validation

Commands run:

```text
node --check backend\card_descriptions\card_visual_description_agent_v1.mjs
node --test tests\contracts\card_visual_description_agent_v1.test.mjs
git diff --check
```

Results:

- syntax check passed
- targeted contract suite passed: `23/23`
- whitespace check passed

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- Review flags route human review; they do not approve rows.
- No generated row may become approved without human review.
- No embeddings may be generated from unreviewed output.
- No unreviewed visual description may become app-facing.
- Generated descriptions must not mutate `card_prints`.
- Physical card finish must not be inferred from illustrated object material.
- Deterministic repairs must be validated before another OpenAI sample.

## Why The Visual Layer Remains Derived Intelligence

The visual layer observes artwork and produces reviewable descriptions, tags, and attributes. It can support matching and future semantic retrieval after review, but it does not define identity, printing truth, finish, rarity, pricing, lore, or collector taste.

## What Must Never Be Broken

- Do not let generated descriptions override canonical identity.
- Do not approve generated rows automatically.
- Do not treat object material as physical card finish.
- Do not generate embeddings from unreviewed descriptions.
- Do not expose unreviewed descriptions in app-facing surfaces.
- Do not run more OpenAI samples to compensate for known deterministic review gaps.
- Do not integrate Grookai Signature, Taste Engine, or Listing Resolver from this lane yet.

## Explicit Next Gate

Human review this claim-class deterministic repair.

If accepted, run one branch-stratified 25-card OpenAI dry run with:

- no database writes
- no approvals
- no embeddings
- no semantic search
- no downstream integrations
- the same four-bucket final report structure

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until a later gate explicitly approves it.
