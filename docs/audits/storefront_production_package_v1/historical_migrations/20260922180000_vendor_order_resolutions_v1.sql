-- Retained review and consent only. Never clears financial holds or changes stock.
begin;
create table if not exists public.vendor_order_resolutions_control (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false
);
insert into public.vendor_order_resolutions_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_order_resolution_cases (
 id uuid primary key, order_id uuid not null references public.vendor_orders(id) on delete restrict,
 terms_version text not null check(terms_version='continue-original-order-after-failed-refund-v1'),
 basis_hash text not null check(basis_hash ~ '^[a-f0-9]{64}$'),
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 evidence_hash text not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(order_id,evidence_hash) references public.vendor_order_refund_observations(order_id,evidence_hash) on delete restrict
);
create index if not exists vendor_order_resolution_cases_order on public.vendor_order_resolution_cases(order_id,created_at,id);
create table if not exists public.vendor_order_resolution_events (
 id uuid primary key, case_id uuid not null references public.vendor_order_resolution_cases(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 sequence integer not null check(sequence between 1 and 8),
 action text not null check(action in ('request','agree','decline','withdraw','accept','reject')),
 actor_role text not null check(actor_role in ('seller','buyer','operator')),
 terms_hash text not null check(terms_hash ~ '^[a-f0-9]{64}$'),
 recorded_at timestamptz not null default clock_timestamp(), unique(case_id,sequence),
 check((sequence=1)=(action='request')),
 check((action='request' and actor_role='seller') or (action in ('agree','decline') and actor_role='buyer')
  or (action in ('accept','reject') and actor_role='operator') or (action='withdraw' and actor_role in ('seller','buyer')))
);
do $$declare n text;begin
 foreach n in array array['vendor_order_resolutions_control','vendor_order_resolution_cases','vendor_order_resolution_events'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;
create or replace function public.vendor_order_resolution_immutable_v1() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'order_resolution_history_retained';end;$$;
drop trigger if exists vendor_order_resolution_immutable on public.vendor_order_resolution_cases;
create trigger vendor_order_resolution_immutable before update or delete on public.vendor_order_resolution_cases
 for each row execute function public.vendor_order_resolution_immutable_v1();
drop trigger if exists vendor_order_resolution_immutable on public.vendor_order_resolution_events;
create trigger vendor_order_resolution_immutable before update or delete on public.vendor_order_resolution_events
 for each row execute function public.vendor_order_resolution_immutable_v1();

create or replace function public.vendor_order_resolution_operator_v1(p_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_entitlements where user_id=p_actor and is_active
  and tier='founder_admin' and role in ('founder','internal') and features->'order_resolution_operator'='true'::jsonb);
$$;
-- Deliberately excludes volatile observation timestamps and order revision.
-- A changed refund request/outcome, historical hold, notification generation or
-- physical progress invalidates positive responses, even after a clean later check.
create or replace function public.vendor_order_resolution_basis_v1(p_order uuid) returns text
language sql stable security definer set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_object('paid',o.paid,'review',o.review_reasons,'stock',r.state,
  'amount',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,'mode',o.fulfillment,
  'intent',a.payment_intent_id,'generation',coalesce(j.requested_generation,0),
  'pending',public.vendor_order_notification_pending_v1(o.id),
  'fulfillment',coalesce((select max(sequence) from public.vendor_order_fulfillment_events where order_id=o.id),0),
  'requests',coalesce((select jsonb_agg(jsonb_build_array(id,refund_id,status,amount_minor) order by id)
   from public.vendor_order_refund_requests where order_id=o.id),'[]'::jsonb),
  'inventory',(select inventory from public.vendor_order_refund_observations where order_id=o.id order by checked_at desc,recorded_at desc,evidence_hash desc limit 1),
  'holds',coalesce((select jsonb_agg(jsonb_build_array(reason,reference_id) order by reason,reference_id)
   from public.vendor_account_financial_holds where owner_id=o.owner_id),'[]'::jsonb))::text,'UTF8')),'hex')
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 join public.vendor_order_attempts a on a.order_id=o.id left join public.vendor_order_reconcile_jobs j on j.order_id=o.id where o.id=p_order;
$$;

create or replace function public.vendor_order_resolution_request_v1(
 p_order_id uuid,p_actor_id uuid,p_request_id uuid,p_revision bigint,p_evidence jsonb,p_inventory jsonb,p_disputes jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;c public.vendor_order_resolution_cases;
 b text;h text;t timestamptz;v_terms constant text:='continue-original-order-after-failed-refund-v1';
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_actor_id is null or p_request_id is null then raise exception 'order_resolution_invalid';end if;
 select x.* into a from public.vendor_order_attempts x join public.vendor_orders y on y.id=x.order_id where y.id=p_order_id and y.owner_id=p_actor_id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 select * into c from public.vendor_order_resolution_cases where id=p_request_id;
 if found then
  if c.order_id<>o.id then raise exception 'order_resolution_conflict';end if;
  return c.id; -- Same request always recovers its immutable original terms.
 end if;
 if not coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false) then raise exception 'order_resolutions_disabled';end if;
 if exists(select 1 from public.vendor_order_resolution_events where id=p_request_id) then raise exception 'order_resolution_conflict';end if;
 if (select count(*) from public.vendor_order_resolution_cases where order_id=o.id)>=20 or exists(
  select 1 from public.vendor_order_resolution_cases x join lateral
   (select action from public.vendor_order_resolution_events where case_id=x.id order by sequence desc limit 1) e on true
   where x.order_id=o.id and e.action in ('request','agree','accept')) then raise exception 'order_resolution_conflict';end if;
 perform public.vendor_order_refund_validate_v1(o.id,p_revision,p_evidence,p_inventory);
 if not o.paid or (select state from public.vendor_stock_reservations where id=o.reservation_id)<>'consumed'
  or public.vendor_order_notification_pending_v1(o.id)
  or exists(select 1 from public.vendor_order_fulfillment_events where order_id=o.id)
  or not o.review_reasons <@ array['refund_requires_reconciliation','refund_failed']::text[]
  or exists(select 1 from jsonb_array_elements_text(p_evidence->'reviewReasons') x where x not in ('refund_requires_reconciliation','refund_failed'))
  or p_disputes is distinct from '{"complete":true,"rows":[],"reviewReasons":[]}'::jsonb
  or jsonb_array_length(p_inventory->'rows')=0 or (p_inventory->>'succeededMinor')::bigint<>0 or (p_inventory->>'pendingMinor')::bigint<>0
  or exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'status' not in ('failed','canceled'))
  or exists(select 1 from public.vendor_order_refund_requests q where q.order_id=o.id and (q.refund_id is null or q.status not in ('failed','canceled')
   or not exists(select 1 from jsonb_array_elements(p_inventory->'rows') x where x->>'id'=q.refund_id and x->>'status'=q.status and (x->>'amountMinor')::bigint=q.amount_minor)))
  then raise exception 'order_resolution_not_ready';end if;
 perform public.vendor_order_refund_observe_v1(o.id,p_revision,p_evidence,p_inventory);
 b:=public.vendor_order_resolution_basis_v1(o.id);
 h:=encode(sha256(convert_to(jsonb_build_array(v_terms,o.id,b)::text,'UTF8')),'hex');t:=clock_timestamp();
 insert into public.vendor_order_resolution_cases(id,order_id,terms_version,basis_hash,terms_hash,evidence_hash,created_at)
  values(p_request_id,o.id,v_terms,b,h,p_evidence->>'evidenceHash',t);
 insert into public.vendor_order_resolution_events(id,case_id,actor_id,sequence,action,actor_role,terms_hash,recorded_at)
  values(p_request_id,p_request_id,p_actor_id,1,'request','seller',h,t);
 return p_request_id;
end;$$;

create or replace function public.vendor_order_resolution_record_v1(
 p_order_id uuid,p_case_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_sequence integer,p_action text,p_terms_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;c public.vendor_order_resolution_cases;
 e public.vendor_order_resolution_events;previous public.vendor_order_resolution_events;v_role text;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_order_id is null or p_case_id is null or p_actor_id is null or p_request_id is null or p_expected_sequence is null
  or p_expected_sequence not between 1 and 7 or p_action is null or p_action not in ('agree','decline','withdraw','accept','reject')
  or p_terms_hash is null or p_terms_hash !~ '^[a-f0-9]{64}$' then raise exception 'order_resolution_invalid';end if;
 select * into o from public.vendor_orders where id=p_order_id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 v_role:=case when p_actor_id=o.owner_id then 'seller' when p_actor_id=o.buyer_id then 'buyer'
  when public.vendor_order_resolution_operator_v1(p_actor_id) then 'operator' else null end;
 if v_role is null then raise exception 'order_resolution_unavailable';end if;
 select * into strict a from public.vendor_order_attempts where order_id=o.id;
 perform public.vendor_order_notification_lock_v1(a.stripe_account_id,a.livemode);
 perform 1 from public.vendor_orders where id=o.id for update;
 if v_role='operator' then
  perform 1 from public.user_entitlements where user_id=p_actor_id and is_active and tier='founder_admin'
   and role in ('founder','internal') and features->'order_resolution_operator'='true'::jsonb for share;
  if not found then raise exception 'order_resolution_unavailable';end if;
 end if;
 select * into c from public.vendor_order_resolution_cases where id=p_case_id and order_id=o.id;
 if not found then raise exception 'order_resolution_unavailable';end if;
 if c.terms_hash<>p_terms_hash then raise exception 'order_resolution_conflict';end if;
 select * into e from public.vendor_order_resolution_events where id=p_request_id;
 if found then
  if row(e.case_id,e.actor_id,e.sequence,e.action,e.actor_role,e.terms_hash) is distinct from
   row(c.id,p_actor_id,p_expected_sequence+1,p_action,v_role,p_terms_hash) then raise exception 'order_resolution_conflict';end if;
  return e.case_id;
 end if;
 if not coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false) then raise exception 'order_resolutions_disabled';end if;
 select * into strict previous from public.vendor_order_resolution_events where case_id=c.id order by sequence desc limit 1;
 if previous.sequence<>p_expected_sequence then raise exception 'order_resolution_conflict';end if;
 if not ((v_role='buyer' and previous.action='request' and p_action in ('agree','decline'))
  or (v_role='buyer' and previous.action in ('agree','accept') and p_action='withdraw')
  or (v_role='seller' and previous.action in ('request','agree','accept') and p_action='withdraw')
  or (v_role='operator' and previous.action='agree' and p_action in ('accept','reject')))
  then raise exception 'order_resolution_conflict';end if;
 if p_action in ('agree','accept') and (public.vendor_order_notification_pending_v1(o.id)
  or public.vendor_order_resolution_basis_v1(o.id) is distinct from c.basis_hash) then raise exception 'order_resolution_changed';end if;
 insert into public.vendor_order_resolution_events(id,case_id,actor_id,sequence,action,actor_role,terms_hash)
  values(p_request_id,c.id,p_actor_id,previous.sequence+1,p_action,v_role,p_terms_hash);
 return c.id;
end;$$;

create or replace function public.vendor_order_resolution_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('schema','VENDOR_ORDER_RESOLUTIONS_V1','orderId',o.id,
  'role',case when auth.uid()=o.owner_id then 'seller' when auth.uid()=o.buyer_id then 'buyer' else 'operator' end,
  'writesEnabled',coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false),
  'canRequest',auth.uid()=o.owner_id and coalesce((select enabled from public.vendor_order_resolutions_control where singleton),false)
   and o.paid and not exists(select 1 from public.vendor_order_fulfillment_events where order_id=o.id)
   and (select count(*) from public.vendor_order_resolution_cases where order_id=o.id)<20
   and not exists(select 1 from public.vendor_order_resolution_cases x join lateral
    (select action from public.vendor_order_resolution_events where case_id=x.id order by sequence desc limit 1) e on true
    where x.order_id=o.id and e.action in ('request','agree','accept')),
  'clearsFinancialHolds',false,'permitsFulfillment',false,
  'cases',coalesce((select jsonb_agg(jsonb_build_object('caseId',c.id,'termsVersion',c.terms_version,'termsHash',c.terms_hash,
   'totalAmountMinor',o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor,'currency',o.currency,
   'createdAt',c.created_at,'basisCurrent',not public.vendor_order_notification_pending_v1(o.id) and c.basis_hash=public.vendor_order_resolution_basis_v1(o.id),
   'sequence',last.sequence,'state',case last.action when 'request' then 'requested' when 'agree' then 'agreed' when 'decline' then 'declined'
    when 'withdraw' then 'withdrawn' when 'accept' then 'accepted' when 'reject' then 'rejected' end,
   'events',(select jsonb_agg(jsonb_build_object('requestId',e.id,'sequence',e.sequence,'action',e.action,'role',e.actor_role,'recordedAt',e.recorded_at) order by e.sequence)
    from public.vendor_order_resolution_events e where e.case_id=c.id)) order by c.created_at desc,c.id)
   from (select * from public.vendor_order_resolution_cases where order_id=o.id order by created_at desc,id limit 20) c
   join lateral(select * from public.vendor_order_resolution_events where case_id=c.id order by sequence desc limit 1) last on true),'[]'::jsonb))
 from public.vendor_orders o where o.id=p_order_id and (auth.uid() in(o.owner_id,o.buyer_id) or public.vendor_order_resolution_operator_v1(auth.uid()));
$$;
do $$declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'vendor_order_resolution_%_v1' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
 end loop;
end$$;
grant execute on function public.vendor_order_resolution_request_v1(uuid,uuid,uuid,bigint,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.vendor_order_resolution_record_v1(uuid,uuid,uuid,uuid,integer,text,text) to service_role;
grant execute on function public.vendor_order_resolution_status_v1(uuid) to authenticated;
commit;
