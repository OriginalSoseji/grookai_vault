# MEE-CORE-FAST-POST-INGEST-REVIEW-READBACK-V1

Use this as the daily first-pass MEE review command.

1. Run `node scripts/audits/market_evidence_fast_post_ingest_review_readback_v1.mjs`.
2. If `remaining_safe_internal_action_rows > 0`, package one safe internal action batch.
3. If `remaining_safe_internal_action_rows = 0`, do not regenerate micro apply packages. Move to manual/policy lanes.
4. Do not use the heavy post-ingest orchestrator unless a detailed per-row manifest is required.
5. Stop immediately if public boundary counts are nonzero.
