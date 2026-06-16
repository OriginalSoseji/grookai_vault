# External Mapping Alias 01B Product Alias Preservation Real Apply V1

Package: `EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION`

## Result

- Pass: true
- Mode: real_apply
- Target alias rows: 214
- Inserted rows: 214
- Transaction status: committed
- Package fingerprint: `e8374bd891cc7ee12d38679fe201ee3673e8477bd289a568a2eea139ee540d95`
- Before hash: `2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3`
- After hash: `fc968401a2daf74ab13998306bed1f5ca45e690c3582a753e4dd014bd3bd6ff3`

## Alias Kinds

| alias_kind | rows |
| --- | --- |
| battle_academy_alias | 168 |
| prize_pack_alias | 34 |
| prerelease_alias | 6 |
| product_alias | 4 |
| league_alias | 2 |

## Safety

- Durable DB writes performed: true
- Migrations created: false
- `external_mappings` deactivated: 0
- Card parent writes: false
- Child printing writes: false
- Identity writes: false
- Deletes/merges: false
- Image writes: false

## Stop Findings

_None._

## Recommended Next Step

Prepare guarded dry-run for deactivating the preserved duplicate external_mappings rows now that aliases exist in the sidecar.

## Approval Text

_Not applicable for this report._
