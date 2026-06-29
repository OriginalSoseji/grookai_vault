# MEE-REFERENCE-SOURCE-REFRESH-WORKER-V1

Generated: 2026-06-28T22:18:56.257Z
Mode: `dry_run`
Fingerprint: `3e5287f7d3d375fe563646cd2d2da14ee838f0396630065099bb17abdc901820`

## Summary

- adapters: 5
- free reference adapters: 4
- findings: 0

## Boundary

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "db_writes": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "identity_table_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "migrations": false,
  "global_apply": false
}
```

## Execution

```json
[
  {
    "source": "ebay_active",
    "command": "node scripts/audits/market_listing_nightly_ingest_run_v1.mjs --run",
    "skipped": true,
    "reason": "dry_run"
  },
  {
    "source": "tcgdex_tcgplayer_reference",
    "command": "node scripts/audits/market_reference_tcgdex_pricing_audit_v1.mjs --write-row-manifests",
    "skipped": true,
    "reason": "dry_run"
  },
  {
    "source": "tcgdex_cardmarket_reference",
    "command": "node scripts/audits/market_reference_tcgdex_pricing_audit_v1.mjs --write-row-manifests",
    "skipped": true,
    "reason": "dry_run"
  },
  {
    "source": "pokemontcg_io_reference",
    "command": "node scripts/audits/market_evidence_engine_pokemontcg_io_reference_acquisition_v1.mjs",
    "skipped": true,
    "reason": "dry_run"
  },
  {
    "source": "tcgcsv_reference",
    "command": "node scripts/audits/market_evidence_engine_tcgcsv_reference_acquisition_v1.mjs --refresh-cache",
    "skipped": true,
    "reason": "dry_run"
  }
]
```

## Findings

- none
