# COMPATIBILITY_IDENTITY_V2

## Status

DEFINED

## Scope

This contract defines the next compatibility-identity model for Grookai Vault after instance-truth cutover.

It is a design and audit artifact only.

It does not change:

- schema
- migrations
- runtime code
- UI

It defines how raw and slab ownership can coexist safely while preserving the current platform.

## 1. Current Model (As-Is)

Current repo-truth behavior:

```text
vault_items
-> compatibility bucket / ownership episode anchor
-> one active row per user + card
-> still drives:
   - quantity updates
   - collector row compatibility identity
   - UI state keyed by vault_item_id

vault_item_instances
-> canonical owned objects
-> one row per owned object
-> supports both raw and slab objects
-> points back to vault_items via legacy_vault_item_id when available
```

Current conflict:

```text
raw instance(s) and slab instance(s) are both valid active owned objects
for the same user + card_print_id

but vault_items still assumes one active bucket per user + card
```

Repo evidence:

- [20260313153000_vault_items_archival_ownership_episodes_v1.sql](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql)
- [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql)
- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts)
- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)

## 2. Core Issue

The incompatibility is structural, not cosmetic.

Current conceptual constraint:

```text
1 active vault_items row per user + card
```

Current canonical reality:

```text
the system supports multiple active owned object types for the same card:
- raw instance(s)
- slab instance(s)
```

Result:

```text
the compatibility layer blocks valid ownership states
```

That means the following cannot be modeled safely under the current bucket assumption:

- a user owning raw copies and a slab of the same card at the same time
- collector rows that distinguish raw vs slab as separate active owned objects
- object-aware mutation flows that should target one owned object subtype without collapsing into a single bucket

## 3. V2 Design Principle

V2 rule:

```text
vault_items is not the container of truth

vault_items = ownership episode anchor only

vault_item_instances = canonical owned objects
```

Implications:

- `vault_items` persists for compatibility, history, and legacy foreign-key anchoring
- `vault_item_instances` remains the only active ownership truth
- collector rows, mutation targeting, and future slab entry must be defined from instances first

## 4. New Ownership Model

### 4.1 Multiple Active Ownership Episodes Allowed

V2 conceptual model:

```text
User can have:

vault_items:
- episode A (raw)
- episode B (slab)

both active
```

This removes the invalid conceptual rule:

```text
1 active vault_items row per user + card
```

V2 does not require immediate schema removal in this document.
It defines the target semantic model that future implementation must honor.

### 4.2 Instance-First Truth

All ownership truth derives from:

```text
vault_item_instances
```

Each instance represents exactly one owned object:

```text
raw object
or
slab object
```

Subtype is determined from canonical object identity:

- raw instance:
  - `card_print_id` present
  - `slab_cert_id` null
- slab instance:
  - `slab_cert_id` present
  - linked to `slab_certs.card_print_id`

### 4.3 Compatibility Layer Becomes Derived, Not Authoritative

V2 rule:

```text
collector rows are derived from instances
not from single bucket rows
```

`vault_items` remains attachable as a representative episode anchor where runtime compatibility still requires one.

## 5. Collector Read Model V2

Current broken assumption:

```text
group by one compatibility row per card
```

V2 read model:

```text
group by canonical card identity
+ subtype grouping
+ instance aggregation
```

Minimum canonical collector shape:

```ts
{
  card_print_id: string
  total_count: number
  raw_count: number
  slab_items: Array<{
    gv_vi_id: string
    grader: string
    grade: string
    cert_number: string
  }>
}
```

Required semantic rules:

- raw and slab must be allowed to coexist for one `card_print_id`
- slab objects must not be collapsed into raw count
- slab objects must remain object-aware, not bucket-aware
- compatibility anchors may still be attached per rendered row where legacy runtime needs them

### Stable Identity Semantics

V2 collector identity is:

```text
canonical row identity = instance-derived
compatibility anchor = attached explicitly when needed
```

This means:

- UI state should stop assuming `vault_item_id` is the unique primary identity for collector rows
- where a compatibility anchor is still required, it must be labeled as compatibility-only

## 6. Mutation Model V2

### 6.1 Raw Add / Remove

```text
+1 raw -> create raw instance
-1 raw -> archive raw instance
```

### 6.2 Slab Add

```text
create slab instance
-> does not affect raw instances
```

### 6.3 No Bucket-Driven Mutation

V2 rule:

```text
vault_items is no longer the mutation entry point
```

Mutation targets must become object-aware and instance-aware:

- raw mutation targets raw instances
- slab mutation targets slab instances
- compatibility rows mirror or anchor; they do not define mutation truth

## 7. Backward Compatibility

### 7.1 Keep vault_items

`vault_items` remains in the system because it still serves real purposes:

- ownership episode history
- scanner and condition lineage
- user media anchoring
- public/share compatibility
- legacy runtime references

V2 does not remove it.

V2 changes its role:

```text
keep vault_items
but stop treating active uniqueness as the governing ownership model
```

### 7.2 Compatibility Mapping

Where existing code expects:

```text
vault_item_id
```

V2 allows:

```text
derived or representative anchor
```

Allowed compatibility strategies:

- attach the originating ownership episode if it exists
- attach the first active compatible episode for that subtype
- attach a representative anchor for legacy-only flows

Required rule:

```text
representative anchor is compatibility only
never canonical object truth
```

## 8. Transition Rules

Safe transition order:

1. Stop relying on the single-active-bucket assumption in all new code.
2. Move collector read models to instance-first grouping.
3. Preserve existing flows by attaching compatibility anchors where still required.
4. Only remove or alter uniqueness constraints in a later migration once runtime dependency is gone.

What new code must not do:

- assume one active `vault_items` row per user/card
- assume one `vault_item_id` can represent all active ownership states for a card
- use `vault_items.qty` as a truth source

## 9. Risk Analysis

### Risks Addressed

- raw + slab coexistence becomes valid
- slab entry is unblocked conceptually
- future pricing and marketplace logic can stay object-aware
- collector read models stop collapsing incompatible ownership states

### Risks Avoided

- no immediate breaking vault UI rewrite
- no destructive migration in the same step
- no sudden removal of legacy anchors for scans, media, sharing, or condition lineage

### Transitional Risks Still Present

- many runtime paths still key off `vault_item_id`
- scanner and condition systems still depend on `vault_item_id`
- public sharing is still card-level, not object-level
- mobile and some collector mutations still assume compatibility anchor identity

## 10. Final Contract

```text
1. vault_items = ownership episode anchor only
2. vault_item_instances = canonical ownership truth
3. multiple active episodes per user/card are allowed conceptually
4. collector rows are derived from instances, not buckets
5. mutations operate on instances, not buckets
6. compatibility layer remains, but loses authority
```

## 11. Exact Impact Boundary

Blast radius of V2 is:

```text
compatibility layer only
```

It does not require:

- redefinition of canonical ownership truth
- pricing redesign
- slab pricing work
- provenance redesign

It does require future targeted implementation in:

- collector read models
- quantity/mutation targeting
- compatibility-anchor mapping rules
- slab entry flow

## 12. Recommended Next Step

Produce a targeted implementation plan for V2 focused on:

1. web collector row identity
2. web quantity mutation targeting
3. compatibility-anchor shaping for raw + slab coexistence
4. mobile follow-on only after web path is safe
