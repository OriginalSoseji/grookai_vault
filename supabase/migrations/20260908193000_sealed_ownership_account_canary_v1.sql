-- Account-scoped additions only. No grant enrollment or activation.
begin;

alter table public.sealed_ownership_controls_v1
  add column if not exists canary_enabled boolean not null default false;

create table if not exists public.sealed_ownership_canary_grants_v1 (
  user_id uuid primary key references auth.users(id) on delete restrict,
  plan_fingerprint text not null check (plan_fingerprint ~ '^[0-9a-f]{64}$'),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  max_created_copies integer not null check (max_created_copies between 1 and 25),
  revoked_at timestamptz,
  check (expires_at > starts_at and expires_at <= starts_at + interval '24 hours')
);
create table if not exists public.sealed_ownership_canary_variants_v1 (
  user_id uuid not null references public.sealed_ownership_canary_grants_v1(user_id) on delete restrict,
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  primary key(user_id,variant_id)
);
alter table public.sealed_ownership_canary_grants_v1 enable row level security;
alter table public.sealed_ownership_canary_grants_v1 force row level security;
alter table public.sealed_ownership_canary_variants_v1 enable row level security;
alter table public.sealed_ownership_canary_variants_v1 force row level security;
revoke all on public.sealed_ownership_canary_grants_v1,public.sealed_ownership_canary_variants_v1
  from public,anon,authenticated,service_role;
grant select,insert,update on public.sealed_ownership_canary_grants_v1 to service_role;
grant select,insert on public.sealed_ownership_canary_variants_v1 to service_role;
drop policy if exists sealed_canary_grants_service_v1 on public.sealed_ownership_canary_grants_v1;
create policy sealed_canary_grants_service_v1 on public.sealed_ownership_canary_grants_v1
  to service_role using(true) with check(true);
drop policy if exists sealed_canary_variants_service_v1 on public.sealed_ownership_canary_variants_v1;
create policy sealed_canary_variants_service_v1 on public.sealed_ownership_canary_variants_v1
  to service_role using(true) with check(true);

-- Called after the existing owner lock in the writer. Capabilities are advisory;
-- only the writer's serialized budget check authorizes creation.
create or replace function public.sealed_ownership_add_allowed_v1(p_variant_id uuid,p_quantity integer)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select auth.uid() is not null and p_quantity between 1 and 100 and coalesce((
    select controls.enabled or (controls.canary_enabled and exists (
      select 1 from public.sealed_ownership_canary_grants_v1 grant_row
      where grant_row.user_id=auth.uid() and grant_row.revoked_at is null
        and statement_timestamp() >= grant_row.starts_at and statement_timestamp() < grant_row.expires_at
        and exists(select 1 from public.sealed_ownership_canary_variants_v1 target
          where target.user_id=grant_row.user_id and (p_variant_id is null or target.variant_id=p_variant_id))
        and p_quantity + coalesce((select sum((request.result->>'created_count')::integer)
          from public.vault_sealed_requests_v1 request
          where request.user_id=grant_row.user_id and request.operation='add'),0) <= grant_row.max_created_copies
    )) from public.sealed_ownership_controls_v1 controls where controls.singleton
  ),false);
$$;
revoke all on function public.sealed_ownership_add_allowed_v1(uuid,integer) from public,anon,authenticated,service_role;

create or replace function public.get_sealed_ownership_capabilities_v1() returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
  select jsonb_build_object('version',1,'add_enabled',public.sealed_ownership_add_allowed_v1(null,1))
  where auth.uid() is not null;
$$;
revoke all on function public.get_sealed_ownership_capabilities_v1() from public,anon;
grant execute on function public.get_sealed_ownership_capabilities_v1() to authenticated;

create or replace function public.vault_add_sealed_copies_v1(
  p_variant_id uuid,p_request_id uuid,p_quantity integer default 1,
  p_seal_state text default 'unknown',p_package_condition text default 'unknown',
  p_acquisition_cost numeric default null,p_acquisition_currency text default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  u uuid := auth.uid(); o public.vault_owners%rowtype;
  prior public.vault_sealed_requests_v1%rowtype; payload jsonb; result jsonb;
  v public.sealed_product_variants%rowtype; g text;
  ids uuid[] := '{}'; item public.vault_item_instances%rowtype; n integer;
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_request_id is null or p_variant_id is null or p_quantity is null or p_quantity not between 1 and 100
    or p_seal_state is null or p_seal_state not in ('factory_sealed','opened','unknown')
    or p_package_condition is null or p_package_condition not in ('undamaged','damaged','unknown')
    or (p_acquisition_cost is null) <> (p_acquisition_currency is null)
    or (p_acquisition_cost is not null and (p_acquisition_cost not between 0 and 9999999999.99 or round(p_acquisition_cost,2)<>p_acquisition_cost))
    or (p_acquisition_currency is not null and p_acquisition_currency !~ '^[A-Z]{3}$') then
    raise exception 'invalid_sealed_add_request' using errcode='22023';
  end if;
  payload:=jsonb_build_object('variant_id',p_variant_id,'quantity',p_quantity,'seal_state',p_seal_state,
    'package_condition',p_package_condition,'acquisition_cost',p_acquisition_cost,'acquisition_currency',p_acquisition_currency);
  perform public.ensure_vault_owner_v1(u);
  select * into o from public.vault_owners where user_id=u for update;
  select * into prior from public.vault_sealed_requests_v1 where user_id=u and request_id=p_request_id;
  if found then
    if prior.operation<>'add' or prior.payload<>payload then raise exception 'request_payload_conflict' using errcode='23505'; end if;
    return prior.result;
  end if;
  if not public.sealed_ownership_add_allowed_v1(p_variant_id,p_quantity) then
    raise exception 'sealed_ownership_disabled' using errcode='55000';
  end if;
  select * into v from public.sealed_product_variants where id=p_variant_id;
  if not found then raise exception 'sealed_identity_unavailable' using errcode='P0002'; end if;
  select game_key into g from public.sealed_product_families where id=v.family_id;
  if not public.catalog_game_visible_to_request_v1(g) or not public.sealed_product_game_visible_to_request_v1(g)
    or not exists(
      select 1 from public.sealed_product_release_pointer pointer
      join public.sealed_product_releases release on release.id=pointer.release_id and release.game_key=pointer.game_key and release.release_state='frozen'
      join public.sealed_product_release_members member on member.release_id=release.id and member.variant_id=p_variant_id
      join public.sealed_product_source_mappings mapping on mapping.id=member.source_mapping_id and mapping.variant_id=member.variant_id
      where pointer.game_key=g
    ) then raise exception 'sealed_identity_not_released' using errcode='42501'; end if;
  for n in 0..p_quantity-1 loop
    insert into public.vault_item_instances(user_id,gv_vi_id,sealed_product_variant_id,seal_state,package_condition,
      acquisition_cost,acquisition_currency,name,intent)
    values(u,public.generate_gv_vi_id_v1(o.owner_code,o.next_instance_index+n),p_variant_id,p_seal_state,p_package_condition,
      p_acquisition_cost,p_acquisition_currency,v.canonical_name,'hold') returning * into item;
    ids:=array_append(ids,item.id);
  end loop;
  update public.vault_owners set next_instance_index=o.next_instance_index+p_quantity where user_id=u;
  result:=jsonb_build_object('object_kind','sealed','variant_id',p_variant_id,'request_id',p_request_id,
    'instance_ids',to_jsonb(ids),'created_count',cardinality(ids));
  insert into public.vault_sealed_requests_v1(user_id,request_id,operation,payload,result) values(u,p_request_id,'add',payload,result);
  return result;
end $$;
revoke all on function public.vault_add_sealed_copies_v1(uuid,uuid,integer,text,text,numeric,text) from public,anon;
grant execute on function public.vault_add_sealed_copies_v1(uuid,uuid,integer,text,text,numeric,text) to authenticated;
commit;
