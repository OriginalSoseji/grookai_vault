# CARD_VISUAL_AUTO_APPROVAL_READINESS_V1_20260716

Status: COMPLETE

Date: 2026-07-16

## Context

Visual Language V1 is locked at the row-status trust boundary. A bounded 25-row database apply completed, a human-review packet was created, text-only review recommended four approval candidates, and image-confirmed review approved rows `12`, `13`, and `24` while downgrading row `9`.

No database review statuses have been updated.

## Problem

The row `9` failure should not become a permanent requirement that every future card needs human image confirmation. It should become reusable deterministic protection and a path toward confidence-based auto-approval candidates.

## Risk

If text-only recommendations or current `pending` status are treated as approval evidence, a generated row with a material visual-surface error can become approved knowledge. If auto-approval is enabled before version-specific calibration, model trust becomes vague instead of measurable.

## Decision

Create Visual Description Auto-Approval Readiness Gate V1.

This gate:

- treats physical border-color claims as high-risk card-surface claims;
- blocks confident border-color assertions unless deterministic border-color evidence exists;
- adds a non-authoritative `auto_approval_eligible` result separate from `review_status`;
- classifies rows into transparent tiers;
- replays the existing 25 bounded-apply rows offline;
- defines a version-tuple calibration standard;
- recommends a bounded next calibration batch instead of full-catalog manual review.

The gate does not activate auto-approval.

## Alternatives Rejected

- Approve the three image-confirmed rows immediately: rejected because the next objective is scalable eligibility, not status apply.
- Add a row-specific exception for `GV-PK-JPN-PMCG6-085`: rejected because the failure class is reusable.
- Ban only the phrase `silver border visible`: rejected because other border colors and wordings have the same risk.
- Require human confirmation for all future rows: rejected because that does not scale and is not the desired end state.
- Implement unproven pixel classification now: rejected because current evidence does not justify deterministic border-color inference.

## Migration Applied

No migration was applied.

## Current Truths

- Source bounded apply run key: `fede8846074f414722b0a967e52fff7ba1eaeee18d2fe4bea6c8686f9712f1c8`.
- Source bounded apply run ID: `3e7f390a-e372-41ac-be73-b33e94918a8b`.
- Rows replayed offline: `25`.
- OpenAI calls in this gate: `0`.
- Database writes in this gate: `0`.
- Auto-approval eligible candidates: `2`.
- Human-review-required rows: `23`.
- Eligible candidate rows: `13` and `24`.
- Row `9` is blocked by `potential_border_color_certainty_issue`.
- Row `12` is image-confirmed as acceptable for human approval, but is not auto-approval eligible because the generated payload still contains a confident border-color claim and interpretive language.
- Border logic changed routing for rows `2`, `4`, `5`, `6`, `7`, `9`, `12`, `16`, `17`, and `19`.

## Token And Cost Result

No model calls were made in this gate.

The source bounded apply batch remains:

- input tokens: `682128`
- output tokens: `9974`
- total tokens: `692102`
- estimated cost: `$0.1083036`
- average estimated cost per validated card: `$0.00433214`

The recommended next `125`-card calibration batch projects to approximately `$0.5415` at the same observed average cost.

## Invariants

- `review_status` remains separate from auto-approval eligibility.
- Auto-approval remains inactive.
- Text-only decisions are not treated as image-confirmed truth.
- Image-confirmed human approval does not automatically imply future auto-approval eligibility.
- Border-color certainty requires deterministic evidence, not model confidence alone.
- No database rows are approved, rejected, or updated by this gate.
- No embeddings or public/app-facing reads are created.

## Why The Visual Layer Remains Derived Intelligence

Auto-approval readiness is derived policy evaluation over generated visual text and versioned artifacts. It is not canonical identity, printing, rarity, pricing, or collector-taste truth. A row can be an eligibility candidate without becoming approved knowledge until a separately authorized gate activates and applies that behavior.

## What Must Never Be Broken

- Do not approve rows from `auto_approval_eligible` alone while activation is inactive.
- Do not infer approval from `pending`.
- Do not use text-only review as visual truth.
- Do not use row-specific or GV-ID-specific validator exceptions.
- Do not conflate illustrated object material with physical card border or surface treatment.
- Do not generate embeddings before explicit approval.
- Do not expose unreviewed descriptions to app-facing surfaces.
- Do not integrate semantic search, Taste Engine, Listing Resolver, or Grookai Signature from this gate.

## Tests And Readbacks

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` - pass.
- `node --check scripts/audits/card_visual_auto_approval_readiness_v1.mjs` - pass.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` - pass, `31/31`.
- `node scripts/audits/card_visual_auto_approval_readiness_v1.mjs` - pass, `25` rows replayed, `2 eligible_candidate`, `23 human_review_required`.
- Offline replay validation - pass, row `9` blocked and rows `13`/`24` eligible candidates.
- `git diff --check` - pass.
- Full repository contract suite was not run because this gate changed only the card visual description validator, targeted contract tests, and offline audit artifacts.

## Artifacts

- Report: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/AUTO_APPROVAL_READINESS_V1_REPORT.md`
- Replay JSON: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/auto_approval_readiness_25_replay.json`
- Matrix CSV: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/auto_approval_readiness_25_matrix.csv`
- Calibration standard: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/AUTO_APPROVAL_CALIBRATION_STANDARD_V1.md`
- Next calibration plan: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/NEXT_CALIBRATION_BATCH_PLAN.md`
- Hashes: `docs/audits/card_visual_auto_approval_readiness_v1/2026-07-16Tauto_approval_readiness_v1/permanent_artifact_hashes.json`

## Explicit Next Gate

Run the next bounded calibration dry run described in `NEXT_CALIBRATION_BATCH_PLAN.md`: `125` cards, `25` per branch, intentionally covering border styles, scan quality, complex subjects, abstract artwork, reflective illustrated objects, multi-subject cards, and full-art/standard layouts.

Do not activate auto-approval, update statuses, approve rows, reject rows, generate embeddings, expose app-facing reads, or integrate downstream systems until the version tuple satisfies `AUTO_APPROVAL_CALIBRATION_STANDARD_V1.md`.
