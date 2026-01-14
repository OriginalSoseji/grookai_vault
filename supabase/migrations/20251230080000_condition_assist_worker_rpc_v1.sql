-- CONDITION_ASSIST_V1 Phase 1: Privileged insert RPCs for analyses and failures

-- Analysis insert RPC (idempotent by snapshot_id + analysis_version + analysis_key)
create or replace function public.admin_condition_assist_insert_analysis_v1(
  p_snapshot_id uuid,
  p_analysis_version text,
  p_analysis_key text,
  p_scan_quality jsonb,
  p_measurements jsonb,
  p_defects jsonb,
  p_confidence numeric
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  select user_id into v_user_id from public.condition_snapshots where id = p_snapshot_id;
  if not found then
    raise exception 'SNAPSHOT_NOT_FOUND';
  end if;

  insert into public.condition_snapshot_analyses (
    snapshot_id, user_id, analysis_version, analysis_key,
    scan_quality, measurements, defects, confidence
  ) values (
    p_snapshot_id, v_user_id, p_analysis_version, p_analysis_key,
    p_scan_quality, p_measurements, p_defects, p_confidence
  )
  on conflict (snapshot_id, analysis_version, analysis_key) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.condition_snapshot_analyses
    where snapshot_id = p_snapshot_id
      and analysis_version = p_analysis_version
      and analysis_key = p_analysis_key
    limit 1;
  end if;

  return v_id;
end;
$$;

grant execute on function public.admin_condition_assist_insert_analysis_v1(
  uuid, text, text, jsonb, jsonb, jsonb, numeric
) to service_role;

-- Failure insert RPC (append-only)
create or replace function public.admin_condition_assist_insert_failure_v1(
  p_snapshot_id uuid,
  p_analysis_version text,
  p_analysis_key text,
  p_error_code text,
  p_error_detail text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  select user_id into v_user_id from public.condition_snapshots where id = p_snapshot_id;
  -- if not found, v_user_id stays null (acceptable for failure logging)

  insert into public.condition_analysis_failures (
    snapshot_id, user_id, analysis_version, analysis_key, error_code, error_detail
  ) values (
    p_snapshot_id, v_user_id, p_analysis_version, p_analysis_key, p_error_code, p_error_detail
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.admin_condition_assist_insert_failure_v1(
  uuid, text, text, text, text
) to service_role;
