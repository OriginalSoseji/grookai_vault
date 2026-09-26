-- Local billing candidate. No provider call or worker activation. Only verified,
-- service-controlled projection may grant a time-bounded billing contribution.
-- Storefront prerequisite remains a separately governed release.
begin;

create table if not exists public.vendor_billing_accounts (
  owner_id uuid primary key references auth.users(id) on delete restrict,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  customer_id text null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  customer_attempt_id uuid not null unique default gen_random_uuid(),
  customer_attempt_created_at timestamptz not null default now(),
  current_subscription_id text null check (current_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  subscription_status text not null default 'none' check (subscription_status in
    ('none','incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
  lease_fence bigint not null default 0 check (lease_fence >= 0),
  lease_token uuid null,
  lease_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_billing_lease_pair check ((lease_token is null) = (lease_expires_at is null)),
  constraint vendor_billing_customer_scope unique (stripe_account_id,livemode,customer_id)
);

create table if not exists public.vendor_billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.vendor_billing_accounts(owner_id) on delete cascade,
  customer_id text not null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  requested_plan text not null check (requested_plan in ('store_app','store_web')),
  state text not null default 'creating' check (state in ('creating','open','completed','enrolled','expired','recovery')),
  session_id text null unique check (session_id ~ '^cs_(test_|live_)?[A-Za-z0-9]+$'),
  subscription_id text null check (subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_billing_completed_identity check (
    (state not in ('completed','enrolled') or (session_id is not null and subscription_id is not null))
    and (state not in ('open','expired') or subscription_id is null))
);
-- Completed-but-not-enrolled still blocks another paid checkout. Enrollment and
-- account projection must eventually move this state atomically under the lease.
create unique index if not exists vendor_billing_one_pending_checkout
  on public.vendor_billing_checkout_attempts(owner_id)
  where state in ('creating','open','completed','recovery');

create table if not exists public.vendor_billing_events (
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  event_id text not null check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  event_type text not null check (event_type in (
    'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted',
    'customer.subscription.paused','customer.subscription.resumed','invoice.paid','invoice.payment_failed',
    'invoice.payment_action_required','invoice.updated','invoice.voided','invoice.marked_uncollectible')),
  customer_id text not null check (customer_id ~ '^cus_[A-Za-z0-9]+$'),
  subscription_id text not null check (subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  provider_created_at timestamptz not null,
  received_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','processed','ignored')),
  attempts integer not null default 0 check (attempts >= 0),
  retry_after timestamptz not null default now(),
  last_error_code text null check (last_error_code ~ '^[a-z_]{1,64}$'),
  processed_at timestamptz null,
  primary key (stripe_account_id,livemode,event_id)
);
create index if not exists vendor_billing_pending_event_retry
  on public.vendor_billing_events(retry_after,received_at) where state='pending';

alter table public.vendor_billing_accounts enable row level security;
alter table public.vendor_billing_checkout_attempts enable row level security;
alter table public.vendor_billing_events enable row level security;
revoke all on public.vendor_billing_accounts,public.vendor_billing_checkout_attempts,public.vendor_billing_events from public,anon,authenticated;
grant all on public.vendor_billing_accounts,public.vendor_billing_checkout_attempts,public.vendor_billing_events to service_role;

create or replace function public.vendor_billing_reserve_account_v1(p_owner_id uuid,p_stripe_account_id text,p_livemode boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  -- The service route derives p_owner_id from a verified authenticated session.
  -- Neither webhook metadata nor an email-address lookup can call this on behalf
  -- of an owner. All mutation RPCs in this migration are service-role-only.
  if exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_owner_id)) then raise exception 'billing_account_closing' using errcode='P0001';end if;
  insert into public.vendor_billing_accounts(owner_id,stripe_account_id,livemode)
    values(p_owner_id,p_stripe_account_id,p_livemode) on conflict(owner_id) do nothing;
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  if a.stripe_account_id is distinct from p_stripe_account_id or a.livemode is distinct from p_livemode then
    raise exception 'billing_scope_mismatch' using errcode='P0001';
  end if;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_claim_v1(p_owner_id uuid,p_claim_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; t timestamptz;
begin
  if p_claim_token is null then raise exception 'billing_claim_required' using errcode='22023'; end if;
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  t:=clock_timestamp();
  if a.lease_expires_at>t then
    if a.lease_token=p_claim_token then return to_jsonb(a); end if;
    return null;
  end if;
  update public.vendor_billing_accounts set lease_token=p_claim_token,lease_fence=lease_fence+1,
    lease_expires_at=t+interval '120 seconds',updated_at=t where owner_id=p_owner_id returning * into a;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_locked_account_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns public.vendor_billing_accounts language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id for update;
  if a.lease_token is distinct from p_claim_token or p_claim_token is null or a.lease_fence is distinct from p_fence
    or a.lease_expires_at is null or a.lease_expires_at<=clock_timestamp() then
    raise exception 'billing_lease_lost' using errcode='P0001';
  end if;
  return a;
end;
$$;

create or replace function public.vendor_billing_bind_customer_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_customer_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if p_customer_id is null or p_customer_id !~ '^cus_[A-Za-z0-9]+$' then
    raise exception 'billing_customer_invalid' using errcode='22023';
  end if;
  if a.customer_id is not null and a.customer_id<>p_customer_id then
    raise exception 'billing_customer_already_bound' using errcode='P0001';
  end if;
  update public.vendor_billing_accounts set customer_id=p_customer_id,updated_at=clock_timestamp()
    where owner_id=p_owner_id returning * into a;
  return to_jsonb(a);
end;
$$;

create or replace function public.vendor_billing_begin_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_plan text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; c public.vendor_billing_checkout_attempts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if p_plan is null or p_plan not in ('store_app','store_web') then raise exception 'billing_plan_invalid' using errcode='22023'; end if;
  if a.customer_id is null then raise exception 'billing_customer_required' using errcode='P0001'; end if;
  if a.current_subscription_id is not null then raise exception 'billing_existing_subscription' using errcode='P0001'; end if;
  select * into c from public.vendor_billing_checkout_attempts where owner_id=p_owner_id
    and state in ('creating','open','completed','recovery') for update;
  if found then
    if c.requested_plan<>p_plan then raise exception 'billing_checkout_already_pending' using errcode='P0001'; end if;
    return to_jsonb(c);
  end if;
  insert into public.vendor_billing_checkout_attempts(owner_id,customer_id,requested_plan)
    values(p_owner_id,a.customer_id,p_plan) returning * into c;
  return to_jsonb(c);
end;
$$;

create or replace function public.vendor_billing_bind_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,
  p_attempt_id uuid,p_session_id text,p_state text,p_subscription_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; c public.vendor_billing_checkout_attempts;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  select * into strict c from public.vendor_billing_checkout_attempts where id=p_attempt_id and owner_id=p_owner_id for update;
  if c.customer_id is distinct from a.customer_id then raise exception 'billing_customer_mismatch' using errcode='P0001'; end if;
  if p_session_id is null or p_session_id !~ '^cs_(test_|live_)?[A-Za-z0-9]+$' or p_state is null or p_state not in ('open','completed','expired') then
    raise exception 'billing_checkout_invalid' using errcode='22023';
  end if;
  if (c.session_id is not null and c.session_id<>p_session_id) or c.state='enrolled'
    or (c.state in ('expired','completed') and c.state<>p_state) then
    raise exception 'billing_checkout_transition_invalid' using errcode='P0001';
  end if;
  if c.subscription_id is not null and c.subscription_id is distinct from p_subscription_id then
    raise exception 'billing_subscription_mismatch' using errcode='P0001';
  end if;
  update public.vendor_billing_checkout_attempts set session_id=p_session_id,state=p_state,
    subscription_id=p_subscription_id,updated_at=clock_timestamp() where id=p_attempt_id returning * into c;
  return to_jsonb(c);
end;
$$;

create or replace function public.vendor_billing_enqueue_event_v1(p_stripe_account_id text,p_livemode boolean,p_event_id text,
  p_event_type text,p_customer_id text,p_subscription_id text,p_provider_created_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vendor_billing_events; inserted integer;
begin
  -- Only call after the official SDK has verified the raw signed envelope,
  -- account, environment and API version. Persist bounded references, not payloads.
  insert into public.vendor_billing_events(stripe_account_id,livemode,event_id,event_type,customer_id,subscription_id,provider_created_at)
    values(p_stripe_account_id,p_livemode,p_event_id,p_event_type,p_customer_id,p_subscription_id,p_provider_created_at)
    on conflict(stripe_account_id,livemode,event_id) do nothing;
  get diagnostics inserted=row_count;
  select * into strict e from public.vendor_billing_events where stripe_account_id=p_stripe_account_id
    and livemode=p_livemode and event_id=p_event_id;
  if e.event_type is distinct from p_event_type or e.customer_id is distinct from p_customer_id
    or e.subscription_id is distinct from p_subscription_id or e.provider_created_at is distinct from p_provider_created_at then
    raise exception 'billing_event_identity_conflict' using errcode='P0001';
  end if;
  return jsonb_build_object('inserted',inserted=1,'state',e.state);
end;
$$;

create or replace function public.vendor_billing_release_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  update public.vendor_billing_accounts set lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
    where owner_id=p_owner_id;
end;
$$;

revoke all on function public.vendor_billing_reserve_account_v1(uuid,text,boolean),public.vendor_billing_claim_v1(uuid,uuid),
  public.vendor_billing_locked_account_v1(uuid,uuid,bigint),public.vendor_billing_bind_customer_v1(uuid,uuid,bigint,text),
  public.vendor_billing_begin_checkout_v1(uuid,uuid,bigint,text),public.vendor_billing_bind_checkout_v1(uuid,uuid,bigint,uuid,text,text,text),
  public.vendor_billing_enqueue_event_v1(text,boolean,text,text,text,text,timestamptz),public.vendor_billing_release_v1(uuid,uuid,bigint)
  from public,anon,authenticated;
grant execute on function public.vendor_billing_reserve_account_v1(uuid,text,boolean),public.vendor_billing_claim_v1(uuid,uuid),
  public.vendor_billing_locked_account_v1(uuid,uuid,bigint),public.vendor_billing_bind_customer_v1(uuid,uuid,bigint,text),
  public.vendor_billing_begin_checkout_v1(uuid,uuid,bigint,text),public.vendor_billing_bind_checkout_v1(uuid,uuid,bigint,uuid,text,text,text),
  public.vendor_billing_enqueue_event_v1(text,boolean,text,text,text,text,timestamptz),public.vendor_billing_release_v1(uuid,uuid,bigint)
  to service_role;

-- Billing contributions are separate from manual tier/role/features. The existing
-- entitlement row remains the capability authority, including operator suspension.
alter table public.user_entitlements add column if not exists billing_plan text;
alter table public.user_entitlements add column if not exists billing_paid_from timestamptz;
alter table public.user_entitlements add column if not exists billing_paid_through timestamptz;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.user_entitlements'::regclass and conname='user_entitlements_billing_window') then
    alter table public.user_entitlements add constraint user_entitlements_billing_window check (
      (billing_plan is null and billing_paid_from is null and billing_paid_through is null)
      or (billing_plan in ('store_app','store_web') and billing_plan is not null and user_id is not null
        and billing_paid_from is not null and billing_paid_through is not null
        and isfinite(billing_paid_from) and isfinite(billing_paid_through) and billing_paid_from<billing_paid_through));
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.user_entitlements'::regclass and conname='user_entitlements_billing_owner') then
    alter table public.user_entitlements add constraint user_entitlements_billing_owner unique(id,user_id);
  end if;
end $$;
alter table public.vendor_billing_accounts add column if not exists entitlement_id uuid;
alter table public.vendor_billing_accounts add column if not exists cancel_at_period_end boolean not null default false;
alter table public.vendor_billing_accounts add column if not exists last_reconciled_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists customer_creation_started_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_id uuid;
alter table public.vendor_billing_accounts add column if not exists closeout_requested_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_ticket_hash text check(closeout_ticket_hash ~ '^[0-9a-f]{64}$');
alter table public.vendor_billing_accounts add column if not exists closeout_paid_through timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_verified_at timestamptz;
alter table public.vendor_billing_accounts add column if not exists closeout_error text check(closeout_error in ('provider_unavailable','recovery_required','financial_review'));
alter table public.vendor_billing_accounts add column if not exists closeout_reviews jsonb not null default '[]'::jsonb check(jsonb_typeof(closeout_reviews)='array');
create table if not exists public.vendor_billing_closed_accounts (
 id uuid primary key,owner_fingerprint text not null unique check(owner_fingerprint ~ '^[0-9a-f]{64}$'),
 stripe_account_id text not null,livemode boolean not null,customer_id text,
 request_ticket_hash text not null check(request_ticket_hash ~ '^[0-9a-f]{64}$'),
 archived_at timestamptz not null default clock_timestamp(),
 financial_snapshot jsonb not null check(jsonb_typeof(financial_snapshot)='object'),
 constraint vendor_billing_closed_customer unique(stripe_account_id,livemode,customer_id)
);
create table if not exists public.vendor_account_financial_holds (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete restrict,
 reason text not null check(reason in ('order_fulfillment','refund','dispute','payout','manual_review')),
 reference_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 unique(owner_id,reason,reference_id)
);
alter table public.vendor_billing_closed_accounts enable row level security;
alter table public.vendor_account_financial_holds enable row level security;
revoke all on public.vendor_billing_closed_accounts,public.vendor_account_financial_holds from public,anon,authenticated;
grant all on public.vendor_billing_closed_accounts,public.vendor_account_financial_holds to service_role;
create or replace function public.vendor_billing_owner_fingerprint_v1(p_owner_id uuid) returns text language sql immutable strict set search_path='' as $$
 select encode(sha256(convert_to('grookai-billing-owner-v1:'||p_owner_id::text,'UTF8')),'hex');
$$;
revoke all on function public.vendor_billing_owner_fingerprint_v1(uuid) from public,anon,authenticated;
grant execute on function public.vendor_billing_owner_fingerprint_v1(uuid) to service_role;
alter table public.vendor_billing_accounts add column if not exists reconcile_after timestamptz not null default now();
alter table public.vendor_billing_accounts add column if not exists reconcile_failures integer not null default 0 check(reconcile_failures>=0);
alter table public.vendor_billing_accounts add column if not exists reconcile_error text check(reconcile_error in ('checkout_pending','binding_required','reconciliation_failed'));
create index if not exists vendor_billing_reconcile_due on public.vendor_billing_accounts(stripe_account_id,livemode,reconcile_after,owner_id) where customer_id is not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.vendor_billing_accounts'::regclass and conname='vendor_billing_entitlement_owner') then
    alter table public.vendor_billing_accounts add constraint vendor_billing_entitlement_owner
      foreign key(entitlement_id,owner_id) references public.user_entitlements(id,user_id) on delete restrict;
  end if;
end $$;

create or replace function public.grookai_effective_entitlement_v1(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with selected as (
    select e.* from public.user_entitlements e join auth.users u on u.id=p_user_id
      where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
      order by (e.user_id=u.id) desc nulls last,e.id limit 1
  ), effective as (
    select e.*,coalesce(e.user_id=p_user_id and e.billing_plan is not null
      and e.billing_paid_from<=statement_timestamp() and e.billing_paid_through>statement_timestamp(),false) as paid
      from selected e
  )
  select jsonb_build_object('user_id',e.user_id,'email',e.email,'is_active',e.is_active,
    'tier',case when paid and e.tier in ('free','premium') then 'vendor' else e.tier end,
    'role',case when paid and e.role in ('collector','subscriber') then 'vendor' else e.role end,
    'source',e.source,'notes',e.notes,
    'features',e.features||jsonb_build_object(
      'store_app',coalesce(e.features->'store_app'='true'::jsonb,false) or paid,
      'store_web',(coalesce(e.features->'store_app'='true'::jsonb,false) and coalesce(e.features->'store_web'='true'::jsonb,false)) or (paid and e.billing_plan='store_web'),
      'vendor_tools',coalesce(e.features->'vendor_tools'='true'::jsonb,false) or paid)) from effective e;
$$;
revoke all on function public.grookai_effective_entitlement_v1(uuid) from public,anon,authenticated;
grant execute on function public.grookai_effective_entitlement_v1(uuid) to service_role;

create or replace function public.vendor_store_capabilities_v1(p_user_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select case when exists(select 1 from public.vendor_billing_accounts where owner_id=p_user_id and closeout_id is not null)
    or exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_user_id))
    then '{"store_app":false,"store_web":false}'::jsonb else jsonb_build_object(
    'store_app',coalesce(public.grookai_effective_entitlement_v1(p_user_id)->'features'->'store_app','false'::jsonb),
    'store_web',coalesce(public.grookai_effective_entitlement_v1(p_user_id)->'features'->'store_web','false'::jsonb)) end;
$$;

-- Call only after checkout identity and current provider state have been verified
-- under this lease. Event metadata/client success pages never call this function.
create or replace function public.vendor_billing_commit_projection_v1(
  p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_customer_id text,p_subscription_id text,
  p_status text,p_plan text,p_paid_from timestamptz,p_paid_through timestamptz,p_reason text,
  p_cancel_at_period_end boolean,p_attempt_id uuid default null,p_event_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts; e public.user_entitlements;
  c public.vendor_billing_checkout_attempts; ev public.vendor_billing_events;
  t timestamptz:=clock_timestamp(); new_paid boolean; continuous boolean; manual_app boolean; manual_web boolean;
begin
  a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
  if a.customer_id is null or a.customer_id is distinct from p_customer_id then
    raise exception 'billing_customer_mismatch' using errcode='P0001';
  end if;
  if p_event_id is not null then
    select * into strict ev from public.vendor_billing_events where stripe_account_id=a.stripe_account_id
      and livemode=a.livemode and event_id=p_event_id for update;
    if ev.customer_id is distinct from a.customer_id or ev.subscription_id is distinct from p_subscription_id then
      raise exception 'billing_event_identity_conflict' using errcode='P0001';
    end if;
    if ev.state<>'pending' then
      perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
      return jsonb_build_object('state',ev.state,'duplicate',true);
    end if;
  end if;
  if p_attempt_id is null and a.current_subscription_id is distinct from p_subscription_id then
    -- Delayed events for an old (or unrelated) subscription cannot replace/revoke
    -- the owner's currently enrolled subscription. Pending checkout is reconciled
    -- separately using its stored session, even if this early event is ignored.
    if p_event_id is null then raise exception 'billing_subscription_not_enrolled' using errcode='P0001'; end if;
    update public.vendor_billing_events set state='ignored',processed_at=t,attempts=attempts+1,last_error_code=null
      where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id;
    perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
    return jsonb_build_object('state','ignored','duplicate',false);
  end if;
  if p_attempt_id is not null then
    select * into strict c from public.vendor_billing_checkout_attempts where id=p_attempt_id and owner_id=p_owner_id for update;
    if c.customer_id is distinct from a.customer_id or c.subscription_id is distinct from p_subscription_id
      or c.session_id is null or c.state not in ('completed','enrolled')
      or (c.state='enrolled' and a.current_subscription_id is distinct from p_subscription_id)
      or (a.current_subscription_id is not null and a.current_subscription_id is distinct from p_subscription_id) then
      raise exception 'billing_enrollment_mismatch' using errcode='P0001';
    end if;
  end if;
  if p_subscription_id is null or p_subscription_id!~'^sub_[A-Za-z0-9]{1,240}$'
    or p_status is null or p_status not in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')
    or (p_plan is not null and p_plan not in ('store_app','store_web')) or p_cancel_at_period_end is null
    or p_reason is null or p_reason not in ('paid','inactive','unsupported_price','unverified_invoice','expired') then
    raise exception 'billing_projection_invalid' using errcode='22023';
  end if;
  new_paid:=p_reason='paid';
  if new_paid and (p_status<>'active' or p_plan is null or p_paid_from is null or p_paid_through is null
    or not isfinite(p_paid_from) or not isfinite(p_paid_through) or p_paid_from>t
    or p_paid_through<=t or p_paid_through<=p_paid_from) then
    raise exception 'billing_paid_window_invalid' using errcode='22023';
  end if;
  if a.entitlement_id is null then
    select * into e from public.user_entitlements where user_id=p_owner_id and is_active for update;
    if not found then
      -- Do not silently shadow email-only grants or undo a founder's deactivation.
      if exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
        where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then
        raise exception 'billing_entitlement_binding_required' using errcode='P0001';
      end if;
      insert into public.user_entitlements(user_id,tier,role,features,source)
        values(p_owner_id,'free','collector','{}','stripe_billing_baseline') returning * into e;
    end if;
  else
    select * into strict e from public.user_entitlements where id=a.entitlement_id and user_id=p_owner_id for update;
    if not e.is_active then raise exception 'billing_entitlement_inactive' using errcode='P0001'; end if;
  end if;
  -- Match existing entitlement-trigger lock order: entitlement row, then store
  -- advisory lock. Publish uses this same advisory lock before its store write.
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||p_owner_id::text,0));
  manual_app:=coalesce(e.features->'store_app'='true'::jsonb,false);
  manual_web:=manual_app and coalesce(e.features->'store_web'='true'::jsonb,false);
  continuous:=new_paid and e.billing_plan is not null and e.billing_paid_through>=p_paid_from;
  -- A missed expiry event followed by late payment must not republish. Preserve
  -- only destinations supported by a manual grant or continuous paid coverage.
  update public.vendor_stores set
    app_published=app_published and (manual_app or continuous),
    web_published=web_published and (manual_web or (continuous and e.billing_plan='store_web' and p_plan='store_web')),
    updated_at=t where owner_id=p_owner_id and (app_published or web_published);
  if not manual_app and not continuous then
    update public.vendor_store_custom_products p set published=false,suspension_reason='Store access suspended',version=version+1,updated_at=t
      from public.vendor_stores s where p.store_id=s.id and s.owner_id=p_owner_id and p.published;
  end if;
  perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
  if new_paid and p_paid_through<=clock_timestamp() then
    raise exception 'billing_paid_window_invalid' using errcode='22023';
  end if;
  update public.user_entitlements set billing_plan=case when new_paid then p_plan else null end,
    billing_paid_from=case when new_paid then p_paid_from else null end,
    billing_paid_through=case when new_paid then p_paid_through else null end where id=e.id;
  -- Existing entitlement triggers suspend any destination lost by this update.
  if p_attempt_id is not null then
    update public.vendor_billing_checkout_attempts set state='enrolled',updated_at=t where id=p_attempt_id;
  end if;
  update public.vendor_billing_accounts set entitlement_id=e.id,subscription_status=p_status,
    current_subscription_id=case when p_status in ('canceled','incomplete_expired') then null else p_subscription_id end,
    cancel_at_period_end=p_cancel_at_period_end,last_reconciled_at=t,updated_at=t,
    reconcile_after=t+interval '15 minutes',reconcile_failures=0,reconcile_error=null,
    lease_token=null,lease_expires_at=null where owner_id=p_owner_id;
  if p_event_id is not null then
    update public.vendor_billing_events set state='processed',processed_at=t,attempts=attempts+1,last_error_code=null
      where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id;
  end if;
  return jsonb_build_object('state','processed','duplicate',false,'capabilities',public.vendor_store_capabilities_v1(p_owner_id));
end;
$$;
revoke all on function public.vendor_billing_commit_projection_v1(uuid,uuid,bigint,text,text,text,text,timestamptz,timestamptz,text,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_commit_projection_v1(uuid,uuid,bigint,text,text,text,text,timestamptz,timestamptz,text,boolean,uuid,text) to service_role;

-- Keep the existing exact-copy referral checks; active paid vendor tools are
-- resolved through the same time-bound entitlement authority as public offers.
create or replace function public.vendor_referral_credit_v1(p_referred_user_id uuid,p_store_id uuid,p_gvvi_id text,p_created_at timestamptz,p_expires_at timestamptz)
returns text language plpgsql security definer set search_path = '' as $$
declare vendor_id uuid; created timestamptz; v public.vault_item_instances; inserted_count integer;
begin
  if (p_store_id is null)=(p_gvvi_id is null) or p_created_at is null or p_expires_at is null
    or p_created_at>now() or p_expires_at<=now() or p_expires_at<=p_created_at or p_expires_at-p_created_at>interval '30 days'
    then return 'invalid_context'; end if;
  select created_at into created from auth.users where id=p_referred_user_id;
  if created is null or created<p_created_at or created>p_expires_at then return 'not_new_account'; end if;
  if p_store_id is not null then
    select s.owner_id into vendor_id from public.vendor_stores s where s.id=p_store_id and s.web_published
      and coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
      and exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
      and exists(select 1 from public.public_profiles pp where pp.user_id=s.owner_id and pp.public_profile_enabled and pp.vault_sharing_enabled);
  else
    select * into v from public.vault_item_instances where gv_vi_id=p_gvvi_id and archived_at is null;
    if v.intent='sell' and v.pricing_mode='asking' and v.asking_price_amount>0 and v.legacy_vault_item_id is not null
      and exists(select 1 from public.public_profiles pp where pp.user_id=v.user_id and pp.public_profile_enabled and pp.vault_sharing_enabled)
      and exists(select 1 from public.user_entitlements e join auth.users u on u.id=v.user_id
        where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
        and (e.tier in ('vendor','founder_admin') or e.role in ('vendor','founder') or e.features->'vendor_tools'='true'::jsonb
          or public.grookai_effective_entitlement_v1(v.user_id)->'features'->'vendor_tools'='true'::jsonb))
      then vendor_id:=v.user_id; end if;
  end if;
  if vendor_id is null then return 'vendor_offer_unavailable'; end if;
  if vendor_id=p_referred_user_id then return 'self_referral_blocked'; end if;
  insert into public.vendor_referral_signups(referred_user_id,vendor_user_id,store_id,gvvi_id,referral_created_at)
    values(p_referred_user_id,vendor_id,p_store_id,p_gvvi_id,p_created_at) on conflict(referred_user_id) do nothing;
  get diagnostics inserted_count = row_count;
  return case when inserted_count=1 then 'credited' else 'already_credited' end;
end;
$$;

-- Eligibility must be resolved before any provider creation, not after payment.
create or replace function public.vendor_billing_prepare_checkout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_plan text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.user_entitlements;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
 if p_plan is null or p_plan not in ('store_app','store_web') then raise exception 'billing_plan_invalid' using errcode='22023'; end if;
 if not exists(select 1 from public.vendor_store_rollout where app_enabled and (p_plan='store_app' or web_enabled)) then
  raise exception 'billing_store_unavailable' using errcode='P0001';
 end if;
 if a.current_subscription_id is not null then raise exception 'billing_existing_subscription' using errcode='P0001'; end if;
 if a.entitlement_id is null then
  select * into e from public.user_entitlements where user_id=p_owner_id and is_active for update;
  if not found then
   if exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
      where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then
    raise exception 'billing_entitlement_binding_required' using errcode='P0001';
   end if;
   insert into public.user_entitlements(user_id,tier,role,features,source)
    values(p_owner_id,'free','collector','{}','stripe_billing_baseline') returning * into e;
  end if;
 else
  select * into strict e from public.user_entitlements where id=a.entitlement_id and user_id=p_owner_id for update;
  if not e.is_active then raise exception 'billing_entitlement_inactive' using errcode='P0001'; end if;
 end if;
 perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 update public.vendor_billing_accounts set entitlement_id=e.id,updated_at=clock_timestamp() where owner_id=p_owner_id returning * into a;
 return to_jsonb(a);
end $$;

-- This cannot change paid access. It closes only a verified event which does not
-- describe the current or a completed pending checkout's subscription.
create or replace function public.vendor_billing_ignore_event_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_event_id text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.vendor_billing_events;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 select * into strict e from public.vendor_billing_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id for update;
 if e.customer_id is distinct from a.customer_id or e.subscription_id=a.current_subscription_id
   or exists(select 1 from public.vendor_billing_checkout_attempts c where c.owner_id=p_owner_id and c.state='completed' and c.subscription_id=e.subscription_id) then
  raise exception 'billing_event_not_unrelated' using errcode='P0001';
 end if;
 update public.vendor_billing_events set state='ignored',processed_at=clock_timestamp(),attempts=attempts+1,last_error_code=null
  where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id and state='pending';
 perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
end $$;

-- Failure metadata is a bounded code, never a provider payload, URL or secret.
-- A lost/expired lease cannot write failure state over a successor's success.
create or replace function public.vendor_billing_fail_event_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_event_id text,p_code text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.vendor_billing_events;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_code is null or p_code not in ('provider_unavailable','checkout_pending','binding_required','reconciliation_failed') then
  raise exception 'billing_failure_code_invalid' using errcode='22023';
 end if;
 select * into strict e from public.vendor_billing_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id for update;
 if e.customer_id is distinct from a.customer_id then raise exception 'billing_event_identity_conflict' using errcode='P0001'; end if;
 update public.vendor_billing_events set attempts=attempts+1,last_error_code=p_code,
  retry_after=clock_timestamp()+make_interval(secs=>least(21600,60*power(2,least(attempts,9)))::double precision)
  where stripe_account_id=a.stripe_account_id and livemode=a.livemode and event_id=p_event_id and state='pending';
 perform public.vendor_billing_defer_reconcile_v1(p_owner_id,p_claim_token,p_fence,case when p_code='provider_unavailable' then 'reconciliation_failed' else p_code end);
end $$;
revoke all on function public.vendor_billing_prepare_checkout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_ignore_event_v1(uuid,uuid,bigint,text),public.vendor_billing_fail_event_v1(uuid,uuid,bigint,text,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_prepare_checkout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_ignore_event_v1(uuid,uuid,bigint,text),public.vendor_billing_fail_event_v1(uuid,uuid,bigint,text,text) to service_role;

create or replace function public.vendor_billing_owner_status_v1(p_owner_id uuid,p_stripe_account_id text,p_livemode boolean)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.vendor_billing_accounts;e public.user_entitlements;c public.vendor_billing_checkout_attempts;issue text;
begin
 select * into a from public.vendor_billing_accounts where owner_id=p_owner_id;
 if a.owner_id is not null and (a.stripe_account_id is distinct from p_stripe_account_id or a.livemode is distinct from p_livemode) then
  raise exception 'billing_scope_mismatch' using errcode='P0001';
 end if;
 select * into e from public.user_entitlements where user_id=p_owner_id and (id=a.entitlement_id or (a.entitlement_id is null and is_active)) order by id limit 1;
 if e.id is not null and not e.is_active then issue:='suspended';
 elsif e.id is null and exists(select 1 from public.user_entitlements x join auth.users u on u.id=p_owner_id
    where x.user_id=u.id or (x.is_active and lower(x.email)=lower(u.email))) then issue:='binding_required'; end if;
 select * into c from public.vendor_billing_checkout_attempts where owner_id=p_owner_id and state in ('creating','open','completed','recovery');
 return jsonb_build_object('subscriptionStatus',coalesce(a.subscription_status,'none'),'plan',e.billing_plan,
  'paidThrough',e.billing_paid_through,'cancelAtPeriodEnd',coalesce(a.cancel_at_period_end,false),
  'canManagePayment',a.customer_id is not null and a.closeout_id is null,'hasSubscription',a.current_subscription_id is not null,
  'closeoutPending',a.closeout_id is not null or exists(select 1 from public.vendor_billing_closed_accounts where owner_fingerprint=public.vendor_billing_owner_fingerprint_v1(p_owner_id)),
  'checkoutState',c.state,'pendingPlan',c.requested_plan,'eligibilityIssue',issue,
  'recoveryRequired',coalesce((a.customer_id is null and a.customer_attempt_created_at<now()-interval '23 hours')
    or (c.session_id is null and c.created_at<now()-interval '23 hours') or c.state='recovery',false),
  'appAvailable',coalesce((select app_enabled from public.vendor_store_rollout),false),
  'webAvailable',coalesce((select app_enabled and web_enabled from public.vendor_store_rollout),false),
  'access',public.vendor_store_capabilities_v1(p_owner_id));
end $$;
revoke all on function public.vendor_billing_owner_status_v1(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.vendor_billing_owner_status_v1(uuid,text,boolean) to service_role;

-- Scheduled reads share the same fenced projection as signed callbacks. A failed
-- provider read never grants access and cannot hot-loop an account indefinitely.
create or replace function public.vendor_billing_defer_reconcile_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_code text)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_code is null or p_code not in ('checkout_pending','binding_required','reconciliation_failed') then raise exception 'billing_failure_code_invalid' using errcode='22023';end if;
 update public.vendor_billing_accounts set
  reconcile_after=clock_timestamp()+case when p_code='checkout_pending' then interval '5 minutes' else make_interval(secs=>least(21600,60*power(2,least(reconcile_failures,9)))::double precision) end,
  reconcile_failures=case when p_code='checkout_pending' then 0 else reconcile_failures+1 end,
  reconcile_error=p_code where owner_id=p_owner_id;
 perform public.vendor_billing_release_v1(p_owner_id,p_claim_token,p_fence);
end $$;

create table if not exists public.vendor_billing_reconcile_runs (
 id uuid primary key,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),livemode boolean not null,
 started_at timestamptz not null default clock_timestamp(),finished_at timestamptz,
 state text not null default 'running' check(state in ('running','completed','failed')),
 processed integer not null default 0 check(processed between 0 and 50),
 deferred integer not null default 0 check(deferred between 0 and 50),
 busy integer not null default 0 check(busy between 0 and 50),
 failures integer not null default 0 check(failures between 0 and 50),
 error_code text check(error_code in ('item_failure','worker_failed','worker_abandoned')),
 constraint vendor_billing_run_finished check((state='running')=(finished_at is null))
);
create index if not exists vendor_billing_run_scope on public.vendor_billing_reconcile_runs(stripe_account_id,livemode,started_at desc);
alter table public.vendor_billing_reconcile_runs enable row level security;
revoke all on public.vendor_billing_reconcile_runs from public,anon,authenticated;
grant all on public.vendor_billing_reconcile_runs to service_role;

create or replace function public.vendor_billing_start_run_v1(p_id uuid,p_stripe_account_id text,p_livemode boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 -- A dead process leaves durable evidence; the next run closes only stale runs.
 update public.vendor_billing_reconcile_runs set state='failed',finished_at=clock_timestamp(),error_code='worker_abandoned'
  where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='running' and started_at<clock_timestamp()-interval '15 minutes';
 insert into public.vendor_billing_reconcile_runs(id,stripe_account_id,livemode) values(p_id,p_stripe_account_id,p_livemode);
end $$;
create or replace function public.vendor_billing_finish_run_v1(p_id uuid,p_processed integer,p_deferred integer,p_busy integer,p_failures integer,p_error_code text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_processed is null or p_deferred is null or p_busy is null or p_failures is null or p_processed+p_deferred+p_busy+p_failures>50
  or (p_error_code is not null and p_error_code not in ('item_failure','worker_failed')) then raise exception 'billing_run_result_invalid' using errcode='22023';end if;
 update public.vendor_billing_reconcile_runs set state=case when p_failures>0 or p_error_code is not null then 'failed' else 'completed' end,
  finished_at=clock_timestamp(),processed=p_processed,deferred=p_deferred,busy=p_busy,failures=p_failures,error_code=p_error_code
  where id=p_id and state='running' and started_at>clock_timestamp()-interval '15 minutes';
 if not found then raise exception 'billing_run_not_active' using errcode='P0001';end if;
end $$;

create or replace function public.vendor_billing_due_v1(p_stripe_account_id text,p_livemode boolean,p_lane text,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if p_lane is null or p_lane not in ('events','accounts') or p_limit is null or p_limit<1 or p_limit>25 then raise exception 'billing_queue_bounds' using errcode='22023';end if;
 if p_lane='events' then
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
   select a.owner_id,e.event_id,e.event_type,e.customer_id,e.subscription_id,e.provider_created_at
    from public.vendor_billing_events e join public.vendor_billing_accounts a on a.stripe_account_id=e.stripe_account_id and a.livemode=e.livemode and a.customer_id=e.customer_id
    where e.stripe_account_id=p_stripe_account_id and e.livemode=p_livemode and e.state='pending' and e.retry_after<=now() and a.closeout_id is null
      and (a.lease_expires_at is null or a.lease_expires_at<=now())
    order by e.retry_after,e.received_at,e.event_id limit p_limit
  ) q;
 else
  select coalesce(jsonb_agg(to_jsonb(q)),'[]') into result from (
   select a.owner_id from public.vendor_billing_accounts a
    where a.stripe_account_id=p_stripe_account_id and a.livemode=p_livemode and a.customer_id is not null and a.reconcile_after<=now() and a.closeout_id is null
      and (a.lease_expires_at is null or a.lease_expires_at<=now())
      and (a.current_subscription_id is not null or exists(select 1 from public.vendor_billing_checkout_attempts c
        where c.owner_id=a.owner_id and c.session_id is not null and c.state in ('open','completed')))
    order by a.reconcile_after,a.owner_id limit p_limit
  ) q;
 end if;
 return result;
end $$;

create or replace function public.vendor_billing_reconcile_health_v1(p_stripe_account_id text,p_livemode boolean)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'pendingEvents',(select count(*) from public.vendor_billing_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='pending'),
  'oldestPendingAt',(select min(received_at) from public.vendor_billing_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='pending'),
  'failedAccounts',(select count(*) from public.vendor_billing_accounts where stripe_account_id=p_stripe_account_id and livemode=p_livemode and reconcile_failures>0),
  'closingAccounts',(select count(*) from public.vendor_billing_accounts where stripe_account_id=p_stripe_account_id and livemode=p_livemode and closeout_id is not null),
  'recoveryAccounts',(select count(*) from public.vendor_billing_accounts a where stripe_account_id=p_stripe_account_id and livemode=p_livemode and (
   (customer_id is null and customer_attempt_created_at<now()-interval '23 hours') or exists(select 1 from public.vendor_billing_checkout_attempts c where c.owner_id=a.owner_id and (c.state='recovery' or (c.state='creating' and c.session_id is null and c.created_at<now()-interval '23 hours'))))),
  'staleRuns',(select count(*) from public.vendor_billing_reconcile_runs where stripe_account_id=p_stripe_account_id and livemode=p_livemode and state='running' and started_at<now()-interval '15 minutes'),
  'lastRun',(select jsonb_build_object('id',id,'state',state,'startedAt',started_at,'finishedAt',finished_at,'errorCode',error_code) from public.vendor_billing_reconcile_runs where stripe_account_id=p_stripe_account_id and livemode=p_livemode order by started_at desc limit 1)
 );
$$;
revoke all on function public.vendor_billing_defer_reconcile_v1(uuid,uuid,bigint,text),public.vendor_billing_start_run_v1(uuid,text,boolean),
 public.vendor_billing_finish_run_v1(uuid,integer,integer,integer,integer,text),public.vendor_billing_due_v1(text,boolean,text,integer),public.vendor_billing_reconcile_health_v1(text,boolean) from public,anon,authenticated;
grant execute on function public.vendor_billing_defer_reconcile_v1(uuid,uuid,bigint,text),public.vendor_billing_start_run_v1(uuid,text,boolean),
 public.vendor_billing_finish_run_v1(uuid,integer,integer,integer,integer,text),public.vendor_billing_due_v1(text,boolean,text,integer),public.vendor_billing_reconcile_health_v1(text,boolean) to service_role;

create or replace function public.vendor_billing_customer_creation_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if a.closeout_id is not null then raise exception 'billing_account_closing' using errcode='P0001';end if;
 update public.vendor_billing_accounts set customer_creation_started_at=coalesce(customer_creation_started_at,clock_timestamp()) where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_request_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_ticket_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_ticket_hash is null or p_ticket_hash !~ '^[0-9a-f]{64}$' then raise exception 'billing_closeout_ticket_required' using errcode='22023';end if;
 if a.closeout_id is not null and a.closeout_ticket_hash<>p_ticket_hash then raise exception 'billing_closeout_ticket_conflict' using errcode='P0001';end if;
 update public.vendor_billing_accounts set closeout_id=coalesce(closeout_id,gen_random_uuid()),closeout_ticket_hash=p_ticket_hash,
  closeout_requested_at=coalesce(closeout_requested_at,clock_timestamp()),
  closeout_paid_through=case when closeout_id is null then (select billing_paid_through from public.user_entitlements where id=a.entitlement_id) else closeout_paid_through end
  where owner_id=p_owner_id returning * into a;
 update public.user_entitlements set billing_plan=null,billing_paid_from=null,billing_paid_through=null where id=a.entitlement_id and user_id=p_owner_id;
 update public.vendor_stores set app_published=false,web_published=false where owner_id=p_owner_id;
 perform public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 return to_jsonb(a);
end $$;
create or replace function public.vendor_billing_assert_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;
begin
 a:=public.vendor_billing_locked_account_v1(p_owner_id,p_claim_token,p_fence);
 if p_closeout_id is null or a.closeout_id is distinct from p_closeout_id then raise exception 'billing_closeout_mismatch' using errcode='P0001';end if;
end $$;
create or replace function public.vendor_billing_record_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_reviews jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 if p_reviews is null or jsonb_typeof(p_reviews)<>'array' or jsonb_array_length(p_reviews)>7 or exists(select 1 from jsonb_array_elements_text(p_reviews) r where r not in
  ('open_invoices','draft_invoices','pending_invoice_items','customer_balance','balance_evidence_missing','remaining_paid_period','financial_hold')) then raise exception 'billing_closeout_reviews_invalid' using errcode='22023';end if;
 if exists(select 1 from public.vendor_billing_checkout_attempts where owner_id=p_owner_id and state in ('open','creating','recovery')) then raise exception 'billing_closeout_pending_checkout' using errcode='P0001';end if;
 update public.vendor_billing_accounts set closeout_verified_at=clock_timestamp(),closeout_reviews=p_reviews,closeout_error=case when p_reviews='[]'::jsonb then null else 'financial_review' end,
 subscription_status=case when current_subscription_id is null then subscription_status else 'canceled' end where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_fail_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_code text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 if p_code is null or p_code not in ('provider_unavailable','recovery_required') then raise exception 'billing_closeout_error_invalid' using errcode='22023';end if;
 update public.vendor_billing_accounts set closeout_error=p_code,closeout_verified_at=null where owner_id=p_owner_id;
end $$;
create or replace function public.vendor_billing_archive_closeout_v1(p_owner_id uuid,p_claim_token uuid,p_fence bigint,p_closeout_id uuid,p_ticket_hash text)
returns uuid language plpgsql security definer set search_path='' as $$
declare a public.vendor_billing_accounts;snapshot jsonb;
begin
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 select * into strict a from public.vendor_billing_accounts where owner_id=p_owner_id;
 perform 1 from auth.users where id=p_owner_id for update;
 if a.closeout_ticket_hash is distinct from p_ticket_hash or a.closeout_verified_at is null or a.closeout_verified_at<clock_timestamp()-interval '5 minutes' or a.closeout_reviews<>'[]'::jsonb
  or (a.customer_id is null and a.customer_creation_started_at is not null) then raise exception 'billing_closeout_not_ready' using errcode='P0001';end if;
 if exists(select 1 from public.vendor_account_financial_holds where owner_id=p_owner_id) then raise exception 'billing_financial_hold' using errcode='P0001';end if;
 select jsonb_build_object('customerAttemptId',a.customer_attempt_id,'customerAttemptCreatedAt',a.customer_attempt_created_at,
  'subscriptionId',a.current_subscription_id,'subscriptionStatus',a.subscription_status,'closeoutRequestedAt',a.closeout_requested_at,'providerVerifiedAt',a.closeout_verified_at,
  'checkouts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'plan',requested_plan,'sessionId',session_id,'subscriptionId',subscription_id,'state',state,'createdAt',created_at)) from public.vendor_billing_checkout_attempts where owner_id=p_owner_id),'[]')) into snapshot;
 if octet_length(snapshot::text)>262144 then raise exception 'billing_closeout_archive_bounds' using errcode='P0001';end if;
 perform public.vendor_billing_assert_closeout_v1(p_owner_id,p_claim_token,p_fence,p_closeout_id);
 insert into public.vendor_billing_closed_accounts(id,owner_fingerprint,stripe_account_id,livemode,customer_id,request_ticket_hash,financial_snapshot)
  values(p_closeout_id,public.vendor_billing_owner_fingerprint_v1(p_owner_id),a.stripe_account_id,a.livemode,a.customer_id,p_ticket_hash,snapshot);
 update public.vendor_billing_events set state='ignored',processed_at=clock_timestamp() where stripe_account_id=a.stripe_account_id and livemode=a.livemode and customer_id=a.customer_id and state='pending';
 delete from public.vendor_billing_accounts where owner_id=p_owner_id;
 return p_closeout_id;
end $$;
revoke all on function public.vendor_billing_customer_creation_v1(uuid,uuid,bigint),public.vendor_billing_request_closeout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_assert_closeout_v1(uuid,uuid,bigint,uuid),public.vendor_billing_record_closeout_v1(uuid,uuid,bigint,uuid,jsonb),public.vendor_billing_archive_closeout_v1(uuid,uuid,bigint,uuid,text),public.vendor_billing_fail_closeout_v1(uuid,uuid,bigint,uuid,text) from public,anon,authenticated;
grant execute on function public.vendor_billing_customer_creation_v1(uuid,uuid,bigint),public.vendor_billing_request_closeout_v1(uuid,uuid,bigint,text),
 public.vendor_billing_assert_closeout_v1(uuid,uuid,bigint,uuid),public.vendor_billing_record_closeout_v1(uuid,uuid,bigint,uuid,jsonb),public.vendor_billing_archive_closeout_v1(uuid,uuid,bigint,uuid,text),public.vendor_billing_fail_closeout_v1(uuid,uuid,bigint,uuid,text) to service_role;

commit;
