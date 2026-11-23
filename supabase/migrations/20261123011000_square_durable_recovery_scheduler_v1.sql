-- Default-off admission metadata. No catalog, stock, price or sale writer changes.
-- The exact metadata guard rejects partial or changed prior installations.
begin;
do $migration$
declare
 expected text := 'c09b273259e97fa327b7da7d95537e4083c6258ed5385d0f429433312e83f1e3';
 observed text;
 signature_sql text := $signature$
 select encode(extensions.digest(coalesce(jsonb_agg(row_value order by kind,name),'[]'::jsonb)::text,'sha256'),'hex')
 from (
  select 'relation' kind,c.relname name,jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),
   'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl::text,
   'columns',(select jsonb_agg(jsonb_build_array(a.attnum,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,
    a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
   'constraints',(select jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated,x.condeferrable,x.condeferred) order by x.conname)
    from pg_constraint x where x.conrelid=c.oid),
   'indexes',(select jsonb_agg(pg_get_indexdef(i.indexrelid) order by ci.relname) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid),
   'policies',(select jsonb_agg(jsonb_build_array(p.polname,p.polcmd,p.polpermissive,p.polroles::text,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname) from pg_policy p where p.polrelid=c.oid),
   'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid,true) order by t.tgname) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal)) row_value
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='grookai_square' and c.relname in ('recovery_runs','recovery_queue','recovery_attempts')
  union all
  select 'function',n.nspname||'.'||p.proname,jsonb_build_object('definition',pg_get_functiondef(p.oid),
   'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text)
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='public' and p.proname='square_durable_recovery_v1')
    or (n.nspname='grookai_square' and p.proname='recovery_result_v1')
 ) metadata
 $signature$;
 ddl text := $schema$
create table grookai_square.recovery_runs (
 id uuid primary key, environment text not null check(environment in ('sandbox','production')),
 token uuid not null, status text not null default 'running' check(status in ('running','succeeded','failed','abandoned')),
 started_at timestamptz not null default clock_timestamp(), heartbeat_at timestamptz not null default clock_timestamp(),
 admission_until timestamptz not null default clock_timestamp()+interval '180 seconds',
 expires_at timestamptz not null default clock_timestamp()+interval '300 seconds', finished_at timestamptz,
 finish_request jsonb,
 result jsonb check(result is null or (jsonb_typeof(result)='object' and octet_length(result::text)<=8192)),
 check((status='running')=(finished_at is null)), check((status='running')=(result is null)),
 check((status='running')=(finish_request is null))
);
create table grookai_square.recovery_queue (
 connection_id uuid primary key references grookai_square.connections(id) on delete restrict,
 next_due_at timestamptz not null default clock_timestamp(), last_admitted_at timestamptz, last_finished_at timestamptz,
 claim_run_id uuid references grookai_square.recovery_runs(id) on delete restrict, claim_token uuid,
 claim_fence bigint not null default 0 check(claim_fence>=0), claim_until timestamptz,
 consecutive_failures integer not null default 0 check(consecutive_failures between 0 and 32),
 error_code text check(error_code is null or error_code ~ '^square_[a-z_]{1,80}$'),
 check((claim_run_id is null and claim_token is null and claim_until is null)
    or (claim_run_id is not null and claim_token is not null and claim_until is not null and claim_fence>0))
);
create index square_recovery_due_v1 on grookai_square.recovery_queue(next_due_at,last_admitted_at,connection_id);
create table grookai_square.recovery_attempts (
 claim_token uuid primary key, run_id uuid not null references grookai_square.recovery_runs(id) on delete restrict,
 connection_id uuid not null, owner_id uuid not null, fence bigint not null check(fence>0),
 status text not null default 'running' check(status in ('running','succeeded','failed','busy','review','abandoned')),
 started_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 child_run_id uuid unique references grookai_square.worker_runs(id) on delete restrict,
 targets_checked integer not null default 0 check(targets_checked between 0 and 5),
 error_code text check(error_code is null or error_code ~ '^square_[a-z_]{1,80}$'),
 foreign key(connection_id,owner_id) references grookai_square.connections(id,owner_id) on delete restrict,
 unique(run_id,connection_id), unique(connection_id,fence),
 check((status='running')=(finished_at is null))
);
alter table grookai_square.recovery_runs enable row level security;
alter table grookai_square.recovery_queue enable row level security;
alter table grookai_square.recovery_attempts enable row level security;
revoke all on grookai_square.recovery_runs,grookai_square.recovery_queue,grookai_square.recovery_attempts from public,anon,authenticated,service_role;

create function grookai_square.recovery_result_v1(p_run uuid,p_error text,p_reason text) returns jsonb
language sql stable set search_path='' as $body$
 select jsonb_build_object('runId',p_run,'status',case when coalesce(p_error,'')<>'' or
   count(*) filter(where status in ('failed','abandoned','running'))>0 then 'failed' else 'succeeded' end,
  'succeeded',count(*) filter(where status='succeeded'),
  'failed',count(*) filter(where status in ('failed','abandoned','running')),
  'skipped',count(*) filter(where status in ('busy','review')),
  'targetsChecked',coalesce(sum(targets_checked),0),
  'errorCode',coalesce(nullif(p_error,''),min(error_code) filter(where status in ('failed','abandoned','running')),
    case when count(*) filter(where status='running')>0 then 'square_recovery_interrupted' else '' end),
  'review',count(*) filter(where status='review'),'pending',count(*) filter(where status='running'),
  'admitted',count(*),'reason',p_reason)
 from grookai_square.recovery_attempts where run_id=p_run
$body$;
revoke all on function grookai_square.recovery_result_v1(uuid,text,text) from public,anon,authenticated,service_role;

create function public.square_durable_recovery_v1(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql volatile security definer set search_path='' as $body$
declare
 env text:=p_data->>'environment'; stamp timestamptz:=clock_timestamp();
 rid uuid:=(p_data->>'runId')::uuid; tok uuid:=(p_data->>'runToken')::uuid;
 run grookai_square.recovery_runs; queued grookai_square.recovery_queue; attempt grookai_square.recovery_attempts;
 connection grookai_square.connections; child grookai_square.worker_runs;
 eligible jsonb; answer jsonb; err text:=nullif(p_data->>'errorCode',''); outcome text:=p_data->>'outcome';
 checked integer:=coalesce((p_data->>'targetsChecked')::integer,0); child_id uuid:=(p_data->>'childRunId')::uuid;
 delay_seconds integer;
begin
 if jsonb_typeof(p_data) is distinct from 'object' or env is null or env not in ('sandbox','production')
   or octet_length(p_data::text)>4096 or (err is not null and err !~ '^square_[a-z_]{1,80}$') then
  raise exception 'square_invalid_recovery_request';
 end if;
 if p_action='health' then
  eligible:=public.square_commerce_service_v2('commerce_connections',jsonb_build_object('environment',env));
  return jsonb_build_object('version','SQUARE_DURABLE_RECOVERY_V1',
   'eligible',jsonb_array_length(eligible),
   'unqueued',(select count(*) from jsonb_to_recordset(eligible) e("connectionId" uuid)
    where not exists(select 1 from grookai_square.recovery_queue q where q.connection_id=e."connectionId")),
   'due',(select count(*) from grookai_square.recovery_queue q join grookai_square.connections c on c.id=q.connection_id
    where c.environment=env and q.next_due_at<=stamp and (q.claim_until is null or q.claim_until<=stamp)
     and exists(select 1 from jsonb_to_recordset(eligible) e("connectionId" uuid) where e."connectionId"=q.connection_id)),
   'oldestDueAt',(select min(q.next_due_at) from grookai_square.recovery_queue q join grookai_square.connections c on c.id=q.connection_id
    where c.environment=env and q.next_due_at<=stamp and (q.claim_until is null or q.claim_until<=stamp)
     and exists(select 1 from jsonb_to_recordset(eligible) e("connectionId" uuid) where e."connectionId"=q.connection_id)),
   'activeClaims',(select count(*) from grookai_square.recovery_queue q join grookai_square.connections c on c.id=q.connection_id where c.environment=env and q.claim_until>stamp),
   'expiredClaims',(select count(*) from grookai_square.recovery_queue q join grookai_square.connections c on c.id=q.connection_id where c.environment=env and q.claim_until<=stamp),
   'deferredConnections',(select count(*) from grookai_square.connections c where c.environment=env and c.status='connected' and c.retry_after>stamp),
   'reconnectRequired',(select count(*) from grookai_square.connections c where c.environment=env and c.status='reconnect_required'),
   'uncertainRefreshes',(select count(*) from grookai_square.connections c where c.environment=env and c.refresh_status<>'idle'),
   'staleRuns',(select count(*) from grookai_square.recovery_runs r where r.environment=env and r.status='running' and r.expires_at<=stamp),
   'lastRun',(select r.result from grookai_square.recovery_runs r where r.environment=env and r.result is not null order by r.started_at desc,r.id desc limit 1));
 end if;
 if rid is null or tok is null then raise exception 'square_invalid_recovery_request'; end if;
 if p_action='run_start' then
  -- Finalize crashed invocations from their actual durable children, never zero
  -- already completed work. Unresolved claims retain their full fencing period.
  update grookai_square.recovery_runs r set status='abandoned',finished_at=stamp,
   finish_request=jsonb_build_object('errorCode','square_recovery_interrupted','reason','expired'),
   result=grookai_square.recovery_result_v1(r.id,'square_recovery_interrupted','expired')
   where r.environment=env and r.status='running' and r.expires_at<=stamp;
  insert into grookai_square.recovery_runs(id,environment,token) values(rid,env,tok) on conflict(id) do nothing returning * into run;
  if run.id is null then
   select * into run from grookai_square.recovery_runs where id=rid for update;
   if run.environment is distinct from env then raise exception 'square_recovery_run_conflict'; end if;
   if run.status<>'running' then return jsonb_build_object('terminal',true,'result',run.result); end if;
   return jsonb_build_object('busy',true);
  end if;
  eligible:=public.square_commerce_service_v2('commerce_connections',jsonb_build_object('environment',env));
  insert into grookai_square.recovery_queue(connection_id)
   select e."connectionId" from jsonb_to_recordset(eligible) e("connectionId" uuid)
   on conflict(connection_id) do nothing;
  return jsonb_build_object('started',true);
 end if;
 select * into run from grookai_square.recovery_runs where id=rid for update;
 stamp:=clock_timestamp();
 if run.id is null or run.environment is distinct from env or run.token<>tok then raise exception 'square_recovery_run_conflict'; end if;
 if p_action='run_finish' then
  if p_data->>'reason' is null or p_data->>'reason' not in ('drained','deadline','limit','infrastructure') then raise exception 'square_invalid_recovery_request'; end if;
  if run.status<>'running' then
   if run.finish_request=jsonb_build_object('errorCode',coalesce(err,''),'reason',p_data->>'reason') then return run.result; end if;
   raise exception 'square_recovery_result_conflict';
  end if;
  answer:=grookai_square.recovery_result_v1(rid,err,p_data->>'reason');
  update grookai_square.recovery_runs set status=answer->>'status',result=answer,finished_at=stamp,heartbeat_at=stamp,
   finish_request=jsonb_build_object('errorCode',coalesce(err,''),'reason',p_data->>'reason') where id=rid;
  return answer;
 end if;
 if p_action='claim' then
  if run.status<>'running' then raise exception 'square_recovery_run_finished'; end if;
  if run.admission_until<=stamp or (select count(*) from grookai_square.recovery_attempts where run_id=rid)>=100 then return jsonb_build_object('empty',true); end if;
  eligible:=public.square_commerce_service_v2('commerce_connections',jsonb_build_object('environment',env));
  select q.* into queued from grookai_square.recovery_queue q join grookai_square.connections c on c.id=q.connection_id
   where c.environment=env and c.status='connected' and c.refresh_status='idle'
    and (c.retry_after is null or c.retry_after<=stamp) and (c.lease_until is null or c.lease_until<=stamp)
    and q.next_due_at<=stamp and (q.claim_until is null or q.claim_until<=stamp)
    and exists(select 1 from jsonb_to_recordset(eligible) e("connectionId" uuid) where e."connectionId"=c.id)
    and not exists(select 1 from grookai_square.recovery_attempts a where a.run_id=rid and a.connection_id=q.connection_id)
   order by q.next_due_at,q.last_admitted_at nulls first,q.connection_id for update of q skip locked limit 1;
  if queued.connection_id is null then return jsonb_build_object('empty',true); end if;
  if queued.claim_token is not null then
   update grookai_square.recovery_attempts set status='abandoned',finished_at=stamp,error_code='square_recovery_interrupted'
    where claim_token=queued.claim_token and status='running';
  end if;
  select * into connection from grookai_square.connections where id=queued.connection_id;
  update grookai_square.recovery_queue set claim_run_id=rid,claim_token=gen_random_uuid(),claim_fence=claim_fence+1,
   claim_until=stamp+interval '330 seconds',last_admitted_at=stamp where connection_id=queued.connection_id returning * into queued;
  insert into grookai_square.recovery_attempts(claim_token,run_id,connection_id,owner_id,fence)
   values(queued.claim_token,rid,connection.id,connection.owner_id,queued.claim_fence);
  update grookai_square.recovery_runs set heartbeat_at=stamp where id=rid;
  return jsonb_build_object('connectionId',connection.id,'ownerId',connection.owner_id,'claimToken',queued.claim_token,'fence',queued.claim_fence);
 elsif p_action='finish' then
  if outcome is null or outcome not in ('succeeded','failed','busy','review') or checked not between 0 and 5
   or (outcome='failed' and err is null) or (outcome<>'failed' and err is not null) then raise exception 'square_invalid_recovery_result'; end if;
  select * into queued from grookai_square.recovery_queue where connection_id=(p_data->>'connectionId')::uuid for update;
  select * into attempt from grookai_square.recovery_attempts where claim_token=(p_data->>'claimToken')::uuid for update;
  stamp:=clock_timestamp();
  if attempt.claim_token is null or attempt.run_id<>rid or attempt.connection_id is distinct from queued.connection_id
   or attempt.fence is distinct from (p_data->>'fence')::bigint then raise exception 'square_recovery_claim_conflict'; end if;
  if attempt.status<>'running' then
   if attempt.status=outcome and attempt.child_run_id is not distinct from child_id and attempt.targets_checked=checked
    and attempt.error_code is not distinct from err then return jsonb_build_object('recorded',true,'replayed',true); end if;
   raise exception 'square_recovery_result_conflict';
  end if;
  if run.status<>'running' or queued.claim_run_id<>rid or queued.claim_token<>attempt.claim_token
   or queued.claim_fence<>attempt.fence or queued.claim_until<=stamp then raise exception 'square_recovery_claim_expired'; end if;
  select * into connection from grookai_square.connections where id=queued.connection_id;
  if connection.owner_id<>attempt.owner_id or connection.environment<>env then raise exception 'square_recovery_claim_conflict'; end if;
  if child_id is null then
   if outcome<>'failed' or checked<>0 then raise exception 'square_recovery_child_unconfirmed'; end if;
  else
   select * into child from grookai_square.worker_runs where id=child_id;
   if child.id is null or child.environment<>env or child.status<>(case when outcome='failed' then 'failed' else 'succeeded' end)
    or child.finished_at is null or child.started_at<attempt.started_at or checked>child.succeeded+child.failed+child.skipped
    or not exists(select 1 from grookai_square.run_details d where d.run_id=child_id and d.connection_id=connection.id and d.owner_id=attempt.owner_id)
    then raise exception 'square_recovery_child_unconfirmed'; end if;
  end if;
  update grookai_square.recovery_attempts set status=outcome,finished_at=stamp,child_run_id=child_id,targets_checked=checked,error_code=err where claim_token=attempt.claim_token;
  delay_seconds:=case when outcome='failed' then least(3600,(30*power(2,least(7,queued.consecutive_failures)))::integer
    +get_byte(decode(replace(connection.id::text,'-',''),'hex'),0)%16) when outcome='busy' then 15 else 0 end;
  update grookai_square.recovery_queue set claim_run_id=null,claim_token=null,claim_until=null,last_finished_at=stamp,
   next_due_at=greatest(queued.last_admitted_at+interval '60 seconds',stamp+delay_seconds*interval '1 second',connection.retry_after,
    case when outcome='busy' then connection.lease_until else null end),
   consecutive_failures=case when outcome='failed' then least(32,consecutive_failures+1) when outcome='busy' then consecutive_failures else 0 end,
   error_code=err where connection_id=connection.id;
  update grookai_square.recovery_runs set heartbeat_at=stamp where id=rid;
  return jsonb_build_object('recorded',true);
 end if;
 raise exception 'square_invalid_recovery_action';
end $body$;
revoke all on function public.square_durable_recovery_v1(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.square_durable_recovery_v1(text,jsonb) to service_role;
$schema$;
begin
 if encode(extensions.digest(pg_get_functiondef('public.square_commerce_service_v2(text,jsonb)'::regprocedure),'sha256'),'hex')
   <> '5ef48123825c07a02784b76a14d01c0b4b40fb51f8e6caabfb6619da9e8bae75' then
  raise exception 'square_recovery_source_drift';
 end if;
 if to_regclass('grookai_square.recovery_runs') is null and to_regclass('grookai_square.recovery_queue') is null
  and to_regclass('grookai_square.recovery_attempts') is null
  and to_regprocedure('public.square_durable_recovery_v1(text,jsonb)') is null
  and to_regprocedure('grookai_square.recovery_result_v1(uuid,text,text)') is null then execute ddl; end if;
 execute signature_sql into observed;
 if observed is distinct from expected then raise exception 'square_recovery_metadata_drift'; end if;
end $migration$;
commit;
