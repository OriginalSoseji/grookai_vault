-- Repair migration: restore admin_condition_assist_insert_failure_v1 for reset replayability.
-- Some migrations assume this function exists; ensure creation before grant/revoke steps run.

create or replace function public.admin_condition_assist_insert_failure_v1(
  p_snapshot_id uuid,
  p_attempted_snapshot_id uuid,
  p_analysis_version text,
  p_analysis_key text,
  p_error_code text,
  p_error_detail text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  select user_id into v_user_id from public.condition_snapshots where id = p_snapshot_id;
  -- acceptable if not found; user_id remains null

  insert into public.condition_analysis_failures (
    snapshot_id,
    attempted_snapshot_id,
    user_id,
    analysis_version,
    analysis_key,
    error_code,
    error_detail
  ) values (
    p_snapshot_id,
    coalesce(p_attempted_snapshot_id, p_snapshot_id),
    v_user_id,
    p_analysis_version,
    p_analysis_key,
    p_error_code,
    p_error_detail
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_condition_assist_insert_failure_v1(
  uuid, uuid, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.admin_condition_assist_insert_failure_v1(
  uuid, uuid, text, text, text, text
) to service_role;
