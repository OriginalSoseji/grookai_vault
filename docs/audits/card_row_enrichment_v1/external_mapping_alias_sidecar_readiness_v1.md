# External Mapping Alias Sidecar Readiness V1

Audit-only projection for preserving useful source aliases before any future external mapping deactivation.

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Sidecar created: false

## Totals

| metric | value |
| --- | --- |
| duplicate_groups | 5 |
| sidecar_ready_groups | 0 |
| blocked_groups | 5 |
| projected_sidecar_alias_rows | 0 |
| projected_canonical_mapping_deactivations_after_sidecar | 0 |

## Sidecar Readiness

| readiness | groups |
| --- | --- |
| blocked_canonical_source_id_not_unique | 3 |
| blocked_pocket_domain | 1 |
| blocked_source_owner_policy_needed | 1 |

## Projected Alias Kinds

_None._

## Ready Group Samples

_None._

## Blocked Group Samples

| source | set | number | name | readiness | reason |
| --- | --- | --- | --- | --- | --- |
| justtcg | A4a | 074 | Yamper | blocked_pocket_domain | Pocket product aliases require Pocket-specific sidecar governance. |
| justtcg | svp | 107 | Mareep | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| justtcg | svp | 108 | Flaaffy | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| justtcg | svp | 109 | Ampharos | blocked_canonical_source_id_not_unique | Expected exactly one non-product canonical source id; found 0. |
| tcgdex | cel25c | 15 | Venusaur | blocked_source_owner_policy_needed | This source requires source-specific suffix/terminology owner policy before sidecar projection. |

## Guardrails

- Do not create schema in this pass.
- Do not deactivate external_mappings until projected alias rows are preserved.
- Do not project suffix/base aliases without source-specific owner policy.
- Do not project Pocket aliases into English physical sidecar.
- Do not treat product aliases as canonical card identity.

Recommended next step: `keep_remaining_duplicate_mapping_debt_deferred_until_source_specific_adjudication`

Fingerprint: `afde6604424be33191a63eefd4300748289a8b88106797063b850371ff1f04fb`
