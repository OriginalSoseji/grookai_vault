begin;

-- Operational notification progress, never a payment or ownership ledger.
alter table public.vendor_order_reconcile_jobs
 add column if not exists requested_generation bigint not null default 0 check(requested_generation>=0),
 add column if not exists claimed_generation bigint not null default 0 check(claimed_generation>=0 and claimed_generation<=requested_generation),
 add column if not exists completed_generation bigint not null default 0 check(completed_generation>=0 and completed_generation<=requested_generation);
create table if not exists public.vendor_order_signal_associations (
 stripe_account_id text not null, connected_account_id text not null, livemode boolean not null, event_id text not null,
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 generation bigint not null check(generation>0), associated_at timestamptz not null default clock_timestamp(),
 primary key(stripe_account_id,connected_account_id,livemode,event_id), unique(order_id,generation),
 foreign key(stripe_account_id,connected_account_id,livemode,event_id)
  references public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,event_id) on delete restrict
);
alter table public.vendor_order_signal_associations enable row level security;
revoke all on public.vendor_order_signal_associations from public,anon,authenticated,service_role;
grant select on public.vendor_order_signal_associations to service_role;
drop trigger if exists vendor_order_signal_association_immutable on public.vendor_order_signal_associations;
create trigger vendor_order_signal_association_immutable before update or delete on public.vendor_order_signal_associations
 for each row execute function public.vendor_order_reconcile_event_immutable_v1();

-- Always create the lock row: a missing scope must never mean no serialization.
create or replace function public.vendor_order_notification_lock_v1(p_platform text,p_live boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,false);
 perform public.vendor_stock_require_isolation_v1();
 insert into public.vendor_order_reconcile_scopes(stripe_account_id,livemode) values(p_platform,p_live) on conflict do nothing;
 perform 1 from public.vendor_order_reconcile_scopes where stripe_account_id=p_platform and livemode=p_live for update;
end;$$;

-- Bounded association includes old signals that arrived before immutable binding.
-- Scope -> job is also the seed/claim/finish order. No provider IO or order update.
create or replace function public.vendor_order_notification_associate_v1(p_platform text,p_live boolean,p_order uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare e record;g bigint;n integer:=0;
begin
 perform public.vendor_order_notification_lock_v1(p_platform,p_live);
 for e in select s.*,a.order_id from public.vendor_order_signals s join public.vendor_order_attempts a
  on a.stripe_account_id=s.stripe_account_id and a.connected_account_id=s.connected_account_id and a.livemode=s.livemode
  and ((s.kind='checkout' and a.session_id=s.resource_id) or (s.kind='payment_intent' and a.payment_intent_id=s.resource_id))
  where s.stripe_account_id=p_platform and s.livemode=p_live and (p_order is null or a.order_id=p_order)
  and not exists(select 1 from public.vendor_order_signal_associations x where
   (x.stripe_account_id,x.connected_account_id,x.livemode,x.event_id)=(s.stripe_account_id,s.connected_account_id,s.livemode,s.event_id))
  order by s.received_at,s.connected_account_id,s.event_id limit 100
 loop
  insert into public.vendor_order_reconcile_jobs(order_id,next_run_at) values(e.order_id,clock_timestamp()) on conflict do nothing;
  update public.vendor_order_reconcile_jobs set requested_generation=requested_generation+1,
   next_run_at=least(next_run_at,clock_timestamp()) where order_id=e.order_id returning requested_generation into g;
  insert into public.vendor_order_signal_associations(stripe_account_id,connected_account_id,livemode,event_id,order_id,generation)
   values(e.stripe_account_id,e.connected_account_id,e.livemode,e.event_id,e.order_id,g);
  n:=n+1;
 end loop;
 return n;
end;$$;

-- Includes unassociated signals: neither batching nor pre-binding delay can
-- allow new fulfillment on stale payment state. Used only inside private readers.
create or replace function public.vendor_order_notification_pending_v1(p_order uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendor_order_reconcile_jobs where order_id=p_order and requested_generation>completed_generation)
 or exists(select 1 from public.vendor_order_attempts a join public.vendor_order_signals s
  on a.stripe_account_id=s.stripe_account_id and a.connected_account_id=s.connected_account_id and a.livemode=s.livemode
  and ((s.kind='checkout' and a.session_id=s.resource_id) or (s.kind='payment_intent' and a.payment_intent_id=s.resource_id))
  where a.order_id=p_order and not exists(select 1 from public.vendor_order_signal_associations x where
   (x.stripe_account_id,x.connected_account_id,x.livemode,x.event_id)=(s.stripe_account_id,s.connected_account_id,s.livemode,s.event_id)));
$$;

create or replace function public.vendor_order_signal_v1(p_platform text,p_connected text,p_live boolean,p_event text,p_kind text,p_resource text,p_created timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.vendor_order_signals; result uuid;
begin
 perform public.vendor_order_notification_lock_v1(p_platform,p_live);
 if p_created is null or p_created>clock_timestamp()+interval '5 minutes' then raise exception 'order_signal_invalid';end if;
 insert into public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,event_id,kind,resource_id,provider_created_at)
 values(p_platform,p_connected,p_live,p_event,p_kind,p_resource,p_created) on conflict do nothing;
 select * into strict e from public.vendor_order_signals where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live and event_id=p_event;
 if row(e.kind,e.resource_id,e.provider_created_at) is distinct from row(p_kind,p_resource,p_created) then raise exception 'order_signal_conflict';end if;
 select order_id into result from public.vendor_order_attempts where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live
  and ((p_kind='checkout' and session_id=p_resource) or (p_kind='payment_intent' and payment_intent_id=p_resource));
 if result is not null then perform public.vendor_order_notification_associate_v1(p_platform,p_live,result);end if;
 return result;
end;$$;

create or replace function public.vendor_order_reconcile_seed_v1(p_platform text,p_live boolean,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.vendor_order_reconcile_scopes;r record;n integer:=0;done boolean;due timestamptz;
begin
 perform public.vendor_order_reconcile_require_v1(p_platform,p_live,true);
 if p_limit is null or p_limit<1 or p_limit>100 then raise exception 'order_queue_invalid';end if;
 perform public.vendor_order_notification_associate_v1(p_platform,p_live);
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
 perform public.vendor_order_notification_associate_v1(p_platform,p_live);
 select q.* into j from public.vendor_order_reconcile_jobs q join public.vendor_order_attempts a on a.order_id=q.order_id
  where a.stripe_account_id=p_platform and a.livemode=p_live and a.creation_started_at is not null
   and (a.session_id is not null or a.creation_started_at+interval '23 hours 120 seconds'<=clock_timestamp())
   and q.next_run_at<=clock_timestamp() and (q.lease_expires_at is null or q.lease_expires_at<=clock_timestamp())
  order by q.next_run_at,q.order_id limit 1 for update of q skip locked;
 if not found then return null;end if;
 update public.vendor_order_reconcile_jobs set lease_token=p_token,lease_fence=lease_fence+1,claimed_generation=requested_generation,
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
 perform public.vendor_order_notification_associate_v1(p_platform,p_live,p_order);
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
 -- A successful check acknowledges only the generation captured before IO.
 -- A later event remains due even when this payment observation was clean.
 if result in ('verified','needs_review') and j.requested_generation>j.claimed_generation then due:=clock_timestamp();end if;
 update public.vendor_order_reconcile_jobs set completed_generation=case when result in ('verified','needs_review')
  then greatest(completed_generation,claimed_generation) else completed_generation end,lease_token=null,lease_expires_at=null,last_finished_at=clock_timestamp(),
  last_result=result,failures=v_failures,next_run_at=due where order_id=p_order;
 insert into public.vendor_order_reconcile_events(order_id,fence,phase,token,result,next_run_at) values(p_order,p_fence,'finished',p_token,result,due);
 update public.vendor_order_reconcile_scopes set last_finished_at=clock_timestamp() where stripe_account_id=p_platform and livemode=p_live;
 return jsonb_build_object('orderId',p_order,'fence',p_fence,'result',result,'nextRunAt',due);
end;$$;

create or replace function public.vendor_order_fulfillment_record_v1(
 p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_sequence bigint,p_action text,p_carrier text default null,p_tracking text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders; previous public.vendor_order_fulfillment_events; saved public.vendor_order_fulfillment_events;
 a public.vendor_order_attempts; current_state text; current_sequence bigint; next_state text; next_carrier text; next_tracking text;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_actor_id is null or p_request_id is null or p_expected_sequence is null or p_expected_sequence<0
  or p_action is null or p_action not in ('ready_pickup','collect','ship','update_tracking','deliver') then raise exception 'order_fulfillment_invalid';end if;
 -- Obtain the immutable scope before the order lock; re-read pending signals
 -- only after acquiring the order lock, including a newly committed PI binding.
 select t.* into a from public.vendor_order_attempts t join public.vendor_orders v on v.id=t.order_id
  where v.id=p_order_id and v.owner_id=p_actor_id;
 if not found then raise exception 'order_fulfillment_unavailable';end if;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 -- Only this immutable owner can record fulfillment. No inventory lock is acquired
 -- after this order lock, so settlement's stock/reservation/order order cannot cycle.
 select * into o from public.vendor_orders where id=p_order_id and owner_id=p_actor_id for update;
 if not found then raise exception 'order_fulfillment_unavailable';end if;
 if p_action in ('ship','update_tracking') then
  if p_carrier is null or p_carrier not in ('usps','ups','fedex','dhl','other') or p_tracking is null
   or length(p_tracking) not between 3 and 100 or p_tracking !~ '^[A-Za-z0-9][A-Za-z0-9 -]*$' or p_tracking<>btrim(p_tracking)
   then raise exception 'order_fulfillment_invalid';end if;
 elsif p_carrier is not null or p_tracking is not null then raise exception 'order_fulfillment_invalid';end if;
 select * into saved from public.vendor_order_fulfillment_events where id=p_request_id;
 if found then
  if row(saved.order_id,saved.actor_id,saved.sequence,saved.action) is distinct from row(o.id,p_actor_id,p_expected_sequence+1,p_action)
   or (p_action in ('ship','update_tracking') and row(saved.carrier,saved.tracking) is distinct from row(p_carrier,p_tracking))
   then raise exception 'order_fulfillment_conflict';end if;
  -- Exact receipt recovery survives pause and subsequent payment review.
 else
  if not coalesce((select enabled from public.vendor_order_fulfillment_control where singleton),false) then raise exception 'order_fulfillment_disabled';end if;
  if not o.paid or cardinality(o.review_reasons)>0 or public.vendor_order_refund_pending_v1(o.id) or public.vendor_order_notification_pending_v1(o.id) or not exists(select 1 from public.vendor_stock_reservations where id=o.reservation_id and state='consumed')
   then raise exception 'order_fulfillment_payment_unresolved';end if;
  select * into previous from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 1;
  current_state:=coalesce(previous.state,'unfulfilled');current_sequence:=coalesce(previous.sequence,0);
  if current_sequence<>p_expected_sequence then raise exception 'order_fulfillment_conflict';end if;
  if o.fulfillment='pickup' and current_state='unfulfilled' and p_action='ready_pickup' then next_state:='ready_pickup';
  elsif o.fulfillment='pickup' and current_state='ready_pickup' and p_action='collect' then next_state:='collected';
  elsif o.fulfillment='shipping' and current_state='unfulfilled' and p_action='ship' then next_state:='shipped';
  elsif o.fulfillment='shipping' and current_state='shipped' and p_action='update_tracking' then
   if row(previous.carrier,previous.tracking) is not distinct from row(p_carrier,p_tracking) then raise exception 'order_fulfillment_invalid';end if;
   next_state:='shipped';
  elsif o.fulfillment='shipping' and current_state='shipped' and p_action='deliver' then next_state:='delivered';
  else raise exception 'order_fulfillment_conflict';end if;
  if p_action='deliver' then next_carrier:=previous.carrier;next_tracking:=previous.tracking;
  else next_carrier:=p_carrier;next_tracking:=p_tracking;end if;
  insert into public.vendor_order_fulfillment_events(id,order_id,actor_id,sequence,action,state,carrier,tracking)
   values(p_request_id,o.id,p_actor_id,current_sequence+1,p_action,next_state,next_carrier,next_tracking) returning * into saved;
 end if;
 return jsonb_build_object('requestId',saved.id,'orderId',saved.order_id,'sequence',saved.sequence,'action',saved.action,
  'state',saved.state,'carrier',saved.carrier,'tracking',saved.tracking,'recordedAt',saved.recorded_at);
end;$$;

create or replace function public.vendor_order_fulfillment_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_FULFILLMENT_V1','orderId',o.id,'mode',o.fulfillment,
  'role',case when auth.uid()=o.owner_id then 'seller' else 'buyer' end,
  'canManage',auth.uid()=o.owner_id and c.enabled and o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and not public.vendor_order_notification_pending_v1(o.id) and r.state='consumed',
  'paymentReady',o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and not public.vendor_order_notification_pending_v1(o.id) and r.state='consumed',
  'sequence',coalesce(last.sequence,0),'state',coalesce(last.state,'unfulfilled'),
  'carrier',last.carrier,'tracking',last.tracking,'updatedAt',last.recorded_at,
  'events',coalesce((select jsonb_agg(jsonb_build_object('requestId',e.id,'sequence',e.sequence,'action',e.action,'state',e.state,
   'carrier',e.carrier,'tracking',e.tracking,'recordedAt',e.recorded_at) order by e.sequence desc)
   from (select * from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 20) e),'[]'::jsonb))
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 cross join public.vendor_order_fulfillment_control c
 left join lateral(select * from public.vendor_order_fulfillment_events where order_id=o.id order by sequence desc limit 1) last on true
 where o.id=p_order_id and auth.uid() in(o.owner_id,o.buyer_id) and c.singleton;
$$;


-- Helpers are not new RPC authority; existing service/participant grants remain.
revoke all on function public.vendor_order_notification_lock_v1(text,boolean),
 public.vendor_order_notification_associate_v1(text,boolean,uuid),public.vendor_order_notification_pending_v1(uuid)
 from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
