# Image-Confirmed Human Review Decisions

Date: 2026-07-16

These decisions image-confirm the four rows that were previously recommended for `approve_later_gate` by text-only review. The source images were checked through the local review dashboard packet. No database statuses were updated.

## Linked Text-Only Review

- Text-only decisions: `text_only_human_review_decisions.jsonl`
- Text-only summary: `text_only_human_review_decision_summary.json`
- Text-only report: `TEXT_ONLY_HUMAN_REVIEW_DECISIONS.md`

The text-only artifact remains unchanged. This artifact records the separate image-confirmed decision layer.

## Boundary

- no database writes
- no approved rows applied
- no embeddings
- no app-facing reads
- image review confirmed only for rows `9`, `12`, `13`, and `24`

## Summary

- Image-confirmed rows reviewed: `4`
- Approve later gate: `3`
- Needs revision: `1`
- Downgraded from text-only approve queue: `1`
- Reject: `0`
- Leave pending: `0`

## Approve Later Gate

- 12. `GV-PK-JPN-TCGCOLLECTOR11526-019` - Magnetic Storm - current DB status `needs_review`
  - Image confirms the storm scene, lightning, aurora-like color bands, dark landscape, and silhouetted trees.
  - Tags are visually useful.
  - Surface cue is supported enough for the later apply gate.
- 13. `GV-PK-JPN-TCGCOLLECTOR11515-020` - Dark Metal Energy - current DB status `pending`
  - Image confirms the central dark circular symbol, angular yellow shapes, red and black radiating background, and geometric composition.
  - Tags are visually useful.
  - Surface language stays cautious and does not claim physical foil or texture.
- 24. `GV-PK-JPN-TCGCOLLECTOR11525-019` - High Pressure System - current DB status `pending`
  - Image confirms the tropical stadium scene, central circular grassy area, palm trees, bright sky, clouds, and stone steps.
  - Tags are visually useful.
  - Surface language stays uncertain rather than claiming physical treatment.

## Needs Revision

- 9. `GV-PK-JPN-PMCG6-085` - Cinnabar City Gym - current DB status `pending`
  - The artwork scene matches: red platform, lava, dark rock walls, and volcanic gym setting.
  - The generated surface cue says `silver border visible`.
  - The image shows a yellow/gold card border, not a silver border.
  - This is a material image-confirmed mismatch, so the row is downgraded from text-only `approve_later_gate` to `needs_revision`.

## Decision Truth

Text-only recommendation did not become final visual approval. Row `9` proves the value of this separation: it looked safe from description text alone but failed image-confirmation because of the border cue.

## Exact Next Gate

Run a separate bounded review-decision status apply using these image-confirmed decisions:

- carry rows `12`, `13`, and `24` into the approval-status apply gate;
- route row `9` to revision / review instead of approval;
- preserve all other text-only `needs_revision` decisions unless the user requests image review for additional rows.

That apply gate must still not generate embeddings, app-facing reads, semantic search, Taste Engine, Listing Resolver, or Grookai Signature integration.
