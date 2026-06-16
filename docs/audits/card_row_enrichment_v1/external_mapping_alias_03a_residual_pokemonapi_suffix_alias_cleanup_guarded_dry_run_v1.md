# External Mapping Alias 02A Residual Alias Cleanup Guarded Dry Run V1

Package: `EXTMAP-ALIAS-03A-RESIDUAL-POKEMONAPI-SUFFIX-ALIAS-CLEANUP`

## Result

- Pass: true
- Mode: rollback_only_dry_run
- Alias rows: 3
- Inserted aliases: 3
- Deactivated mappings: 3
- Transaction status: rolled_back
- Duplicate groups before: 16
- Duplicate groups inside transaction: 13
- Duplicate groups after: 16
- Package fingerprint: `f9b89f1c9ee97bc65abf6cdf3d31c26b0f810c7c4dacd502ffe2c6f6a082ba09`
- Before hash: `aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270`
- After hash: `aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270`

## By Alias Kind

| alias_kind | rows |
| --- | --- |
| suffix_alias | 3 |

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

`Approve real EXTMAP-ALIAS-03A-RESIDUAL-POKEMONAPI-SUFFIX-ALIAS-CLEANUP apply only. Fingerprint: f9b89f1c9ee97bc65abf6cdf3d31c26b0f810c7c4dacd502ffe2c6f6a082ba09. Scope: 3 residual alias sidecar inserts and 3 preserved duplicate external_mappings active=false updates. Dry-run proof: aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270 == aa3b4955680f22227867f5708b9aeb1868ab74636731de856dd2fa366c045270; duplicate groups inside transaction 16 -> 13. No card_prints writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
