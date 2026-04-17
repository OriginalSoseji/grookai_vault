# VAULT_SYSTEM_HARDENING_V1

Status: ACTIVE  
Type: Checkpoint  
Scope: Vault ownership, lifecycle, and auth hardening across web, Flutter, and database policy surfaces

## Context

Single Auth Layer V1 made Supabase Auth the canonical user identity surface, but vault behavior still had three gaps:

- ownership-sensitive server writes could escalate with admin access after only shallow caller checks
- some private vault read paths could still resolve archived ownership episodes
- table RLS existed in fragmented legacy form instead of a single active-row ownership contract

This pass aligns vault behavior with the existing archival and ownership model:

- one `vault_items` row is one ownership episode
- active ownership means `archived_at IS NULL`
- normal removal archives instead of deleting
- reacquisition creates a new ownership episode
- all ownership is scoped to `auth.users.id`

## Risks Found

- auth drift risk on server-side vault writes using admin clients after caller-supplied `userId`
- archived-row leakage risk on private exact-copy detail paths
- weak ownership boundaries from duplicated legacy `vault_items` policies
- public/shared surfaces depending on app-side filtering instead of explicit safe filters

## Decision

- all vault ownership writes must verify the current authenticated owner before any admin-assisted mutation
- active vault surfaces read only active rows (`archived_at IS NULL`)
- authenticated table access is limited to owner-scoped active rows for `vault_items` and `vault_item_instances`
- normal user flows archive instead of delete
- public/shared surfaces use explicit public-safe queries and never raw private vault reads

## RLS Decisions

### `public.vault_items`

- authenticated `select` limited to own active rows
- authenticated `insert` limited to own active rows
- authenticated `update` limited to own rows, with active-row visibility on the source row
- no authenticated delete policy

### `public.vault_item_instances`

- authenticated `select` limited to own active rows
- authenticated `update` limited to own active rows
- no authenticated direct insert/delete policy
- canonical instance creation and archive wrappers remain the governed mutation surface

## Lifecycle Decisions

- active row truth is `archived_at IS NULL`
- removal archives; it does not delete ownership rows
- reacquisition creates a new ownership episode and leaves archived history intact
- active vault routes fail closed on archived exact-copy rows

## Active Uniqueness Guard Decision

No new partial unique index was added in this pass.

Reason:

- `vault_item_instances` intentionally allows multiple active copies of the same canonical card for the same user
- `vault_items` active uniqueness was deliberately dropped earlier, and reintroducing a schema guard here would need a wider compatibility decision
- legacy bucket duplication is still collapsed locally through `resolveActiveVaultAnchor(...)` for compatibility-only flows

## Web / Flutter Alignment

- web vault writes now assert the authenticated owner before admin-assisted instance creation paths
- web exact-copy mutations use the authenticated client against owner-scoped active rows
- Flutter private exact-copy reads now fail closed when the resolved row is archived
- both clients treat archived rows as absent from current-collection surfaces

## Verification Targets

- owner-only RLS on `vault_items` and `vault_item_instances`
- active reads exclude archived ownership rows
- remove/archive keeps history but removes the row from active surfaces
- reacquiring the same card later creates a new active ownership episode
- cross-user reads and writes fail under authenticated app surfaces

## Locked Invariants

1. `auth.users.id` is the only vault ownership principal
2. `archived_at IS NULL` is the lifecycle truth for active ownership
3. normal removal archives instead of deleting
4. reacquisition creates a new row; it does not resurrect archived history
5. active private surfaces must not render archived rows
6. public/shared vault views must not weaken core owner-table protections
