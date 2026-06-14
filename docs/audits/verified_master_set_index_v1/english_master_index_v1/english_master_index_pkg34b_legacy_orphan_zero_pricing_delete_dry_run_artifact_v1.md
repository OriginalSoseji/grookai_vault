# PKG-34B Legacy Orphan Zero Pricing Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-34A zero-pricing legacy orphan readiness.

No DB writes were committed. No migrations, quarantine, merges, unsupported cleanup, or global apply are authorized by this artifact.

| metric | value |
| --- | --- |
| package_id | PKG-34B-LEGACY-ORPHAN-ZERO-PRICING-DELETE |
| fingerprint | cf3b0e774dc617aff711c67826c4ade5485e6beb2e18c396bdbc603a2099997b |
| source_readiness_fingerprint | f52b3a6486d2f47857139474e6f72e71dacb6f699df2dd80f3d38d3df6cea471 |
| target_rows | 2 |
| pricing_dependency_deletes_in_dry_run | 8 |
| species_mapping_deletes_in_dry_run | 2 |
| child_deletes_in_dry_run | 2 |
| parent_deletes_in_dry_run | 2 |
| sql_hash | a00c8e21d85fc49ba606610975e843424f50b6715541a52a620e7028b90c923f |
| dry_run_sql | docs\sql\english_master_index_pkg34b_legacy_orphan_zero_pricing_delete_guarded_dry_run_transaction_v1.sql |
| db_writes_committed | false |
| migrations_created | false |
