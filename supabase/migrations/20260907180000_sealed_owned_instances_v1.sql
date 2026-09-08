-- SEALED_OWNED_INSTANCES_V1: additive owned-copy identity and transactions.
-- No catalog, price, image, existing ownership, or release activation writes.
begin;

alter table public.vault_item_instances
  add column if not exists sealed_product_variant_id uuid,
  add column if not exists seal_state text,
  add column if not exists package_condition text,
  add column if not exists acquisition_currency text;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.vault_item_instances'::regclass and conname='vault_instances_sealed_variant_fk') then
    alter table public.vault_item_instances add constraint vault_instances_sealed_variant_fk
      foreign key (sealed_product_variant_id) references public.sealed_product_variants(id) on delete restrict;
  end if;
end $$;
alter table public.vault_item_instances drop constraint if exists vault_item_instances_identity_anchor_exactly_one;
alter table public.vault_item_instances add constraint vault_item_instances_identity_anchor_exactly_one
  check (num_nonnulls(card_print_id,slab_cert_id,sealed_product_variant_id)=1);
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.vault_item_instances'::regclass and conname='vault_instances_sealed_fields_v1') then
    alter table public.vault_item_instances add constraint vault_instances_sealed_fields_v1 check (
      (sealed_product_variant_id is null and seal_state is null and package_condition is null)
      or (sealed_product_variant_id is not null and card_printing_id is null
        and legacy_vault_item_id is null and not is_graded and grade_company is null
        and grade_value is null and grade_label is null and condition_label is null and condition_score is null
        and seal_state is not null and seal_state in ('factory_sealed','opened','unknown')
        and package_condition is not null and package_condition in ('undamaged','damaged','unknown')
        and gv_vi_id is not null
        and ((acquisition_cost is null and acquisition_currency is null)
          or (acquisition_cost is not null and acquisition_cost between 0 and 9999999999.99
            and acquisition_currency is not null and acquisition_currency ~ '^[A-Z]{3}$')))
    );
  end if;
end $$;
create index if not exists vault_instances_active_sealed_owner_v1
  on public.vault_item_instances(user_id,created_at desc,id)
  where archived_at is null and sealed_product_variant_id is not null;
create index if not exists vault_instances_sealed_variant_v1
  on public.vault_item_instances(sealed_product_variant_id) where sealed_product_variant_id is not null;

create table if not exists public.sealed_ownership_controls_v1 (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.sealed_ownership_controls_v1(singleton,enabled) values(true,false) on conflict do nothing;
alter table public.sealed_ownership_controls_v1 enable row level security;
alter table public.sealed_ownership_controls_v1 force row level security;
-- Clear inherited Supabase defaults before granting the exact worker scope.
revoke all on public.sealed_ownership_controls_v1 from public,anon,authenticated,service_role;
grant select,update on public.sealed_ownership_controls_v1 to service_role;
drop policy if exists sealed_ownership_controls_service_v1 on public.sealed_ownership_controls_v1;
create policy sealed_ownership_controls_service_v1 on public.sealed_ownership_controls_v1 to service_role using(true) with check(true);

create table if not exists public.vault_sealed_requests_v1 (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  operation text not null check(operation in ('add','remove','sale','trade')),
  payload jsonb not null check(jsonb_typeof(payload)='object'),
  result jsonb not null check(jsonb_typeof(result)='object'),
  created_at timestamptz not null default now(),
  primary key(user_id,request_id)
);
alter table public.vault_sealed_requests_v1 enable row level security;
alter table public.vault_sealed_requests_v1 force row level security;
revoke all on public.vault_sealed_requests_v1 from public,anon,authenticated,service_role;
grant select,insert on public.vault_sealed_requests_v1 to service_role;
drop policy if exists vault_sealed_requests_service_v1 on public.vault_sealed_requests_v1;
create policy vault_sealed_requests_service_v1 on public.vault_sealed_requests_v1 to service_role using(true) with check(true);

alter table public.vault_item_instance_dispositions
  add column if not exists sealed_product_variant_id uuid,
  add column if not exists seal_state text,
  add column if not exists package_condition text,
  alter column card_print_id drop not null;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.vault_item_instance_dispositions'::regclass and conname='vault_dispositions_sealed_variant_fk') then
    alter table public.vault_item_instance_dispositions add constraint vault_dispositions_sealed_variant_fk
      foreign key(sealed_product_variant_id) references public.sealed_product_variants(id) on delete restrict;
    alter table public.vault_item_instance_dispositions add constraint vault_dispositions_target_v1
      check(num_nonnulls(card_print_id,sealed_product_variant_id)=1);
    alter table public.vault_item_instance_dispositions add constraint vault_dispositions_sealed_fields_v1 check (
      (sealed_product_variant_id is null and seal_state is null and package_condition is null)
      or (sealed_product_variant_id is not null and card_printing_id is null
        and seal_state is not null and seal_state in ('factory_sealed','opened','unknown')
        and package_condition is not null and package_condition in ('undamaged','damaged','unknown')));
  end if;
end $$;

create or replace function public.vault_sealed_identity_guard_v1() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if tg_op='UPDATE' and (old.sealed_product_variant_id is not null or new.sealed_product_variant_id is not null) then
    if new.sealed_product_variant_id is distinct from old.sealed_product_variant_id
      or new.user_id is distinct from old.user_id or new.gv_vi_id is distinct from old.gv_vi_id then
      raise exception 'sealed_owned_identity_is_immutable' using errcode='23514';
    end if;
    if old.archived_at is not null and new is distinct from old then
      raise exception 'archived_sealed_copy_is_immutable' using errcode='23514';
    end if;
    if old.archived_at is null and new.archived_at is not null and (
      new.intent <> 'hold' or not exists (
        select 1 from public.vault_sealed_requests_v1 request
        where request.user_id=old.user_id and request.operation in ('remove','sale','trade')
          and request.payload->>'instance_id'=old.id::text
          and request.result->>'instance_id'=old.id::text
          and request.result->>'archived'='true'
      )) then
      raise exception 'sealed_archive_requires_bound_lifecycle_request' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_vault_sealed_identity_guard_v1 on public.vault_item_instances;
create trigger trg_vault_sealed_identity_guard_v1 before update on public.vault_item_instances
  for each row execute function public.vault_sealed_identity_guard_v1();

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
  if not exists(select 1 from public.sealed_ownership_controls_v1 where enabled) then
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

create or replace function public.vault_dispose_sealed_copy_v1(
  p_instance_id uuid,p_request_id uuid,p_operation text,
  p_sale_price numeric default null,p_sale_currency text default null,p_counterparty text default null,
  p_trade_received text default null,p_cash_direction text default null,
  p_cash_amount numeric default null,p_cash_currency text default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  u uuid:=auth.uid(); item public.vault_item_instances%rowtype; prior public.vault_sealed_requests_v1%rowtype;
  payload jsonb; result jsonb; event_id uuid;
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_instance_id is null or p_request_id is null or p_operation is null or p_operation not in ('remove','sale','trade') then
    raise exception 'invalid_disposition_request' using errcode='22023'; end if;
  if p_counterparty is not null and (btrim(p_counterparty)='' or length(p_counterparty)>120) then
    raise exception 'invalid_counterparty' using errcode='22023'; end if;
  if p_operation='sale' then
    if p_sale_price is null or p_sale_price not between 0.01 and 9999999999.99 or round(p_sale_price,2)<>p_sale_price
      or p_sale_currency is null or p_sale_currency !~ '^[A-Z]{3}$'
      or p_trade_received is not null or p_cash_direction is not null or p_cash_amount is not null or p_cash_currency is not null then
      raise exception 'invalid_sale_details' using errcode='22023'; end if;
  elsif p_operation='trade' then
    if p_sale_price is not null or p_sale_currency is not null
      or p_trade_received is null or btrim(p_trade_received)='' or length(p_trade_received)>1000
      or not ((p_cash_direction is null and p_cash_amount is null and p_cash_currency is null)
        or (p_cash_direction is not null and p_cash_direction in ('paid','received') and p_cash_amount is not null
          and p_cash_amount between 0.01 and 9999999999.99 and round(p_cash_amount,2)=p_cash_amount
          and p_cash_currency is not null and p_cash_currency ~ '^[A-Z]{3}$')) then
      raise exception 'invalid_trade_details' using errcode='22023'; end if;
  elsif num_nonnulls(p_sale_price,p_sale_currency,p_counterparty,p_trade_received,p_cash_direction,p_cash_amount,p_cash_currency)>0 then
    raise exception 'remove_cannot_have_transaction_details' using errcode='22023';
  end if;
  payload:=jsonb_build_object('instance_id',p_instance_id,'operation',p_operation,'sale_price',p_sale_price,
    'sale_currency',p_sale_currency,'counterparty',p_counterparty,'trade_received',p_trade_received,
    'cash_direction',p_cash_direction,'cash_amount',p_cash_amount,'cash_currency',p_cash_currency);
  perform 1 from public.vault_owners where user_id=u for update;
  select * into prior from public.vault_sealed_requests_v1 where user_id=u and request_id=p_request_id;
  if found then
    if prior.operation<>p_operation or prior.payload<>payload then raise exception 'request_payload_conflict' using errcode='23505'; end if;
    return prior.result;
  end if;
  select * into item from public.vault_item_instances where id=p_instance_id and user_id=u and sealed_product_variant_id is not null for update;
  if not found then raise exception 'sealed_copy_not_owned' using errcode='P0002'; end if;
  if item.archived_at is not null then raise exception 'sealed_copy_already_archived' using errcode='23514'; end if;
  if p_operation<>'remove' then
    insert into public.vault_item_instance_dispositions(user_id,vault_item_instance_id,sealed_product_variant_id,
      gv_vi_id,disposition_type,seal_state,package_condition,intent_at_disposition,asking_price_amount,asking_price_currency,
      sale_price_amount,sale_price_currency,counterparty_label,trade_received_description,trade_cash_direction,trade_cash_amount,trade_cash_currency)
    values(u,item.id,item.sealed_product_variant_id,item.gv_vi_id,p_operation,item.seal_state,item.package_condition,
      item.intent,item.asking_price_amount,item.asking_price_currency,p_sale_price,p_sale_currency,p_counterparty,
      p_trade_received,p_cash_direction,p_cash_amount,p_cash_currency) returning id into event_id;
  end if;
  result:=jsonb_build_object('instance_id',item.id,'gv_vi_id',item.gv_vi_id,'sealed_product_variant_id',item.sealed_product_variant_id,
    'object_kind','sealed','operation',p_operation,'disposition_id',event_id,'archived',true);
  -- The archive trigger requires this service-only request; both writes roll back together.
  insert into public.vault_sealed_requests_v1(user_id,request_id,operation,payload,result) values(u,p_request_id,p_operation,payload,result);
  update public.vault_item_instances set archived_at=now(),intent='hold' where id=item.id and user_id=u and archived_at is null;
  if not found then raise exception 'sealed_archive_failed'; end if;
  return result;
end $$;

create or replace function public.vault_update_sealed_copy_v1(
  p_instance_id uuid,p_seal_state text,p_package_condition text,p_intent text,
  p_asking_price numeric default null,p_asking_currency text default null
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare item public.vault_item_instances%rowtype; u uuid:=auth.uid();
begin
  if u is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_seal_state is null or p_seal_state not in ('factory_sealed','opened','unknown')
    or p_package_condition is null or p_package_condition not in ('undamaged','damaged','unknown')
    or p_intent is null or p_intent not in ('hold','sell','trade','showcase')
    or (p_asking_price is null)<>(p_asking_currency is null)
    or (p_asking_price is not null and (p_asking_price not between 0 and 9999999999.99 or round(p_asking_price,2)<>p_asking_price))
    or (p_asking_currency is not null and p_asking_currency !~ '^[A-Z]{3}$') then
    raise exception 'invalid_sealed_copy_settings' using errcode='22023'; end if;
  update public.vault_item_instances set seal_state=p_seal_state,package_condition=p_package_condition,intent=p_intent,
    pricing_mode=case when p_asking_price is null then 'market' else 'asking' end,
    asking_price_amount=p_asking_price,asking_price_currency=p_asking_currency,asking_price_note=null
  where id=p_instance_id and user_id=u and sealed_product_variant_id is not null and archived_at is null returning * into item;
  if not found then raise exception 'sealed_copy_not_owned' using errcode='P0002'; end if;
  return jsonb_build_object('instance_id',item.id,'object_kind','sealed','seal_state',item.seal_state,
    'package_condition',item.package_condition,'intent',item.intent,'asking_price_amount',item.asking_price_amount,
    'asking_price_currency',item.asking_price_currency);
end $$;

revoke all on function public.vault_sealed_identity_guard_v1() from public,anon,authenticated;
revoke all on function public.vault_add_sealed_copies_v1(uuid,uuid,integer,text,text,numeric,text) from public,anon;
revoke all on function public.vault_dispose_sealed_copy_v1(uuid,uuid,text,numeric,text,text,text,text,numeric,text) from public,anon;
revoke all on function public.vault_update_sealed_copy_v1(uuid,text,text,text,numeric,text) from public,anon;
grant execute on function public.vault_add_sealed_copies_v1(uuid,uuid,integer,text,text,numeric,text) to authenticated;
grant execute on function public.vault_dispose_sealed_copy_v1(uuid,uuid,text,numeric,text,text,text,text,numeric,text) to authenticated;
grant execute on function public.vault_update_sealed_copy_v1(uuid,text,text,text,numeric,text) to authenticated;
notify pgrst,'reload schema';
commit;
