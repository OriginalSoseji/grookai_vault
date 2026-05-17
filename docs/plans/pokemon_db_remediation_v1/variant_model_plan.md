# Variant Model Plan

Status: planning only. This file proposes a future model direction only. It authorizes no Supabase writes, migrations, inserts, updates, deletes, or migration repair.

## Current Gap

The audit found a major structural gap between DB variant representation and external variant signals:

| Source | Variant slots/signals |
| --- | ---: |
| DB variant slots | 2,901 |
| TCGdex signals | 21,066 |
| PokemonTCG/TCGPlayer signals | 32,449 |

The DB currently has some `variant_key` rows and truthy `variants` JSON keys, but that is not enough for true collector master sets. PkmnCards is a numbered-card checklist source, not a full finish/SKU authority. TCGdex and PokemonTCG/TCGPlayer expose stronger variant signals, but they are not identical and must be normalized through a dedicated authority model.

## Why The Current DB Is Not Ready For True Collector Master Sets

- Variant evidence is split across `variant_key`, `variants` JSON, TCGdex `cardCount` signals, PokemonTCG API `tcgplayer.prices` keys, and source-specific payloads.
- The same physical card identity can have multiple finish states without being a separate canonical card.
- Some source price keys represent market channels rather than collector-print identities.
- Stamped, promo, reverse, first edition, holo, normal, and product-specific variants need different semantics.
- Duplicate set rows and number-normalization gaps make variant ownership unsafe until earlier remediation phases are complete.

## Required Distinctions

| Concept | Meaning | Example risk if mixed |
| --- | --- | --- |
| Canonical card identity | The numbered printed card in a canonical set | Duplicate rows for the same card across aliases |
| Finish/printing variants | Normal, holo, reverse, first edition, etc. | Treating a finish as a separate checklist card |
| Stamped/canonical variants | Product stamp or special treatment that collectors track as distinct | Losing stamp identity under generic reverse/holo |
| Market variants | TCGPlayer/PokemonTCG price buckets or sales channels | Creating collector variants from price-only keys |
| Source-specific product variants | Source-only distinctions from product feeds | Polluting canonical identity with source-local terms |

## Recommended Future Normalized Variant Authority Model

Create a separate future contract named `VARIANT_AUTHORITY_MODEL_V2` before any variant implementation. The contract should define:

- A canonical variant authority table keyed by canonical card print and normalized variant type.
- Source evidence rows for TCGdex, PokemonTCG API, TCGPlayer, JustTCG, and other sources.
- A normalized vocabulary for finish types, stamp types, edition types, language/region constraints, and product-only variants.
- Rules for when a source signal becomes a collector variant versus a market-only signal.
- Confidence and provenance fields so source disagreement is reviewable.
- Backward compatibility rules for existing `variant_key` and `variants` JSON.
- Acceptance tests that prove canonical card identity and variants are not mixed.

## Why Not Solve Variants During Missing Card Backfill

Missing card backfill should complete canonical checklist identity only. Adding variants during that phase would combine three unresolved decisions: set ownership, printed number identity, and finish authority. That would make review harder and could create duplicate card rows that later need consolidation.

Backfill should create, at most, a canonical card identity candidate in a future authorized write pass. Variant and finish rows should wait until `VARIANT_AUTHORITY_MODEL_V2` is approved.

## No-Write Implementation Queue

1. Freeze variant writes during set canonicalization and missing-card checklist backfill.
2. Produce a read-only variant evidence matrix by canonical set and source.
3. Compare DB variant slots against TCGdex and PokemonTCG/TCGPlayer signals after duplicate sets are resolved.
4. Draft `VARIANT_AUTHORITY_MODEL_V2` as a separate contract.
5. Review source vocabulary conflicts and market-only keys.
6. Only after contract approval, design a separate implementation plan for variant authority backfill.

## 2026-05-17 V2 Planning Artifacts

- `variant_authority_model_v2_plan_20260517.md`
- `variant_authority_model_v2_matrix_20260517.json`

These artifacts define the future authority lanes, no-backfill boundaries, schema responsibilities, and hard stop gates. Recommended immediate variant writes remain `0`.
