# MEE TCGdex Pricing Source Constraints V1

- Package: `MARKET-REFERENCE-TCGDEX-PRICING-SOURCE-CONSTRAINTS-V1`
- Ready: `true`
- Applied: `false`
- Migration hash: `e4e0165e125605a6c996d863c8cdda07f8e8537977dcae0482776db6300d0d63`
- Package fingerprint: `1ce51b00c3705b11a9257579e8749031eb829a5bf673e8f0b950f589928a240b`
- Migration path: `supabase/migrations/20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql`

## Scope

- Constraint-only extension for internal reference evidence.
- Allows `tcgdex_tcgplayer_reference` and `tcgdex_cardmarket_reference`.
- Preserves review-only candidates and no direct public publishing.
- Does not insert TCGdex evidence.

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-TCGDEX-PRICING-SOURCE-CONSTRAINTS-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: e4e0165e125605a6c996d863c8cdda07f8e8537977dcae0482776db6300d0d63. Package fingerprint: 1ce51b00c3705b11a9257579e8749031eb829a5bf673e8f0b950f589928a240b. Source audit fingerprint: da6b070aef331e3b3e193e841038232b58031f2ef31fe38790119cd2bf8ba899. Backfill plan fingerprint: 60ed28faf7ed421344fe4637e421d0b1e7029a563fc8ee1d46caede95e0aa4c9. Scope: execute supabase/migrations/20260625130000_market_reference_tcgdex_pricing_source_constraints_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, extending internal market_reference_candidates and market_reference_normalized_evidence constraints to allow TCGdex TCGPlayer/Cardmarket reference evidence sources. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No card_prints/card_printings writes. No vault writes. No image/storage writes. No deletes. No upserts. No merges. No db push. No global apply.
```
