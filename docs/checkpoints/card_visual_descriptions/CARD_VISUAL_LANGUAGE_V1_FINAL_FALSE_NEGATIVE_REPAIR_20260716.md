# CARD_VISUAL_LANGUAGE_V1_FINAL_FALSE_NEGATIVE_REPAIR_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The claim-class 25-card dry run reduced first-pass status-level false negatives from `7` to `3` with `0` first-pass false positives.

The accepted next gate was a narrow deterministic repair with fixture/contract validation only.

## Problem

Three pending rows still contained unsupported claims:

- Mega Excadrill action/personality language
- Gladion body-language/personality language
- Basic Grass Energy purpose/theme language

There were also two surface phrases and one raw model quality phrase that needed targeted handling.

## Risk

If these phrases remain unflagged, a visually fluent description can still remain `pending` while carrying unsupported action, personality, purpose, or physical-surface claims.

## Decision

Implement only the three narrow repair families and targeted cleanup.

Stop after targeted validation.

Do not run another OpenAI sample or apply rows in this gate.

## Alternatives Rejected

- Broad banned-word expansion: rejected to preserve the prior `0` false-positive result.
- Prompt rewrite: rejected because the remaining failures are narrow validator misses.
- Another immediate OpenAI sample: rejected because known validator misses should be repaired first.
- Database apply: rejected because the previous run still had `3` false negatives.
- Embeddings and semantic search: rejected because outputs remain private derived intelligence.

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
docs/audits/card_visual_language_v1_final_false_negative_repair/VISUAL_LANGUAGE_V1_FINAL_FALSE_NEGATIVE_REPAIR_REPORT.md
```

## Current Truths

- The `3` claim-class dry-run false-negative families now have targeted deterministic coverage.
- `foil treatment is present` and `card surface quality appears clear` now route to review as surface overclaims.
- `glare prevents determination` is ignored as a standalone raw model quality flag.
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
- targeted contract suite passed: `25/25`
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

Human review this final false-negative repair.

If accepted, run one final branch-stratified 25-card OpenAI dry run as the Visual Language V1 freeze candidate.

The freeze-candidate target is:

- `25/25` validated
- `0` false positives
- `0-1` false negatives
- all branches resolved correctly
- no subject-identity failures
- no unflagged physical-surface claims
- no database writes

Do not apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, process production cards, or integrate Grookai Signature until a later gate explicitly approves it.
