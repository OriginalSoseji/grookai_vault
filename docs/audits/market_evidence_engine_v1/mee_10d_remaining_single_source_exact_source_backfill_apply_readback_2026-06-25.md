# MEE-10D Remaining Single-Source Exact Source Backfill Apply Readback

- Package: `MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-BACKFILL-APPLY-V1`
- Scope: targeted evidence candidate backfill only
- Linked project: `ycdxbpibncqcchqiihfz`
- Package fingerprint: `e30ba7d70ec8227723909fce6676978a13de1cddc9034fb165509dafe56bac34`
- Candidate evidence manifest hash: `18a642c2731441f83dfcd2908e375af0ad3fd62211eb6ca6e8088cc7c4e4e168`
- Source package fingerprint: `aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077`
- Active-listing schema migration hash: `9c3b473529416edf0798d510469e924b1b2da3229af960fd06de4954438ff807`

## Apply Proof

- Executed `npm run mee:remaining-single-source-exact-backfill-apply -- --apply --approval-text <approved text>`
- Apply mode: `apply_requested`
- Ready: `true`
- Applied: `true`
- Inserted `market_reference_candidates`: `15`
- Inserted `market_reference_normalized_evidence`: `0`
- Findings: none

## Remote Readback

- `market_reference_candidates` rows with `source = ebay_active`: `15`
- `market_reference_raw_snapshots` rows with `source = ebay_active`: `0`
- `market_reference_normalized_evidence` rows with `source = ebay_active`: `0`

## Review Gate Readback

All inserted `ebay_active` evidence candidate rows have:

- `source_type = active_listing`
- `needs_review = true`
- `can_publish_price_directly = false`

Readback grouped result:

```text
source=ebay_active
source_type=active_listing
needs_review=true
can_publish_price_directly=false
rows=15
```

## Boundary

- No raw snapshot writes.
- No normalized evidence writes.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No price rollups.
- No identity-table writes.
- No vault writes.
- No image writes.
- No deletes.
- No upserts.
- No merges.
- No migrations.
- No global apply.
