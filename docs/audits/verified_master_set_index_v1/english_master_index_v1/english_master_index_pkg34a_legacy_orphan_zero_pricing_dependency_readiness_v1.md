# PKG-34A Legacy Orphan Zero Pricing Dependency Readiness V1

Read-only readiness report for the two remaining `legacy_orphan` rows that were blocked by pricing/eBay dependencies.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, or global apply are authorized by this report.

| metric | value |
| --- | --- |
| package_id | PKG-34A-LEGACY-ORPHAN-ZERO-PRICING-DEPENDENCY-READINESS |
| fingerprint | f52b3a6486d2f47857139474e6f72e71dacb6f699df2dd80f3d38d3df6cea471 |
| target_rows | 2 |
| eligible_rows | 2 |
| blocked_rows | 0 |
| db_writes_performed | false |
| migrations_created | false |

## Classification Counts

| classification | rows |
| --- | --- |
| legacy_orphan_zero_pricing_delete_candidate | 2 |

## Eligible Rows

| number | name | parent | child | species | pricing_job |
| --- | --- | --- | --- | --- | --- |
| 68 | Sandshrew | 070f8fd3-3aef-4e52-b84e-1b7e64673a96 | 293fa0c1-b221-4352-b7e8-83692613d771 | 0d5ce239-d675-4b8e-9c3d-b7a1de6d16f0 | 04c6c4c7-89cc-42cc-878b-177974a0699e |
| 84 | Garganacl | 02a9c42c-5303-4d7c-85c9-886497097710 | 31b72a5d-f261-4f8d-8e5d-12e73a3abead | e05611f3-6753-43ba-881a-52e6e61e6afc | 518d4cb1-5eae-49ba-9e4c-161a0a68bae5 |

## Governance Rule

Rows are eligible only when every pricing/eBay dependency is zero-signal generated debris: zero listings, zero samples, null prices, low confidence, completed scheduled job, no requester, and no other FK references.
