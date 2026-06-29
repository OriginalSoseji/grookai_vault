# MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Audit the `470` held publication-gate review-confirmation rows and create a deterministic blocker-resolution plan before any `confirm_internal_candidate` apply package exists.

No remote apply. No DB writes. No function invocation. No provider calls. No source fetches. No public pricing.

## Input

This package uses the enriched confirmation-policy audit:

`docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-REVIEW-CONFIRMATION-POLICY-V1/enriched_candidate_policy_audit.json`

## Current Result

```json
{
  "total_rows": 470,
  "confirmable_rows": 0,
  "raw_single_rows": 378,
  "slab_rows": 92
}
```

## Primary Resolution Lanes

```json
{
  "exclusion_flag_review": 60,
  "special_lane_manual_review": 338,
  "high_value_manual_review": 30,
  "matcher_confidence_review": 42
}
```

These are primary lanes. Rows can have multiple blockers. The universal blockers remain:

```json
{
  "matcher_confidence_review_required": 470,
  "candidate_evidence_review_required": 470
}
```

## Resolution Order

1. Public-boundary check
2. Exclusion-flag review
3. Special-lane manual review
4. High-value manual review
5. Evidence-volume and seller-diversity defer
6. Matcher-confidence review
7. Candidate-level `needs_review` resolution
8. Re-run confirmation policy

## Lane Handling

### exclusion_flag_review

Rows with candidate evidence exclusion flags must be reviewed first. The outcome is either removal from future rollup eligibility, reclassification, or a corrected candidate path. These rows cannot be confirmed while exclusion flags remain.

### special_lane_manual_review

Special lanes need card-family policy before confirmation. World Championship, McDonald's, MEP, Trainer Kit, Base print-run, and promo lanes can be visually or textually close to ordinary source cards, so ordinary-card matching is not enough.

### high_value_manual_review

High-value rows must remain held until a human or a stricter high-value review policy inspects the evidence set. This avoids a bad public-facing price caused by a small number of expensive listings.

### matcher_confidence_review

Rows without exclusion, special-lane, or high-value primary blockers still fail direct confirmation because match confidence is below `0.90`. The fix is deterministic matcher improvement or candidate reclassification, not lowering the confirmation threshold.

## Decision

No apply candidate is generated.

The next real work is candidate blocker cleanup. Only after these blockers are resolved should we generate any `confirm_internal_candidate` package.

## Artifacts

- Full manifest: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/blocker_resolution_manifest.json`
- Summary manifest: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/blocker_resolution_summary.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-PUBLICATION-GATE-CANDIDATE-BLOCKER-RESOLUTION-V1/report.json`
- Preflight SQL: `docs/sql/mee_publication_gate_candidate_blocker_resolution_v1_preflight.sql`
- Readback SQL: `docs/sql/mee_publication_gate_candidate_blocker_resolution_v1_readback.sql`
- Contract test: `tests/contracts/mee_publication_gate_candidate_blocker_resolution_v1.test.mjs`

## Next Step

Create the candidate cleanup plan. It should not confirm rows. It should resolve or quarantine candidate-level evidence issues first.

