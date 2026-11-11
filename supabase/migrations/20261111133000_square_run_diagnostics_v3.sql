-- Additive private run context and bounded diagnostics; no inventory authority.
begin;
create table grookai_square.run_details (
 run_id uuid primary key references grookai_square.worker_runs(id) on delete restrict,
 connection_id uuid not null, owner_id uuid not null,
 source_version text not null default 'SQUARE_COMMERCE_V3',
 stage text not null check(stage in ('start','reconcile','enroll','read_targets','catalog','stock','target_checked','finish')),
 target_id uuid references grookai_square.targets(id) on delete restrict,
 error_code text check(error_code is null or error_code ~ '^square_[a-z_]{1,80}$'),
 error_detail jsonb not null check(jsonb_typeof(error_detail)='object' and octet_length(error_detail::text)<=1024),
 updated_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 foreign key(connection_id,owner_id) references grookai_square.connections(id,owner_id) on delete restrict
);
alter table grookai_square.run_details enable row level security;
revoke all on grookai_square.run_details from public,anon,authenticated,service_role;
create function public.square_commerce_run_detail_v3(p_run_id uuid,p_owner uuid,p_connection uuid,p_stage text,
 p_error_code text default null,p_database_code text default null,p_target uuid default null) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare run grookai_square.worker_runs; connection grookai_square.connections; detail grookai_square.run_details; facts jsonb;
begin
 if p_stage is null or p_stage not in ('start','reconcile','enroll','read_targets','catalog','stock','target_checked','finish')
  or (p_error_code is not null and p_error_code !~ '^square_[a-z_]{1,80}$')
  or (p_database_code is not null and p_database_code !~ '^[0-9A-Z]{5}$') then raise exception 'square_invalid_run_diagnostic'; end if;
 select * into connection from grookai_square.connections where id=p_connection and owner_id=p_owner;
 select * into run from grookai_square.worker_runs where id=p_run_id for update;
 if connection.id is null or run.id is null or run.environment is distinct from connection.environment then raise exception 'square_run_context_unconfirmed'; end if;
 if p_target is not null and not exists(select 1 from grookai_square.targets where id=p_target and connection_id=p_connection and owner_id=p_owner) then raise exception 'square_target_not_owned'; end if;
 facts:=jsonb_strip_nulls(jsonb_build_object('stage',p_stage,'databaseCode',p_database_code,'targetId',p_target));
 select * into detail from grookai_square.run_details where run_id=p_run_id;
 if detail.run_id is not null then
  if detail.connection_id<>p_connection or detail.owner_id<>p_owner then raise exception 'square_run_context_conflict'; end if;
  if detail.finished_at is not null then
   if detail.stage=p_stage and detail.target_id is not distinct from p_target and detail.error_code is not distinct from p_error_code and detail.error_detail=facts then return true; end if;
   raise exception 'square_run_diagnostic_finalized';
  end if;
 end if;
 insert into grookai_square.run_details(run_id,connection_id,owner_id,stage,target_id,error_code,error_detail,finished_at)
 values(p_run_id,p_connection,p_owner,p_stage,p_target,p_error_code,facts,run.finished_at)
 on conflict(run_id) do update set stage=excluded.stage,target_id=excluded.target_id,error_code=excluded.error_code,
  error_detail=excluded.error_detail,updated_at=clock_timestamp(),finished_at=excluded.finished_at;
 return true;
end $$;
create function public.square_commerce_run_health_v3(p_environment text) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version','SQUARE_COMMERCE_DIAGNOSTICS_V3','recentRuns',coalesce((select jsonb_agg(row) from (
  select d.run_id as "runId",d.connection_id as "connectionId",d.source_version as version,d.stage,d.error_code as "errorCode",
   d.error_detail as "errorDetail",d.updated_at as "checkedAt",w.status,w.finished_at as "finishedAt"
  from grookai_square.run_details d join grookai_square.worker_runs w on w.id=d.run_id
  where w.environment=p_environment order by d.updated_at desc,d.run_id desc limit 20) row),'[]'::jsonb));
$$;
revoke all on function public.square_commerce_run_detail_v3(uuid,uuid,uuid,text,text,text,uuid),public.square_commerce_run_health_v3(text) from public,anon,authenticated,service_role;
grant execute on function public.square_commerce_run_detail_v3(uuid,uuid,uuid,text,text,text,uuid),public.square_commerce_run_health_v3(text) to service_role;
notify pgrst,'reload schema';
commit;
