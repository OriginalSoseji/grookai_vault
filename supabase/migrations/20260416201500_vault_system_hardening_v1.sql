begin;

alter table public.vault_items enable row level security;
alter table public.vault_item_instances enable row level security;

revoke all on table public.vault_items from anon;
revoke all on table public.vault_items from authenticated;
grant select, insert, update on table public.vault_items to authenticated;
grant all on table public.vault_items to service_role;

revoke all on table public.vault_item_instances from anon;
revoke all on table public.vault_item_instances from authenticated;
grant select, update on table public.vault_item_instances to authenticated;
grant all on table public.vault_item_instances to service_role;

drop policy if exists gv_vault_items_delete on public.vault_items;
drop policy if exists gv_vault_items_insert on public.vault_items;
drop policy if exists gv_vault_items_select on public.vault_items;
drop policy if exists gv_vault_items_update on public.vault_items;
drop policy if exists "owner delete vault_items" on public.vault_items;
drop policy if exists "owner insert" on public.vault_items;
drop policy if exists "owner insert vault_items" on public.vault_items;
drop policy if exists "owner read" on public.vault_items;
drop policy if exists "owner select vault_items" on public.vault_items;
drop policy if exists "owner update" on public.vault_items;
drop policy if exists "owner update vault_items" on public.vault_items;
drop policy if exists "vault_items owner delete" on public.vault_items;
drop policy if exists "vault_items owner read" on public.vault_items;
drop policy if exists "vault_items owner update" on public.vault_items;
drop policy if exists "vault_items owner write" on public.vault_items;
drop policy if exists vault_items_owner_select_active_v1 on public.vault_items;
drop policy if exists vault_items_owner_insert_active_v1 on public.vault_items;
drop policy if exists vault_items_owner_update_active_v1 on public.vault_items;
drop policy if exists vault_items_service_role_all_v1 on public.vault_items;

create policy vault_items_owner_select_active_v1
on public.vault_items
for select
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
  and archived_at is null
);

create policy vault_items_owner_insert_active_v1
on public.vault_items
for insert
to authenticated
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and archived_at is null
);

create policy vault_items_owner_update_active_v1
on public.vault_items
for update
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
  and archived_at is null
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy vault_items_service_role_all_v1
on public.vault_items
for all
to service_role
using (true)
with check (true);

drop policy if exists service_role_only on public.vault_item_instances;
drop policy if exists vault_item_instances_owner_select_active_v1 on public.vault_item_instances;
drop policy if exists vault_item_instances_owner_update_active_v1 on public.vault_item_instances;
drop policy if exists vault_item_instances_service_role_all_v1 on public.vault_item_instances;

create policy vault_item_instances_owner_select_active_v1
on public.vault_item_instances
for select
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
  and archived_at is null
);

create policy vault_item_instances_owner_update_active_v1
on public.vault_item_instances
for update
to authenticated
using (
  auth.uid() is not null
  and user_id = auth.uid()
  and archived_at is null
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

create policy vault_item_instances_service_role_all_v1
on public.vault_item_instances
for all
to service_role
using (true)
with check (true);

commit;
