# Pocket GV-ID Guarded Dry Run V1

Rollback-only proof for resolving deterministic Pocket source-alias duplicates and assigning `GV-TCGP-*` IDs.

## Safety

- Rollback only: true
- DB writes persisted: false
- Physical rows targeted: false
- Migrations created: false

## Totals

| metric | value |
| --- | --- |
| starting_pocket_parent_rows | 3150 |
| source_alias_duplicate_groups | 1138 |
| surviving_pocket_parent_targets | 2012 |
| surviving_pocket_child_targets | 6036 |

## Proof

| metric | value |
| --- | --- |
| duplicate_mappings_transferred | 1138 |
| duplicate_printing_mappings_deleted | 0 |
| duplicate_identity_rows_deleted | 0 |
| duplicate_trait_rows_deleted | 1138 |
| duplicate_species_rows_deleted | 1053 |
| duplicate_children_deleted | 3414 |
| duplicate_parents_deleted | 1138 |
| pocket_parent_gv_ids_updated | 2012 |
| pocket_child_printing_gv_ids_updated | 6036 |

Fingerprint: `75e99091084a71d1e8780136d20eeafb4660ef9af3390fbf601191bf6c7902f7`

Dry-run proof: `89f59875340da2133a55675c5dcc7efac976a86df3643f30f4e6594dbcf883fc`

## Approval Phrase

`Approve real POCKET-GVID-01-SOURCE-ALIAS-CLEANUP-AND-GVID-BACKFILL apply only. Fingerprint: 75e99091084a71d1e8780136d20eeafb4660ef9af3390fbf601191bf6c7902f7. Dry-run proof: 89f59875340da2133a55675c5dcc7efac976a86df3643f30f4e6594dbcf883fc. Scope: 1138 Pocket source-alias duplicate parent cleanups, 2012 Pocket parent GV-ID updates, 6036 Pocket child printing GV-ID updates. No physical rows. No migrations. No image writes. No global apply.`
