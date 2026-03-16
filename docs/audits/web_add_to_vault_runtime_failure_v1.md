# Web Add To Vault Runtime Failure Audit v1

## Title
Web Add To Vault Runtime Failure Audit v1

## Date
2026-03-16

## Objective
Make the first web add-to-vault GVVI cutover seam observable, prove the exact failing layer, repair only the confirmed defect, and verify that canonical instance creation plus legacy bucket mirroring now succeed.

## Reproduction Surface
Primary seam under test:

- `apps/web/src/lib/vault/addCardToVault.ts`

Caller context:

- the card page server action in `apps/web/src/app/card/[gv_id]/page.tsx`
- server-authenticated user resolution through `createServerComponentClient()`
- canonical ownership create through `public.admin_vault_instance_create_v1(...)`

Failure reproduction method used:

- authenticated publishable-key Supabase client calling `public.admin_vault_instance_create_v1(...)`
- this matches the actual pre-fix runtime credential model used by `createServerComponentClient()` in `apps/web/src/lib/supabase/server.ts`

## Observed Inputs
Confirmed pre-fix runtime inputs:

| Field | Value |
| --- | --- |
| userId | `2b08742f-b5a1-4e52-a91e-376a69331ee1` |
| cardPrintId | `11111111-1111-1111-1111-111111111111` |
| auth model | authenticated publishable-key client |
| function called | `public.admin_vault_instance_create_v1(...)` |

Confirmed post-fix verification inputs:

| Field | Value |
| --- | --- |
| userId | `6ea2aa2e-54b4-4374-8c53-b23865cd011d` |
| cardPrintId | `33333333-3333-3333-3333-333333333333` |
| gvId | `GV-CODEX-TEST-001` |
| card name | `Codex Test Card` |
| set name | `Codex Test Set` |
| canonical client | server admin client |
| mirror client | authenticated publishable-key client |

## Exact Runtime Error
Observed pre-fix runtime error from the authenticated client call:

```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "permission denied for function admin_vault_instance_create_v1"
}
```

Observed privilege proof from the rebuilt database:

| Role | Can Execute `admin_vault_instance_create_v1` |
| --- | --- |
| `authenticated` | `false` |
| `service_role` | `true` |

## Confirmed Failing Layer
Confirmed failing layer:

`4. permission / RLS / function security issue`

Exact failing boundary:

- `addCardToVault.ts` was using the authenticated server client for the canonical RPC
- `public.admin_vault_instance_create_v1(...)` is `security definer`, but execution is granted only to `service_role`
- therefore the canonical create failed before any legacy bucket mirror logic ran

## Root Cause
Root cause confirmed from repo truth:

- `apps/web/src/lib/supabase/server.ts` builds `createServerComponentClient()` from `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- pre-fix `apps/web/src/lib/vault/addCardToVault.ts` used that authenticated publishable-key client to call `public.admin_vault_instance_create_v1(...)`
- `public.admin_vault_instance_create_v1(...)` was intentionally created as a service-role-only admin RPC in `20260316110000_create_admin_vault_instance_create_v1.sql`

This was not:

- an RPC signature mismatch
- a missing `userId`
- a missing `cardPrintId`
- a DB constraint failure inside the RPC

It was a client/privilege mismatch at the canonical RPC call site.

## Repair Applied
Minimal repair applied:

- kept the canonical ownership path instance-first
- switched only the canonical RPC call in `apps/web/src/lib/vault/addCardToVault.ts` to the existing server admin client from `apps/web/src/lib/supabase/admin.ts`
- kept the legacy bucket mirror on the authenticated client
- added durable structured logging:
  - `vault.addCardToVault.begin`
  - `vault.addCardToVault.instance_rpc_failed`
  - `vault.addCardToVault.bucket_mirror_failed`

No migration was required.

No DB grants were widened.

No read paths were changed.

## Verification Result
Verification method:

- local rebuilt Supabase stack
- synthetic local catalog fixture:
  - `card_print_id = 33333333-3333-3333-3333-333333333333`
  - `gv_id = GV-CODEX-TEST-001`
- authenticated user session for the legacy mirror client
- service-role admin client for canonical instance creation
- two sequential add calls using the repaired canonical/mirror split

Runtime result:

```json
{
  "userId": "6ea2aa2e-54b4-4374-8c53-b23865cd011d",
  "first": { "gv_vi_id": "GVVI-06D72700-000001" },
  "second": { "gv_vi_id": "GVVI-06D72700-000002" }
}
```

DB verification query 1:

```sql
select gv_vi_id, user_id, card_print_id, archived_at
from public.vault_item_instances
where user_id = '6ea2aa2e-54b4-4374-8c53-b23865cd011d'
  and card_print_id = '33333333-3333-3333-3333-333333333333'
order by created_at desc
limit 5;
```

Result:

| gv_vi_id | user_id | card_print_id | archived_at |
| --- | --- | --- | --- |
| `GVVI-06D72700-000002` | `6ea2aa2e-54b4-4374-8c53-b23865cd011d` | `33333333-3333-3333-3333-333333333333` | `null` |
| `GVVI-06D72700-000001` | `6ea2aa2e-54b4-4374-8c53-b23865cd011d` | `33333333-3333-3333-3333-333333333333` | `null` |

DB verification query 2:

```sql
select id, user_id, card_id, qty, archived_at
from public.vault_items
where user_id = '6ea2aa2e-54b4-4374-8c53-b23865cd011d'
  and card_id = '33333333-3333-3333-3333-333333333333'
order by created_at desc
limit 5;
```

Result:

| id | user_id | card_id | qty | archived_at |
| --- | --- | --- | --- | --- |
| `2d7f44f7-e9c1-4be7-9d89-048e229c8925` | `6ea2aa2e-54b4-4374-8c53-b23865cd011d` | `33333333-3333-3333-3333-333333333333` | `2` | `null` |

Parity check:

| Check | Result |
| --- | --- |
| instance row count | `2` |
| mirrored bucket qty | `2` |

Conclusion:

- canonical instance create now succeeds
- legacy bucket mirror now succeeds
- parity between created instance rows and bucket quantity held for the verified seam

Note:

- a full browser-click automation run against the local card page was not completed in this shell session because the background Next server did not return stable HTTP responses under the local launch method
- the verified runtime path still matched the actual card-page server-action seam inputs and the exact failing layer was proven before repair

## Next Step
Cut over [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts) next, because decrement/archive is the next live web ownership mutation still anchored to legacy bucket semantics.
