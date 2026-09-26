-- Private durable orders. No checkout endpoint, provider mutation or rollout.
begin;
create table if not exists public.vendor_orders_rollout (
 singleton boolean primary key default true check(singleton), orders_enabled boolean not null default false
);
insert into public.vendor_orders_rollout(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_orders (
 id uuid primary key,
 reservation_id uuid not null unique references public.vendor_stock_reservations(id) on delete restrict,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 seller jsonb not null check(jsonb_typeof(seller)='object'),
 offer jsonb not null check(jsonb_typeof(offer)='object'),
 quantity integer not null check(quantity between 1 and 100),
 unit_amount_minor bigint not null check(unit_amount_minor>0),
 shipping_amount_minor bigint not null check(shipping_amount_minor>=0),
 tax_amount_minor bigint not null check(tax_amount_minor>=0),
 currency text not null check(currency='usd'),
 quote_reference uuid not null,
 fulfillment text not null check(fulfillment in ('shipping','pickup')),
 created_at timestamptz not null default clock_timestamp(),
 revision bigint not null default 0 check(revision>=0),
 paid boolean not null default false,
 review_reasons text[] not null default '{}',
 last_checked_at timestamptz,
 check(buyer_id<>owner_id),
 check(unit_amount_minor*quantity+shipping_amount_minor+tax_amount_minor<=99999999),
 check(fulfillment<>'pickup' or shipping_amount_minor=0)
);
create table if not exists public.vendor_order_attempts (
 id uuid primary key,
 order_id uuid not null unique references public.vendor_orders(id) on delete restrict,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255),
 livemode boolean not null,
 creation_started_at timestamptz,
 lease_token uuid,
 lease_fence bigint not null default 0 check(lease_fence>=0),
 lease_expires_at timestamptz,
 session_id text check(length(session_id)<=255 and session_id ~ '^cs_(test|live)_[A-Za-z0-9]+$'),
 session_created_at timestamptz,
 payment_intent_id text check(length(payment_intent_id)<=255 and payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
 check(stripe_account_id<>connected_account_id),
 check((lease_token is null)=(lease_expires_at is null)),
 check((session_id is null)=(session_created_at is null)),
 check(session_id is null or (creation_started_at is not null and session_created_at>=creation_started_at-interval '5 seconds'
   and session_created_at<creation_started_at+interval '23 hours')),
 unique(stripe_account_id,connected_account_id,livemode,session_id),
 unique(stripe_account_id,connected_account_id,livemode,payment_intent_id)
);
create table if not exists public.vendor_order_signals (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$' and length(stripe_account_id)<=255),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and length(connected_account_id)<=255),
 livemode boolean not null,
 event_id text not null check(event_id ~ '^evt_[A-Za-z0-9]+$' and length(event_id)<=255),
 kind text not null check(kind in ('checkout','payment_intent')),
 resource_id text not null check(length(resource_id)<=255),
 provider_created_at timestamptz not null,
 received_at timestamptz not null default clock_timestamp(),
 primary key(stripe_account_id,connected_account_id,livemode,event_id),
 check((kind='checkout' and resource_id ~ '^cs_(test|live)_[A-Za-z0-9]+$') or (kind='payment_intent' and resource_id ~ '^pi_[A-Za-z0-9]+$'))
);
create index if not exists vendor_order_signals_resource on public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,resource_id);
create table if not exists public.vendor_order_observations (
 order_id uuid not null references public.vendor_orders(id) on delete restrict,
 evidence_hash text not null check(evidence_hash ~ '^[a-f0-9]{64}$'),
 evidence jsonb not null check(jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=8192),
 applied_action text not null check(applied_action in ('consume','release','retain','none')),
 revision bigint not null check(revision>0),
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(order_id,evidence_hash), unique(order_id,revision)
);
do $$declare n text;begin
 foreach n in array array['vendor_orders_rollout','vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations'] loop
  execute format('alter table public.%I enable row level security',n);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',n);
  execute format('grant select on public.%I to service_role',n);
 end loop;
end$$;
grant update on public.vendor_orders_rollout to service_role;

create or replace function public.vendor_order_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'order_history_retained';end if;
 if tg_table_name in ('vendor_order_signals','vendor_order_observations') then raise exception 'order_history_immutable';end if;
 if tg_table_name='vendor_orders' then
  if (to_jsonb(new)-array['revision','paid','review_reasons','last_checked_at']) is distinct from
   (to_jsonb(old)-array['revision','paid','review_reasons','last_checked_at']) or (old.paid and not new.paid)
   or not new.review_reasons @> old.review_reasons then raise exception 'order_immutable';end if;
 else
  if (to_jsonb(new)-array['creation_started_at','lease_token','lease_fence','lease_expires_at','session_id','session_created_at','payment_intent_id']) is distinct from
   (to_jsonb(old)-array['creation_started_at','lease_token','lease_fence','lease_expires_at','session_id','session_created_at','payment_intent_id'])
   or (old.creation_started_at is not null and new.creation_started_at is distinct from old.creation_started_at)
   or (old.session_id is not null and row(new.session_id,new.session_created_at) is distinct from row(old.session_id,old.session_created_at))
   or (old.payment_intent_id is not null and new.payment_intent_id is distinct from old.payment_intent_id)
   or new.lease_fence<old.lease_fence then raise exception 'order_attempt_immutable';end if;
 end if;return new;
end;$$;
do $$declare n text;begin
 foreach n in array array['vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations'] loop
  if not exists(select 1 from pg_trigger where tgrelid=('public.'||n)::regclass and tgname='vendor_order_immutable') then
   execute format('create trigger vendor_order_immutable before update or delete on public.%I for each row execute function public.vendor_order_immutable_v1()',n);
  end if;
 end loop;
end$$;

-- Extend only the named stock lifecycle constraints and transition guard.
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_state_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_state_check check(state in ('held','payment_pending','released','consumed'));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_check3;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_check3 check(
 (state in ('payment_pending','consumed') and payment_started_at is not null) or
 (state='held' and payment_started_at is null) or (state='released' and (payment_started_at is not null)=(release_reason='provider_unpaid')));
alter table public.vendor_stock_reservations drop constraint if exists vendor_stock_reservations_release_reason_check;
alter table public.vendor_stock_reservations add constraint vendor_stock_reservations_release_reason_check check(release_reason in ('canceled','expired','provider_unpaid'));
create or replace function public.vendor_stock_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'stock_history_retained';end if;
 if (to_jsonb(new)-array['state','payment_started_at','released_at','release_reason']) is distinct from
    (to_jsonb(old)-array['state','payment_started_at','released_at','release_reason']) then raise exception 'stock_reservation_immutable';end if;
 if old.state='held' and new.state in ('payment_pending','released') then return new;end if;
 if old.state='payment_pending' and new.state in ('consumed','released') and new.payment_started_at=old.payment_started_at
  and exists(select 1 from public.vendor_orders o join public.vendor_order_observations e on e.order_id=o.id and e.revision=o.revision
   where o.reservation_id=old.id and e.applied_action=case new.state when 'consumed' then 'consume' else 'release' end)
  then return new;end if;
 raise exception 'stock_reservation_immutable';
end;$$;
-- Paid stock can never be unarchived/repriced/transferred through a legacy path.
create or replace function public.vendor_order_consumed_copy_v1() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,new.legacy_vault_item_id,
  new.gv_vi_id,new.archived_at,new.condition_label,new.intent,new.pricing_mode,new.asking_price_amount,new.asking_price_currency)
  is not distinct from row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,old.legacy_vault_item_id,
  old.gv_vi_id,old.archived_at,old.condition_label,old.intent,old.pricing_mode,old.asking_price_amount,old.asking_price_currency) then return new;end if;
 perform public.vendor_stock_require_isolation_v1();
 if exists(select 1 from public.vendor_stock_reservations where instance_id=old.id and state='consumed') then
  raise exception 'order_copy_consumed';end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='vendor_order_consumed_copy') then
  create trigger vendor_order_consumed_copy before update or delete on public.vault_item_instances for each row execute function public.vendor_order_consumed_copy_v1();
 end if;
end$$;

-- Server-only immutable quote input: shipping/tax policy is deliberately not an
-- HTTP input here. Unit price and quantity always come from the locked hold.
create or replace function public.vendor_order_create_v1(p_id uuid,p_attempt_id uuid,p_reservation_id uuid,p_buyer_id uuid,
 p_quote_reference uuid,p_fulfillment text,p_shipping bigint,p_tax bigint) returns public.vendor_orders
language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;r public.vendor_stock_reservations;a public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_id is null or p_attempt_id is null or p_reservation_id is null or p_buyer_id is null or p_quote_reference is null
  or p_fulfillment is null or p_fulfillment not in ('shipping','pickup') or p_shipping is null or p_tax is null
  or p_shipping not between 0 and 99999999 or p_tax not between 0 and 99999999 or (p_fulfillment='pickup' and p_shipping<>0) then raise exception 'order_invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-order:'||p_reservation_id::text,0));
 select * into o from public.vendor_orders where reservation_id=p_reservation_id;
 if found then
  if row(o.id,o.buyer_id,o.quote_reference,o.fulfillment,o.shipping_amount_minor,o.tax_amount_minor) is distinct from
   row(p_id,p_buyer_id,p_quote_reference,p_fulfillment,p_shipping,p_tax) or
   not exists(select 1 from public.vendor_order_attempts where order_id=o.id and id=p_attempt_id) then raise exception 'order_request_conflict';end if;
  return o;
 end if;
 if not exists(select 1 from public.vendor_orders_rollout where orders_enabled) then raise exception 'orders_disabled';end if;
 -- Reuses the same store -> seller -> stock -> reservation arbitration.
 r:=public.vendor_stock_start_payment_v1(p_reservation_id,p_buyer_id);
 select * into strict a from public.vendor_seller_accounts where id=r.seller_id;
 if a.state<>'bound' or a.closeout_id is not null then raise exception 'order_seller_unavailable';end if;
 insert into public.vendor_orders(id,reservation_id,buyer_id,owner_id,seller,offer,quantity,unit_amount_minor,
  shipping_amount_minor,tax_amount_minor,currency,quote_reference,fulfillment)
 values(p_id,r.id,r.buyer_id,r.owner_id,jsonb_build_object('id',a.id,'ownerId',a.owner_id,'storeId',a.store_id,
  'platformAccountId',a.stripe_account_id,'connectedAccountId',a.connected_account_id,'livemode',a.livemode,'controller',a.controller),
  r.offer,r.quantity,((r.offer->>'unit_amount')::numeric*100)::bigint,p_shipping,p_tax,'usd',p_quote_reference,p_fulfillment) returning * into o;
 insert into public.vendor_order_attempts(id,order_id,stripe_account_id,connected_account_id,livemode)
 values(p_attempt_id,o.id,a.stripe_account_id,a.connected_account_id,a.livemode);
 return o;
end;$$;

-- First creation timestamp and idempotency key (attempt UUID) are durable.
-- Acquiring a fence never authorizes provider access by itself; re-read seller
-- readiness immediately before any future provider creation adapter.
create or replace function public.vendor_order_claim_v1(p_order_id uuid,p_token uuid) returns public.vendor_order_attempts
language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;s public.vendor_seller_accounts;r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_token is null then raise exception 'order_claim_invalid';end if;
 select * into strict o from public.vendor_orders where id=p_order_id;
 perform 1 from public.vendor_stores where id=(o.seller->>'storeId')::uuid for update;
 select * into strict s from public.vendor_seller_accounts where id=(o.seller->>'id')::uuid for update;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if a.session_id is not null then return a;end if;
 if s.state<>'bound' or s.closeout_id is not null or not exists(select 1 from public.vendor_orders_rollout where orders_enabled)
  or not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(o.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.vendor_stores where id=s.store_id and web_published)
  or not exists(select 1 from public.public_profiles where user_id=o.owner_id and public_profile_enabled and vault_sharing_enabled)
  then raise exception 'order_creation_unavailable';end if;
 if r.state<>'payment_pending' or (r.instance_id is not null and (public.vendor_store_copy_reason_v1(o.owner_id,r.instance_id) is not null
  or not exists(select 1 from public.vendor_store_items where store_id=s.store_id and instance_id=r.instance_id)))
  or (r.product_id is not null and (public.vendor_store_custom_reason_v1(r.product_id) is not null
   or not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and published)
   or not exists(select 1 from public.vendor_store_rollout where custom_enabled))) then raise exception 'order_item_unavailable';end if;
 if a.creation_started_at is not null and clock_timestamp()>=a.creation_started_at+interval '23 hours' then raise exception 'order_creation_recovery_required';end if;
 if a.lease_expires_at>clock_timestamp() then
  if a.lease_token=p_token then return a;end if;raise exception 'order_claim_busy';
 end if;
 update public.vendor_order_attempts set lease_token=p_token,lease_fence=lease_fence+1,lease_expires_at=clock_timestamp()+interval '120 seconds',
  creation_started_at=coalesce(creation_started_at,clock_timestamp()) where id=a.id returning * into a;
 return a;
end;$$;

create or replace function public.vendor_order_bind_v1(p_order_id uuid,p_token uuid,p_fence bigint,p_session text,p_created timestamptz)
returns public.vendor_order_attempts language plpgsql security definer set search_path='' as $$
declare a public.vendor_order_attempts;
begin
 select * into strict a from public.vendor_order_attempts where order_id=p_order_id for update;
 if p_session is null or p_created is null or p_created>clock_timestamp() or p_created<a.creation_started_at-interval '5 seconds'
  or p_created>=a.creation_started_at+interval '23 hours' or p_session !~ ((case when a.livemode then '^cs_live_' else '^cs_test_' end)||'[A-Za-z0-9]+$')
  then raise exception 'order_session_invalid';end if;
 if a.session_id is not null then
  if row(a.session_id,a.session_created_at) is distinct from row(p_session,p_created) then raise exception 'order_session_conflict';end if;return a;
 end if;
 if a.lease_token is distinct from p_token or p_token is null or a.lease_fence is distinct from p_fence or a.lease_expires_at<=clock_timestamp()
  or a.creation_started_at is null then raise exception 'order_claim_stale';end if;
 update public.vendor_order_attempts set session_id=p_session,session_created_at=p_created,lease_token=null,lease_expires_at=null
 where id=a.id returning * into a;return a;
end;$$;

create or replace function public.vendor_order_binding_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('orderId',o.id,'reservationId',o.reservation_id,'attemptId',a.id,'buyerId',o.buyer_id,'seller',o.seller,
 'revision',o.revision,'createdAt',floor(extract(epoch from o.created_at)),
 'creationStartedAt',floor(extract(epoch from a.creation_started_at)),'sessionId',a.session_id,
 'sessionCreatedAt',floor(extract(epoch from a.session_created_at)),'paymentIntentId',a.payment_intent_id,'currency',o.currency,
 'unitAmountMinor',o.unit_amount_minor,'quantity',o.quantity,'shippingAmountMinor',o.shipping_amount_minor,'taxAmountMinor',o.tax_amount_minor,'stockState',r.state)
 from public.vendor_orders o join public.vendor_order_attempts a on a.order_id=o.id
 join public.vendor_stock_reservations r on r.id=o.reservation_id where o.id=p_order_id and a.session_id is not null;
$$;

-- Signals are immutable lookup hints. Pre-binding events survive; metadata and
-- delivery order are never payment authority or order lookup keys.
create or replace function public.vendor_order_signal_v1(p_platform text,p_connected text,p_live boolean,p_event text,p_kind text,p_resource text,p_created timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare e public.vendor_order_signals; result uuid;
begin
 if p_created is null or p_created>clock_timestamp()+interval '5 minutes' then raise exception 'order_signal_invalid';end if;
 insert into public.vendor_order_signals(stripe_account_id,connected_account_id,livemode,event_id,kind,resource_id,provider_created_at)
 values(p_platform,p_connected,p_live,p_event,p_kind,p_resource,p_created) on conflict do nothing;
 select * into strict e from public.vendor_order_signals where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live and event_id=p_event;
 if row(e.kind,e.resource_id,e.provider_created_at) is distinct from row(p_kind,p_resource,p_created) then raise exception 'order_signal_conflict';end if;
 select order_id into result from public.vendor_order_attempts where stripe_account_id=p_platform and connected_account_id=p_connected and livemode=p_live
  and ((p_kind='checkout' and session_id=p_resource) or (p_kind='payment_intent' and payment_intent_id=p_resource));return result;
end;$$;

-- The service must call this only with original, freshly verified provider
-- evidence. SQL rechecks the persisted revision, scope, identities and money
-- under locks. Evidence hashes alone confer no authority to untrusted callers.
create or replace function public.vendor_order_apply_v1(p_order_id uuid,p_revision bigint,p_platform text,p_connected text,p_live boolean,p_evidence jsonb)
returns public.vendor_orders language plpgsql security definer set search_path='' as $$
declare o public.vendor_orders;a public.vendor_order_attempts;r public.vendor_stock_reservations;
 checked timestamptz; action text; reasons text[]; v public.vault_item_instances; anchor uuid; remaining integer;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into strict o from public.vendor_orders where id=p_order_id;
 select * into strict r from public.vendor_stock_reservations where id=o.reservation_id;
 -- Same stock -> reservation order as legacy cancellation/start. No provider IO
 -- and no store/seller/entitlement lock or flag is needed for an old obligation.
 if r.instance_id is not null then select * into strict v from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=r.id for update;
 select * into strict o from public.vendor_orders where id=p_order_id for update;
 select * into strict a from public.vendor_order_attempts where order_id=o.id for update;
 if row(a.stripe_account_id,a.connected_account_id,a.livemode) is distinct from row(p_platform,p_connected,p_live) then raise exception 'order_scope_mismatch';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object' or octet_length(p_evidence::text)>8192 or
  not (p_evidence ?& array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons']) or
  p_evidence-array['version','orderId','attemptId','checkedAt','orderHash','evidenceHash','sessionId','paymentIntentId','chargeId','amountMinor','currency','payment','stockAction','reviewReasons']<>'{}'::jsonb
  then raise exception 'order_evidence_invalid';end if;
 if p_evidence->>'version'<>'vendor-checkout-evidence-v1' or p_evidence->>'orderId' is distinct from o.id::text or p_evidence->>'attemptId' is distinct from a.id::text
  or p_evidence->>'sessionId' is distinct from a.session_id or a.session_id is null or p_evidence->>'currency' is distinct from 'usd'
  or coalesce(p_evidence->>'evidenceHash','') !~ '^[a-f0-9]{64}$' or coalesce(p_evidence->>'orderHash','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'amountMinor','')<> (o.unit_amount_minor*o.quantity+o.shipping_amount_minor+o.tax_amount_minor)::text
  or coalesce(p_evidence->>'payment','') not in ('paid','unpaid','pending') or coalesce(p_evidence->>'stockAction','') not in ('consume','release','retain','none')
  or jsonb_typeof(p_evidence->'reviewReasons')<>'array' or jsonb_array_length(p_evidence->'reviewReasons')>16
  or exists(select 1 from jsonb_array_elements(p_evidence->'reviewReasons') x where jsonb_typeof(x)<>'string' or x#>>'{}' !~ '^[a-z_]{1,80}$')
  or (p_evidence->>'paymentIntentId' is not null and p_evidence->>'paymentIntentId' !~ '^pi_[A-Za-z0-9]{1,252}$')
  or (p_evidence->>'chargeId' is not null and p_evidence->>'chargeId' !~ '^ch_[A-Za-z0-9]{1,252}$')
  or (a.payment_intent_id is not null and a.payment_intent_id is distinct from p_evidence->>'paymentIntentId')
  then raise exception 'order_evidence_mismatch';end if;
 checked:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if checked is null or checked>clock_timestamp() or checked<=clock_timestamp()-interval '60 seconds' then raise exception 'order_evidence_stale';end if;
 if exists(select 1 from public.vendor_order_observations where order_id=o.id and evidence_hash=p_evidence->>'evidenceHash') then return o;end if;
 if o.revision is distinct from p_revision then raise exception 'order_revision_conflict';end if;
 if checked<o.last_checked_at then raise exception 'order_observation_out_of_order';end if;
 select coalesce(array_agg(x),'{}') into reasons from jsonb_array_elements_text(p_evidence->'reviewReasons') x;
 action:=p_evidence->>'stockAction';
 if p_evidence->>'payment'='paid' and (p_evidence->>'paymentIntentId' is null or p_evidence->>'chargeId' is null) then raise exception 'order_capture_missing';end if;
 if action='consume' and (p_evidence->>'payment'<>'paid' or r.state<>'payment_pending' or cardinality(reasons)>0) then raise exception 'order_consume_invalid';end if;
 if action='release' and (p_evidence->>'payment'<>'unpaid' or r.state<>'payment_pending' or cardinality(reasons)>0) then raise exception 'order_release_invalid';end if;
 if p_evidence->>'payment'='paid' and r.state='released' then reasons:=array_append(reasons,'paid_after_stock_release');end if;
 if o.paid and p_evidence->>'payment'<>'paid' then reasons:=array_append(reasons,'payment_fact_conflict');end if;
 if cardinality(o.review_reasons)>0 or cardinality(reasons)>0 then action:=case when r.state='payment_pending' then 'retain' else 'none' end;end if;
 if o.paid and action='release' then action:='retain';end if;
 update public.vendor_orders set revision=revision+1,paid=paid or p_evidence->>'payment'='paid',last_checked_at=checked,
  review_reasons=array(select distinct x from unnest(o.review_reasons||reasons) x order by x) where id=o.id returning * into o;
 update public.vendor_order_attempts set payment_intent_id=coalesce(payment_intent_id,p_evidence->>'paymentIntentId') where id=a.id;
 insert into public.vendor_order_observations(order_id,evidence_hash,evidence,applied_action,revision) values(o.id,p_evidence->>'evidenceHash',p_evidence,action,o.revision);
 if action in ('consume','release') then
  -- Release our claim before the stock mutation, inside this same locked
  -- transaction. Any subsequent failure rolls back both ledger and stock.
  update public.vendor_stock_reservations set state='released',released_at=clock_timestamp(),release_reason='provider_unpaid'
   where id=r.id and action='release';
  if action='consume' then
   -- The existing pending guard must no longer count our claim, while the
   -- permanent consumed guard is installed only after the first archive.
   if r.instance_id is not null then
    -- No bypass GUC: the sole narrow archive authorization is this transaction's
    -- just-inserted immutable consume observation (see guard below).
    if v.user_id<>o.owner_id or v.archived_at is not null then raise exception 'order_stock_conflict';end if;
    update public.vault_item_instances set archived_at=clock_timestamp() where id=v.id;
    -- Keep the existing legacy summary derived from exact active instances.
    select id into anchor from public.vault_items where user_id=o.owner_id and card_id=(r.offer->>'card_print_id')::uuid and archived_at is null
     order by created_at desc,id desc limit 1 for update;
    select count(*) into remaining from public.vault_item_instances vi left join public.slab_certs sc on sc.id=vi.slab_cert_id
     where vi.user_id=o.owner_id and vi.archived_at is null and coalesce(vi.card_print_id,sc.card_print_id)=(r.offer->>'card_print_id')::uuid;
    update public.vault_items set qty=remaining,archived_at=case when remaining=0 then clock_timestamp() else null end where id=anchor;
   else
    update public.vendor_store_custom_products set available_quantity=available_quantity-r.quantity,version=version+1,updated_at=clock_timestamp(),
     published=case when available_quantity=r.quantity then false else published end,
     suspension_reason=case when available_quantity=r.quantity then 'out_of_stock' else suspension_reason end
     where id=r.product_id and archived_at is null and available_quantity>=r.quantity;
    if not found then raise exception 'order_stock_conflict';end if;
   end if;
   update public.vendor_stock_reservations set state='consumed' where id=r.id;
  end if;
 end if;
 if o.paid then insert into public.vendor_account_financial_holds(owner_id,reason,reference_id) values(o.owner_id,'order_fulfillment',o.id) on conflict do nothing;end if;
 if cardinality(o.review_reasons)>0 then insert into public.vendor_account_financial_holds(owner_id,reason,reference_id) values(o.owner_id,'manual_review',o.id) on conflict do nothing;end if;
 return o;
end;$$;

-- A pending claim being atomically consumed is excluded only when its current
-- immutable ledger observation authorizes consumption. No client-set context.
create or replace function public.vendor_stock_live_quantity_v1(p_instance uuid,p_product uuid) returns bigint
language sql volatile security definer set search_path='' as $$
 select coalesce(sum(r.quantity),0) from public.vendor_stock_reservations r
 where ((p_instance is not null and r.instance_id=p_instance) or (p_product is not null and r.product_id=p_product))
 and (r.state='payment_pending' or (r.state='held' and r.expires_at>clock_timestamp()))
 and not exists(select 1 from public.vendor_orders o join public.vendor_order_observations e on e.order_id=o.id and e.revision=o.revision
  where o.reservation_id=r.id and e.applied_action='consume');
$$;

-- Participant read survives downgrade, but contains no provider IDs, another
-- account's identity, addresses or internal evidence. Exact order ID only.
create or replace function public.vendor_order_status_v1(p_order_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',o.id,'offer',o.offer,'quantity',o.quantity,'unitAmountMinor',o.unit_amount_minor,
 'shippingAmountMinor',o.shipping_amount_minor,'taxAmountMinor',o.tax_amount_minor,'currency',o.currency,
 'fulfillment',o.fulfillment,'paid',o.paid,'needsReview',cardinality(o.review_reasons)>0,'stockState',r.state,'createdAt',o.created_at)
 from public.vendor_orders o join public.vendor_stock_reservations r on r.id=o.reservation_id
 where o.id=p_order_id and auth.uid() in (o.owner_id,o.buyer_id);
$$;
revoke all on function public.vendor_order_immutable_v1(),public.vendor_order_consumed_copy_v1(),
 public.vendor_order_create_v1(uuid,uuid,uuid,uuid,uuid,text,bigint,bigint),public.vendor_order_claim_v1(uuid,uuid),
 public.vendor_order_bind_v1(uuid,uuid,bigint,text,timestamptz),public.vendor_order_binding_v1(uuid),
 public.vendor_order_signal_v1(text,text,boolean,text,text,text,timestamptz),public.vendor_order_apply_v1(uuid,bigint,text,text,boolean,jsonb),
 public.vendor_order_status_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_order_create_v1(uuid,uuid,uuid,uuid,uuid,text,bigint,bigint),public.vendor_order_claim_v1(uuid,uuid),
 public.vendor_order_bind_v1(uuid,uuid,bigint,text,timestamptz),public.vendor_order_binding_v1(uuid),
 public.vendor_order_signal_v1(text,text,boolean,text,text,text,timestamptz),public.vendor_order_apply_v1(uuid,bigint,text,text,boolean,jsonb) to service_role;
grant execute on function public.vendor_order_status_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
