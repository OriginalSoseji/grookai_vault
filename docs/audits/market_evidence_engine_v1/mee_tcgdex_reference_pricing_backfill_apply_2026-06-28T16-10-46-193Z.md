# MEE TCGdex Reference Pricing Backfill Apply V1

- Package: `MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-APPLY-V1`
- Mode: `apply_requested`
- Ready for apply: `true`
- Applied: `true`
- Package fingerprint: `0bb6f6165450e5bc3f8f4c0db4bd53fb514c2de581750485ae681b6e5f9d8ca4`

## Rows

- Candidates: 310744
- Normalized evidence: 310744
- Unique card prints: 19134
- Model-eligible rows: 285396
- Quarantined rows: 25348

## Boundary

- Internal `market_reference_*` warehouse only.
- No public/app-visible pricing.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No identity, card, vault, image, delete, upsert, merge, migration, or global apply.

## Readback

```json
{
  "market_reference_candidates": {
    "tcgdex_tcgplayer_reference": 110675,
    "tcgdex_cardmarket_reference": 200069
  },
  "market_reference_normalized_evidence": {
    "tcgdex_tcgplayer_reference": 110675,
    "tcgdex_cardmarket_reference": 200069
  },
  "total_candidates": 310744,
  "total_normalized": 310744
}
```

## Findings

- none
