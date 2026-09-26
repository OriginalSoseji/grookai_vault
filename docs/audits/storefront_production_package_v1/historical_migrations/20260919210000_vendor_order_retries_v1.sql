begin;

-- Operational retry ownership only. Payment and stock authority stay in the
-- existing immutable orders, provider verifier and atomic settlement boundary.
create table if not exists public.vendor_order_reconcile_control (
 id boolean primary key default true check(id), enabled boolean not null default false
);
insert into public.vendor_order_reconcile_control(id) values(true) on conflict do nothing;
create table if not exists public.vendor_order_reconcile_scopes (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 livemode boolean not null, scan_after uuid, scan_upper uuid,
 completed_sweeps bigint not null default 0 check(completed_sweeps>=0),
 last_scan_at timestamptz, last_completed_sweep_at timestamptz,
 last_claimed_at timestamptz, last_finished_at timestamptz,
 primary key(stripe_account_id,livemode), check(scan_after is null or (scan_upper is not null and scan_after<=scan_upper))
);
create table if not exists public.vendor_order_reconcile_jobs (
 order_id uuid primary key references public.vendor_orders(id) on delete restrict,
 next_run_at timestamptz not null, created_at timestamptz not null default clock_timestamp(),
 lease_token uuid, lease_fence bigint not null default 0 check(lease_fence>=0), lease_expires_at timestamptz,
 attempts bigint not null default 0 check(attempts>=0), failures integer not null default 0 check(failures>=0),
 abandoned_claims bigint not null default 0 check(abandoned_claims>=0),
 last_claimed_at timestamptz, last_finished_at timestamptz,
 last_result text check(last_result in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit')),
 check((lease_token is null)=(lease_expires_at is null)), unique(lease_token)
);
create index if not exists vendor_order_reconcile_jobs_due on public.vendor_order_reconcile_jobs(next_run_at,order_id);
create table if not exists public.vendor_order_reconcile_events (
 order_id uuid not null references public.vendor_order_reconcile_jobs(order_id) on delete restrict,
 fence bigint not null check(fence>0), phase text not null check(phase in ('claimed','finished')),
 token uuid not null, recorded_at timestamptz not null default clock_timestamp(),
 result text check(result in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit')),
 next_run_at timestamptz,
 primary key(order_id,fence,phase),
 check((phase='claimed' and result is null and next_run_at is null) or (phase='finished' and result is not null and next_run_at is not null))
);
alter table public.vendor_order_reconcile_control enable row level security;
alter table public.vendor_order_reconcile_scopes enable row level security;
alter table public.vendor_order_reconcile_jobs enable row level security;
alter table public.vendor_order_reconcile_events enable row level security;
revoke all on public.vendor_order_reconcile_control,public.vendor_order_reconcile_scopes,
 public.vendor_order_reconcile_jobs,public.vendor_order_reconcile_events from public,anon,authenticated,service_role;
grant select on public.vendor_order_reconcile_control,public.vendor_order_reconcile_scopes,
 public.vendor_order_reconcile_jobs,public.vendor_order_reconcile_events to service_role;

create or replace function public.vendor_order_reconcile_event_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin raise exception 'order_queue_event_immutable';end;$$;
drop trigger if exists vendor_order_reconcile_event_immutable on public.vendor_order_reconcile_events;
create trigger vendor_order_reconcile_event_immutable before update or delete on public.vendor_order_reconcile_events
 for each row execute function public.vendor_order_reconcile_event_immutable_v1();

create or replace function public.vendor_order_reconcile_require_v1(p_platform text,p_live boolean,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_platform is null or p_platform !~ '^acct_[A-Za-z0-9]+$' or length(p_platform)>255 or p_live is null or p_enabled is null then
  raise exception 'order_queue_invalid';end if;
 if p_enabled then
  perform public.vendor_stock_require_isolation_v1();
  if not coalesce((select enabled from public.vendor_order_reconcile_control where id),false) then raise exception 'order_queue_disabled';end if;
 end if;
end;$$;

-- Cursor advancement and insertion commit together. Each sweep has a fixed
-- upper UUID. Inserts behind the cursor are picked up on the next full sweep.
create or replace function public.vendor_order_reconcile_seed_v1(p_platform text,p_live boolean,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_order_reconcile_scopes;r record;n integer:=0;done boolean;due timestamptz;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,true);
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'order_queue_invalid';end if;
 insert into public.vendor_order_reconcile_scopes(stripe_account_id,livemode) values(p_platform,p_live) on conflict do nothing;
 select * into strict s from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
 if s.scan_upper is null then
  select order_id into s.scan_upper from public.vendor_order_attempts where stripe_account_id=p_platform and livemode=p_live
   and creation_started_at is not null order by order_id desc limit 1;
 end if;
 for r in select order_id,session_id,creation_started_at from public.vendor_order_attempts
  where stripe_account_id=p_platform and livemode=p_live and creation_started_at is not null
   and (s.scan_after is null or order_id>s.scan_after) and order_id<=s.scan_upper order by order_id limit p_limit
 loop
  due:=case when r.session_id is null then greatest(clock_timestamp(),r.creation_started_at+interval '23 hours 120 seconds') else clock_timestamp() end;
  insert into public.vendor_order_reconcile_jobs(order_id,next_run_at) values(r.order_id,due)
   on conflict(order_id) do update set next_run_at=least(vendor_order_reconcile_jobs.next_run_at,excluded.next_run_at)
    where vendor_order_reconcile_jobs.last_finished_at is null and vendor_order_reconcile_jobs.lease_token is null;
  s.scan_after:=r.order_id;n:=n+1;
 end loop;
 done:=not exists(select 1 from public.vendor_order_attempts where stripe_account_id=p_platform and livemode=p_live
  and creation_started_at is not null and (s.scan_after is null or order_id>s.scan_after) and order_id<=s.scan_upper);
 update public.vendor_order_reconcile_scopes set scan_after=case when done then null else s.scan_after end,
  scan_upper=case when done then null else s.scan_upper end,last_scan_at=clock_timestamp(),
  completed_sweeps=completed_sweeps+case when done then 1 else 0 end,
  last_completed_sweep_at=case when done then clock_timestamp() else last_completed_sweep_at end
  where stripe_account_id=p_platform and livemode=p_live returning * into s;
 return jsonb_build_object('scanned',n,'complete',done,'completedSweeps',s.completed_sweeps);
end;$$;

create or replace function public.vendor_order_reconcile_claim_v1(p_platform text,p_live boolean,p_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.vendor_order_reconcile_jobs;lane text;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,true);
 if p_token is null then raise exception 'order_queue_invalid';end if;
 -- All bookkeeping takes scope before job, including seed and completion.
 -- Provider IO happens after this short transaction has committed.
 perform 1 from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
 select q.* into j from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id
  where a.stripe_account_id=p_platform and a.livemode=p_live and a.creation_started_at is not null
   and (a.session_id is not null or a.creation_started_at+interval '23 hours 120 seconds'<=clock_timestamp())
   and q.next_run_at<=clock_timestamp() and (q.lease_expires_at is null or q.lease_expires_at<=clock_timestamp())
  order by q.next_run_at,q.order_id limit 1 for update of q skip locked;
 if not found then return null;end if;
 update public.vendor_order_reconcile_jobs set lease_token=p_token,lease_fence=lease_fence+1,
  lease_expires_at=clock_timestamp()+interval '180 seconds',attempts=attempts+1,last_claimed_at=clock_timestamp(),
  abandoned_claims=abandoned_claims+case when lease_token is not null then 1 else 0 end
  where order_id=j.order_id returning * into j;
 select case when session_id is null then 'discovery' else 'bound' end into lane from public.vendor_order_attempts where order_id=j.order_id;
 insert into public.vendor_order_reconcile_events(order_id,fence,phase,token) values(j.order_id,j.lease_fence,'claimed',p_token);
 update public.vendor_order_reconcile_scopes set last_claimed_at=clock_timestamp() where stripe_account_id=p_platform and livemode=p_live;
 return jsonb_build_object('orderId',j.order_id,'token',p_token,'fence',j.lease_fence,'lane',lane,'leaseExpiresAt',j.lease_expires_at);
end;$$;

create or replace function public.vendor_order_reconcile_finish_v1(p_platform text,p_live boolean,p_order uuid,p_token uuid,p_fence bigint,p_result text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.vendor_order_reconcile_jobs;e public.vendor_order_reconcile_events;o public.vendor_orders;
 result text:=p_result;due timestamptz;v_failures integer;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 perform public.vendor_stock_require_isolation_v1();
 if p_order is null or p_token is null or p_fence is null or p_fence<1 or p_result is null or
  p_result not in ('verified','needs_review','retry','not_found','conflicting_sessions','scan_limit') then raise exception 'order_queue_invalid';end if;
 if not exists(select 1 from public.vendor_order_attempts where order_id=p_order and stripe_account_id=p_platform and livemode=p_live) then
  raise exception 'order_queue_scope_mismatch';end if;
 perform 1 from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
 select * into strict j from public.vendor_order_reconcile_jobs where order_id=p_order for update;
 select * into e from public.vendor_order_reconcile_events where order_id=p_order and fence=p_fence and phase='finished';
 if found then
  if e.token<>p_token or (e.result<>p_result and not(e.result='needs_review' and p_result='verified')) then raise exception 'order_queue_receipt_conflict';end if;
  return jsonb_build_object('orderId',p_order,'fence',p_fence,'result',e.result,'nextRunAt',e.next_run_at);
 end if;
 if j.lease_token is distinct from p_token or j.lease_fence<>p_fence or j.lease_expires_at<=clock_timestamp() then raise exception 'order_queue_lease_lost';end if;
 select * into strict o from public.vendor_orders where id=p_order;
 if result='verified' then
  if not exists(select 1 from public.vendor_order_attempts where order_id=p_order and session_id is not null) then raise exception 'order_queue_not_bound';end if;
  if cardinality(o.review_reasons)>0 then result:='needs_review';end if;
 end if;
 v_failures:=case when result='verified' then 0 else least(j.failures+1,1000000) end;
 due:=clock_timestamp()+case when result='verified' then case when o.paid then interval '6 hours' else interval '15 minutes' end
  when result='needs_review' then interval '1 hour'
  else make_interval(secs=>least(3600,30*power(2,least(v_failures-1,7)))::integer) end;
 update public.vendor_order_reconcile_jobs set lease_token=null,lease_expires_at=null,last_finished_at=clock_timestamp(),
  last_result=result,failures=v_failures,next_run_at=due where order_id=p_order;
 insert into public.vendor_order_reconcile_events(order_id,fence,phase,token,result,next_run_at) values(p_order,p_fence,'finished',p_token,result,due);
 update public.vendor_order_reconcile_scopes set last_finished_at=clock_timestamp() where stripe_account_id=p_platform and livemode=p_live;
 return jsonb_build_object('orderId',p_order,'fence',p_fence,'result',result,'nextRunAt',due);
end;$$;

create or replace function public.vendor_order_reconcile_status_v1(p_platform text,p_live boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_order_reconcile_scopes;stats jsonb;attention jsonb;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 select * into s from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live;
 select jsonb_build_object('total',count(*),'due',count(*) filter(where q.next_run_at<=clock_timestamp() and (q.lease_expires_at is null or q.lease_expires_at<=clock_timestamp())),
  'leased',count(*) filter(where q.lease_expires_at>clock_timestamp()),'expiredLeases',count(*) filter(where q.lease_expires_at<=clock_timestamp()),
  'unresolved',count(*) filter(where q.last_result is not null and q.last_result<>'verified'),
  'abandonedClaims',coalesce(sum(q.abandoned_claims),0),'oldestDueAt',min(q.next_run_at) filter(where q.next_run_at<=clock_timestamp())) into stats
  from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id where a.stripe_account_id=p_platform and a.livemode=p_live;
 select coalesce(jsonb_agg(x.value),'[]'::jsonb) into attention from (
  select jsonb_build_object('orderId',q.order_id,'result',q.last_result,'failures',q.failures,'nextRunAt',q.next_run_at,'leaseExpiresAt',q.lease_expires_at) value
  from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id
  where a.stripe_account_id=p_platform and a.livemode=p_live and (q.last_result is not null and q.last_result<>'verified' or q.lease_expires_at<=clock_timestamp())
  order by q.next_run_at,q.order_id limit 25) x;
 return stats||jsonb_build_object('enabled',coalesce((select enabled from public.vendor_order_reconcile_control where id),false),
  'checkedAt',clock_timestamp(),'lastScanAt',s.last_scan_at,'lastCompletedSweepAt',s.last_completed_sweep_at,
  'lastClaimedAt',s.last_claimed_at,'lastFinishedAt',s.last_finished_at,'completedSweeps',coalesce(s.completed_sweeps,0),'attention',attention);
end;$$;

revoke all on function public.vendor_order_reconcile_event_immutable_v1(),public.vendor_order_reconcile_require_v1(text,boolean,boolean),
 public.vendor_order_reconcile_seed_v1(text,boolean,integer),public.vendor_order_reconcile_claim_v1(text,boolean,uuid),
 public.vendor_order_reconcile_finish_v1(text,boolean,uuid,uuid,bigint,text),public.vendor_order_reconcile_status_v1(text,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_reconcile_seed_v1(text,boolean,integer),public.vendor_order_reconcile_claim_v1(text,boolean,uuid),
 public.vendor_order_reconcile_finish_v1(text,boolean,uuid,uuid,bigint,text),public.vendor_order_reconcile_status_v1(text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
