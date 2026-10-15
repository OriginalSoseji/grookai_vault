-- Persist each enabled evaluation outcome. Core state/outbox work rolls back
-- together on failure; a private failure receipt survives the caught exception.
begin;
create table if not exists public.price_target_evaluation_runs (
 id uuid primary key,
 started_at timestamptz not null,
 finished_at timestamptz not null,
 status text not null check(status in ('completed','failed')),
 requested_limit integer not null check(requested_limit between 1 and 100),
 checked integer not null check(checked between 0 and 100),
 triggered integer not null check(triggered between 0 and checked),
 error_code text,
 error_detail text,
 check((status='completed' and error_code is null and error_detail is null)
    or (status='failed' and error_code is not null and error_detail is not null))
);
alter table public.price_target_evaluation_runs enable row level security;
revoke all on public.price_target_evaluation_runs from public,anon,authenticated,service_role;
grant select on public.price_target_evaluation_runs to service_role;
do $migration$
begin
 if to_regprocedure('public.price_targets_evaluate_core_v1(integer)') is null then
  alter function public.price_targets_evaluate_v1(integer) rename to price_targets_evaluate_core_v1;
 end if;
end $migration$;
revoke all on function public.price_targets_evaluate_core_v1(integer) from public,anon,authenticated,service_role;
create or replace function public.price_targets_evaluate_v1(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path='' as $$
declare run_id uuid:=gen_random_uuid(); started timestamptz:=clock_timestamp(); result jsonb;
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid evaluation limit' using errcode='22023'; end if;
 perform 1 from public.price_target_control where evaluate_enabled for share;
 if not found then return jsonb_build_object('enabled',false,'status','disabled','checked',0,'triggered',0); end if;
 begin
  result:=public.price_targets_evaluate_core_v1(p_limit);
  insert into public.price_target_evaluation_runs(id,started_at,finished_at,status,requested_limit,checked,triggered)
   values(run_id,started,clock_timestamp(),'completed',p_limit,(result->>'checked')::integer,(result->>'triggered')::integer);
  return result||jsonb_build_object('runId',run_id,'status','completed');
 exception when others then
  insert into public.price_target_evaluation_runs(id,started_at,finished_at,status,requested_limit,checked,triggered,error_code,error_detail)
   values(run_id,started,clock_timestamp(),'failed',p_limit,0,0,sqlstate,left(sqlerrm,1024));
  return jsonb_build_object('enabled',true,'status','failed','runId',run_id,'checked',0,'triggered',0);
 end;
end $$;
revoke all on function public.price_targets_evaluate_v1(integer) from public,anon,authenticated,service_role;
grant execute on function public.price_targets_evaluate_v1(integer) to service_role;
commit;
