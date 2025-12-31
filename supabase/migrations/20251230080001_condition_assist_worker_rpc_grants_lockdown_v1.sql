-- CONDITION_ASSIST_V1 Phase 1: RPC grant cleanup

-- Ensure only service_role can execute the privileged RPCs
revoke all on function public.admin_condition_assist_insert_analysis_v1(
  uuid, text, text, jsonb, jsonb, jsonb, numeric
) from public, anon, authenticated;

grant execute on function public.admin_condition_assist_insert_analysis_v1(
  uuid, text, text, jsonb, jsonb, jsonb, numeric
) to service_role;

revoke all on function public.admin_condition_assist_insert_failure_v1(
  uuid, uuid, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.admin_condition_assist_insert_failure_v1(
  uuid, uuid, text, text, text, text
) to service_role;
