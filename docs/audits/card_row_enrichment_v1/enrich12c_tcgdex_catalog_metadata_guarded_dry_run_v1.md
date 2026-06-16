# ENRICH-12C TCGdex Catalog Metadata Guarded Dry Run V1

- Pass: true
- Candidate rows: 60
- Target parent rows: 52
- Blocked rows: 8
- Updated inside transaction: 52
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `8f62b5ff6513a7975fe46c13d13cee8e09dbdb0ee13b2936e351dd02e4127a62`
- After rollback hash: `8f62b5ff6513a7975fe46c13d13cee8e09dbdb0ee13b2936e351dd02e4127a62`
- Package fingerprint: `9db306d247dbcfbe8c823ba27098821f7e47f2d630fcfc6547350520df75e388`

## Accepted By Set

| set_code | rows |
| --- | --- |
| mep | 42 |
| xya | 6 |
| g1 | 1 |
| sm4 | 1 |
| swshp | 1 |
| xy7 | 1 |

## Blocked By Reason

| reason | rows |
| --- | --- |
| source_name_mismatch | 8 |

## Approval Text

`Approve real ENRICH-12C-TCGDEX-CATALOG-METADATA-BACKFILL apply only. Fingerprint: 9db306d247dbcfbe8c823ba27098821f7e47f2d630fcfc6547350520df75e388. Scope: 52 null-only card_prints catalog metadata updates from exact active TCGdex source mappings. Dry-run proof: 8f62b5ff6513a7975fe46c13d13cee8e09dbdb0ee13b2936e351dd02e4127a62 == 8f62b5ff6513a7975fe46c13d13cee8e09dbdb0ee13b2936e351dd02e4127a62. No non-null overwrites. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
