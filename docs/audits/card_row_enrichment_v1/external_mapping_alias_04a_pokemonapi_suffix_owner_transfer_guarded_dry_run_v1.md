# External Mapping Alias 04A PokemonAPI Suffix Owner Transfer Guarded Dry Run V1

Package: `EXTMAP-ALIAS-04A-POKEMONAPI-SUFFIX-OWNER-TRANSFER`

## Result

- Pass: true
- Mode: rollback_only_dry_run
- Transfer rows: 8
- Transferred rows: 8
- Transaction status: rolled_back
- Duplicate groups before: 13
- Duplicate groups inside transaction: 5
- Duplicate groups after: 13
- Package fingerprint: `4908bb9588c1666c7bce6ea921997b394ddd42a2a1b750196ebad0b724a84f22`
- Before hash: `72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70`
- After hash: `72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70`

## Transfers

| source | external_id | from | to |
| --- | --- | --- | --- |
| pokemonapi | xy10-105a | GV-PK-FCO-105 | GV-PK-FCO-105A |
| pokemonapi | xy3-55a | GV-PK-FFI-55 | GV-PK-FFI-55A |
| pokemonapi | xy4-24a | GV-PK-PHF-24 | GV-PK-PHF-24A |
| pokemonapi | xy4-65 | GV-PK-PHF-65A | GV-PK-PHF-65 |
| pokemonapi | xyp-XY150 | GV-PK-PR-XY-XY150A | GV-PK-PR-XY-XY150 |
| pokemonapi | xyp-XY198 | GV-PK-PR-XY-XY198A | GV-PK-PR-XY-XY198 |
| pokemonapi | xyp-XY200a | GV-PK-PR-XY-XY200 | GV-PK-PR-XY-XY200A |
| pokemonapi | xyp-XY67a | GV-PK-PR-XY-XY67 | GV-PK-PR-XY-XY67A |

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Rows deleted: 0
- Card parent writes: false
- Child printing writes: false
- Identity writes: false
- Image writes: false

## Stop Findings

_None._

## Approval Text

`Approve real EXTMAP-ALIAS-04A-POKEMONAPI-SUFFIX-OWNER-TRANSFER apply only. Fingerprint: 4908bb9588c1666c7bce6ea921997b394ddd42a2a1b750196ebad0b724a84f22. Scope: 8 PokemonAPI external_mapping owner transfers to suffix/base owner parents. Dry-run proof: 72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70 == 72e219e1823ca74d04bbabb7357e869d0c38cdcd657c1131e7ffd7fd49a0ce70; duplicate groups inside transaction 13 -> 5. No card_prints writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
