# External Mapping Alias 01C Preserved Mapping Deactivation Real Apply V1

Package: `EXTMAP-ALIAS-01C-PRESERVED-MAPPING-DEACTIVATION`

## Result

- Pass: true
- Mode: real_apply
- Target deactivations: 214
- Deactivated rows: 214
- Transaction status: committed
- Package fingerprint: `c8f4a94af4883968d56d9e6105ab48e7c9f6f38c0fa60d975d024798a8ac80c2`
- Before hash: `d78c98a055aa790f82ef2da5696f3a12db9407cb52e83cb41bf96bdea0f8e07c`
- After hash: `569b47ca8f7704121b115745a09d37d2ebdf25b3a100ccedc240a52dcf705fb1`
- Source/card duplicate groups before: 169
- Source/card duplicate groups inside transaction: 70
- Source/card duplicate groups after: 70

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
- Rows deleted: 0
- Card parent writes: false
- Child printing writes: false
- Identity writes: false
- Alias sidecar writes: false
- Image writes: false

## Stop Findings

_None._

## Recommended Next Step

Regenerate card row enrichment status and run preflight to confirm external_mappings_source_card_duplicates dropped to the blocked-only residual.

## Approval Text

_Not applicable for this report._
