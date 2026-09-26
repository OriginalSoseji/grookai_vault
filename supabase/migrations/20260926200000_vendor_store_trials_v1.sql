-- Invitation-only, expiring production store trials. No billing, publication,
-- inventory selection, collector privacy or legacy Vendor Mode changes.
begin;
create table public.vendor_store_trial_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null check(isfinite(expires_at)),
  max_members integer not null check(max_members between 1 and 10),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.vendor_store_trial_members (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  invite_id uuid not null references public.vendor_store_trial_invites(id),
  expires_at timestamptz not null check(isfinite(expires_at)),
  created_at timestamptz not null default now()
);
alter table public.vendor_store_trial_invites enable row level security;
alter table public.vendor_store_trial_members enable row level security;
revoke all on public.vendor_store_trial_invites,public.vendor_store_trial_members from public,anon,authenticated;
grant all on public.vendor_store_trial_invites,public.vendor_store_trial_members to service_role;

create function public.vendor_store_trial_active_v1(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.vendor_store_trial_members m
    join public.vendor_store_trial_invites i on i.id=m.invite_id
    where m.owner_id=p_owner and m.expires_at>statement_timestamp()
      and i.expires_at>statement_timestamp() and not i.revoked);
$$;
revoke all on function public.vendor_store_trial_active_v1(uuid) from public,anon,authenticated;
grant execute on function public.vendor_store_trial_active_v1(uuid) to service_role;

-- Apply expiration at the authoritative entitlement reader, including direct
-- RPCs. Verified paid access can continue after a trial ends. Other grant sources
-- retain the exact existing precedence and package projection.
create or replace function public.grookai_effective_entitlement_v1(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with selected as (
    select e.* from public.user_entitlements e join auth.users u on u.id=p_user_id
      where e.is_active and (e.user_id=u.id or (e.user_id is null and lower(e.email)=lower(u.email)))
      and (e.source<>'vendor_store_trial_v1' or public.vendor_store_trial_active_v1(p_user_id)
        or (e.user_id=p_user_id and e.billing_plan is not null
          and e.billing_paid_from<=statement_timestamp() and e.billing_paid_through>statement_timestamp()))
      order by (e.user_id=u.id) desc nulls last,e.id limit 1
  ), effective as (
    select e.*,coalesce(e.user_id=p_user_id and e.billing_plan is not null
      and e.billing_paid_from<=statement_timestamp() and e.billing_paid_through>statement_timestamp(),false) as paid,
      (e.source='vendor_store_trial_v1' and public.vendor_store_trial_active_v1(p_user_id)) as trial
      from selected e
  )
  select jsonb_build_object('user_id',e.user_id,'email',e.email,'is_active',e.is_active,
    'tier',case when paid and e.tier in ('free','premium') then 'vendor' else e.tier end,
    'role',case when paid and e.role in ('collector','subscriber') then 'vendor' else e.role end,
    'source',e.source,'notes',e.notes,
    'features',e.features||jsonb_build_object(
      'store_app',coalesce(e.features->'store_app'='true'::jsonb,false) or paid or trial,
      'store_web',(coalesce(e.features->'store_app'='true'::jsonb,false) and coalesce(e.features->'store_web'='true'::jsonb,false)) or (paid and e.billing_plan='store_web'),
      'vendor_tools',coalesce(e.features->'vendor_tools'='true'::jsonb,false) or paid)) from effective e;
$$;
revoke all on function public.grookai_effective_entitlement_v1(uuid) from public,anon,authenticated;
grant execute on function public.grookai_effective_entitlement_v1(uuid) to service_role;

create function public.vendor_store_trial_activate_v1(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); invitation public.vendor_store_trial_invites;
  member public.vendor_store_trial_members; actor_email text; until_at timestamptz;
begin
  if actor is null or p_code is null or p_code !~ '^[a-f0-9]{64}$'
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Trial invitation unavailable' using errcode='42501';end if;
  select * into invitation from public.vendor_store_trial_invites
    where code_hash=encode(extensions.digest(p_code,'sha256'),'hex') for update;
  if invitation.id is null or invitation.revoked or invitation.expires_at<=now()
    then raise exception 'Trial invitation unavailable' using errcode='42501';end if;
  select email into actor_email from auth.users where id=actor for update;
  if not found then raise exception 'Trial invitation unavailable' using errcode='42501';end if;
  select * into member from public.vendor_store_trial_members where owner_id=actor;
  if member.owner_id is not null then
    if not public.vendor_store_trial_active_v1(actor)
      then raise exception 'Trial invitation unavailable' using errcode='42501';end if;
    return jsonb_build_object('expires_at',member.expires_at,'existing',true);
  end if;
  if (select count(*) from public.vendor_store_trial_members where invite_id=invitation.id)>=invitation.max_members
    or exists(select 1 from public.user_entitlements where is_active
      and (user_id=actor or (user_id is null and lower(email)=lower(actor_email))))
    then raise exception 'Trial invitation unavailable' using errcode='42501';end if;
  until_at:=least(invitation.expires_at,now()+interval '14 days');
  insert into public.vendor_store_trial_members(owner_id,invite_id,expires_at) values(actor,invitation.id,until_at);
  insert into public.user_entitlements(user_id,tier,role,features,source)
    values(actor,'free','collector','{}','vendor_store_trial_v1');
  return jsonb_build_object('expires_at',until_at,'existing',false);
end;
$$;
revoke all on function public.vendor_store_trial_activate_v1(text) from public,anon;
grant execute on function public.vendor_store_trial_activate_v1(text) to authenticated;
notify pgrst,'reload schema';
commit;
