-- Durable owner-authorized refunds. Disabled by default; no provider or stock action.
begin;
create table if not exists public.vendor_order_refunds_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_refunds_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_refund_requests (
 id uuid primary key,
 request_version text not null default 'v1' check(request_version='v1'),
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 amount_minor bigint not null check(amount_minor between 1 and 99999999),
 reason text not null check(reason in ('requested_by_customer','duplicate')),
 charge_id text not null check(charge_id ~ '^ch_[A-Za-z0-9]+$' and length(charge_id)<=255),
 payment_intent_id text not null check(payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and length(payment_intent_id)<=255),
 platform_account_id text not null check(platform_account_id ~ '^acct_[A-Za-z0-9]+$' and length(platform_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255 and connected_account_id<>platform_account_id),
 livemode boolean not null,
 created_at timestamptz not null default clock_timestamp(),
 creation_started_at timestamptz not null default clock_timestamp(),
 lease_token uuid not null,
 lease_fence bigint not null default 1 check(lease_fence>0),
 lease_expires_at timestamptz not null,
 refund_id text check(refund_id ~ '^re_[A-Za-z0-9]+$' and length(refund_id)<=255),
 status text not null default 'unbound' check(status in ('unbound','pending','requires_action','succeeded','failed','canceled')),
 last_checked_at timestamptz,
 check((refund_id is null)=(status='unbound')),
 unique(platform_account_id,connected_account_id,livemode,refund_id)
);
create index if not exists vendor_order_refund_requests_order on public.vendor_order_refund_requests(order_id,created_at,id);
create table if not exists public.vendor_order_refund_observations (
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 charge_id text not null,
 checked_at timestamptz not null,
 inventory jsonb not null check(jsonb_typeof(inventory)='object' and octet_length(inventory::text)<=262144),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(order_id,evidence_hash)
);
do $$declare n text;begin
 foreach n in array array['vendor_order_refunds_control','vendor_order_refund_requests','vendor_order_refund_observations'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;

create or replace function public.vendor_order_refund_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' or tg_table_name='vendor_order_refund_observations' then raise exception 'order_refund_history_retained';end if;
 if (to_jsonb(new)-array['lease_token','lease_fence','lease_expires_at','refund_id','status','last_checked_at']) is distinct from
  (to_jsonb(old)-array['lease_token','lease_fence','lease_expires_at','refund_id','status','last_checked_at'])
  or (old.refund_id is not null and new.refund_id is distinct from old.refund_id)
  or new.lease_fence<old.lease_fence then raise exception 'order_refund_request_immutable';end if;
 return new;
end;$$;
drop trigger if exists vendor_order_refund_immutable on public.vendor_order_refund_requests;
create trigger vendor_order_refund_immutable before update or delete on public.vendor_order_refund_requests
 for each row execute function public.vendor_order_refund_immutable_v1();
drop trigger if exists vendor_order_refund_immutable on public.vendor_order_refund_observations;
create trigger vendor_order_refund_immutable before update or delete on public.vendor_order_refund_observations
 for each row execute function public.vendor_order_refund_immutable_v1();

create or replace function public.vendor_order_refund_validate_v1(p_order uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r jsonb;checked timestamptz;
 amount bigint;success bigint:=0;pending bigint:=0;failed bigint:=0;canceled bigint:=0;seen text[]:='{}';
begin
 select * into strict o from public.vendor_orders where id=p_order;
 select * into strict a from public.vendor_order_attempts where order_id=p_order;
 if p_revision is null or o.revision<>p_revision then raise exception 'order_revision_conflict';end if;
 if not o.paid or a.payment_intent_id is null then raise exception 'order_refund_payment_unverified';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or
  not (p_evidence ?& array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons'])
  or exists(select 1 from unnest(array['version','orderId','attemptId','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','currency','payment','stockAction']) k where jsonb_typeof(p_evidence->k) is distinct from 'string')
  or jsonb_typeof(p_evidence->'checkedAt') is distinct from 'number' or jsonb_typeof(p_evidence->'amountMinor') is distinct from 'number'
  or jsonb_typeof(p_evidence->'reviewReasons') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_evidence->'reviewReasons') x where jsonb_typeof(x) is distinct from 'string')
  or p_evidence->>'version'<>'vendor-checkout-evidence-v1' or p_evidence->>'orderId'<>p_order::text
  or p_evidence->>'attemptId'<>a.id::text or p_evidence->>'sessionId'<>a.session_id
  or p_evidence->>'paymentIntentId'<>a.payment_intent_id or p_evidence->>'currency'<>o.currency
  or p_evidence->>'payment'<>'paid' or p_evidence->>'evidenceHash' !~ '^[a-f0-9]{64}$'
  or p_evidence->>'orderHash' !~ '^[a-f0-9]{64}$' or p_evidence->>'chargeId' !~ '^ch_[A-Za-z0-9]{1,252}$'
  or p_evidence->>'amountMinor' !~ '^[0-9]{1,8}$' or p_evidence->>'checkedAt' !~ '^[0-9]{1,12}$'
  or (p_evidence->>'amountMinor')::bigint<>o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor
  then raise exception 'order_refund_evidence_invalid';end if;
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if checked>clock_timestamp() or checked<=clock_timestamp()-interval '60 seconds' then raise exception 'order_refund_evidence_stale';end if;
 if not exists(select 1 from public.vendor_order_observations where order_id=p_order and evidence->>'payment'='paid'
  and evidence->>'chargeId'=p_evidence->>'chargeId' and evidence->>'paymentIntentId'=a.payment_intent_id)
  then raise exception 'order_refund_capture_mismatch';end if;
 if p_inventory is null or jsonb_typeof(p_inventory)<>'object' or octet_length(p_inventory::text)>262144
  or not (p_inventory ?& array['complete','rows','succeededMinor','pendingMinor','failedMinor','canceledMinor','reviewReasons'])
  or p_inventory-array['complete','rows','succeededMinor','pendingMinor','failedMinor','canceledMinor','reviewReasons']<>'{}'::jsonb
  or p_inventory->'complete' is distinct from 'true'::jsonb or jsonb_typeof(p_inventory->'rows') is distinct from 'array' or jsonb_array_length(p_inventory->'rows')>500
  or exists(select 1 from unnest(array['succeededMinor','pendingMinor','failedMinor','canceledMinor']) k where jsonb_typeof(p_inventory->k) is distinct from 'number')
  or jsonb_typeof(p_inventory->'reviewReasons') is distinct from 'array'
  or exists(select 1 from jsonb_array_elements(p_inventory->'reviewReasons') x where jsonb_typeof(x) is distinct from 'string')
  then raise exception 'order_refund_inventory_incomplete';end if;
 for r in select value from jsonb_array_elements(p_inventory->'rows') loop
  if jsonb_typeof(r)<>'object' or not (r ?& array['id','amountMinor','createdAt','requestId','status','balanceTransactionId','failureBalanceTransactionId','failureReason','pendingReason'])
   or r-array['id','amountMinor','createdAt','requestId','status','balanceTransactionId','failureBalanceTransactionId','failureReason','pendingReason']<>'{}'::jsonb
   or jsonb_typeof(r->'id') is distinct from 'string' or jsonb_typeof(r->'status') is distinct from 'string'
   or jsonb_typeof(r->'amountMinor') is distinct from 'number' or jsonb_typeof(r->'createdAt') is distinct from 'number'
   or r->>'id' !~ '^re_[A-Za-z0-9]{1,252}$' or r->>'id'=any(seen)
   or r->>'amountMinor' !~ '^[0-9]{1,8}$' or (r->>'amountMinor')::bigint not between 1 and (p_evidence->>'amountMinor')::bigint
   or r->>'createdAt' !~ '^[0-9]{1,12}$' or (r->>'createdAt')::bigint>extract(epoch from clock_timestamp())
   or r->>'status' not in ('pending','requires_action','succeeded','failed','canceled')
   or (r->>'requestId' is not null and r->>'requestId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
   or exists(select 1 from unnest(array['balanceTransactionId','failureBalanceTransactionId']) k
    where r->k<>'null'::jsonb and (jsonb_typeof(r->k) is distinct from 'string' or r->>k !~ '^txn_[A-Za-z0-9]{1,251}$'))
   or exists(select 1 from unnest(array['failureReason','pendingReason']) k
    where r->k<>'null'::jsonb and (jsonb_typeof(r->k) is distinct from 'string' or r->>k !~ '^[a-z_]{1,80}$'))
   then raise exception 'order_refund_inventory_invalid';end if;
  seen:=array_append(seen,r->>'id');amount:=(r->>'amountMinor')::bigint;
  case r->>'status' when 'succeeded' then success:=success+amount;
   when 'pending' then pending:=pending+amount;when 'requires_action' then pending:=pending+amount;
   when 'failed' then failed:=failed+amount;when 'canceled' then canceled:=canceled+amount;end case;
 end loop;
 if p_inventory->>'succeededMinor'<>success::text or p_inventory->>'pendingMinor'<>pending::text
  or p_inventory->>'failedMinor'<>failed::text or p_inventory->>'canceledMinor'<>canceled::text
  or success+pending>(p_evidence->>'amountMinor')::bigint then raise exception 'order_refund_amount_mismatch';end if;
end;$$;

create or replace function public.vendor_order_refund_context_v1(p_order_id uuid,p_actor_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('binding',public.vendor_order_binding_v1(o.id),'paid',o.paid,
  'requests',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from
   (select * from public.vendor_order_refund_requests where order_id=o.id order by created_at,id limit 500) r),'[]'::jsonb))
 from public.vendor_orders o where o.id=p_order_id and (p_actor_id is null or o.owner_id=p_actor_id);
$$;

create or replace function public.vendor_order_refund_observe_v1(p_order_id uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare req public.vendor_order_refund_requests;r jsonb;checked timestamptz;
begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_orders where id=p_order_id for update;
 perform public.vendor_order_refund_validate_v1(p_order_id,p_revision,p_evidence,p_inventory);
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if exists(select 1 from public.vendor_order_refund_observations where order_id=p_order_id and evidence_hash=p_evidence->>'evidenceHash'
  and (inventory is distinct from p_inventory or charge_id is distinct from p_evidence->>'chargeId')) then raise exception 'order_refund_evidence_conflict';end if;
 if exists(select 1 from public.vendor_order_refund_observations where order_id=p_order_id and checked_at>checked)
  then raise exception 'order_refund_evidence_stale';end if;
 for req in select * from public.vendor_order_refund_requests where order_id=p_order_id and refund_id is not null for update loop
  select value into r from jsonb_array_elements(p_inventory->'rows') where value->>'id'=req.refund_id;
  if not found or (r->>'amountMinor')::bigint<>req.amount_minor then raise exception 'order_refund_binding_mismatch';end if;
  update public.vendor_order_refund_requests set status=r->>'status',last_checked_at=checked where id=req.id;
 end loop;
 insert into public.vendor_order_refund_observations(order_id,evidence_hash,charge_id,checked_at,inventory)
  values(p_order_id,p_evidence->>'evidenceHash',p_evidence->>'chargeId',checked,p_inventory) on conflict do nothing;
end;$$;

create or replace function public.vendor_order_refund_prepare_v1(p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_amount bigint,p_reason text,
 p_token uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_order_refund_requests;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into o from public.vendor_orders where id=p_order_id for update;
 if o.id is null or p_actor_id is null or o.owner_id<>p_actor_id then raise exception 'order_refund_unavailable';end if;
 if p_request_id is null or p_token is null or p_amount is null or p_amount not between 1 and 99999999 or
  p_reason is null or p_reason not in ('requested_by_customer','duplicate') then raise exception 'order_refund_invalid';end if;
 select * into r from public.vendor_order_refund_requests where id=p_request_id;
 if found then
  if row(r.order_id,r.actor_id,r.amount_minor,r.reason) is distinct from row(o.id,p_actor_id,p_amount,p_reason) then raise exception 'order_refund_request_conflict';end if;
  if r.refund_id is not null then return r;end if;
  if r.creation_started_at<=clock_timestamp()-interval '23 hours' then raise exception 'order_refund_recovery_required';end if;
  if r.lease_token<>p_token and r.lease_expires_at>clock_timestamp() then raise exception 'order_refund_busy';end if;
 end if;
 if not coalesce((select enabled from public.vendor_order_refunds_control where singleton),false) then raise exception 'order_refunds_disabled';end if;
 perform public.vendor_order_refund_validate_v1(o.id,p_revision,p_evidence,p_inventory);
 if jsonb_typeof(p_evidence->'reviewReasons')<>'array' or exists(select 1 from jsonb_array_elements_text(p_evidence->'reviewReasons') x
  where x not in ('refund_requires_reconciliation','refund_pending','refund_action_required','refund_failed','paid_after_stock_release'))
  then raise exception 'order_refund_review_required';end if;
 if r.id is not null then
  -- Same request bytes/key only. Fresh history can prevent another POST when a
  -- previous ambiguous attempt is now discoverable by its durable request ID.
  if exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'requestId'=r.id::text)
   then raise exception 'order_refund_recovery_required';end if;
  update public.vendor_order_refund_requests set lease_token=p_token,
   lease_fence=lease_fence+case when lease_token=p_token then 0 else 1 end,
   lease_expires_at=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
  return r;
 end if;
 if exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null)
  then raise exception 'order_refund_unresolved_request';end if;
 if (select count(*) from public.vendor_order_refund_requests where order_id=o.id)>=500 then raise exception 'order_refund_limit';end if;
 if p_amount>(p_evidence->>'amountMinor')::bigint-(p_inventory->>'succeededMinor')::bigint-(p_inventory->>'pendingMinor')::bigint
  then raise exception 'order_refund_amount_unavailable';end if;
 perform public.vendor_order_refund_observe_v1(o.id,p_revision,p_evidence,p_inventory);
 select * into strict a from public.vendor_order_attempts where order_id=o.id;
 insert into public.vendor_order_refund_requests(id,order_id,actor_id,amount_minor,reason,charge_id,payment_intent_id,
  platform_account_id,connected_account_id,livemode,lease_token,lease_expires_at)
 values(p_request_id,o.id,p_actor_id,p_amount,p_reason,p_evidence->>'chargeId',a.payment_intent_id,
  a.stripe_account_id,a.connected_account_id,a.livemode,p_token,clock_timestamp()+interval '120 seconds') returning * into r;
 return r;
end;$$;

create or replace function public.vendor_order_refund_recovery_v1(p_order_id uuid,p_request_id uuid,p_token uuid)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare r public.vendor_order_refund_requests;begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_refund_invalid';end if;
 perform 1 from public.vendor_orders where id=p_order_id for update;
 select * into strict r from public.vendor_order_refund_requests where id=p_request_id and order_id=p_order_id for update;
 if r.refund_id is not null then return r;end if;
 if r.lease_token<>p_token and r.lease_expires_at>clock_timestamp() then raise exception 'order_refund_busy';end if;
 update public.vendor_order_refund_requests set lease_token=p_token,
  lease_fence=lease_fence+case when lease_token=p_token then 0 else 1 end,
  lease_expires_at=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
 return r;
end;$$;

create or replace function public.vendor_order_refund_bind_v1(p_order_id uuid,p_request_id uuid,p_token uuid,p_fence bigint,p_refund_id text,
 p_revision bigint,p_evidence jsonb,p_inventory jsonb)
returns public.vendor_order_refund_requests language plpgsql security definer set search_path='' as $$
declare req public.vendor_order_refund_requests;r jsonb;begin
 perform public.vendor_stock_require_isolation_v1();
 perform 1 from public.vendor_orders where id=p_order_id for update;
 select * into strict req from public.vendor_order_refund_requests where id=p_request_id and order_id=p_order_id for update;
 perform public.vendor_order_refund_validate_v1(p_order_id,p_revision,p_evidence,p_inventory);
 if p_refund_id is null or (req.refund_id is not null and req.refund_id<>p_refund_id) then raise exception 'order_refund_binding_mismatch';end if;
 if req.refund_id is null and (p_token is null or req.lease_token<>p_token or p_fence is null or req.lease_fence<>p_fence or req.lease_expires_at<=clock_timestamp())
  then raise exception 'order_refund_lease_lost';end if;
 select value into r from jsonb_array_elements(p_inventory->'rows') where value->>'id'=p_refund_id;
 if not found or (r->>'amountMinor')::bigint<>req.amount_minor or r->>'requestId' is distinct from req.id::text
  or (r->>'createdAt')::bigint<extract(epoch from req.creation_started_at)-5
  or p_evidence->>'chargeId'<>req.charge_id then raise exception 'order_refund_binding_mismatch';end if;
 if (select count(*) from jsonb_array_elements(p_inventory->'rows') where value->>'requestId'=req.id::text)<>1
  then raise exception 'order_refund_ambiguous_match';end if;
 update public.vendor_order_refund_requests set refund_id=p_refund_id,status=r->>'status',
  last_checked_at=to_timestamp((p_evidence->>'checkedAt')::bigint) where id=req.id;
 perform public.vendor_order_refund_observe_v1(p_order_id,p_revision,p_evidence,p_inventory);
 select * into strict req from public.vendor_order_refund_requests where id=p_request_id;return req;
end;$$;

create or replace function public.vendor_order_refund_pending_v1(p_order uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vendor_order_refund_requests where order_id=p_order and status in ('unbound','pending','requires_action','succeeded'));
$$;

create or replace function public.vendor_order_refund_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_REFUNDS_V1','orderId',o.id,'role',case when auth.uid()=o.owner_id then 'seller' else 'buyer' end,
  'canRequest',auth.uid()=o.owner_id and o.paid and coalesce(c.enabled,false) and not exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null),
  'totalAmountMinor',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,
  'succeededMinor',coalesce((last.inventory->>'succeededMinor')::bigint,0),'pendingMinor',coalesce((last.inventory->>'pendingMinor')::bigint,0),
  'checkedAt',last.checked_at,'uncertain',exists(select 1 from public.vendor_order_refund_requests where order_id=o.id and refund_id is null),
  'requests',coalesce((select jsonb_agg(jsonb_build_object('requestId',r.id,'amountMinor',r.amount_minor,'reason',r.reason,'status',r.status,'createdAt',r.created_at,'checkedAt',r.last_checked_at) order by r.created_at desc,r.id desc)
   from (select * from public.vendor_order_refund_requests where order_id=o.id order by created_at desc,id desc limit 20) r),'[]'::jsonb))
 from public.vendor_orders o left join public.vendor_order_refunds_control c on c.singleton
 left join lateral (select * from public.vendor_order_refund_observations where order_id=o.id order by checked_at desc,recorded_at desc limit 1) last on true
 where o.id=p_order_id and auth.uid() in (o.owner_id,o.buyer_id);
$$;

-- Original fulfillment ownership/sequence rules stay exact; pending refunds add
-- a shared order-lock check to both write and participant-read availability.
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
  if not o.paid or cardinality(o.review_reasons)>0 or public.vendor_order_refund_pending_v1(o.id) or not exists(select 1 from public.vendor_stock_reservations where id=o.reservation_id and state='consumed')
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
  'canManage',auth.uid()=o.owner_id and c.enabled and o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and r.state='consumed',
  'paymentReady',o.paid and cardinality(o.review_reasons)=0 and not public.vendor_order_refund_pending_v1(o.id) and r.state='consumed',
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
-- Function grants are narrow even for tables protected by RLS.
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'vendor_order_refund%_v1' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end$$;
grant execute on function public.vendor_order_refund_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
