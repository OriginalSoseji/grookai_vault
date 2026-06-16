# External Mapping Alias 02A Residual Alias Cleanup Guarded Dry Run V1

Package: `EXTMAP-ALIAS-02A-RESIDUAL-ALIAS-PRESERVATION-CLEANUP`

## Result

- Pass: true
- Mode: rollback_only_dry_run
- Alias rows: 55
- Inserted aliases: 55
- Deactivated mappings: 55
- Transaction status: rolled_back
- Duplicate groups before: 70
- Duplicate groups inside transaction: 16
- Duplicate groups after: 70
- Package fingerprint: `95f6d2d3ac13446413508db37fd0d0a0d2124c19b1c591f03a57dfdc3c9b4ef9`
- Before hash: `88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403`
- After hash: `88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403`

## By Alias Kind

| alias_kind | rows |
| --- | --- |
| suffix_alias | 41 |
| terminology_alias | 13 |
| text_alias | 1 |

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

`Approve real EXTMAP-ALIAS-02A-RESIDUAL-ALIAS-PRESERVATION-CLEANUP apply only. Fingerprint: 95f6d2d3ac13446413508db37fd0d0a0d2124c19b1c591f03a57dfdc3c9b4ef9. Scope: 55 residual alias sidecar inserts and 55 preserved duplicate external_mappings active=false updates. Dry-run proof: 88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403 == 88ff35a063c5ed0c821ce7928899a418cab4bc9a3f85b2c8e698b7da64547403; duplicate groups inside transaction 70 -> 16. No card_prints writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
