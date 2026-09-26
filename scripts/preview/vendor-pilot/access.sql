-- Isolated hosted vendor review overlay. NOT a production migration.
begin;
create table public.vendor_pilot_invites (
 id uuid primary key default gen_random_uuid(),code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null,max_members integer not null check(max_members between 1 and 10),revoked boolean not null default false
);
create table public.vendor_pilot_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 invite_id uuid not null references public.vendor_pilot_invites(id),expires_at timestamptz not null
);
alter table public.vendor_pilot_invites enable row level security;
alter table public.vendor_pilot_members enable row level security;
revoke all on public.vendor_pilot_invites,public.vendor_pilot_members from public,anon,authenticated;
grant all on public.vendor_pilot_invites,public.vendor_pilot_members to service_role;
create function public.vendor_pilot_activate_v1(p_invite text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); invitation public.vendor_pilot_invites; prior public.user_entitlements;
begin
 if actor is null or p_invite is null or p_invite !~ '^[a-f0-9]{64}$' then raise exception 'Review access unavailable' using errcode='42501';end if;
 select * into invitation from public.vendor_pilot_invites where code_hash=encode(extensions.digest(p_invite,'sha256'),'hex') for update;
 if invitation.id is null or invitation.revoked or invitation.expires_at<=now() then raise exception 'Review access unavailable' using errcode='42501';end if;
 if exists(select 1 from public.vendor_pilot_members where user_id=actor) then
  if not exists(select 1 from public.vendor_pilot_members m join public.vendor_pilot_invites i on i.id=m.invite_id where m.user_id=actor and m.expires_at>now() and i.expires_at>now() and not i.revoked) then raise exception 'Review access expired' using errcode='42501';end if;
  return;
 end if;
 if (select count(*) from public.vendor_pilot_members where invite_id=invitation.id)>=invitation.max_members then raise exception 'Review access unavailable' using errcode='42501';end if;
 perform 1 from auth.users where id=actor for update;
 select * into prior from public.user_entitlements where user_id=actor and is_active;
 if prior.id is not null then raise exception 'Existing entitlement requires review' using errcode='42501';end if;
 insert into public.vendor_pilot_members(user_id,invite_id,expires_at) values(actor,invitation.id,least(invitation.expires_at,now()+interval '14 days'));
 insert into public.user_entitlements(user_id,tier,role,features,source) values(actor,'vendor','vendor','{"store_app":true,"store_web":false,"vendor_tools":true}','vendor_pilot_v1');
end;$$;
revoke all on function public.vendor_pilot_activate_v1(text) from public,anon;
grant execute on function public.vendor_pilot_activate_v1(text) to authenticated;
-- __BASE_CAPABILITIES__
revoke all on function public.vendor_pilot_base_capabilities_v1(uuid) from public,anon,authenticated,service_role;
create or replace function public.vendor_store_capabilities_v1(p_user_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.user_entitlements where user_id=p_user_id and is_active and source='vendor_pilot_v1')
 and not exists(select 1 from public.vendor_pilot_members m join public.vendor_pilot_invites i on i.id=m.invite_id where m.user_id=p_user_id and m.expires_at>now() and i.expires_at>now() and not i.revoked)
 then '{"store_app":false,"store_web":false}'::jsonb else public.vendor_pilot_base_capabilities_v1(p_user_id) end;
$$;
update public.vendor_store_rollout set app_enabled=true,custom_enabled=true,web_enabled=false;
notify pgrst,'reload schema';
commit;
