# PKG-08AA SWSH45SV Correction Guarded Dry Run V1

Rollback-only dry run for correcting the PKG-08Y Shining Fates Shiny Vault direction. No durable write was authorized or performed by this script.

## Status

- Dry-run status: `pkg08aa_swsh45sv_correction_completed_rolled_back_no_durable_change`
- Fingerprint: `2c18c98a4774bc445d7b8c4fad5f66a3c68199c70714ef843746b3b60d351c77`
- Target rows: 25
- Parent updates simulated: 25
- Child updates simulated: 25
- Deletes simulated: 0
- Inserts simulated: 0
- Durable DB writes performed: `false`
- Stop findings: 0

## Rollback Proof

- Before hash: `0e0a09bcebf494f9f66cb31f8ee11e604434d5c27c0875ea32256987089d4f5a`
- After hash: `0e0a09bcebf494f9f66cb31f8ee11e604434d5c27c0875ea32256987089d4f5a`
- Match: `true`

## Rows

| Number | Name | From Set | To Set | From Finish | To Finish | From GV | To GV |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SV023 | Galarian Darumaka | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV023-STD | GV-PK-SHF-SV023-HOLO |
| SV043 | Pincurchin | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV043-STD | GV-PK-SHF-SV043-HOLO |
| SV100 | Greedent | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV100-STD | GV-PK-SHF-SV100-HOLO |
| SV101 | Rookidee | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV101-STD | GV-PK-SHF-SV101-HOLO |
| SV102 | Corvisquire | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV102-STD | GV-PK-SHF-SV102-HOLO |
| SV103 | Wooloo | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV103-STD | GV-PK-SHF-SV103-HOLO |
| SV104 | Dubwool | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV104-STD | GV-PK-SHF-SV104-HOLO |
| SV105 | Rillaboom V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV105-STD | GV-PK-SHF-SV105-HOLO |
| SV106 | Rillaboom VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV106-STD | GV-PK-SHF-SV106-HOLO |
| SV107 | Charizard VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV107-STD | GV-PK-SHF-SV107-HOLO |
| SV108 | Centiskorch V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV108-STD | GV-PK-SHF-SV108-HOLO |
| SV109 | Centiskorch VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV109-STD | GV-PK-SHF-SV109-HOLO |
| SV110 | Lapras V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV110-STD | GV-PK-SHF-SV110-HOLO |
| SV111 | Lapras VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV111-STD | GV-PK-SHF-SV111-HOLO |
| SV112 | Toxtricity V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV112-STD | GV-PK-SHF-SV112-HOLO |
| SV113 | Toxtricity VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV113-STD | GV-PK-SHF-SV113-HOLO |
| SV114 | Indeedee V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV114-STD | GV-PK-SHF-SV114-HOLO |
| SV115 | Falinks V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV115-STD | GV-PK-SHF-SV115-HOLO |
| SV116 | Grimmsnarl V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV116-STD | GV-PK-SHF-SV116-HOLO |
| SV117 | Grimmsnarl VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV117-STD | GV-PK-SHF-SV117-HOLO |
| SV118 | Ditto V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV118-STD | GV-PK-SHF-SV118-HOLO |
| SV119 | Ditto VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV119-STD | GV-PK-SHF-SV119-HOLO |
| SV120 | Dubwool V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV120-STD | GV-PK-SHF-SV120-HOLO |
| SV121 | Eternatus V | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV121-STD | GV-PK-SHF-SV121-HOLO |
| SV122 | Eternatus VMAX | swsh4.5 | swsh45sv | normal | holo | GV-PK-SHF-SV122-STD | GV-PK-SHF-SV122-HOLO |

## Recommended Real Apply Approval Text

```text
Approve real PKG-08AA-SWSH45SV-CORRECTION apply only. Fingerprint: 2c18c98a4774bc445d7b8c4fad5f66a3c68199c70714ef843746b3b60d351c77. Scope: 25 parent relocations from swsh4.5 back to swsh45sv and 25 child finish updates from normal to holo in place; printing_gv_id STD -> HOLO; no deletes; no inserts; existing external mappings preserved. Dry-run proof: 0e0a09bcebf494f9f66cb31f8ee11e604434d5c27c0875ea32256987089d4f5a == 0e0a09bcebf494f9f66cb31f8ee11e604434d5c27c0875ea32256987089d4f5a. No global apply. No migrations. No merges. No unsupported cleanup. No quarantine.
```
