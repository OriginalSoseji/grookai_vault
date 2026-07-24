# TCGDEX_SOURCE_CONTRACT_V1

Status: Active
Date: 2026-07-22

## Purpose

Define the deterministic boundary for TCGdex catalog, image, variant, and pricing payloads entering Grookai.

TCGdex is an external evidence source. It is not canonical authority.

## Raw And Mapping Rules

- Preserve the complete TCGdex payload and upstream card/set IDs in `raw_imports`.
- Normalize only after raw preservation.
- Require one deterministic active external mapping before evidence can target an existing Grookai identity.
- Missing or multiple mappings remain unmatched and review-only.
- TCGdex cannot directly create a child printing or rewrite printed identity.

## Variant And Finish Rules

TCGdex `variants` flags are card-level source metadata. They may classify evidence, but a flag alone is not proof of a physical printing.

For Cardmarket metrics carried by a TCGdex payload:

- explicit finish suffixes remain authoritative only for the evidence hint;
- unsuffixed metrics normalize to Holo only for the exact source state `variants.holo === true && variants.normal === false`;
- missing, partial, contradictory, both-true, or both-false metadata retains the legacy Normal evidence hint;
- all outcomes remain review-gated market evidence;
- raw metric key, both source variant flags, raw snapshot lineage, and normalizer version must be preserved.

No pricing or variant normalization outcome may create, restore, delete, or rename `card_printings`. If a verified target child does not exist, the evidence stays unmatched or review-only.

## Image Rules

TCGdex imagery may enrich only an exact mapped identity and must obey the active image contracts. Ambiguity blocks enrichment. Representative imagery must not claim exact variant-image truth.

## Enforcement

- `backend/pricing/market_reference_tcgdex_pricing_audit_v1.mjs`
- `scripts/audits/market_reference_tcgdex_pricing_backfill_apply_v1.mjs`
- `docs/sql/mee_variant_assignment_v1_backfill.sql`
- `backend/images/source_image_enrichment_worker_v1.mjs`
- `tests/contracts/market_reference_tcgdex_pricing_audit_v1.test.mjs`
- `tests/contracts/market_reference_tcgdex_pricing_backfill_apply_v1.test.mjs`
- `tests/contracts/mee_variant_assignment_v1.test.mjs`
- `tests/contracts/ingestion_finish_truth_guard_v1.test.mjs`

This contract works under `INGESTION_PIPELINE_CONTRACT_V1`, `PRINTING_TRUTH_CONTRACT_V1`, and `PRICING_EVIDENCE_ENGINE_V1`. The stricter identity or printing-truth rule wins.
