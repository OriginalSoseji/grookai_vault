-- Durable worker outcomes and read-only health; no stock/payment authority.
begin;
create table grookai_square.worker_runs (
  id uuid primary key, environment text not null check(environment in ('sandbox','production')),
  started_at timestamptz not null default clock_timestamp(), heartbeat_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz, status text not null default 'running' check(status in ('running','succeeded','failed','paused','abandoned')),
  succeeded integer not null default 0 check(succeeded between 0 and 25),
  failed integer not null default 0 check(failed between 0 and 25),
  skipped integer not null default 0 check(skipped between 0 and 25), error_code text
);
alter table grookai_square.worker_runs enable row level security;
revoke all on grookai_square.worker_runs from public,anon,authenticated,service_role;
create function public.square_worker_run_v1(p_id uuid,p_action text,p_result jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare row grookai_square.worker_runs;
begin
  if p_id is null then raise exception 'square_invalid_worker_run'; end if;
  if p_action='start' then
    if p_result->>'environment' not in ('sandbox','production') then raise exception 'square_invalid_worker_run'; end if;
    update grookai_square.worker_runs set status='abandoned',finished_at=clock_timestamp(),error_code='square_worker_interrupted'
      where status='running' and heartbeat_at<clock_timestamp()-interval '5 minutes';
    insert into grookai_square.worker_runs(id,environment) values(p_id,p_result->>'environment') on conflict(id) do nothing;
    select * into row from grookai_square.worker_runs where id=p_id;
    if row.environment is distinct from p_result->>'environment' then raise exception 'square_worker_request_conflict'; end if;
    return to_jsonb(row);
  end if;
  select * into row from grookai_square.worker_runs where id=p_id for update;
  if row.id is null then raise exception 'square_worker_not_started'; end if;
  if p_action='heartbeat' then
    if row.status<>'running' then raise exception 'square_worker_not_running'; end if;
    update grookai_square.worker_runs set heartbeat_at=clock_timestamp() where id=p_id;
    return jsonb_build_object('alive',true);
  elsif p_action='finish' then
    if p_result->>'status' not in ('succeeded','failed','paused') or
      coalesce(p_result->>'errorCode','') !~ '^(|square_[a-z_]{1,80})$' then raise exception 'square_invalid_worker_result'; end if;
    if row.status<>'running' then
      if row.status=p_result->>'status' and row.succeeded=(p_result->>'succeeded')::integer
        and row.failed=(p_result->>'failed')::integer and row.skipped=(p_result->>'skipped')::integer
        and row.error_code is not distinct from nullif(p_result->>'errorCode','') then return to_jsonb(row); end if;
      raise exception 'square_worker_result_conflict';
    end if;
    update grookai_square.worker_runs set status=p_result->>'status',finished_at=clock_timestamp(),heartbeat_at=clock_timestamp(),
      succeeded=(p_result->>'succeeded')::integer,failed=(p_result->>'failed')::integer,skipped=(p_result->>'skipped')::integer,
      error_code=nullif(p_result->>'errorCode','') where id=p_id returning * into row;
    return to_jsonb(row);
  end if;
  raise exception 'square_invalid_worker_action';
end $$;
create function public.square_health_v1() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('version','SQUARE_CATALOG_HEALTH_V1',
    'lastRun',(select jsonb_build_object('status',status,'startedAt',started_at,'finishedAt',finished_at,'errorCode',error_code)
      from grookai_square.worker_runs order by started_at desc,id desc limit 1),
    'staleRuns',(select count(*) from grookai_square.worker_runs where status='running' and heartbeat_at<statement_timestamp()-interval '5 minutes'),
    'uncertainOperations',(select count(*) from grookai_square.operations where status='uncertain'),
    'uncertainRefreshes',(select count(*) from grookai_square.connections where refresh_status='uncertain'));
$$;
revoke all on function public.square_worker_run_v1(uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.square_health_v1() from public,anon,authenticated,service_role;
grant execute on function public.square_worker_run_v1(uuid,text,jsonb),public.square_health_v1() to service_role;

-- One target per merchant per tick. Unresolved attempts take priority even after
-- deselection, so newer selection cannot starve read-only recovery forever.
create function public.square_poll_v2(p_environment text,p_limit integer default 10) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if p_environment is null or p_environment not in ('sandbox','production') or p_limit is null or p_limit not between 1 and 25
    then raise exception 'square_invalid_limit'; end if;
  return coalesce((select jsonb_agg(row) from (
    select candidate.id as "targetId",c.id as "connectionId",c.owner_id as "ownerId"
    from grookai_square.connections c cross join grookai_square.controls ctl
    cross join lateral (select t.id,t.updated_at from grookai_square.targets t
      left join grookai_square.operations op on op.target_id=t.id and op.status in ('prepared','sending','uncertain')
      where t.connection_id=c.id and (t.selected or op.id is not null)
      order by (op.id is not null) desc,t.updated_at,t.id limit 1) candidate
    where ctl.singleton and ctl.catalog_enabled and c.owner_id=any(ctl.owner_allowlist)
      and c.environment=p_environment and c.status='connected' and c.auto_sync
    order by candidate.updated_at,c.id limit p_limit) row),'[]'::jsonb);
end $$;
revoke all on function public.square_poll_v2(text,integer) from public,anon,authenticated,service_role;
grant execute on function public.square_poll_v2(text,integer) to service_role;
commit;
