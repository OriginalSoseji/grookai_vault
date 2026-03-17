# COMPATIBILITY_IDENTITY_V2_IMPLEMENTATION_PLAN

## STATUS

READY FOR IMPLEMENTATION

## Scope

This plan defines the phased rollout for `COMPATIBILITY_IDENTITY_V2`.

It is execution-ready but non-destructive in this document.

It includes:

- phased rollout
- exact file and surface targets
- compatibility bridge rules
- verification and rollback by phase

It excludes:

- code edits
- migrations in this task
- pricing and marketplace work

---

## PHASE OVERVIEW

```text
PHASE 1 — Read Model (instance-first, non-breaking)
PHASE 2 — Compatibility Bridge (anchor decoupling)
PHASE 3 — Mutation Model (instance-targeted writes)
PHASE 4 — Constraint Removal (final migration)
```

Execution rule:

- each phase must be independently verifiable
- each phase must be independently reversible
- no phase may assume a later phase is already done

---

## PHASE 1 — READ MODEL (INSTANCE-FIRST)

### GOAL

Move collector read paths to an instance-first projection without breaking current UI or mutation flows.

### TARGET FILES / SURFACES

Web:

- [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)
- [getSharedCardsBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getSharedCardsBySlug.ts)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)

Mobile:

- [20260317101500_create_mobile_vault_collector_rows_v1.sql](/c:/grookai_vault/supabase/migrations/20260317101500_create_mobile_vault_collector_rows_v1.sql)
- [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)
- [main.dart](/c:/grookai_vault/lib/main.dart)

Support surfaces:

- any helper currently hard-gating rows on `coalesce(cb.id, legacy_vault_item_id)`

### CURRENT RISK TO REMOVE

Current read-model blockers proven from repo:

- web helper skips rows if no compatibility `vault_item_id` can be resolved
- mobile projection hard-filters rows with `where coalesce(cb.id, li.legacy_vault_item_id) is not null`
- collector payload shape still assumes one representative `vault_item_id` per rendered row

### CHANGES (DESIGN)

1. Base aggregation on canonical instances only:

```text
vault_item_instances
-> card identity via:
   - raw: card_print_id
   - slab: slab_cert_id -> slab_certs.card_print_id
-> group by card_print_id + subtype
```

2. Derive collector counts from instances:

- `total_count`
- `raw_count`
- `slab_count`
- `slab_items[]`

3. Keep a compatibility anchor, but make it secondary:

```text
representative_vault_item_id
```

Selection rule:

- prefer active episode anchor attached to the subtype with the highest active instance count
- fallback to any active episode anchor for that `card_print_id`
- fallback to a linked `legacy_vault_item_id` from an active instance
- do not use compatibility anchor presence as an inclusion gate

4. Update card detail owned summary to consume object-aware grouped data rather than count-only data.

### TARGET OUTPUT SHAPE

Minimum target shape:

```ts
{
  card_print_id: string
  total_count: number
  raw_count: number
  slab_count: number
  slab_items: Array<{
    gv_vi_id: string
    grader: string
    grade: string
    cert_number: string
  }>
  representative_vault_item_id: string | null
}
```

Compatibility note:

- existing UI may still receive legacy fields such as `vault_item_id`, `owned_count`, `gv_vi_id`
- but those become projection conveniences, not truth

### VERIFICATION

DB checks:

```sql
select
  coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
  count(*) filter (where vii.slab_cert_id is null and vii.archived_at is null) as raw_count,
  count(*) filter (where vii.slab_cert_id is not null and vii.archived_at is null) as slab_count,
  count(*) filter (where vii.archived_at is null) as total_count
from public.vault_item_instances vii
left join public.slab_certs sc on sc.id = vii.slab_cert_id
where vii.user_id = '<USER_UUID>'
group by coalesce(vii.card_print_id, sc.card_print_id)
order by card_print_id;
```

UI checks:

- vault shows the same cards as before for raw-only users
- slab rows remain visible
- mixed raw + slab rows do not disappear
- no duplicate vault rows per subtype unless intentionally rendered
- authenticated card detail can render object-aware ownership summary

### ROLLBACK

- revert read mappers and projections to the current grouped contract
- keep `vault_item_instances` untouched
- no data rollback required

---

## PHASE 2 — COMPATIBILITY BRIDGE (ANCHOR DECOUPLING)

### GOAL

Decouple UI state and runtime identity from the assumption that one `vault_item_id` is the single authoritative identity for a rendered collector row.

### TARGET FILES / SURFACES

Web collector UI:

- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
- [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx)

Mobile collector UI:

- [main.dart](/c:/grookai_vault/lib/main.dart)
- [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)

Compatibility-heavy runtime seams:

- photo/public image toggles
- public note controls
- share controls
- any selection or expansion state keyed by `vault_item_id`

### CURRENT RISK TO REMOVE

Repo-truth dependency:

- web collector state is keyed repeatedly by `vault_item_id`
- mobile passes `vaultItemId` through active vault flows
- shared-card identity already partially prefers `gv_vi_id`, proving a bridge pattern exists

### CHANGES (DESIGN)

1. Replace:

```text
vault_item_id = primary collector identity
```

with:

```text
card_print_id + subtype identity + representative_vault_item_id
```

2. State-key rules:

- primary state key for grouped card rows: `card_print_id`
- primary state key for object-specific slab rows: `gv_vi_id`
- compatibility-only key: `representative_vault_item_id`

3. UI components must stop assuming:

- one `vault_item_id` == one rendered row
- one card == one compatibility episode

4. Maintain legacy compatibility by passing `representative_vault_item_id` into flows that still need a bucket anchor.

### VERIFICATION

UI checks:

- expand/collapse remains stable after refresh
- share/public note/public image controls keep working on existing raw rows
- mixed raw + slab state does not merge incorrectly
- no disappearing rows when slab subtype is present

Behavior checks:

- if a row has both `gv_vi_id` and `representative_vault_item_id`, object-aware flows prefer canonical identity
- compatibility-only flows continue to receive a valid anchor

### ROLLBACK

- restore previous state keying to `vault_item_id`
- keep read-model improvements from Phase 1 if already safe

---

## PHASE 3 — MUTATION MODEL (INSTANCE-TARGETED WRITES)

### GOAL

Stop treating `vault_items` as the mutation entry point.

All add/remove actions must target instances first and use compatibility anchors second.

### TARGET FILES / SURFACES

Web:

- [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts)
- [changeVaultItemQuantityAction.ts](/c:/grookai_vault/apps/web/src/lib/vault/changeVaultItemQuantityAction.ts)
- [addCardToVault.ts](/c:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts)
- slab entry flow after this phase, not before it

Mobile:

- [vault_card_service.dart](/c:/grookai_vault/lib/services/vault/vault_card_service.dart)
- [20260316113000_create_mobile_vault_instance_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql)

### CURRENT RISK TO REMOVE

Current repo-truth mutation assumption:

- raw increment/decrement start from `vault_items.id`
- archive/decrement resolves by `card_print_id`
- slab and raw cannot be targeted independently for the same card if they share one representative bucket anchor

### CHANGES (DESIGN)

#### 3.1 Raw add

```text
+1 raw
-> create raw instance
-> attach to an existing or new raw ownership episode anchor
-> mirror compatibility metadata second
```

#### 3.2 Raw remove

```text
-1 raw
-> archive one raw instance
-> do not archive slab instances
-> update or archive only the raw-compatible ownership episode mirror
```

#### 3.3 Slab add

Unblocked only after Phase 1 and Phase 2:

```text
create or resolve slab_cert
-> create new ownership episode anchor for slab
-> create slab-backed vault_item_instances row
-> do not mutate existing raw rows
```

#### 3.4 Remove mutation entry dependence on:

```text
vault_item_id as the primary mutation selector
```

Mutation selectors become:

- raw mutation: subtype-aware canonical selector
- slab mutation: `gv_vi_id` or slab-object selector
- compatibility anchor: optional secondary linkage only

### RULES

- no destructive overwrite of raw rows
- no reuse of archived episodes
- instance is the unit of mutation
- bucket mirror remains compatibility-only until final retirement work

### VERIFICATION

DB checks:

```sql
select
  coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
  count(*) filter (where vii.slab_cert_id is null and vii.archived_at is null) as raw_count,
  count(*) filter (where vii.slab_cert_id is not null and vii.archived_at is null) as slab_count
from public.vault_item_instances vii
left join public.slab_certs sc on sc.id = vii.slab_cert_id
where vii.user_id = '<USER_UUID>'
group by coalesce(vii.card_print_id, sc.card_print_id);
```

UI checks:

- raw add still works
- raw decrement removes only raw
- slab rows remain present during raw decrement
- slab entry becomes safe to implement after this phase

### ROLLBACK

- restore bucket-driven mutation selectors
- preserve any created canonical instances; do not attempt destructive undo

---

## PHASE 4 — CONSTRAINT REMOVAL (FINAL)

### GOAL

Remove the invalid uniqueness constraint only after all runtime read and mutation paths are instance-safe.

### TARGET

Planned migration target:

- [20260313153000_vault_items_archival_ownership_episodes_v1.sql](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql)

### CHANGE (PLANNED MIGRATION)

Remove:

```sql
uq_vault_items_active_user_card
uq_vault_items_active_user_gv_id
```

Replace with:

- no uniqueness constraint on active rows per user/card
- optional later subtype-scoped or episode-scoped constraints only if proven necessary

### PRECONDITIONS

Must all be true before Phase 4:

- Phase 1 production-like verification complete
- Phase 2 UI-state verification complete
- Phase 3 instance-targeted mutation verification complete
- slab entry flow implemented and proven on a staging-like environment
- no remaining read or write path assumes one active episode per card

### VERIFICATION

Required end-state test:

1. Add one raw copy for a card.
2. Add one slab for the same card.
3. Verify both remain active.
4. Verify vault renders both ownership states correctly.
5. Verify raw decrement does not archive the slab.

DB checks:

```sql
select id, user_id, card_id, gv_id, archived_at
from public.vault_items
where user_id = '<USER_UUID>'
  and card_id = '<CARD_PRINT_UUID>'
order by created_at;
```

```sql
select
  gv_vi_id,
  card_print_id,
  slab_cert_id,
  legacy_vault_item_id,
  archived_at
from public.vault_item_instances
where user_id = '<USER_UUID>'
  and (
    card_print_id = '<CARD_PRINT_UUID>'
    or slab_cert_id in (
      select id from public.slab_certs where card_print_id = '<CARD_PRINT_UUID>'
    )
  )
order by created_at;
```

### ROLLBACK

- restore the uniqueness constraint only if Phase 3 writes are reverted and no multi-episode active data has been created
- if multi-episode data exists, do not force rollback via destructive collapse
- prefer forward-fix over data-destructive rollback

---

## GLOBAL VERIFICATION CHECKLIST

Run after each phase:

### Data Integrity

- no orphaned instances
- no slab instances without `slab_cert_id`
- no raw instances accidentally linked to slab identity
- no collector rows dropped only because compatibility anchor is missing

### UI

- vault stable
- authenticated card detail stable
- slab + raw visible together when supported
- public shared surfaces remain conservative and do not leak ambiguous slab state

### Behavior

- raw add/remove unchanged until Phase 3 changes them intentionally
- scanner and condition flows still receive valid compatibility anchors
- shared/public surfaces do not regress

### Regression Surfaces to Watch

- [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx)
- [main.dart](/c:/grookai_vault/lib/main.dart)
- [condition_scan_service.dart](/c:/grookai_vault/lib/services/scanner/condition_scan_service.dart)
- [AssignConditionSnapshotAction](/c:/grookai_vault/apps/web/src/lib/condition/assignConditionSnapshotAction.ts)
- [toggleSharedCardAction.ts](/c:/grookai_vault/apps/web/src/lib/sharedCards/toggleSharedCardAction.ts)

---

## ROLLBACK POLICY

Phase rollback rules:

- Phase 1 and Phase 2 are code-only rollbacks and are safe to revert directly.
- Phase 3 should prefer feature rollback over data rollback.
- Phase 4 is the only destructive-capable phase and must happen last.

Global rule:

```text
never use rollback to collapse valid raw + slab ownership into a false single-bucket state
```

---

## FINAL RESULT

```text
- vault_items -> anchor only
- vault_item_instances -> truth
- collector rows -> instance-derived
- mutations -> instance-targeted
- raw + slab coexistence -> supported
- slab entry flow -> unblocked
```

---

## RECOMMENDED EXECUTION ORDER

1. Implement Phase 1 on web first.
2. Mirror Phase 1 on mobile once the web projection proves stable.
3. Implement Phase 2 on web collector state.
4. Implement Phase 3 raw mutation targeting.
5. Implement slab entry on top of Phase 1–3.
6. Remove uniqueness constraints only after all above are proven.

---

## TERMINAL SUMMARY

```text
COMPATIBILITY_IDENTITY_V2_IMPLEMENTATION_PLAN: READY
Phases: 4 (Read -> Bridge -> Mutation -> Constraint)
Blast radius: compatibility + mutation layer only
Next step: Phase 1 implementation (read model)
```
