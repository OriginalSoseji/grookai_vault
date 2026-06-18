# External Mapping Duplicate Readiness V1

Audit-only readiness plan for the `external_mappings_source_card_duplicates` debt.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false

## Principle

Do not deactivate product aliases or suffix/base aliases until the source-specific owner policy is explicit.

## Totals

| metric | value |
| --- | --- |
| duplicate_groups | 5 |
| write_ready_groups | 0 |
| blocked_or_preserve_groups | 5 |
| ready_mapping_rows_in_groups | 0 |

## By Readiness Class

| readiness class | groups |
| --- | --- |
| justtcg_product_alias_preserve_until_sidecar | 3 |
| manual_source_specific_review | 1 |
| pocket_product_alias_blocked | 1 |

## Write-Ready Groups

_None._

## Blocked / Preserve Samples

| source | set | number | name | class |
| --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | pocket_product_alias_blocked |
| justtcg | svp | 107 | Mareep | justtcg_product_alias_preserve_until_sidecar |
| justtcg | svp | 108 | Flaaffy | justtcg_product_alias_preserve_until_sidecar |
| justtcg | svp | 109 | Ampharos | justtcg_product_alias_preserve_until_sidecar |
| tcgdex | cel25c | 15 | Venusaur | manual_source_specific_review |

Recommended next step: `create_product_alias_sidecar_policy_before_deactivation`

Fingerprint: `4337695645ff8808719c4f68c85e6676035e4df47713005ac5c2d286227fc960`
