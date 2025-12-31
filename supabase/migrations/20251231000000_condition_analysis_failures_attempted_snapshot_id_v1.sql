-- CONDITION_ASSIST_V1: Add attempted_snapshot_id and update failure RPC

-- 1) Add attempted_snapshot_id column (nullable, then backfill, then not null)
alter table public.condition_analysis_failures
  add column if not exists attempted_snapshot_id uuid;

do $$
declare
  v_missing integer;
begin
  select count(*) into v_missing from public.condition_analysis_failures where attempted_snapshot_id is null;
  if v_missing > 0 then
    update public.condition_analysis_failures
      set attempted_snapshot_id = snapshot_id
      where attempted_snapshot_id is null;
  end if;
  alter table public.condition_analysis_failures
    alter column attempted_snapshot_id set not null;
end;
$$;

create index if not exists condition_analysis_failures_attempted_snapshot_created_idx
  on public.condition_analysis_failures (attempted_snapshot_id, created_at desc);

-- 2) Replace failure insert RPC with attempted_snapshot_id support
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
set search_path = public, extensions
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  if p_snapshot_id is not null then
    select user_id into v_user_id from public.condition_snapshots where id = p_snapshot_id;
    -- if not found, v_user_id remains null
  end if;

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
