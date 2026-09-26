-- Seller identity and coordination only. No account provisioning, checkout,
-- subscription grants, inventory mutation or payment authority is activated.
begin;

create or replace function public.vendor_seller_controller_valid_v1(p jsonb)
returns boolean language sql immutable set search_path='' as $$
 select coalesce(case when jsonb_typeof(p)='object' then
   p-array['feesPayer','paymentLosses','requirementCollection','dashboard']='{}'::jsonb
   and p->>'feesPayer' in ('account','application')
   and p->>'paymentLosses' in ('stripe','application')
   and p->>'requirementCollection' in ('stripe','application')
   and p->>'dashboard' in ('full','express','none') else false end,false);
$$;

create table if not exists public.vendor_seller_rollout (
 singleton boolean primary key default true check(singleton),
 onboarding_enabled boolean not null default false
);
insert into public.vendor_seller_rollout(singleton) values(true) on conflict do nothing;
-- This is the only addition on an existing relation. It supports immutable
-- owner/store correlation; it never changes either store or Vault ownership.
create unique index if not exists vendor_seller_store_owner_key on public.vendor_stores(id,owner_id);
create table if not exists public.vendor_seller_accounts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete restrict,
 store_id uuid not null unique,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 livemode boolean not null,
 controller jsonb not null check(public.vendor_seller_controller_valid_v1(controller)),
 connected_account_id text check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and connected_account_id<>stripe_account_id),
 creation_attempt_id uuid not null unique default gen_random_uuid(),
 creation_started_at timestamptz,
 state text not null default 'reserved' check(state in ('reserved','creating','bound','deauthorized','closing')),
 lease_fence bigint not null default 0 check(lease_fence>=0),
 lease_token uuid,
 lease_expires_at timestamptz,
 closeout_id uuid,
 closeout_requested_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint vendor_seller_owner_store foreign key(store_id,owner_id) references public.vendor_stores(id,owner_id) on delete restrict on update restrict,
 constraint vendor_seller_connected_scope unique(stripe_account_id,livemode,connected_account_id),
 constraint vendor_seller_lease_pair check((lease_token is null)=(lease_expires_at is null)),
 constraint vendor_seller_closeout_pair check((closeout_id is null)=(closeout_requested_at is null) and (state='closing')=(closeout_id is not null)),
 constraint vendor_seller_creation_state check(
   (state<>'reserved' or (creation_started_at is null and connected_account_id is null))
   and (state<>'creating' or (creation_started_at is not null and connected_account_id is null))
   and (state not in ('bound','deauthorized') or (creation_started_at is not null and connected_account_id is not null))
   and (connected_account_id is null or creation_started_at is not null))
);
create table if not exists public.vendor_seller_events (
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 livemode boolean not null,
 event_id text not null check(event_id ~ '^evt_[A-Za-z0-9]+$'),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and connected_account_id<>stripe_account_id),
 kind text not null check(kind in ('refresh','deauthorized')),
 provider_created_at timestamptz not null,
 received_at timestamptz not null default now(),
 primary key(stripe_account_id,livemode,event_id)
);
create index if not exists vendor_seller_events_account on public.vendor_seller_events(stripe_account_id,livemode,connected_account_id,received_at);

alter table public.vendor_seller_accounts enable row level security;
alter table public.vendor_seller_events enable row level security;
alter table public.vendor_seller_rollout enable row level security;
revoke all on public.vendor_seller_accounts,public.vendor_seller_events,public.vendor_seller_rollout from public,anon,authenticated,service_role;
grant select,insert,update on public.vendor_seller_accounts to service_role;
grant select,insert on public.vendor_seller_events to service_role;
grant select,update on public.vendor_seller_rollout to service_role;

create or replace function public.vendor_seller_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'seller_closeout_required' using errcode='P0001';end if;
 if row(new.id,new.owner_id,new.store_id,new.stripe_account_id,new.livemode,new.controller,new.creation_attempt_id,new.created_at)
   is distinct from row(old.id,old.owner_id,old.store_id,old.stripe_account_id,old.livemode,old.controller,old.creation_attempt_id,old.created_at)
   or (old.connected_account_id is not null and new.connected_account_id is distinct from old.connected_account_id)
   or (old.creation_started_at is not null and new.creation_started_at is distinct from old.creation_started_at)
   or (old.closeout_id is not null and row(new.closeout_id,new.closeout_requested_at) is distinct from row(old.closeout_id,old.closeout_requested_at))
   or (old.state='deauthorized' and new.state not in ('deauthorized','closing'))
 then raise exception 'seller_identity_immutable' using errcode='P0001';end if;
 return new;
end;
$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_seller_accounts'::regclass and tgname='vendor_seller_immutable') then
   create trigger vendor_seller_immutable before update or delete on public.vendor_seller_accounts for each row execute function public.vendor_seller_immutable_v1();
 end if;
end$$;

create or replace function public.vendor_seller_require_onboarding_v1(p_owner_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_owner_id is null or not exists(select 1 from public.vendor_seller_rollout where onboarding_enabled)
   or not exists(select 1 from public.vendor_store_rollout where app_enabled)
   or not coalesce((public.vendor_store_capabilities_v1(p_owner_id)->>'store_app')::boolean,false)
   or exists(select 1 from public.vendor_account_financial_holds where owner_id=p_owner_id)
 then raise exception 'seller_onboarding_unavailable' using errcode='42501';end if;
end;
$$;

create or replace function public.vendor_seller_reserve_v1(p_owner_id uuid,p_store_id uuid,p_stripe_account_id text,p_livemode boolean,p_controller jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 if p_owner_id is null or p_store_id is null or p_stripe_account_id is null or p_stripe_account_id !~ '^acct_[A-Za-z0-9]+$'
   or p_livemode is null or not public.vendor_seller_controller_valid_v1(p_controller)
 then raise exception 'seller_binding_invalid' using errcode='22023';end if;
 -- Protect deletion before taking the existing store advisory lock. The caller
 -- derives owner/store from verified Auth and owner storage, never request IDs.
 perform 1 from auth.users where id=p_owner_id for key share;
 if not found then raise exception 'seller_owner_missing' using errcode='P0001';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||p_owner_id::text,0));
 perform 1 from public.vendor_stores where id=p_store_id and owner_id=p_owner_id for key share;
 if not found then raise exception 'seller_store_mismatch' using errcode='42501';end if;
 select * into a from public.vendor_seller_accounts where owner_id=p_owner_id for update;
 if found then
   if row(a.store_id,a.stripe_account_id,a.livemode,a.controller) is distinct from row(p_store_id,p_stripe_account_id,p_livemode,p_controller)
   then raise exception 'seller_scope_mismatch' using errcode='P0001';end if;
   return to_jsonb(a);
 end if;
 perform public.vendor_seller_require_onboarding_v1(p_owner_id);
 insert into public.vendor_seller_accounts(owner_id,store_id,stripe_account_id,livemode,controller)
   values(p_owner_id,p_store_id,p_stripe_account_id,p_livemode,p_controller) returning * into a;
 return to_jsonb(a);
end;
$$;

create or replace function public.vendor_seller_claim_v1(p_id uuid,p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;t timestamptz;
begin
 if p_token is null then raise exception 'seller_claim_required' using errcode='22023';end if;
 select * into strict a from public.vendor_seller_accounts where id=p_id for update;t:=clock_timestamp();
 if a.lease_expires_at>t then
   if a.lease_token=p_token then return to_jsonb(a);end if;
   return null;
 end if;
 update public.vendor_seller_accounts set lease_token=p_token,lease_fence=lease_fence+1,
   lease_expires_at=t+interval '120 seconds',updated_at=t where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_locked_v1(p_id uuid,p_token uuid,p_fence bigint) returns public.vendor_seller_accounts
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 select * into strict a from public.vendor_seller_accounts where id=p_id for update;
 if p_token is null or a.lease_token is distinct from p_token or a.lease_fence is distinct from p_fence
   or a.lease_expires_at is null or a.lease_expires_at<=clock_timestamp()
 then raise exception 'seller_lease_lost' using errcode='P0001';end if;
 return a;
end;
$$;
create or replace function public.vendor_seller_prepare_creation_v1(p_id uuid,p_token uuid,p_fence bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;t timestamptz;
begin
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if a.state not in ('reserved','creating') then raise exception 'seller_creation_blocked' using errcode='P0001';end if;
 perform public.vendor_seller_require_onboarding_v1(a.owner_id);
 -- Recheck after any waits inside authorization. Time is database authority.
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);t:=clock_timestamp();
 if a.creation_started_at is not null and t-a.creation_started_at>=interval '23 hours'
 then raise exception 'seller_creation_recovery_required' using errcode='P0001';end if;
 update public.vendor_seller_accounts set state='creating',creation_started_at=coalesce(creation_started_at,t),updated_at=t
   where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_bind_v1(p_id uuid,p_token uuid,p_fence bigint,p_connected_account_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;v_deauthorized boolean;
begin
 -- Acquire provider identity before the account row. An event may arrive while
 -- the first binding is still uncommitted (or before a binding exists at all).
 -- Both paths must serialize on a key that does not depend on finding that row.
 select * into strict a from public.vendor_seller_accounts where id=p_id;
 if p_connected_account_id is null or p_connected_account_id !~ '^acct_[A-Za-z0-9]+$' or p_connected_account_id=a.stripe_account_id
 then raise exception 'seller_account_invalid' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||a.stripe_account_id||':'||a.livemode::text||':'||p_connected_account_id,0));
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if p_connected_account_id is null or p_connected_account_id !~ '^acct_[A-Za-z0-9]+$' or p_connected_account_id=a.stripe_account_id
   or a.creation_started_at is null then raise exception 'seller_account_invalid' using errcode='22023';end if;
 if a.connected_account_id is not null and a.connected_account_id<>p_connected_account_id
 then raise exception 'seller_account_already_bound' using errcode='P0001';end if;
 -- Called only after independently verifying a returned/recovered account against
 -- the durable attempt and expected controller. An old attempt may be recovered
 -- by readback, but prepare_creation can never recreate it beyond key retention.
 select exists(select 1 from public.vendor_seller_events where stripe_account_id=a.stripe_account_id and livemode=a.livemode
   and connected_account_id=p_connected_account_id and kind='deauthorized') into v_deauthorized;
 update public.vendor_seller_accounts set connected_account_id=p_connected_account_id,
   state=case when closeout_id is not null then 'closing' when state='deauthorized' or v_deauthorized then 'deauthorized' else 'bound' end,
   updated_at=clock_timestamp() where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;
create or replace function public.vendor_seller_release_v1(p_id uuid,p_token uuid,p_fence bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 update public.vendor_seller_accounts set lease_token=null,lease_expires_at=null,updated_at=clock_timestamp() where id=p_id;
end;
$$;
create or replace function public.vendor_seller_freeze_v1(p_id uuid,p_token uuid,p_fence bigint,p_closeout_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 a:=public.vendor_seller_locked_v1(p_id,p_token,p_fence);
 if p_closeout_id is null or (a.closeout_id is not null and a.closeout_id<>p_closeout_id)
 then raise exception 'seller_closeout_invalid' using errcode='22023';end if;
 update public.vendor_seller_accounts set state='closing',closeout_id=p_closeout_id,
   closeout_requested_at=coalesce(closeout_requested_at,clock_timestamp()),lease_fence=lease_fence+1,
   lease_token=null,lease_expires_at=null,updated_at=clock_timestamp() where id=p_id returning * into a;
 return to_jsonb(a);
end;
$$;

create or replace function public.vendor_seller_enqueue_v1(p_stripe_account_id text,p_livemode boolean,p_event_id text,
 p_connected_account_id text,p_kind text,p_provider_created_at timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.vendor_seller_events;v_inserted integer;
begin
 if p_provider_created_at is null or not isfinite(p_provider_created_at) or p_provider_created_at>clock_timestamp()+interval '5 minutes'
 then raise exception 'seller_event_invalid' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||p_stripe_account_id||':'||p_livemode::text||':'||p_connected_account_id,0));
 -- SDK signature/scope verification precedes this service-only append. Unknown
 -- accounts remain in the ledger: a deauthorization can arrive before binding.
 insert into public.vendor_seller_events(stripe_account_id,livemode,event_id,connected_account_id,kind,provider_created_at)
 values(p_stripe_account_id,p_livemode,p_event_id,p_connected_account_id,p_kind,p_provider_created_at)
 on conflict(stripe_account_id,livemode,event_id) do nothing;
 get diagnostics v_inserted=row_count;
 select * into strict e from public.vendor_seller_events where stripe_account_id=p_stripe_account_id and livemode=p_livemode and event_id=p_event_id;
 if row(e.connected_account_id,e.kind,e.provider_created_at) is distinct from row(p_connected_account_id,p_kind,p_provider_created_at)
 then raise exception 'seller_event_conflict' using errcode='P0001';end if;
 if v_inserted=1 and p_kind='deauthorized' then
   update public.vendor_seller_accounts set state=case when closeout_id is null then 'deauthorized' else 'closing' end,
     lease_fence=lease_fence+1,lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
     where stripe_account_id=p_stripe_account_id and livemode=p_livemode and connected_account_id=p_connected_account_id;
 end if;
 return jsonb_build_object('inserted',v_inserted=1);
end;
$$;

create or replace function public.vendor_seller_owner_status_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.vendor_seller_accounts;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into a from public.vendor_seller_accounts where owner_id=auth.uid();
 return jsonb_build_object('schema_version','VENDOR_SELLER_BINDING_V1','binding',case when a.id is null then null else
   jsonb_build_object('storeId',a.store_id,'state',a.state,'hasConnectedAccount',a.connected_account_id is not null,
     'testMode',not a.livemode,'creationNeedsRecovery',coalesce(a.connected_account_id is null and a.creation_started_at<=now()-interval '23 hours',false)) end);
end;
$$;

revoke all on function public.vendor_seller_controller_valid_v1(jsonb),public.vendor_seller_immutable_v1(),
 public.vendor_seller_require_onboarding_v1(uuid),public.vendor_seller_reserve_v1(uuid,uuid,text,boolean,jsonb),
 public.vendor_seller_claim_v1(uuid,uuid),public.vendor_seller_locked_v1(uuid,uuid,bigint),
 public.vendor_seller_prepare_creation_v1(uuid,uuid,bigint),public.vendor_seller_bind_v1(uuid,uuid,bigint,text),
 public.vendor_seller_release_v1(uuid,uuid,bigint),public.vendor_seller_freeze_v1(uuid,uuid,bigint,uuid),
 public.vendor_seller_enqueue_v1(text,boolean,text,text,text,timestamptz),public.vendor_seller_owner_status_v1()
 from public,anon,authenticated;
grant execute on function public.vendor_seller_controller_valid_v1(jsonb),public.vendor_seller_require_onboarding_v1(uuid),
 public.vendor_seller_reserve_v1(uuid,uuid,text,boolean,jsonb),public.vendor_seller_claim_v1(uuid,uuid),
 public.vendor_seller_locked_v1(uuid,uuid,bigint),public.vendor_seller_prepare_creation_v1(uuid,uuid,bigint),
 public.vendor_seller_bind_v1(uuid,uuid,bigint,text),public.vendor_seller_release_v1(uuid,uuid,bigint),
 public.vendor_seller_freeze_v1(uuid,uuid,bigint,uuid),public.vendor_seller_enqueue_v1(text,boolean,text,text,text,timestamptz),
 public.vendor_seller_owner_status_v1() to service_role;
grant execute on function public.vendor_seller_owner_status_v1() to authenticated;
commit;
