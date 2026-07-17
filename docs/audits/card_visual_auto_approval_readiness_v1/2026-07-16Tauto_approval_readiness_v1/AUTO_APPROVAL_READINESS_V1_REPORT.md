# Auto-Approval Readiness V1 Report

Date: 2026-07-16

This gate is offline only. It does not approve rows, update review statuses, generate embeddings, expose app-facing reads, call OpenAI, or enable automatic approval.

## Objective

Build and validate a Visual Description Auto-Approval Readiness Gate V1 that separates current `review_status` from future auto-approval eligibility.

## Version Tuple Under Evaluation

```json
{
  "prompt_version": "CARD_VISUAL_DESCRIPTION_PROMPT_V6_VISUAL_LANGUAGE_V1_SUBJECT_REPAIR",
  "visual_language_version": "CARD_VISUAL_LANGUAGE_V1",
  "output_schema_version": "CARD_VISUAL_DESCRIPTION_SCHEMA_V1",
  "agent_version": "CARD_VISUAL_DESCRIPTION_AGENT_V1",
  "validator_policy_version": "CARD_VISUAL_DESCRIPTION_AUTO_APPROVAL_READINESS_V1",
  "model_version": "gpt-4o-mini",
  "response_model_version": "gpt-4o-mini-2024-07-18",
  "image_source_version": "self_hosted_user_card_images_review_packet_2026-07-16",
  "image_detail": "high"
}
```

Trust belongs only to this tested version tuple. Prompt, model, validator, schema, visual language, or image-source changes require recalibration before any auto-approval activation.

## Border-Color Repair

Row 9 exposed a reusable failure class: a physical card-border color was asserted as `silver border visible` even though image review showed a yellow/gold border.

The repair treats border color as a high-risk physical surface claim. A generated row may not confidently claim `silver`, `gold`, `yellow`, `black`, or another border color unless deterministic border-color evidence is present. Current replay inputs do not include a justified pixel classifier, so confident border-color claims route to review. Uncertainty language such as `border visible; color cannot be determined reliably` is allowed.

## Replay Results

- Rows replayed: `25`
- Auto-approval eligible candidates: `2`
- Not eligible: `23`
- Tier counts: `{"eligible_candidate":2,"human_review_required":23}`
- Border logic changed routing for rows: `2, 4, 5, 6, 7, 9, 12, 16, 17, 19`
- OpenAI calls: `0`
- Database writes: `0`

## Rows 9, 12, 13, And 24

| Row | GV-ID | Card | Status | Image Decision | Eligible | Tier | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | GV-PK-JPN-PMCG6-085 | Cinnabar City Gym | pending | needs_revision | false | human_review_required | blocking_policy_result_present; no_unresolved_border_color_certainty_issue |
| 12 | GV-PK-JPN-TCGCOLLECTOR11526-019 | Magnetic Storm | needs_review | approve_later_gate | false | human_review_required | blocking_policy_result_present; no_unresolved_border_color_certainty_issue; no_unsupported_personality_emotion_purpose_lore_or_event_claim |
| 13 | GV-PK-JPN-TCGCOLLECTOR11515-020 | Dark Metal Energy | pending | approve_later_gate | true | eligible_candidate | none |
| 24 | GV-PK-JPN-TCGCOLLECTOR11525-019 | High Pressure System | pending | approve_later_gate | true | eligible_candidate | none |

## Disagreements

| Row | GV-ID | Disagreements |
| --- | --- | --- |
| 9 | GV-PK-JPN-PMCG6-085 | existing_pending_but_auto_ineligible; text_only_approve_but_auto_ineligible |
| 12 | GV-PK-JPN-TCGCOLLECTOR11526-019 | text_only_approve_but_auto_ineligible; image_confirmed_approve_but_auto_ineligible |

## Validation Commands And Results

- `node --check backend/card_descriptions/card_visual_description_agent_v1.mjs` - pass.
- `node --check scripts/audits/card_visual_auto_approval_readiness_v1.mjs` - pass.
- `node --test tests/contracts/card_visual_description_agent_v1.test.mjs` - pass, `31/31`.
- `node scripts/audits/card_visual_auto_approval_readiness_v1.mjs` - pass, `25` rows replayed, `2 eligible_candidate`, `23 human_review_required`.
- Replay invariant check against `auto_approval_readiness_25_replay.json` - pass.
- Permanent artifact hash reconciliation - pass.
- `git diff --check` - pass.

## Boundary

- no database review-status update
- no approval apply
- no rejection apply
- no embeddings
- no semantic search
- no public/app-facing reads
- no Taste Engine, Listing Resolver, or Grookai Signature integration
- no text-only recommendation treated as image-confirmed visual truth

## Exact Next Gate

Run the next bounded calibration batch from `NEXT_CALIBRATION_BATCH_PLAN.md` as an offline/dry-run calibration sample. Do not activate automatic approval until the version tuple satisfies `AUTO_APPROVAL_CALIBRATION_STANDARD_V1.md`.
