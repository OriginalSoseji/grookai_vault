# MEE-REFERENCE-WAREHOUSE-DELTA-WRITER-V1

Generated: 2026-06-28T23:50:33.034Z
Mode: `guarded_run_missing_rows_only`
Fingerprint: `223764d836f5377daf93076a52432971af3c240f301e2c6fd541159d0022385d`

## Purpose

Run/dry-run the internal reference warehouse delta writer. It inventories available source artifacts, compares current warehouse source counts, and inserts only missing internal reference rows when explicitly enabled.

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
  "card_prints_writes": false,
  "card_printings_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "deletes": false,
  "upserts": false,
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Current Warehouse Counts

```json
{
  "market_reference_candidates": {
    "tcgdex_tcgplayer_reference": 110675,
    "tcgdex_cardmarket_reference": 200069,
    "pokemontcg_io_reference": 14338,
    "tcgcsv_reference": 7407
  },
  "market_reference_normalized_evidence": {
    "tcgdex_tcgplayer_reference": 110675,
    "tcgdex_cardmarket_reference": 200069,
    "pokemontcg_io_reference": 14338,
    "tcgcsv_reference": 7407
  }
}
```

## Artifact Inventory

```json
{
  "tcgdex": {
    "audit_path": "docs/audits/market_evidence_engine_v1/mee_tcgdex_reference_pricing_audit_2026-06-28T15-26-50-764Z.json",
    "candidate_manifest_path": null,
    "normalized_manifest_path": null,
    "projected_candidate_rows": 310744,
    "projected_normalized_rows": 310744,
    "projected_candidate_rows_by_source": {
      "tcgdex_cardmarket_reference": 200069,
      "tcgdex_tcgplayer_reference": 110675
    },
    "projected_normalized_rows_by_source": {
      "tcgdex_cardmarket_reference": 200069,
      "tcgdex_tcgplayer_reference": 110675
    },
    "warehouse_already_complete": true,
    "candidate_manifest_rows": null,
    "normalized_manifest_rows": null,
    "findings": []
  },
  "pokemontcg_io_reference": {
    "acquisition_path": "docs/audits/market_evidence_engine_v1/mee_06a_pokemontcg_io_reference_evidence_2026-06-25T17-34-20-477Z.json",
    "normalized_path": "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T19-55-05-157Z.json",
    "projected_candidate_rows": 3618,
    "projected_normalized_rows": 10720,
    "findings": []
  },
  "tcgcsv_reference": {
    "acquisition_path": "docs/audits/market_evidence_engine_v1/mee_06b_tcgcsv_reference_evidence_2026-06-25T17-45-49-629Z.json",
    "normalized_path": "docs/audits/market_evidence_engine_v1/mee_06c_normalized_reference_evidence_2026-06-25T17-45-57-604Z.json",
    "projected_candidate_rows": 7407,
    "projected_normalized_rows": 7407,
    "findings": []
  }
}
```

## Findings

- MEE_REFERENCE_WAREHOUSE_DELTA_ALLOW_RUN_not_set_to_1

## Delta Plan

```json
{
  "sources": [
    {
      "source": "pokemontcg_io_reference",
      "projected_candidate_rows": 3618,
      "projected_normalized_rows": 10720,
      "existing_candidate_rows": 14338,
      "existing_normalized_rows": 14338,
      "missing_candidate_rows": 0,
      "missing_normalized_rows": 0,
      "unresolved_normalized_rows": 0,
      "ready_for_insert": true
    },
    {
      "source": "tcgcsv_reference",
      "projected_candidate_rows": 7407,
      "projected_normalized_rows": 7407,
      "existing_candidate_rows": 7407,
      "existing_normalized_rows": 7407,
      "missing_candidate_rows": 0,
      "missing_normalized_rows": 0,
      "unresolved_normalized_rows": 0,
      "ready_for_insert": true
    }
  ],
  "total_missing_candidate_rows": 0,
  "total_missing_normalized_rows": 0
}
```

## Apply Results

```json
[]
```

## Next

Generate complete TCGDex row manifests on the droplet reference-refresh pass, then implement the guarded missing-row insert mode using these artifact and readback rules.
