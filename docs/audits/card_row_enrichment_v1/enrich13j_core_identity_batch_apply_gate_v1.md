# ENRICH-13J Core Identity Batch Apply Gate V1

Generated: 2026-06-15T20:53:49.603Z

Mode: read-only batch apply gate.

This report reduces the five proven ENRICH-13 packages into one batch approval unit. It does not execute SQL and does not authorize a real apply.

## Summary

- Packages in batch: 5
- Unsafe package count: 0
- Ready for single batch approval: true
- Parent rows in batch: 124
- Child printings handled in batch: 343
- External mappings handled in batch: 124
- Blocked rows excluded: 208
- Batch fingerprint: `4f5268be40ce76f3569a81b7a86bb85fea7ecb2863d761dbdab70f10bdbad69f`
- Real apply authorized by this report: false

## Batch Packages

| Order | Package | Rows | Children | Mappings | Package fingerprint | SQL hash |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | ENRICH-13D1 | 56 | 168 | 56 | 9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2 | 00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212 |
| 2 | ENRICH-13E1 | 40 | 99 | 40 | 17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02 | bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d |
| 3 | ENRICH-13C1 | 20 | 60 | 20 | 6336e52e453641b1041a54e61313178e0998016f58a2c2df0e8a706f370e4566 | 43665f6292dc8269b6b24c846a00d144131aa4b33f65f7f099eb608bd4111ffc |
| 4 | ENRICH-13F1 | 4 | 12 | 4 | 8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b | 4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd |
| 5 | ENRICH-13G1 | 4 | 4 | 4 | 2a55568422b6a513dbfe6ca64ea662274acc697a3f6955e249e23c781b6641ac | a9b4550e4e3343dfee547af686468bb141f5d4dc2ad593809f1e7a96772c3a05 |

## Excluded Blockers

| Blocker | Rows | Status |
| --- | --- | --- |
| ENRICH-13B1 | 203 | blocked_domain_contract_required |
| ENRICH-13E-MANUAL-LUXRAY | 1 | blocked_manual_review |
| ENRICH-13F-BASE-VS-SUFFIX | 4 | blocked_split_owner_proof_required |

## Guardrails

- This is a batch approval gate only; it does not execute SQL.
- The batch is composed only from already-proven rollback dry-run packages.
- Each package SQL artifact must retain ROLLBACK and no COMMIT until a separate real-apply script is intentionally generated.
- Pocket/non-physical rows remain excluded.
- Luxray GL versus Luxray GL LV.X remains excluded.
- Base-number versus suffix-owner rows remain excluded.
- No migrations, image writes, global apply, cleanup, or unrelated enrichment are included.

## Stop Findings

None.

## Single Batch Approval Text

Use only after intentionally deciding to perform a real apply:

```text
Approve real ENRICH-13J-CORE-IDENTITY-BATCH apply only. Batch fingerprint: 4f5268be40ce76f3569a81b7a86bb85fea7ecb2863d761dbdab70f10bdbad69f. Scope: 124 parent dependency/identity rows across 5 proven packages, 343 child printings handled, 124 external mappings handled. Package fingerprints: ENRICH-13D1=9715c745f549bff135a0f8f18718e8d89dbcbc185309f11a5c474f68181368c2, ENRICH-13E1=17fffbc2ffe5831de01ed152c47c668e4c94c92ff36601e1f1cc7651b4dafc02, ENRICH-13C1=6336e52e453641b1041a54e61313178e0998016f58a2c2df0e8a706f370e4566, ENRICH-13F1=8d363c0d4eff9389606fa452090e234830c207438057cbf48733f110e67cdc5b, ENRICH-13G1=2a55568422b6a513dbfe6ca64ea662274acc697a3f6955e249e23c781b6641ac. SQL hashes: ENRICH-13D1=00319a0bea1ef96671d82c6c019fdc36c8ec38060bb21ac795798f8199097212, ENRICH-13E1=bb7cef1d447bca9d2d1e373b078f7bd73b8a60b40447e40aa6e43021a9195c0d, ENRICH-13C1=43665f6292dc8269b6b24c846a00d144131aa4b33f65f7f099eb608bd4111ffc, ENRICH-13F1=4b8b0a01d14d2b84efae86cc73799dc7e5427da9937dce502b348e9faa41e4bd, ENRICH-13G1=a9b4550e4e3343dfee547af686468bb141f5d4dc2ad593809f1e7a96772c3a05. Blocked rows excluded: 208. No global apply. No migrations. No image writes. No cleanup outside the listed package scopes.
```
