# External Mapping Alias 01C Preserved Mapping Deactivation Guarded Dry Run V1

Package: `EXTMAP-ALIAS-01C-PRESERVED-MAPPING-DEACTIVATION`

## Result

- Pass: true
- Mode: rollback_only_dry_run
- Target deactivations: 214
- Deactivated rows: 214
- Transaction status: rolled_back
- Package fingerprint: `c8f4a94af4883968d56d9e6105ab48e7c9f6f38c0fa60d975d024798a8ac80c2`
- Before hash: `d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c`
- After hash: `d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c`
- Source/card duplicate groups before: 169
- Source/card duplicate groups inside transaction: 70
- Source/card duplicate groups after: 169

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
- Rows deleted: 0
- Card parent writes: false
- Child printing writes: false
- Identity writes: false
- Alias sidecar writes: false
- Image writes: false

## Stop Findings

_None._

## Recommended Next Step

If pass is true, run this script with --apply to deactivate the preserved duplicate external_mappings rows.

## Approval Text

`Approve real EXTMAP-ALIAS-01C-PRESERVED-MAPPING-DEACTIVATION apply only. Fingerprint: c8f4a94af4883968d56d9e6105ab48e7c9f6f38c0fa60d975d024798a8ac80c2. Scope: 214 preserved duplicate external_mappings active=false updates protected by 214 sidecar alias rows. Dry-run proof: d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c == d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c; duplicate groups inside transaction 169 -> 70. No card_prints writes. No child writes. No identity writes. No alias sidecar writes. No deletes. No merges. No migrations. No image writes. No global apply.`
