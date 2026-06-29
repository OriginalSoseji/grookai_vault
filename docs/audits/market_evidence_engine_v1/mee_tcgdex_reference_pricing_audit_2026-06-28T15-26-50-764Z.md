# MEE-TCGDEX Reference Pricing Audit V1

Generated: 2026-06-28T15:26:50.764Z

## Boundary

- Read-only DB audit.
- No provider calls.
- No source fetches.
- No DB writes.
- No pricing_observations writes.
- No ebay_active_prices_latest writes.
- No public pricing views.
- No app-visible pricing.
- No identity, vault, image, delete, migration, merge, or global apply.

## Summary

- TCGdex raw imports: 22739
- TCGdex card raw imports: 22540
- Card raw imports with pricing: 22539
- Mapped pricing card imports: 22534
- Unmapped/ambiguous pricing card imports: 5
- Projected candidate rows: 310744
- Projected normalized evidence rows: 310744
- Projected model-eligible rows: 285396
- Projected quarantined rows: 25348
- Projected unique card prints: 19134

## Source Counts

| Source | Projected candidate rows |
| --- | ---: |
| tcgdex_cardmarket_reference | 200069 |
| tcgdex_tcgplayer_reference | 110675 |

## Disposition Counts

| Disposition | Projected normalized rows |
| --- | ---: |
| quarantined_metric | 25348 |
| reference_model_candidate | 285396 |

## Proofs

- no_candidate_can_publish_directly: true
- all_candidates_need_review: true
- all_candidates_have_card_print_id: true
- all_candidates_have_gv_id: true
- all_candidate_hashes_unique: true
- no_public_boundary_leak: true

## Hashes

- candidate_rows_hash: `f4864fffb268dba1bb4c1d784d7d12e84dca2d98e095f23dad8920cc7a10cea7`
- normalized_rows_hash: `543bb50256c54ed34831816ec08ea9de962b7d1629d2e2ba2ac443375ebe2a4e`
- package_fingerprint: `da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899`

## Artifacts

- JSON report: docs/audits/market_evidence_engine_v1/mee_tcgdex_reference_pricing_audit_2026-06-28T15-26-50-764Z.json
- Markdown report: docs/audits/market_evidence_engine_v1/mee_tcgdex_reference_pricing_audit_2026-06-28T15-26-50-764Z.md
- Candidate row JSONL: not materialized; rerun with --write-row-manifests for apply packaging
- Normalized evidence JSONL: not materialized; rerun with --write-row-manifests for apply packaging

## Findings

- none

## Next Step

Prepare a guarded backfill plan that inserts the projected TCGdex reference candidates and normalized evidence into `market_reference_*` only, then refresh internal reference rollups. Keep all rows review-only and non-public.
