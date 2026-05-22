begin;

-- The owner-bound guard added in 20260522160000 makes this safe to run as
-- invoker for direct authenticated app reads. RLS on vault_items keeps direct
-- reads/writes scoped to auth.uid(), while service_role keeps maintenance
-- authority through its existing table privileges.

alter function public.resolve_active_vault_anchor_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) security invoker;

grant execute on function public.resolve_active_vault_anchor_v1(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
