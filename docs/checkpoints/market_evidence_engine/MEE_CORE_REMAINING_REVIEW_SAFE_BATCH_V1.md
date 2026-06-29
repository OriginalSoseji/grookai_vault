# MEE-CORE-REMAINING-REVIEW-SAFE-BATCH-V1

## Status

- Package fingerprint: `da9936d9d47a22fe6221fd15fe05fb2729e82d76b40b5fca1d66de873a50deb0`
- Status: `ready_for_single_safe_internal_apply`
- Target rows: `933`

## Action Counts

```json
{
  "defer_more_evidence": 911,
  "block_evidence": 18,
  "defer_active_market_evidence": 4
}
```

## Hashes

```json
{
  "row_manifest_sha256": "107d28f882644c5e39e6c231270aaab9fc699cc858b14570ffa8e1b4b7cb17dd",
  "apply_sql_sha256": "dd7152efd5ad4bd71d20651d9b28f992624e5894091de12c56420dd0a783c6a3",
  "preflight_sql_sha256": "b2848c49b1d08a5feb013e8f0fe8730d85bc02dc89e06f4e411dda106070624b",
  "readback_sql_sha256": "7d3a178e1fd2e89ba2554dbb29bd6c5298c794ba2125b67cd50d171b70c93f68",
  "rollback_sql_sha256": "4ae0f07fe385a533312e0c65a6d66c1aba65d3407499ccc5b101605fd28c05bf"
}
```

## Scope

This package is one safe internal cleanup batch only.

It excludes raw/single and slab candidate confirmation.

It does not publish prices and does not create market truth.
