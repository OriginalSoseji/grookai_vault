-- Explicit owner-confirmed adoption of a previously created Connect account.
-- No grants, payments, orders or provider account creation are activated here.
begin;
create table if not exists public.vendor_seller_adoption_grants (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete restrict,
 store_id uuid not null,
 stripe_account_id text not null check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
 connected_account_id text not null check(connected_account_id ~ '^acct_[A-Za-z0-9]+$' and connected_account_id<>stripe_account_id),
 livemode boolean not null,
 owner_email_sha256 text not null check(owner_email_sha256 ~ '^[a-f0-9]{64}$'),
 approval_sha256 text not null check(approval_sha256 ~ '^[a-f0-9]{64}$'),
 enabled boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 replaces_grant_id uuid unique references public.vendor_seller_adoption_grants(id) on delete restrict,
 foreign key(store_id,owner_id) references public.vendor_stores(id,owner_id) on delete restrict on update restrict,
 check(isfinite(created_at) and isfinite(expires_at) and expires_at>created_at and expires_at<=created_at+interval '7 days')
);
create unique index if not exists vendor_seller_adoption_active_owner on public.vendor_seller_adoption_grants(owner_id) where enabled;
create unique index if not exists vendor_seller_adoption_active_store on public.vendor_seller_adoption_grants(store_id) where enabled;
create unique index if not exists vendor_seller_adoption_active_account on public.vendor_seller_adoption_grants(stripe_account_id,livemode,connected_account_id) where enabled;
alter table public.vendor_seller_adoption_grants enable row level security;
revoke all on public.vendor_seller_adoption_grants from public,anon,authenticated,service_role;
grant select on public.vendor_seller_adoption_grants to service_role;
grant update(enabled) on public.vendor_seller_adoption_grants to service_role;

create or replace function public.vendor_seller_adoption_grant_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (to_jsonb(new)-'enabled') is distinct from (to_jsonb(old)-'enabled')
   or (not old.enabled and new.enabled)
  then raise exception 'seller_approval_immutable' using errcode='42501';end if;
  return new;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||new.stripe_account_id||':'||new.livemode::text||':'||new.connected_account_id,0));
 perform 1 from auth.users where id=new.owner_id for key share;
 perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||new.owner_id::text,0));
 if exists(select 1 from public.vendor_seller_accounts where owner_id=new.owner_id or
  (stripe_account_id=new.stripe_account_id and livemode=new.livemode and connected_account_id=new.connected_account_id))
 then raise exception 'seller_account_already_bound' using errcode='P0001';end if;
 if exists(select 1 from public.vendor_seller_adoption_grants where stripe_account_id=new.stripe_account_id
  and livemode=new.livemode and connected_account_id=new.connected_account_id and owner_id<>new.owner_id)
 then raise exception 'seller_approval_conflict' using errcode='P0001';end if;
 return new;
end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_seller_adoption_grants'::regclass and tgname='vendor_seller_adoption_grant_guard') then
  create trigger vendor_seller_adoption_grant_guard before insert or update on public.vendor_seller_adoption_grants
  for each row execute function public.vendor_seller_adoption_grant_guard_v1();
 end if;
end$$;

alter table public.vendor_seller_accounts
 add column if not exists adoption_grant_id uuid unique references public.vendor_seller_adoption_grants(id) on delete restrict,
 add column if not exists adoption_evidence jsonb;
alter table public.vendor_seller_accounts alter column creation_attempt_id drop not null;
alter table public.vendor_seller_accounts drop constraint if exists vendor_seller_creation_state;
alter table public.vendor_seller_accounts add constraint vendor_seller_creation_state check (
 (adoption_grant_id is null and adoption_evidence is null and creation_attempt_id is not null
  and (state<>'reserved' or (creation_started_at is null and connected_account_id is null))
  and (state<>'creating' or (creation_started_at is not null and connected_account_id is null))
  and (state not in ('bound','deauthorized') or (creation_started_at is not null and connected_account_id is not null))
  and (connected_account_id is null or creation_started_at is not null))
 or (adoption_grant_id is not null and adoption_evidence is not null
  and jsonb_typeof(adoption_evidence)='object' and creation_attempt_id is null and creation_started_at is null
  and connected_account_id is not null and state in ('bound','deauthorized','closing'))
);

create or replace function public.vendor_seller_adoption_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.adoption_grant_id is null and exists(select 1 from public.vendor_seller_adoption_grants where owner_id=new.owner_id)
  then raise exception 'seller_adoption_required' using errcode='P0001';end if;
  return new;
 end if;
 if row(new.adoption_grant_id,new.adoption_evidence) is distinct from row(old.adoption_grant_id,old.adoption_evidence)
 then raise exception 'seller_adoption_immutable' using errcode='P0001';end if;
 return new;
end;$$;
do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_seller_accounts'::regclass and tgname='vendor_seller_adoption_immutable') then
  create trigger vendor_seller_adoption_immutable before insert or update on public.vendor_seller_accounts
  for each row execute function public.vendor_seller_adoption_immutable_v1();
 end if;
end$$;

create or replace function public.vendor_seller_adopt_v1(p_owner_id uuid,p_grant_id uuid,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.vendor_seller_adoption_grants; a public.vendor_seller_accounts;
 t timestamptz; v_email text; v_confirmed timestamptz; checked_at timestamptz;
 v_controller constant jsonb := '{"feesPayer":"account","paymentLosses":"stripe","requirementCollection":"stripe","dashboard":"full"}'::jsonb;
begin
 -- Service calls derive the owner from Auth.getUser and load the private grant.
 -- A client cannot supply an account ID, approval, controller or evidence.
 select * into strict g from public.vendor_seller_adoption_grants where id=p_grant_id;
 if p_owner_id is null or g.owner_id<>p_owner_id then raise exception 'seller_adoption_denied' using errcode='42501';end if;
 -- Same account lock/order as Connect deauthorization, then owner/store locks.
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||g.stripe_account_id||':'||g.livemode::text||':'||g.connected_account_id,0));
 select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=p_owner_id for share;
 if not found or v_confirmed is null or encode(extensions.digest(lower(btrim(v_email)),'sha256'),'hex') is distinct from g.owner_email_sha256
 then raise exception 'seller_adoption_denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||p_owner_id::text,0));
 perform 1 from public.vendor_stores where id=g.store_id and owner_id=p_owner_id for key share;
 if not found then raise exception 'seller_store_mismatch' using errcode='42501';end if;
 select * into strict g from public.vendor_seller_adoption_grants where id=p_grant_id for update;
 select * into a from public.vendor_seller_accounts where owner_id=p_owner_id for update;
 if found then
  if a.adoption_grant_id is distinct from g.id or a.connected_account_id is distinct from g.connected_account_id
  then raise exception 'seller_account_already_bound' using errcode='P0001';end if;
  -- Response-loss retry can inspect retained identity, never reopen a frozen row.
  return to_jsonb(a);
 end if;
 t:=clock_timestamp();
 if not g.enabled or g.expires_at<=t or not exists(select 1 from public.vendor_store_rollout where app_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(p_owner_id)->>'store_app')::boolean,false)
  or exists(select 1 from public.vendor_account_financial_holds where owner_id=p_owner_id)
 then raise exception 'seller_adoption_denied' using errcode='42501';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object'
  or (select count(*) from jsonb_object_keys(p_evidence))<>12
  or p_evidence->>'version' is distinct from 'vendor-seller-adoption-v1'
  or p_evidence->>'grantId' is distinct from g.id::text
  or p_evidence->>'ownerId' is distinct from g.owner_id::text
  or p_evidence->>'storeId' is distinct from g.store_id::text
  or p_evidence->>'platformAccountId' is distinct from g.stripe_account_id
  or p_evidence->>'connectedAccountId' is distinct from g.connected_account_id
  or p_evidence->'livemode' is distinct from to_jsonb(g.livemode)
  or p_evidence->>'ownerEmailSha256' is distinct from g.owner_email_sha256
  or p_evidence->'controller' is distinct from v_controller
  or coalesce(p_evidence->>'sha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'checkedAt','') !~ '^[0-9]{1,12}$'
  or coalesce(p_evidence->>'providerCreatedAt','') !~ '^[0-9]{1,12}$'
 then raise exception 'seller_adoption_evidence_invalid' using errcode='22023';end if;
 checked_at:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 if checked_at>t+interval '5 seconds' or checked_at<=t-interval '60 seconds'
  or to_timestamp((p_evidence->>'providerCreatedAt')::bigint)>checked_at+interval '5 seconds'
 then raise exception 'seller_adoption_evidence_expired' using errcode='22023';end if;
 if exists(select 1 from public.vendor_seller_events where stripe_account_id=g.stripe_account_id
  and livemode=g.livemode and connected_account_id=g.connected_account_id and kind='deauthorized')
 then raise exception 'seller_onboarding_blocked' using errcode='P0001';end if;
 insert into public.vendor_seller_accounts(owner_id,store_id,stripe_account_id,livemode,controller,
  connected_account_id,creation_attempt_id,creation_started_at,state,adoption_grant_id,adoption_evidence)
 values(g.owner_id,g.store_id,g.stripe_account_id,g.livemode,v_controller,g.connected_account_id,null,null,'bound',g.id,p_evidence)
 returning * into a;
 return to_jsonb(a);
end;$$;
revoke all on function public.vendor_seller_adoption_grant_guard_v1(),public.vendor_seller_adoption_immutable_v1(),public.vendor_seller_adopt_v1(uuid,uuid,jsonb)
 from public,anon,authenticated;
grant execute on function public.vendor_seller_adopt_v1(uuid,uuid,jsonb) to service_role;

-- Operator-only issuance. Plans bind exact identities and immutable release bytes;
-- the operator adapter verifies approved hash/release and refreshes provider GETs.
-- This RPC rechecks current database authority in the insertion transaction.
create or replace function public.vendor_seller_issue_adoption_v1(p_plan jsonb,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb; g public.vendor_seller_adoption_grants; old public.vendor_seller_adoption_grants;
 t timestamptz:=clock_timestamp(); v_email text; v_confirmed timestamptz; checked_at timestamptz;
 v_controller constant jsonb:='{"feesPayer":"account","paymentLosses":"stripe","requirementCollection":"stripe","dashboard":"full"}'::jsonb;
begin
 if p_plan is null or jsonb_typeof(p_plan)<>'object'
  or (select count(*) from jsonb_object_keys(p_plan))<>(case when p_plan ? 'replacesGrantId' then 9 else 8 end)
  or (p_plan ? 'replacesGrantId' and coalesce(p_plan->>'replacesGrantId','') !~ '^[0-9a-f-]{36}$')
  or p_plan->>'version' is distinct from 'vendor-seller-approval-plan-v1'
  or coalesce(p_plan->>'projectRef','') !~ '^[a-z0-9-]{3,80}$'
  or coalesce(p_plan->>'migrationSha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_plan->>'providerEvidenceSha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_plan->>'sha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_plan->>'createdAt','') !~ '^[0-9]{1,12}$'
  or coalesce(p_plan->>'expiresAt','') !~ '^[0-9]{1,12}$'
 then raise exception 'seller_approval_plan_invalid' using errcode='22023';end if;
 v:=p_plan->'grant';
 if v is null or jsonb_typeof(v)<>'object' or (select count(*) from jsonb_object_keys(v))<>9
  or coalesce(v->>'id','') !~ '^[0-9a-f-]{36}$' or coalesce(v->>'ownerId','') !~ '^[0-9a-f-]{36}$'
  or coalesce(v->>'storeId','') !~ '^[0-9a-f-]{36}$'
  or coalesce(v->>'platformAccountId','') !~ '^acct_[A-Za-z0-9]+$'
  or coalesce(v->>'connectedAccountId','') !~ '^acct_[A-Za-z0-9]+$'
  or v->>'platformAccountId'=v->>'connectedAccountId'
  or jsonb_typeof(v->'livemode') is distinct from 'boolean'
  or coalesce(v->>'ownerEmailSha256','') !~ '^[a-f0-9]{64}$'
  or v->'createdAt' is distinct from p_plan->'createdAt'
  or coalesce(v->>'expiresAt','') !~ '^[0-9]{1,12}$'
 then raise exception 'seller_approval_plan_invalid' using errcode='22023';end if;
 g.id:=(v->>'id')::uuid;g.owner_id:=(v->>'ownerId')::uuid;g.store_id:=(v->>'storeId')::uuid;
 g.stripe_account_id:=v->>'platformAccountId';g.connected_account_id:=v->>'connectedAccountId';
 g.livemode:=(v->>'livemode')::boolean;g.owner_email_sha256:=v->>'ownerEmailSha256';
 g.approval_sha256:=p_plan->>'sha256';g.created_at:=to_timestamp((v->>'createdAt')::bigint);
 g.expires_at:=to_timestamp((v->>'expiresAt')::bigint);
 g.replaces_grant_id:=(p_plan->>'replacesGrantId')::uuid;
 if g.created_at>t or to_timestamp((p_plan->>'expiresAt')::bigint)<=t
  or (p_plan->>'expiresAt')::bigint-(p_plan->>'createdAt')::bigint<>1800
  or g.expires_at-g.created_at<>interval '24 hours'
 then raise exception 'seller_approval_plan_expired' using errcode='22023';end if;
 if p_evidence is null or jsonb_typeof(p_evidence)<>'object'
  or (select count(*) from jsonb_object_keys(p_evidence))<>12
  or p_evidence->>'version' is distinct from 'vendor-seller-adoption-v1'
  or p_evidence->>'grantId' is distinct from g.id::text
  or p_evidence->>'ownerId' is distinct from g.owner_id::text
  or p_evidence->>'storeId' is distinct from g.store_id::text
  or p_evidence->>'platformAccountId' is distinct from g.stripe_account_id
  or p_evidence->>'connectedAccountId' is distinct from g.connected_account_id
  or p_evidence->'livemode' is distinct from to_jsonb(g.livemode)
  or p_evidence->>'ownerEmailSha256' is distinct from g.owner_email_sha256
  or p_evidence->'controller' is distinct from v_controller
  or coalesce(p_evidence->>'sha256','') !~ '^[a-f0-9]{64}$'
  or coalesce(p_evidence->>'checkedAt','') !~ '^[0-9]{1,12}$'
  or coalesce(p_evidence->>'providerCreatedAt','') !~ '^[0-9]{1,12}$'
 then raise exception 'seller_adoption_evidence_invalid' using errcode='22023';end if;
 checked_at:=to_timestamp((p_evidence->>'checkedAt')::bigint);
 perform pg_advisory_xact_lock(hashtextextended('vendor-seller-connect:'||g.stripe_account_id||':'||g.livemode::text||':'||g.connected_account_id,0));
 select email,email_confirmed_at into v_email,v_confirmed from auth.users where id=g.owner_id for share;
 if not found or v_confirmed is null or encode(extensions.digest(lower(btrim(v_email)),'sha256'),'hex') is distinct from g.owner_email_sha256
 then raise exception 'seller_adoption_denied' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||g.owner_id::text,0));
 perform 1 from public.vendor_stores where id=g.store_id and owner_id=g.owner_id for key share;
 if not found then raise exception 'seller_store_mismatch' using errcode='42501';end if;
 -- Recheck time after waits: stale approval/evidence never issues a new grant.
 t:=clock_timestamp();
 if to_timestamp((p_plan->>'expiresAt')::bigint)<=t or checked_at>t+interval '5 seconds'
  or checked_at<=t-interval '60 seconds'
  or to_timestamp((p_evidence->>'providerCreatedAt')::bigint)>checked_at+interval '5 seconds'
 then raise exception 'seller_adoption_evidence_expired' using errcode='22023';end if;
 if not exists(select 1 from public.vendor_store_rollout where app_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(g.owner_id)->>'store_app')::boolean,false)
  or exists(select 1 from public.vendor_account_financial_holds where owner_id=g.owner_id)
 then raise exception 'seller_adoption_denied' using errcode='42501';end if;
 if exists(select 1 from public.vendor_seller_accounts where owner_id=g.owner_id or
  (stripe_account_id=g.stripe_account_id and livemode=g.livemode and connected_account_id=g.connected_account_id))
 then raise exception 'seller_account_already_bound' using errcode='P0001';end if;
 if exists(select 1 from public.vendor_seller_events where stripe_account_id=g.stripe_account_id
  and livemode=g.livemode and connected_account_id=g.connected_account_id and kind='deauthorized')
 then raise exception 'seller_onboarding_blocked' using errcode='P0001';end if;
 -- Same-plan retries return the original record even after it was revoked or
 -- replaced. They never revive it or replace the current approval.
 select * into old from public.vendor_seller_adoption_grants where id=g.id for update;
 if found then
  if row(old.owner_id,old.store_id,old.stripe_account_id,old.connected_account_id,old.livemode,old.owner_email_sha256,old.approval_sha256,old.created_at,old.expires_at,old.replaces_grant_id)
   is distinct from row(g.owner_id,g.store_id,g.stripe_account_id,g.connected_account_id,g.livemode,g.owner_email_sha256,g.approval_sha256,g.created_at,g.expires_at,g.replaces_grant_id)
  then raise exception 'seller_approval_conflict' using errcode='P0001';end if;
  return jsonb_build_object('id',old.id,'approval_sha256',old.approval_sha256,'enabled',old.enabled);
 end if;
 select * into old from public.vendor_seller_adoption_grants where owner_id=g.owner_id order by created_at desc,id desc limit 1 for update;
 if found then
  -- Only a still-enabled expired approval can be superseded, by a fresh plan
  -- explicitly naming it and preserving the exact account/store scope.
  if old.id is distinct from g.replaces_grant_id or not old.enabled or old.expires_at>t
   or row(old.store_id,old.stripe_account_id,old.connected_account_id,old.livemode)
    is distinct from row(g.store_id,g.stripe_account_id,g.connected_account_id,g.livemode)
  then raise exception 'seller_approval_conflict' using errcode='P0001';end if;
  update public.vendor_seller_adoption_grants set enabled=false where id=old.id;
 elsif g.replaces_grant_id is not null then
  raise exception 'seller_approval_conflict' using errcode='P0001';
 end if;
 insert into public.vendor_seller_adoption_grants(id,owner_id,store_id,stripe_account_id,connected_account_id,livemode,owner_email_sha256,approval_sha256,enabled,created_at,expires_at,replaces_grant_id)
 values(g.id,g.owner_id,g.store_id,g.stripe_account_id,g.connected_account_id,g.livemode,g.owner_email_sha256,g.approval_sha256,true,g.created_at,g.expires_at,g.replaces_grant_id);
 return jsonb_build_object('id',g.id,'approval_sha256',g.approval_sha256,'enabled',true);
end;$$;
revoke all on function public.vendor_seller_issue_adoption_v1(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.vendor_seller_issue_adoption_v1(jsonb,jsonb) to service_role;
commit;
