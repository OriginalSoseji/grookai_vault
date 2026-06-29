# MEE-TCGDEX Reference Pricing Backfill Plan V1

Generated: 2026-06-28T15:34:25.491Z

## Boundary

- Plan only.
- No DB writes.
- No provider calls.
- No source fetches.
- No pricing_observations writes.
- No ebay_active_prices_latest writes.
- No public pricing views.
- No app-visible pricing.
- No identity, card_print, vault, image, delete, migration, merge, or global apply.

## Input Audit

- Audit package: `MEE-TCGDEX-REFERENCE-PRICING-AUDIT-V1`
- Audit artifact: docs/audits/market_evidence_engine_v1/mee_tcgdex_reference_pricing_audit_2026-06-28T15-26-50-764Z.json
- Audit fingerprint: `da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899`

## Proposed Rows

- market_reference_candidates: 310744
- market_reference_normalized_evidence: 310744
- unique card prints: 19134
- model eligible normalized rows: 285396
- quarantined metric rows: 25348

## Chunking

- Candidate chunk size: 5000
- Normalized chunk size: 5000
- Candidate chunks: 63
- Normalized chunks: 63

## Collision Guard

- Existing `tcgdex_tcgplayer_reference` candidates: 0
- Existing `tcgdex_cardmarket_reference` candidates: 0
- Ready for apply package: true

## Hashes

- candidate_rows_hash: `f4864fffb268dba1bb4c1d784d7d12e84dca2d98e095f23dad8920cc7a10cea7`
- normalized_rows_hash: `543bb50256c54ed34831816ec08ea9de962b7d1629d2e2ba2ac443375ebe2a4e`
- package_fingerprint: `da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899`
- backfill_plan_fingerprint: `60ed28faf7ed421344fe4637e421d0b1e7029a563fc8ee1d46caede95e0aa4c9`

## SQL Artifacts

- Preflight: docs/sql/mee_tcgdex_reference_pricing_backfill_v1_preflight.sql
- Readback: docs/sql/mee_tcgdex_reference_pricing_backfill_v1_readback.sql

## Findings

- none

## Next Step

Create the apply package that regenerates rows from current TCGdex raw imports, verifies the audit hashes, inserts candidate rows first, links normalized rows by candidate_hash, and then runs the readback. Keep all rows internal and review-only.
