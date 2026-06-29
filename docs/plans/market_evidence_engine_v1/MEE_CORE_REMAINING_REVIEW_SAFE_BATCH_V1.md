# MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1

Next step after explicit approval:

1. Run `docs/sql/mee_core_remaining_review_safe_batch_v1_preflight.sql`.
2. If it returns `933` eligible rows and zero boundary rows, run `docs/sql/mee_core_remaining_review_safe_batch_v1_apply_candidate.sql`.
3. Run `docs/sql/mee_core_remaining_review_safe_batch_v1_readback.sql`.
4. Run fast post-ingest review readback again.
