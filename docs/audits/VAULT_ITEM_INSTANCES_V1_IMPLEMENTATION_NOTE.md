# Vault Item Instances V1 Implementation Note

- Created `public.vault_item_instances` as the new shadow owned-instance lane.
- The table is one-row-per-owned-object and supports:
  - raw items via `card_print_id`
  - slab items via `slab_cert_id`
- Legacy `public.vault_items` remains unchanged and still carries the active bucketed `qty` model.
- `legacy_vault_item_id` exists only for future lineage and backfill support.
- `gv_vi_id` is present as a nullable future ownership identity column, but no allocation or backfill occurs in this stage.
- Backfill, write-path cutover, read-path cutover, and legacy bucket retirement remain deferred.
