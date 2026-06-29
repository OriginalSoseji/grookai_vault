# MEE-REFERENCE-SOURCE-REFRESH-WORKER-V1

Generated: 2026-06-28T23:00:45.584Z
Mode: `dry_run`
Fingerprint: `55cae63a7976c7d8ce723a7748dcd18ae30786b21c780cbe02eb7419de788690`

## Summary

- adapters: 4
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
