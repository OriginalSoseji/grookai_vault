begin;
set local statement_timeout='30s';
create function pg_temp.square_assert(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Square retry proof: %',label;end if;end $$;
create function pg_temp.square_reject(command text,expected text) returns void language plpgsql as $$
declare reason text;begin begin execute command;exception when others then reason:=sqlerrm;end;
 if reason is null or position(expected in reason)=0 then raise exception 'Square expected rejection %, got %',expected,reason;end if;end $$;
set local role authenticated;
select pg_temp.square_reject($q$select public.square_poll_v3('sandbox',10)$q$,'permission denied');
select pg_temp.square_reject($q$select public.square_health_v1()$q$,'permission denied');
select pg_temp.square_reject($q$select public.square_worker_run_v1(gen_random_uuid(),'start','{}')$q$,'permission denied');
reset role;
do $$
declare c grookai_square.connections;lease uuid:=gen_random_uuid();claim jsonb;run uuid:=gen_random_uuid();result jsonb;
begin
 select * into strict c from grookai_square.connections where status='connected' and environment='sandbox';
 claim:=public.square_service_v1('claim',jsonb_build_object('ownerId',c.owner_id,'connectionId',c.id,'leaseToken',lease));
 perform public.square_connection_defer_v1(c.id,c.owner_id,lease,(claim->>'lease_fence')::bigint,3600);
 perform pg_temp.square_assert((select retry_after>clock_timestamp()+interval '59 minutes' from grookai_square.connections where id=c.id),'backoff retained');
 perform pg_temp.square_assert(public.square_poll_v3('sandbox',10)='[]'::jsonb,'backoff excludes scheduled IO');
 perform pg_temp.square_assert(public.square_poll_v3('production',10)='[]'::jsonb,'environment isolation');
 begin perform public.square_connection_defer_v1(c.id,c.owner_id,lease,0,60);raise exception 'stale lease accepted';
  exception when others then if sqlerrm<>'square_stale_lease' then raise;end if;end;
 perform public.square_connection_authorization_failed_v1(c.id,c.owner_id,lease,(claim->>'lease_fence')::bigint);
 perform pg_temp.square_assert((select status='reconnect_required' from grookai_square.connections where id=c.id),'revoked authorization paused');
 perform public.square_worker_run_v1(run,'start','{"environment":"sandbox"}');
 update grookai_square.worker_runs set heartbeat_at=clock_timestamp()-interval '6 minutes' where id=run;
 perform pg_temp.square_assert((public.square_health_v1()->>'staleRuns')::int=1,'interrupted run observable');
 perform public.square_worker_run_v1(gen_random_uuid(),'start','{"environment":"sandbox"}');
 perform pg_temp.square_assert((select status='abandoned' from grookai_square.worker_runs where id=run),'abandoned run retained');
 run:=gen_random_uuid();perform public.square_worker_run_v1(run,'start','{"environment":"sandbox"}');
 result:=public.square_worker_run_v1(run,'finish','{"status":"succeeded","succeeded":2,"failed":0,"skipped":1,"errorCode":""}');
 perform pg_temp.square_assert(public.square_worker_run_v1(run,'finish','{"status":"succeeded","succeeded":2,"failed":0,"skipped":1,"errorCode":""}')=result,'worker result retry idempotent');
 begin perform public.square_worker_run_v1(run,'finish','{"status":"failed","succeeded":0,"failed":1,"skipped":0,"errorCode":"square_worker_failed"}');raise exception 'conflicting retry accepted';
  exception when others then if sqlerrm<>'square_worker_result_conflict' then raise;end if;end;
end $$;
select 'square_retry_authority_passed_rolled_back';
rollback;
