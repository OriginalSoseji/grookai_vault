# External Mapping Alias 01B Product Alias Preservation Guarded Dry Run V1

Package: `EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION`

## Result

- Pass: true
- Mode: rollback_only_dry_run
- Target alias rows: 214
- Inserted rows: 214
- Transaction status: rolled_back
- Package fingerprint: `e8374bd891cc7ee12d38679fe201ee3673e8477bd289a568a2eea139ee540d95`
- Before hash: `2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3`
- After hash: `2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3`

## Alias Kinds

| alias_kind | rows |
| --- | --- |
| battle_academy_alias | 168 |
| prize_pack_alias | 34 |
| prerelease_alias | 6 |
| product_alias | 4 |
| league_alias | 2 |

## Safety

- Durable DB writes performed: false
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

If pass is true, run this script with --apply to preserve aliases in public.external_mapping_aliases.

## Approval Text

`Approve real EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION apply only. Fingerprint: e8374bd891cc7ee12d38679fe201ee3673e8477bd289a568a2eea139ee540d95. Scope: 214 external_mapping_aliases inserts preserving product/source aliases before duplicate mapping deactivation. Dry-run proof: 2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3 == 2f44aec6549f670fee75f6504f139d917ae13eede3a51a70eaa24a727ddc55e3. No card_prints writes. No child writes. No identity writes. No external_mappings deactivation. No deletes. No merges. No migrations. No image writes. No global apply.`
