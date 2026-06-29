# MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1

Mode: plan only

Generated: 2026-06-27

## Scope

Audit `market_listing_card_candidates` behind the `470` held publication-gate review-confirmation rows and define deterministic cleanup outcomes before any `confirm_internal_candidate` package exists.

No remote apply. No DB writes. No function invocation. No provider calls. No source fetches. No public pricing.

## Candidate Audit

```json
{
  "held_gate_rows": 470,
  "card_prints_with_candidates": 470,
  "candidate_rows": 52630,
  "public_boundary_candidate_rows": 0
}
```

Every audited candidate row currently has `match_status = needs_review`.

## Cleanup Outcomes

```json
{
  "require_special_lane_policy": 39180,
  "require_matcher_reclassify": 9610,
  "require_high_value_review": 2169,
  "quarantine_candidate": 1671
}
```

## Card-Level Resolution Lanes

```json
{
  "special_lane_manual_review": 338,
  "exclusion_flag_review": 60,
  "matcher_confidence_review": 42,
  "high_value_manual_review": 30
}
```

## Cleanup Order

1. Quarantine exclusion-flagged candidate evidence.
2. Hold special-lane evidence until lane-specific policy exists.
3. Hold high-value evidence for stricter review.
4. Reclassify or improve matcher confidence for low-confidence evidence.
5. Keep unresolved `needs_review` rows out of confirmation.
6. Re-run publication-gate confirmation policy after cleanup.

## Decision

No apply candidate is generated.

The candidate layer is not ready for confirmation because all candidate rows are still in review state. The right next step is a candidate action workflow or quarantine/reclassification schema plan, not publication.

## Artifacts

- Contract: `docs/contracts/MEE_CANDIDATE_EVIDENCE_CLEANUP_POLICY_V1.md`
- Candidate schema: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_schema.json`
- Candidate row audit: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_rows_audit.json`
- Cleanup manifest: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_cleanup_manifest.json`
- Cleanup summary: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/candidate_cleanup_summary.json`
- Policy manifest: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/policy_manifest.json`
- Report JSON: `docs/audits/market_evidence_engine_v1/MEE-CANDIDATE-EVIDENCE-CLEANUP-POLICY-V1/report.json`
- Preflight SQL: `docs/sql/mee_candidate_evidence_cleanup_policy_v1_preflight.sql`
- Readback SQL: `docs/sql/mee_candidate_evidence_cleanup_policy_v1_readback.sql`
- Contract test: `tests/contracts/mee_candidate_evidence_cleanup_policy_v1.test.mjs`

## Next Step

Create the candidate cleanup action model. That model should support non-public actions such as quarantine, require matcher reclassification, require special-lane policy, and require high-value review.

