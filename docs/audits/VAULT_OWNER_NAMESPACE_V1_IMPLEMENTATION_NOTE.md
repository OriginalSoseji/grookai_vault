# Vault Owner Namespace V1 Implementation Note

Status: implemented as schema only.  
Scope: owner namespace foundation for future GVVI allocation.  
Out of scope: GVVI issuance, vault item normalization, slab ownership integration, UI adoption.

## What Was Created
- `public.vault_owners`
- `public.generate_owner_code_v1()`
- `public.ensure_vault_owner_v1(uuid)`

## Why OWNER_CODE Lives Here
- `owner_code` is universal ownership namespace state.
- It must exist independently of public profile settings and independently of authentication identifiers.
- A dedicated 1:1 table keyed to `auth.users` keeps owner namespace stable and separate from profile, sharing, and vault item row semantics.

## Why GVVI Is Not Implemented Yet
- Current `vault_items` rows still represent quantity-bucket ownership, not universal per-instance ownership.
- GVVI allocation is deferred until vault item normalization is implemented.

## Why next_instance_index Exists Already
- GVVI allocation must be per owner namespace.
- `next_instance_index` reserves allocator state now so future issuance does not depend on object counts.

## Explicit Deferral
- No `vault_items` changes were made in this step.
- No GVVI ids were minted in this step.
- Slab ownership integration remains deferred.
