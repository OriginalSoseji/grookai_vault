# GVVI Allocator And Instance Create V1 Note

- Created `public.generate_gv_vi_id_v1(owner_code, instance_index)`.
- Created `public.admin_vault_instance_create_v1(...)` as the authoritative backend-only instance creation RPC.
- GVVI format is:
  - `GVVI-{OWNER_CODE}-{INSTANCE_INDEX}`
  - instance index is left-padded to width `6`
- Allocation is owner-scoped only and uses `public.vault_owners.next_instance_index`.
- The allocator is concurrency-safe because the owner namespace row is locked before the instance row is inserted and the counter is advanced only after a successful insert.
- This stage does not backfill legacy `vault_items`, does not split qty buckets, and does not cut over any read or write paths.
