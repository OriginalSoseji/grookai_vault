begin;

-- public_vault_instance_detail_v1 is the governed anonymous public exact-copy
-- read surface. It must not expose direct table grants to anon, and it no
-- longer calls resolve_active_vault_anchor_v1. Keep the RPC itself as the
-- public SECURITY DEFINER boundary.

alter function public.public_vault_instance_detail_v1(text) security definer;
alter function public.public_vault_instance_detail_v1(text) set search_path = public;

grant execute on function public.public_vault_instance_detail_v1(text)
to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
