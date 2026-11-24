-- Read-only inspection after the exact candidate has been applied to an owned
-- lab or a separately authorized release. Contains no seed, repair or activation.
begin isolation level repeatable read read only;
set local statement_timeout='30s';
set local lock_timeout='3s';
set local search_path=pg_catalog,public,extensions;
do $verify$
declare relation regclass; principal text;
begin
 foreach relation in array array['grookai_square.recovery_runs'::regclass,
   'grookai_square.recovery_queue'::regclass,'grookai_square.recovery_attempts'::regclass] loop
  if not (select relrowsecurity from pg_class where oid=relation) then raise exception 'square_recovery_rls_missing'; end if;
  foreach principal in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(principal,relation,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'square_recovery_private_table_grant';
   end if;
  end loop;
 end loop;
 if not has_function_privilege('service_role','public.square_durable_recovery_v1(text,jsonb)','EXECUTE')
  or has_function_privilege('anon','public.square_durable_recovery_v1(text,jsonb)','EXECUTE')
  or has_function_privilege('authenticated','public.square_durable_recovery_v1(text,jsonb)','EXECUTE') then
  raise exception 'square_recovery_rpc_grant_drift';
 end if;
 foreach principal in array array['anon','authenticated','service_role'] loop
  if has_function_privilege(principal,'grookai_square.recovery_result_v1(uuid,text,text)','EXECUTE') then
   raise exception 'square_recovery_helper_grant_drift';
  end if;
 end loop;
 if not exists(select 1 from pg_proc where oid='public.square_durable_recovery_v1(text,jsonb)'::regprocedure
  and prosecdef and proconfig=array['search_path=""']::text[] and pg_get_userbyid(proowner)='postgres') then
  raise exception 'square_recovery_definer_drift';
 end if;
 if exists(select 1 from grookai_square.recovery_queue q left join grookai_square.recovery_attempts a on a.claim_token=q.claim_token
  where q.claim_token is not null and (a.claim_token is null or a.status<>'running'
    or a.run_id<>q.claim_run_id or a.connection_id<>q.connection_id or a.fence<>q.claim_fence)) then
  raise exception 'square_recovery_claim_binding_invalid';
 end if;
 if exists(select 1 from grookai_square.recovery_attempts a
  join grookai_square.recovery_runs r on r.id=a.run_id
  left join grookai_square.worker_runs w on w.id=a.child_run_id
  left join grookai_square.run_details d on d.run_id=a.child_run_id
  where a.child_run_id is not null and (w.id is null or d.run_id is null
   or w.environment<>r.environment or d.owner_id<>a.owner_id or d.connection_id<>a.connection_id
   or w.finished_at is null or w.started_at<a.started_at)) then
  raise exception 'square_recovery_child_binding_invalid';
 end if;
end $verify$;
select environment,status,count(*) as runs from grookai_square.recovery_runs group by environment,status order by environment,status;
select public.square_durable_recovery_v1('health','{"environment":"production"}'::jsonb) as production_health;
select public.square_durable_recovery_v1('health','{"environment":"sandbox"}'::jsonb) as sandbox_health;
rollback;
