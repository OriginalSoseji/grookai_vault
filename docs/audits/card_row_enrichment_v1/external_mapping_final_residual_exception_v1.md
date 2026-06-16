# External Mapping Final Residual Exception V1

This report documents the final five `external_mappings_source_card_duplicates` groups left after the alias sidecar governance cleanup.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Deletions performed: false

## Summary

| metric | value |
| --- | --- |
| `external_mappings_source_card_duplicates` | 5 |
| `external_mappings_source_external_duplicates` | 0 |
| deterministic write-ready groups | 0 |
| blocked exception groups | 5 |
| public identity impact | none |
| printing truth impact | none |
| search truth impact | none |

These rows are preserved because no deterministic canonical source-owner rule currently exists. They must not be auto-deactivated, deleted, merged, or treated as public card truth until source-specific governance exists.

## Exception Groups

| source | set | card | GV-ID | mappings | reason |
| --- | --- | --- | --- | --- | --- |
| JustTCG | A4a | Yamper #074 | `GV-TCGP-A4A-074` | 2 | Pocket product aliases require Pocket-specific governance. |
| JustTCG | svp | Mareep #107 | `GV-PK-PR-SV-107` | 4 | All active routes are Battle Academy product aliases; no canonical non-product owner route exists. |
| JustTCG | svp | Flaaffy #108 | `GV-PK-PR-SV-108` | 3 | All active routes are Battle Academy product aliases; no canonical non-product owner route exists. |
| JustTCG | svp | Ampharos #109 | `GV-PK-PR-SV-109` | 2 | All active routes are Battle Academy product aliases; no canonical non-product owner route exists. |
| TCGdex | cel25c | Venusaur #15 | `GV-PK-CEL-15CC` | 2 | Classic Collection source IDs use suffix-like identifiers that do not map deterministically to printed number 15 under current policy. |

## Required Future Rules

- Pocket product/source alias governance
- JustTCG product-only alias owner policy
- TCGdex Classic Collection source alias policy

## Allowed State

These rows may remain active as documented deferred governance debt. They do not affect canonical card identity, child printing truth, or public search truth.

## Forbidden Actions

- Do not auto-deactivate these rows.
- Do not delete these rows.
- Do not infer canonical owner from product alias strings.
- Do not collapse Pocket aliases into English physical canon.

## References

- Triage: `docs/audits/card_row_enrichment_v1/external_mapping_duplicate_triage_v1.json`
- Residual governance: `docs/audits/card_row_enrichment_v1/external_mapping_alias_residual_governance_plan_v1.json`
- Checkpoint: `docs/checkpoints/card_row_enrichment/20260616_external_mapping_alias_governance_checkpoint_v1.md`

Fingerprint: `9d5f12ebf4c40f88a15020cdaea415bf3f23a8e60b56c4c8c0cf14acae0fd2fb`
