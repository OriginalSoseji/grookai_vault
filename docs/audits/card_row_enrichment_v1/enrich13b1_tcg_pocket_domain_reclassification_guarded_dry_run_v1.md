# ENRICH-13B1 TCG Pocket Domain Reclassification Guarded Dry Run V1

Package: `ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION`

## Result

- Pass: true
- Target sets: 2
- Updated sets inside transaction: 2
- Updated parents inside transaction: 203
- Deactivated active identities inside transaction: 203
- Dry-run status: completed_rolled_back_no_durable_change
- Before hash: `048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41`
- After rollback hash: `048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41`
- Package fingerprint: `5f5ebd12c51c5f7da47a7ccf0b98c55c377af8dc5adcb194357d51c419ac6ed0`

## Safety

- Durable DB writes performed: false
- Migrations created: false
- Child writes: false
- GV-ID writes: false
- External mapping/species/trait writes: false
- Deletes/merges: false
- Image writes: false

## Target Sets

| set_code | set_name | parents | children | active identities | active mappings |
| --- | --- | --- | --- | --- | --- |
| A3a | Extradimensional Crisis | 103 | 309 | 103 | 103 |
| P-A | Promos-A | 100 | 300 | 100 | 100 |

## Stop Findings

_None._

## Approval Text

`Approve real ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION apply only. Fingerprint: 5f5ebd12c51c5f7da47a7ccf0b98c55c377af8dc5adcb194357d51c419ac6ed0. Scope: 2 Pocket-like set domain reclassifications for A3a/Extradimensional Crisis and P-A/Promos-A; updates sets.source.domain, sets.identity_domain_default, 203 card_prints.identity_domain rows, and deactivates 203 active card_print_identity rows because excluded Pocket rows cannot remain active physical identities. Dry-run proof: 048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41 == 048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41. No child writes. No GV-ID writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.`
