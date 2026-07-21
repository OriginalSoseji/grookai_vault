# Card Visual Search Full Fact Graph Review Packet

Status: COMPLETE - FULL SAVED VISUAL RECORDS EXPOSED; HUMAN CALIBRATION PENDING

Date: 2026-07-21

## Context

The calibration dashboard originally showed only the evidence that matched the active search concept. This was sufficient for ranking provenance but insufficient for checking whether the extraction captured the rest of the artwork.

## Problem

For `Wingull sky`, the result cards exposed only `sky` evidence. Reviewers could not see whether clouds, trees, water, terrain, shadows, anatomy, or other saved observations existed. This conflated search-match evidence with the complete visual record.

## Decision

At producing commit `90c10233`, preserve the concise match evidence but label it `Search match evidence only`. Load and deduplicate the exact saved generated row for every required card-print ID, including the complete `visual_attributes.fact_graph`, source artifact path, and deterministic source/generated-row hashes.

Every result now provides a `Full saved Fact Graph` view containing:

- the deterministic compatibility digest;
- all observations and typed facts in readable tables;
- every Fact Graph module, review, uncertainty, abstention, search term, and canonical concept;
- the exact saved generated-row JSON;
- source provenance and SHA-256 hashes.

Canonical subject filters are displayed separately from visual concepts.

## Reconciled Packet

Artifact:

`docs/audits/card_visual_search_judgment_packet_v1/2026-07-21T23-17-11-690Z_packet_145826909292/`

- Calibration queries: `200`
- Holdout queries: `0`
- Top-result slots: `1,195`
- Unique required card-print IDs: `753`
- Saved visual records resolved: `753/753`
- Images resolved: `753/753`
- Missing source records, images, inventory rows, and unreadable sources: `0`
- Packet JSON size: `39,684,702` bytes
- Standalone dashboard size: `22,177,878` bytes

Readiness artifact:

`docs/audits/card_visual_search_calibration_evaluator_v1/2026-07-21T23-17-27-202Z_readiness_9f08ae5e04b6/`

- Ready: `true`
- Imported submissions: `0`
- Official metrics: `not_run_awaiting_human_judgments`

## Wingull Proof

For `vsq_0002`:

- Rank 3, `GV-PK-CES-111`, saved `blue sky background` and `white clouds`.
- Rank 4, `GV-PK-AR-80`, saved `green trees with red trunks`, grassy hills, water, and blue sky.
- Rank 5, `GV-PK-DX-81`, saved `sky background with orange and purple hues` and omitted the visible cast-shadow interpretation. This is a real extraction/search-evidence defect, not merely a truncated dashboard display.

## Boundaries

No provider calls, database connections or writes, approvals, embeddings, persistent index writes, holdout execution, or public release occurred.

## Verification

- Relevant visual-search contracts: `62/62` passed.
- Judgment-packet contracts: `6/6` passed.
- Generated dashboard script syntax: passed.
- `git diff --check`: passed before the producing commit.
- Packet reconciliation: passed with zero missing source records.

The full repository shipcheck was not run because `SUPABASE_DB_URL` is unavailable; no database-dependent result is claimed.

## Explicit Next Gate

Use packet `145826909292` for human calibration. Judge result relevance while opening the complete saved Fact Graph whenever extraction completeness or support is uncertain. Record rank 5 of `vsq_0002` as a likely `not_relevant` result with `unsupported_inference`, then continue the primary calibration review. Do not execute the sealed holdout yet.
