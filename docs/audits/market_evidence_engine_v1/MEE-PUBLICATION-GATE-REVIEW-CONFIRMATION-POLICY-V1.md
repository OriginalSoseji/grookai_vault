# MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Create a deterministic internal confirmation policy for when publication-gate `defer_review_confirmation` rows may be advanced with `confirm_internal_candidate`.

No remote apply. No DB writes. No function invocation. No provider calls. No source fetches. No public pricing.

## Audit Inputs

- Review-confirmation manifest: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-ACTION-PLAN-V1/defer_review_confirmation_manifest.json`
- Enriched policy audit: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/enriched_candidate_policy_audit.json`
- Policy manifest: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/policy_manifest.json`

## Current Candidate Result

```json
{
  "total_review_confirmation_rows": 470,
  "policy_hold_rows": 470,
  "policy_confirmable_rows": 0,
  "raw_single_rows": 378,
  "slab_rows": 92
}
```

## Hold Reasons

```json
{
  "match_confidence_below_policy": 470,
  "candidate_rows_still_need_review": 470,
  "special_lane_manual_review": 383,
  "high_value_manual_review": 103,
  "exclusion_flags_present": 60,
  "insufficient_seller_diversity": 15,
  "insufficient_listing_count": 14
}
```

## Policy Decision

No apply candidate is generated.

Every current `defer_review_confirmation` row remains a policy hold. The two universal blockers are:

- every row has candidate evidence still marked `needs_review`
- every row has minimum match confidence below the direct-confirm threshold

The policy therefore prevents the system from treating noisy active listing evidence as internally confirmed.

## Confirmation Requirements

A future `confirm_internal_candidate` package may only be generated for rows that satisfy all of the following:

- action function transition eligibility
- lane-specific listing count and seller diversity thresholds
- minimum match confidence
- no exclusion flags
- no candidate evidence still needing review
- freshness threshold
- no special-lane hold
- no high-value manual-review hold
- no public-boundary flags

## Artifacts

- Contract: `docs/contracts/MEE_PUBLICATION_GATE_REVIEW_CONFIRMATION_POLICY_V1.md`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/report.json`
- Policy manifest: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/policy_manifest.json`
- Enriched audit: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/enriched_candidate_policy_audit.json`
- Preflight SQL: `docs/sql/mee_publication_gate_review_confirmation_policy_v1_preflight.sql`
- Readback SQL: `docs/sql/mee_publication_gate_review_confirmation_policy_v1_readback.sql`
- Contract test: `tests/contracts/mee_publication_gate_review_confirmation_policy_v1.test.mjs`

## Next Step

Fix or review the candidate evidence blockers before producing any `confirm_internal_candidate` apply package. The most important blockers are candidate-level `needs_review` and sub-policy match confidence.

