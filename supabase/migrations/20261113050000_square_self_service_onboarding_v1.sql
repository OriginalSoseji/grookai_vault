-- Explicit vendor self-service access. Existing canaries and all inventory,
-- OAuth, merchant ownership, allocation and settlement authorities are retained.
begin;

create table grookai_square.onboarding_controls (
 singleton boolean primary key default true check(singleton),
 revision bigint not null default 0 check(revision>=0),
 enabled boolean not null default false
);
insert into grookai_square.onboarding_controls(singleton) values(true);
create table grookai_square.onboarding_control_history (
 revision bigint primary key, enabled boolean not null,
 recorded_at timestamptz not null default clock_timestamp()
);
create table grookai_square.onboarding_grants (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 control_revision bigint not null,
 granted_at timestamptz not null default clock_timestamp()
);
alter table grookai_square.onboarding_controls enable row level security;
alter table grookai_square.onboarding_control_history enable row level security;
alter table grookai_square.onboarding_grants enable row level security;
revoke all on grookai_square.onboarding_controls,grookai_square.onboarding_control_history,
 grookai_square.onboarding_grants from public,anon,authenticated,service_role;

create function public.square_onboarding_eligible_v1(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_owner is not null and coalesce((e->>'is_active')::boolean,false) and coalesce(
  e->>'tier' in ('vendor','founder_admin') or e->>'role' in ('vendor','founder')
  or coalesce((e->'features'->>'vendor_tools')::boolean,false),false)
 from (select public.grookai_effective_entitlement_v1(p_owner) e) entitlement;
$$;
create function public.square_onboarding_owner_v1(p_owner uuid) returns boolean
language sql stable security definer set search_path='' as $$
 -- A grant keeps an existing integration recoverable after a plan change.
 -- Per-copy vendor entitlement is still reproved by square_offer_snapshot_v1
 -- before catalog or stock publication. Settlement/reconciliation must continue.
 select exists(select 1 from grookai_square.onboarding_grants g where g.owner_id=p_owner);
$$;
revoke all on function public.square_onboarding_eligible_v1(uuid),public.square_onboarding_owner_v1(uuid)
 from public,anon,authenticated,service_role;

create function public.square_onboarding_access_v1() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); eligible boolean;
begin
 if actor is null then raise exception 'square_sign_in_required' using errcode='28000'; end if;
 eligible:=public.square_onboarding_eligible_v1(actor);
 return jsonb_build_object('eligible',eligible,'available',eligible and exists(
  select 1 from grookai_square.onboarding_controls o cross join grookai_square.controls c
  cross join grookai_square.commerce_controls s where o.singleton and c.singleton and s.singleton
  and o.enabled and c.linking_enabled and c.catalog_enabled and s.enabled));
end $$;
create function public.square_onboarding_enroll_v1() returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid(); revision bigint;
begin
 if actor is null then raise exception 'square_sign_in_required' using errcode='28000'; end if;
 -- Previously authorized owners retain their existing release path.
 if exists(select 1 from grookai_square.controls where singleton and actor=any(owner_allowlist))
  then return jsonb_build_object('existing',true); end if;
 select o.revision into revision from grookai_square.onboarding_controls o where o.singleton and o.enabled for share;
 if revision is null or not public.square_onboarding_eligible_v1(actor)
  or not exists(select 1 from grookai_square.controls c cross join grookai_square.commerce_controls s
   where c.singleton and s.singleton and c.linking_enabled and c.catalog_enabled and s.enabled)
  then raise exception 'square_linking_disabled'; end if;
 insert into grookai_square.onboarding_grants(owner_id,control_revision) values(actor,revision) on conflict(owner_id) do nothing;
 return jsonb_build_object('enrolled',true);
end $$;
revoke all on function public.square_onboarding_access_v1(),public.square_onboarding_enroll_v1()
 from public,anon,authenticated,service_role;
grant execute on function public.square_onboarding_access_v1(),public.square_onboarding_enroll_v1() to authenticated;

create function public.square_onboarding_controls_set_v1(p_expected_revision bigint,p_enabled boolean) returns bigint
language plpgsql volatile security definer set search_path='' as $$
declare revision bigint;
begin
 select o.revision into revision from grookai_square.onboarding_controls o where singleton for update;
 if p_enabled is null or p_expected_revision is distinct from revision then raise exception 'square_controls_conflict'; end if;
 update grookai_square.onboarding_controls o set enabled=p_enabled,revision=o.revision+1 where singleton returning o.revision into revision;
 insert into grookai_square.onboarding_control_history(revision,enabled) values(revision,p_enabled);
 return revision;
end $$;
revoke all on function public.square_onboarding_controls_set_v1(bigint,boolean) from public,anon,authenticated,service_role;
grant execute on function public.square_onboarding_controls_set_v1(bigint,boolean) to service_role;

-- Exact-source rewrites extend only the existing membership predicates.
-- Pinned definitions and marker counts fail closed on any baseline drift.
do $access$
declare item record; definition text; marker text; replacement text; hits integer;
begin
 for item in select * from (values
  ('public.square_workspace_v1()','6cb9b66c54fffbfe3a0be618b1d9eb6655c46ece1e746f9baf3814f6ae068e39','actor=any(c.owner_allowlist)','actor',2),
  ('public.square_service_v1(text,jsonb)','16650cd0d9a1e2c7e84e2a159b3033590bbf440b5b5d876cb38f47ce6cb537b1','actor=any(ctl.owner_allowlist)','actor',6),
  ('public.square_commerce_workspace_v2()','2bd07eb49318b929211c4007ec49c66b72da295ee5e56f4b7eeff529d3c3a123','auth.uid()=any(owner_allowlist)','auth.uid()',1),
  ('public.square_commerce_service_v2(text,jsonb)','6a0790a0c4bc5caedadcc60c1af620b8a43b401ca0bd5ae353948dbfc55062a0','actor=any(ctl.owner_allowlist)','actor',4),
  ('public.square_poll_v1(integer)','90cbe27113be9c7bfaaef3f0733484033c50c0c2f94fc9c957c04244466291ca','c.owner_id=any(ctl.owner_allowlist)','c.owner_id',1),
  ('public.square_poll_v2(text,integer)','c45fe5ae8d1eb9aadea91aeb77d96e926c08cc6cc2a65ba8e9cfef42687ea7e8','c.owner_id=any(ctl.owner_allowlist)','c.owner_id',1),
  ('public.square_poll_v3(text,integer)','e663401ff9e02ba86cd4b4b4d0c1ca28411d910819a8519f5c7ce2b2cbd36223','c.owner_id=any(ctl.owner_allowlist)','c.owner_id',1)
 ) as changes(signature,pin,old_predicate,actor,expected_hits) loop
  select pg_get_functiondef(item.signature::regprocedure) into definition;
  if encode(extensions.digest(definition,'sha256'),'hex') is distinct from item.pin then raise exception 'square_onboarding_source_drift:%',item.signature; end if;
  marker:=item.old_predicate;
  hits:=(length(definition)-length(replace(definition,marker,'')))/length(marker);
  if hits<>item.expected_hits then raise exception 'square_onboarding_predicate_drift:%:%',item.signature,hits; end if;
  replacement:='('||marker||' or public.square_onboarding_owner_v1('||item.actor||'))';
  execute replace(definition,marker,replacement);
 end loop;
end $access$;

notify pgrst,'reload schema';
commit;
