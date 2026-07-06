# MEE-CORE-QUALITY-SCORING-READ-MODEL-V1

Next step:

1. Review `docs/sql/mee_core_quality_scoring_read_model_v1_view_candidate.sql`.
2. Apply it later as a service-role-only internal view if accepted.
3. Use it as the post-ingest quality gate before review disposition automation.
4. Do not allow `confirm_internal_candidate` or publish-gate handoff until quality eligibility is nonzero and threshold policy is explicit.
