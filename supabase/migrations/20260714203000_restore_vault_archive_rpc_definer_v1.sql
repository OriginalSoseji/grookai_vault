begin;

-- Archive is the governed authenticated app write boundary for Vault deletion.
-- The RPC bodies enforce auth.uid() ownership before mutating vault_items or
-- vault_item_instances. Keep table RLS strict and restore only these wrappers
-- as SECURITY DEFINER so archive updates can set archived_at without tripping
-- active-row RLS checks.

alter function public.vault_archive_one_instance_v1(uuid, uuid) security definer;
alter function public.vault_archive_one_instance_v1(uuid, uuid) set search_path = public;

alter function public.vault_archive_all_instances_v1(uuid, uuid) security definer;
alter function public.vault_archive_all_instances_v1(uuid, uuid) set search_path = public;

alter function public.vault_archive_exact_instance_v1(uuid) security definer;
alter function public.vault_archive_exact_instance_v1(uuid) set search_path = public;

revoke all on function public.vault_archive_one_instance_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_archive_one_instance_v1(uuid, uuid)
to authenticated, service_role;

revoke all on function public.vault_archive_all_instances_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_archive_all_instances_v1(uuid, uuid)
to authenticated, service_role;

revoke all on function public.vault_archive_exact_instance_v1(uuid)
from public, anon;

grant execute on function public.vault_archive_exact_instance_v1(uuid)
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
