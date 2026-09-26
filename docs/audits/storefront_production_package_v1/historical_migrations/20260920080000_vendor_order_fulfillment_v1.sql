-- Seller-recorded fulfillment, separate from payment and carrier evidence.
begin;
create table if not exists public.vendor_order_fulfillment_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_fulfillment_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_fulfillment_events (
 id uuid primary key,
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 sequence bigint not null check(sequence>0),
 action text not null check(action in ('ready_pickup','collect','ship','update_tracking','deliver')),
 state text not null check(state in ('ready_pickup','collected','shipped','delivered')),
 carrier text check(carrier in ('usps','ups','fedex','dhl','other')),
 tracking text check(length(tracking) between 3 and 100 and tracking ~ '^[A-Za-z0-9][A-Za-z0-9 -]*$'),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(order_id,sequence),
 check((state in ('shipped','delivered'))=(carrier is not null and tracking is not null)),
 check(state in ('shipped','delivered') or (carrier is null and tracking is null)),
 check((action='ready_pickup' and state='ready_pickup') or (action='collect' and state='collected')
  or (action in ('ship','update_tracking') and state='shipped') or (action='deliver' and state='delivered'))
);
alter table public.vendor_order_fulfillment_control enable row level security;
alter table public.vendor_order_fulfillment_events enable row level security;
revoke all on public.vendor_order_fulfillment_control,public.vendor_order_fulfillment_events from public,anon,authenticated,service_role;
grant select on public.vendor_order_fulfillment_control,public.vendor_order_fulfillment_events to service_role;
create or replace function public.vendor_order_fulfillment_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_fulfillment_history_retained';end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_order_fulfillment_events'::regclass and tgname='vendor_order_fulfillment_immutable') then
  create trigger vendor_order_fulfillment_immutable before update or delete on public.vendor_order_fulfillment_events
   for each row execute function public.vendor_order_fulfillment_immutable_v1();
 end if;
end$$;

create or replace function public.vendor_order_fulfillment_record_v1(
 p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_sequence bigint,p_action text,p_carrier text default null,p_tracking text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders; previous public.vendor_order_fulfillment_events; saved public.vendor_order_fulfillment_events;
 current_state text; current_sequence bigint; next_state text; next_carrier text; next_tracking text;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_actor_id is null or p_request_id is null or p_expected_sequence is null or p_expected_sequence<0
  or p_action is null or p_action not in ('ready_pickup','collect','ship','update_tracking','deliver') then raise exception 'order_fulfillment_invalid';end if;
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
  if not o.paid or cardinality(o.review_reasons)>0 or not exists(select 1 from public.vendor_stock_reservations where id=o.reservation_id and state='consumed')
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
  'canManage',auth.uid()=o.owner_id and c.enabled and o.paid and cardinality(o.review_reasons)=0 and r.state='consumed',
  'paymentReady',o.paid and cardinality(o.review_reasons)=0 and r.state='consumed',
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
revoke all on function public.vendor_order_fulfillment_immutable_v1(),
 public.vendor_order_fulfillment_record_v1(uuid,uuid,uuid,bigint,text,text,text),public.vendor_order_fulfillment_status_v1(uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_fulfillment_record_v1(uuid,uuid,uuid,bigint,text,text,text) to service_role;
grant execute on function public.vendor_order_fulfillment_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
