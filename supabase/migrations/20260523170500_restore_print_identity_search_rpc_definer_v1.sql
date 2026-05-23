-- Restore the app-facing print identity search RPC boundary.
--
-- SECURITY_WARN_REMEDIATION_V2 changed this RPC to SECURITY INVOKER, but the
-- underlying v_print_identity_search_documents_v1 view is intentionally not
-- selectable by anon/authenticated callers. The mobile app and public web
-- resolver call this RPC, so it must remain the narrow SECURITY DEFINER read
-- boundary over the public-safe search document view.

alter function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) security definer;

alter function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) set search_path = public;

revoke all on public.v_print_identity_search_documents_v1 from anon, authenticated;
grant select on public.v_print_identity_search_documents_v1 to service_role;

revoke all on function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) from public;

grant execute on function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) to anon, authenticated, service_role;

comment on function public.search_print_identity_v1(
  q text,
  set_code_in text,
  number_in text,
  object_type_in text,
  limit_in int,
  offset_in int
) is
  'Public-safe card search RPC. SECURITY DEFINER is required because the underlying search document view is intentionally not directly selectable by anon/authenticated callers.';
