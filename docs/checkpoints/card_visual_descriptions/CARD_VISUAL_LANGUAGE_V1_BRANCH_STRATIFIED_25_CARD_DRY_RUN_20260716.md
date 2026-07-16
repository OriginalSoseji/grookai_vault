# CARD_VISUAL_LANGUAGE_V1_BRANCH_STRATIFIED_25_CARD_DRY_RUN_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

The prior Visual Language V1 25-card dry run proved deterministic review flags were useful, but the sample collapsed into the Pokemon branch because most rows lacked usable card-type metadata.

The next gate was to add narrow deterministic repairs and run a branch-stratified OpenAI dry run only.

## Problem

Two risks had to be addressed before any apply:

- false negatives from narrow vocabulary gaps such as `evoke`, `symbolizing`, and surface overclaim phrasing
- branch-noise blindness caused by a 25-card sample that did not cover Trainer, Stadium, Energy, and Item / Tool / Supporter rows

## Risk

The main operational risk is letting plausible-looking descriptions pass schema validation while violating Grookai's Visual Language contract.

The main product risk is allowing the visual layer to drift into canonical identity, printing truth, or app-facing search before review gates prove quality.

## Decision

Implement only narrow enforcement and sampling repairs:

- expanded interpretive-claim detection
- expanded card-surface overclaim detection
- literal-star false-positive repair
- branch fallback cues for Trainer and Item / Tool / Supporter rows
- branch-stratified sample selection
- artifact telemetry for local TLS override
- clearer OpenAI transport error reporting

Then run one dry-run-only 25-card OpenAI sample with five rows per branch.

## Alternatives Rejected

- Prompt V7 rewrite: rejected because the issue is deterministic enforcement, not broad prompt architecture.
- Database apply: rejected because human review found four status-level false negatives.
- Embeddings and semantic search: rejected because output still needs review-gate repair.
- Taste Engine, Listing Resolver, and Grookai Signature integration: rejected as later product gates.
- Unattended batch processing: rejected because the review loop is still active.

## Migration Applied

No migration was applied in this checkpoint.

Existing visual description schema remains:

```text
supabase/migrations/20260715120000_card_visual_description_agent_v1.sql
```

## Dry Run Proof

Final run artifact:

```text
docs/audits/card_visual_language_v1_branch_stratified_dry_run/2026-07-16T15-05-45-620Z_dry_run_bef1caf0e6a4
```

Final report:

```text
docs/audits/card_visual_language_v1_branch_stratified_dry_run/VISUAL_LANGUAGE_V1_BRANCH_STRATIFIED_25_CARD_DRY_RUN_REPORT.md
```

Description packet:

```text
docs/audits/card_visual_language_v1_branch_stratified_dry_run/2026-07-16T15-05-45-620Z_dry_run_bef1caf0e6a4/CARD_VISUAL_LANGUAGE_V1_BRANCH_STRATIFIED_25_DESCRIPTIONS.md
```

No-write readback:

```text
docs/audits/card_visual_language_v1_branch_stratified_dry_run/2026-07-16T15-05-45-620Z_dry_run_bef1caf0e6a4/dry_run_no_db_write_readback.json
```

Artifact hashes:

```text
docs/audits/card_visual_language_v1_branch_stratified_dry_run/2026-07-16T15-05-45-620Z_dry_run_bef1caf0e6a4/artifact_hashes.json
```

## Current Truths

- `25` rows were selected.
- Branch coverage was exactly `5` Pokemon, `5` Trainer, `5` Stadium, `5` Energy, and `5` Item / Tool / Supporter.
- `25` rows validated.
- `0` rows failed.
- `0` images skipped in the final run.
- `12` rows were routed to `needs_review`.
- `13` rows remained `pending`.
- `4` status-level false negatives were found during human review.
- `0` status-level false positives were found.
- No database rows were written.
- All final images were read from self-hosted canonical image paths.

## Token And Cost Result

- requested model: `gpt-4o-mini`
- response model: `gpt-4o-mini-2024-07-18`
- image detail: `high`
- request count: `25`
- retry count: `0`
- input tokens: `651693`
- output tokens: `10322`
- cached input tokens: `1792`
- total tokens: `662015`
- estimated cost: `$0.10381275`
- average cost per validated description: `$0.00415251`
- projected 500 cards: `$2.076255`
- projected 1,000 cards: `$4.15251`
- projected full eligible catalog: `$221.02564977`

## Invariants

- Visual descriptions are derived intelligence, not canonical identity.
- `card_prints` must not receive visual description, semantic, or embedding columns from this lane.
- Generated descriptions must remain private until explicitly exposed by a later gate.
- `quality_flags` route review; they do not approve rows.
- No row may become approved without human review.
- Semantic tags are retrieval aids, not truth claims.
- Image-surface claims must remain conservative.
- Branch routing should prefer metadata and controlled fallbacks over image guessing.

## Why The Visual Layer Remains Derived Intelligence

The model observes an image and produces reviewable descriptions and tags. That output can help matching and future semantic retrieval, but it does not define what the card is, what printing it is, what rarity it has, what it is worth, or what a collector prefers.

## What Must Never Be Broken

- Do not treat generated descriptions as canonical identity.
- Do not approve generated rows automatically.
- Do not generate embeddings from unreviewed output.
- Do not expose unreviewed output to app-facing reads.
- Do not mutate canonical card rows from visual-description output.
- Do not make local TLS certificate override default behavior.
- Do not patch rules midway through a sample that is meant to evaluate a fixed gate.

## Explicit Next Gate

Implement a narrow deterministic enforcement patch for:

- `evocative`
- `enchantment`
- `reflective finish`
- `clean, reflective finish`
- unsupported expression claims when text says facial features are not visible
- generic franchise language on non-Pokemon branches without mislabeling it as creature-subject language

Then run targeted contract/fixture validation only.

Do not run another 25-card OpenAI sample, apply rows, approve rows, generate embeddings, build semantic search, expose app-facing reads, integrate Taste Engine, integrate Listing Resolver, or integrate Grookai Signature until that repair gate passes.
