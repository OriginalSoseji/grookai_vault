# IMG-18A-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE-DRY-RUN

Generated: 2026-06-18T19:09:40.650Z

Status: dry-run only. No DB writes. No migrations. No storage uploads.

## Scope

- target: child card_printings only
- set: MEP Black Star Promos
- modifier: Pokemon Center Stamp
- rows: 4
- ready rows: 4
- blocked rows: 0
- image confidence after apply: representative
- exact stamped image claim: false

This package closes current English physical missing-display rows by routing stamped child printings to already-stored same-card base representative images.

It does not claim the displayed image shows the Pokemon Center stamp.

## Proof

```text
fingerprint: eb74103e5a208ed1ada8042aada5a98df3c4478eb783e6afce54c8a9b8b80e66
sql_hash: 45bb60b18bdf2d0cca3dbc723628d11801d6606c218c3db353920954207cd5c5
db_writes_performed: false
migrations_created: false
storage_uploads_performed: false
parent_writes: false
deletes: false
merges: false
```

## Ready Rows

| set | number | card | printing | source base printing | planned status |
| --- | --- | --- | --- | --- | --- |
| mep | 022 | Charcadet | GV-PK-MEP-022-POKEMON-CENTER-STAMP-HOLO | GV-PK-MEP-022-HOLO | representative_shared_stamp |
| mep | 031 | N's Zekrom | GV-PK-MEP-031-POKEMON-CENTER-STAMP-HOLO | GV-PK-MEP-031-HOLO | representative_shared_stamp |
| mep | 070 | Tyrunt | GV-PK-MEP-070-POKEMON-CENTER-STAMP-HOLO | GV-PK-MEP-070-HOLO | representative_shared_stamp |
| mep | 80 | Fennekin | GV-PK-MEP-080-POKEMON-CENTER-STAMP-HOLO | GV-PK-MEP-80-HOLO | representative_shared_stamp |

## Source Evidence URLs

| card | source URL |
| --- | --- |
| Charcadet #022 | https://www.tcgplayer.com/product/666538/pokemon-me-mega-evolution-promo-charcadet-022 |
| N's Zekrom #031 | https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/mep/31/ |
| Tyrunt #070 | https://www.tcgplayer.com/product/685562/pokemon-me-mega-evolution-promo-tyrunt-070 |
| Fennekin #80 | https://www.tcgplayer.com/product/694695/pokemon-me-mega-evolution-promo-fennekin-080-pokemon-center-exclusive |

## Blocked Rows

_None._

## Approval Text

```text
Approve real IMG-18B-MEP-POKEMON-CENTER-STAMP-REPRESENTATIVE-CHILD-IMAGE apply only. Fingerprint: eb74103e5a208ed1ada8042aada5a98df3c4478eb783e6afce54c8a9b8b80e66. SQL hash: 45bb60b18bdf2d0cca3dbc723628d11801d6606c218c3db353920954207cd5c5. Scope: 4 child-only representative image updates for MEP Pokemon Center stamped holo rows; exact stamped image claim=false; source base images preserved from same set/number/name MEP child printings. No parent writes. No storage uploads. No deletes. No merges. No migrations. No global apply.
```
