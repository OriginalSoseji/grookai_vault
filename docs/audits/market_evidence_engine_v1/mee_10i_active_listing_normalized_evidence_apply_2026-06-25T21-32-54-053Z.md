# MEE-10I Active Listing Normalized Evidence Apply

- Package: `MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-APPLY-V1`
- Mode: `dry_run_report_only`
- Ready: `true`
- Applied: `false`
- Package fingerprint: `3fcf9fbacc04680d56ceafb9eb4b3c9a3e70f8b41942d5c4e250f7a62d6ba36c`
- Row manifest hash: `cf27211e34f750f176234a3ce439c505e5a33ac2e45a9bee210de63c34a8840e`
- Migration hash: `0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90`
- Normalized rows: `15`
- Model eligible rows: `0`
- Duplicate rows: `0`

## Boundary

- No provider calls.
- No source fetches.
- No pricing observations writes.
- No eBay latest price writes.
- No public/app-visible pricing.
- No price rollups.
- No candidate writes.
- No raw snapshot writes.

## Dispositions

| Disposition | Rows |
| --- | ---: |
| quarantined_active_listing_context | 2 |
| review_required_active_listing | 13 |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-REFERENCE-ACTIVE-LISTING-NORMALIZED-EVIDENCE-APPLY-V1 apply only. Package fingerprint: 3fcf9fbacc04680d56ceafb9eb4b3c9a3e70f8b41942d5c4e250f7a62d6ba36c. Row manifest hash: cf27211e34f750f176234a3ce439c505e5a33ac2e45a9bee210de63c34a8840e. Active-listing normalized schema migration hash: 0c7c9ef9b750036f1ed9a2a0e0144b77fa147175ee12c971d91d18b84ff31a90. Scope: insert 15 review-only ebay_active normalized evidence rows into market_reference_normalized_evidence only, with model_eligible=false for every row. No candidate writes. No raw snapshot writes. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
