-- Private stock arbitration foundation. No checkout, payment confirmation,
-- ownership transfer, worker or public buying capability is enabled here.
begin;

create table if not exists public.vendor_stock_rollout (
 singleton boolean primary key default true check(singleton),
 reservations_enabled boolean not null default false
);
insert into public.vendor_stock_rollout(singleton) values(true) on conflict do nothing;

create table if not exists public.vendor_stock_reservations (
 id uuid primary key,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 owner_id uuid not null references auth.users(id) on delete restrict,
 store_id uuid not null references public.vendor_stores(id) on delete restrict,
 seller_id uuid not null references public.vendor_seller_accounts(id) on delete restrict,
 instance_id uuid references public.vault_item_instances(id) on delete restrict,
 product_id uuid references public.vendor_store_custom_products(id) on delete restrict,
 quantity integer not null check(quantity between 1 and 100),
 offer jsonb not null check(jsonb_typeof(offer)='object'),
 state text not null default 'held' check(state in ('held','payment_pending','released')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 payment_started_at timestamptz,
 released_at timestamptz,
 release_reason text check(release_reason in ('canceled','expired')),
 check(buyer_id<>owner_id),
 check((instance_id is not null and product_id is null and quantity=1) or (instance_id is null and product_id is not null)),
 check(expires_at>created_at and expires_at<=created_at+interval '120 seconds'),
 check((state='payment_pending')=(payment_started_at is not null)),
 check((state='released')=(released_at is not null) and (released_at is null)=(release_reason is null))
);
create index if not exists vendor_stock_copy_active on public.vendor_stock_reservations(instance_id) where state<>'released';
create index if not exists vendor_stock_product_active on public.vendor_stock_reservations(product_id) where state<>'released';
create index if not exists vendor_stock_buyer_active on public.vendor_stock_reservations(buyer_id,store_id) where state<>'released';

alter table public.vendor_stock_rollout enable row level security;
alter table public.vendor_stock_reservations enable row level security;
revoke all on public.vendor_stock_rollout,public.vendor_stock_reservations from public,anon,authenticated,service_role;
grant select,update on public.vendor_stock_rollout to service_role;
grant select on public.vendor_stock_reservations to service_role;

-- Fresh command snapshots are necessary after waiting for stock row locks.
-- Repeatable-read callers must retry in READ COMMITTED; stale snapshots cannot
-- authorize stock mutation. No GUC supplied by a client bypasses these guards.
create or replace function public.vendor_stock_require_isolation_v1() returns void
language plpgsql set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception 'stock_requires_read_committed' using errcode='25000';
 end if;
end; $$;

create or replace function public.vendor_stock_live_quantity_v1(p_instance uuid,p_product uuid) returns bigint
language sql volatile security definer set search_path='' as $$
 select coalesce(sum(quantity),0) from public.vendor_stock_reservations
 where ((p_instance is not null and instance_id=p_instance) or (p_product is not null and product_id=p_product))
 and (state='payment_pending' or (state='held' and expires_at>clock_timestamp()));
$$;

create or replace function public.vendor_stock_copy_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and row(new.id,new.user_id,new.card_print_id,new.card_printing_id,new.slab_cert_id,
   new.legacy_vault_item_id,new.gv_vi_id,new.archived_at,new.condition_label,new.intent,new.pricing_mode,
   new.asking_price_amount,new.asking_price_currency) is not distinct from
   row(old.id,old.user_id,old.card_print_id,old.card_printing_id,old.slab_cert_id,
   old.legacy_vault_item_id,old.gv_vi_id,old.archived_at,old.condition_label,old.intent,old.pricing_mode,
   old.asking_price_amount,old.asking_price_currency) then return new;end if;
 perform public.vendor_stock_require_isolation_v1();
 if public.vendor_stock_live_quantity_v1(old.id,null)>0 then
  raise exception 'stock_reserved' using errcode='P0001';
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end; $$;

create or replace function public.vendor_stock_product_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare held bigint;
begin
 perform public.vendor_stock_require_isolation_v1();
 held:=public.vendor_stock_live_quantity_v1(null,old.id);
 if held>0 then
  if tg_op='DELETE' then raise exception 'stock_reserved' using errcode='P0001';end if;
  -- Allow unpublishing and adjustments to genuinely unreserved stock. The offer
  -- identity, description, price, media and archive state stay fixed while held.
  if new.available_quantity<held or
   (to_jsonb(new)-array['available_quantity','published','suspension_reason','version','updated_at']) is distinct from
   (to_jsonb(old)-array['available_quantity','published','suspension_reason','version','updated_at'])
   then raise exception 'stock_reserved' using errcode='P0001';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end; $$;

create or replace function public.vendor_stock_store_guard_v1() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if row(new.id,new.owner_id,new.custom_currency) is distinct from row(old.id,old.owner_id,old.custom_currency) then
  perform public.vendor_stock_require_isolation_v1();
  if exists(select 1 from public.vendor_stock_reservations where store_id=old.id and
    (state='payment_pending' or (state='held' and expires_at>clock_timestamp()))) then
   raise exception 'stock_reserved' using errcode='P0001';
  end if;
 end if;return new;
end; $$;

create or replace function public.vendor_stock_immutable_v1() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'stock_history_retained' using errcode='P0001';end if;
 if (to_jsonb(new)-array['state','payment_started_at','released_at','release_reason']) is distinct from
    (to_jsonb(old)-array['state','payment_started_at','released_at','release_reason']) or
    old.state<>'held' then raise exception 'stock_reservation_immutable' using errcode='P0001';end if;
 return new;
end; $$;

do $$begin
 if not exists(select 1 from pg_trigger where tgrelid='public.vault_item_instances'::regclass and tgname='vendor_stock_copy_guard') then
  create trigger vendor_stock_copy_guard before update or delete on public.vault_item_instances for each row execute function public.vendor_stock_copy_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_store_custom_products'::regclass and tgname='vendor_stock_product_guard') then
  create trigger vendor_stock_product_guard before update or delete on public.vendor_store_custom_products for each row execute function public.vendor_stock_product_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_stores'::regclass and tgname='vendor_stock_store_guard') then
  create trigger vendor_stock_store_guard before update on public.vendor_stores for each row execute function public.vendor_stock_store_guard_v1();
 end if;
 if not exists(select 1 from pg_trigger where tgrelid='public.vendor_stock_reservations'::regclass and tgname='vendor_stock_immutable') then
  create trigger vendor_stock_immutable before update or delete on public.vendor_stock_reservations for each row execute function public.vendor_stock_immutable_v1();
 end if;
end$$;

-- Shared order: request advisory lock -> store -> seller -> physical stock ->
-- reservation. Legacy writers already lock physical stock; their trigger never
-- waits on a store/seller/reservation row, so it cannot invert that order.
create or replace function public.vendor_stock_reserve_v1(p_id uuid,p_buyer_id uuid,p_store_id uuid,
 p_instance_id uuid,p_product_id uuid,p_quantity integer) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare s public.vendor_stores; a public.vendor_seller_accounts; v public.vault_item_instances;
 p public.vendor_store_custom_products; r public.vendor_stock_reservations; t timestamptz; snapshot jsonb;
begin
 perform public.vendor_stock_require_isolation_v1();
 if p_id is null or p_buyer_id is null or p_store_id is null or p_quantity is null or p_quantity not between 1 and 100
  or not ((p_instance_id is not null and p_product_id is null and p_quantity=1) or (p_instance_id is null and p_product_id is not null))
  then raise exception 'stock_invalid_request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('vendor-stock:'||p_id::text,0));
 select * into r from public.vendor_stock_reservations where id=p_id;
 if found then
  if row(r.buyer_id,r.store_id,r.instance_id,r.product_id,r.quantity) is distinct from
   row(p_buyer_id,p_store_id,p_instance_id,p_product_id,p_quantity) then
    raise exception 'stock_request_conflict' using errcode='22023';end if;
  return r; -- Recovery does not extend expiry, recreate an attempt or grant payment authority.
 end if;
 if not exists(select 1 from public.vendor_stock_rollout where reservations_enabled) then
  raise exception 'stock_disabled' using errcode='42501';end if;
 select * into s from public.vendor_stores where id=p_store_id for update;
 select * into a from public.vendor_seller_accounts where store_id=p_store_id for update;
 if s.id is null or s.owner_id=p_buyer_id or not s.web_published or a.id is null or a.owner_id<>s.owner_id
  or a.state<>'bound' or a.closeout_id is not null
  or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
  or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
  or not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled
    and nullif(slug,'') is not null and nullif(display_name,'') is not null)
  then raise exception 'stock_store_unavailable' using errcode='42501';end if;
 if (select count(*) from public.vendor_stock_reservations where buyer_id=p_buyer_id and store_id=s.id
   and (state='payment_pending' or (state='held' and expires_at>clock_timestamp())))>=10 then
  raise exception 'stock_buyer_limit' using errcode='P0001';end if;
 if p_instance_id is not null then
  select * into v from public.vault_item_instances where id=p_instance_id for update;
  if not found or public.vendor_store_copy_reason_v1(s.owner_id,p_instance_id) is not null
    or not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=p_instance_id) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
  if public.vendor_stock_live_quantity_v1(p_instance_id,null)>0 then raise exception 'stock_unavailable' using errcode='P0001';end if;
  snapshot:=jsonb_build_object('schema','VENDOR_STOCK_OFFER_V1','kind','copy','instance_id',v.id,'gvvi',v.gv_vi_id,
   'card_printing_id',v.card_printing_id,'card_print_id',coalesce(v.card_print_id,(select card_print_id from public.slab_certs where id=v.slab_cert_id)),
   'condition',v.condition_label,'slab_cert_id',v.slab_cert_id,'unit_amount',v.asking_price_amount,'currency',v.asking_price_currency);
 else
  select * into p from public.vendor_store_custom_products where id=p_product_id for update;
  if not found or p.store_id<>s.id or not p.published or public.vendor_store_custom_reason_v1(p_product_id) is not null
    or not exists(select 1 from public.vendor_store_rollout where custom_enabled) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
  if p.available_quantity-public.vendor_stock_live_quantity_v1(null,p.id)<p_quantity then
   raise exception 'stock_unavailable' using errcode='P0001';end if;
  snapshot:=jsonb_build_object('schema','VENDOR_STOCK_OFFER_V1','kind','custom','product_id',p.id,'version',p.version,
    'title',p.title,'unit_amount',p.asking_price_amount,'currency',s.custom_currency);
 end if;
 -- Checkout V1 will price USD only; accepting another currency here would lose
 -- minor-unit semantics. Browse-only stores retain their existing currencies.
 if snapshot->>'currency'<>'USD' or (snapshot->>'unit_amount')::numeric<>round((snapshot->>'unit_amount')::numeric,2) then
  raise exception 'stock_currency_unavailable' using errcode='22023';end if;
 t:=clock_timestamp();
 insert into public.vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,instance_id,product_id,quantity,offer,created_at,expires_at)
 values(p_id,p_buyer_id,s.owner_id,s.id,a.id,p_instance_id,p_product_id,p_quantity,snapshot,t,t+interval '120 seconds') returning * into r;
 return r;
end; $$;

create or replace function public.vendor_stock_release_v1(p_id uuid,p_buyer_id uuid) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare r public.vendor_stock_reservations;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into r from public.vendor_stock_reservations where id=p_id;
 if not found or r.buyer_id is distinct from p_buyer_id then raise exception 'stock_not_found' using errcode='42501';end if;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=p_id for update;
 if r.state='released' then return r;end if;
 if r.state='payment_pending' then raise exception 'stock_payment_resolution_required' using errcode='P0001';end if;
 update public.vendor_stock_reservations set state='released',released_at=clock_timestamp(),
  release_reason=case when expires_at<=clock_timestamp() then 'expired' else 'canceled' end where id=p_id returning * into r;
 return r;
end; $$;

-- Claim BEFORE any provider create request. Its durable ID is the future payment
-- attempt's idempotency anchor. No timeout or owner cancellation can release it.
-- Payment settlement/release must be added with the authoritative order ledger.
create or replace function public.vendor_stock_start_payment_v1(p_id uuid,p_buyer_id uuid) returns public.vendor_stock_reservations
language plpgsql security definer set search_path='' as $$
declare r public.vendor_stock_reservations; s public.vendor_stores; a public.vendor_seller_accounts;
begin
 perform public.vendor_stock_require_isolation_v1();
 select * into r from public.vendor_stock_reservations where id=p_id;
 if not found or r.buyer_id is distinct from p_buyer_id then raise exception 'stock_not_found' using errcode='42501';end if;
 select * into s from public.vendor_stores where id=r.store_id for update;
 select * into a from public.vendor_seller_accounts where id=r.seller_id for update;
 if r.instance_id is not null then perform 1 from public.vault_item_instances where id=r.instance_id for update;
 else perform 1 from public.vendor_store_custom_products where id=r.product_id for update;end if;
 select * into strict r from public.vendor_stock_reservations where id=p_id for update;
 if r.state='payment_pending' then return r;end if; -- Recovery only; callers must recheck readiness before provider access.
 if r.state<>'held' or r.expires_at<=clock_timestamp() then raise exception 'stock_reservation_expired' using errcode='P0001';end if;
 if not exists(select 1 from public.vendor_stock_rollout where reservations_enabled)
   or not s.web_published or a.state<>'bound' or a.closeout_id is not null
   or not exists(select 1 from public.vendor_store_rollout where app_enabled and web_enabled)
   or not coalesce((public.vendor_store_capabilities_v1(s.owner_id)->>'store_web')::boolean,false)
   or not exists(select 1 from public.public_profiles where user_id=s.owner_id and public_profile_enabled and vault_sharing_enabled
    and nullif(slug,'') is not null and nullif(display_name,'') is not null) then
  raise exception 'stock_store_unavailable' using errcode='42501';end if;
 if r.instance_id is not null then
  if public.vendor_store_copy_reason_v1(s.owner_id,r.instance_id) is not null or
   not exists(select 1 from public.vendor_store_items where store_id=s.id and instance_id=r.instance_id) then
   raise exception 'stock_item_unavailable' using errcode='P0001';end if;
 elsif public.vendor_store_custom_reason_v1(r.product_id) is not null or
   not exists(select 1 from public.vendor_store_custom_products where id=r.product_id and store_id=s.id and published) or
   not exists(select 1 from public.vendor_store_rollout where custom_enabled) then
  raise exception 'stock_item_unavailable' using errcode='P0001';
 end if;
 update public.vendor_stock_reservations set state='payment_pending',payment_started_at=clock_timestamp() where id=p_id returning * into r;
 return r;
end; $$;

revoke all on function public.vendor_stock_require_isolation_v1(),public.vendor_stock_live_quantity_v1(uuid,uuid),
 public.vendor_stock_copy_guard_v1(),public.vendor_stock_product_guard_v1(),public.vendor_stock_store_guard_v1(),
 public.vendor_stock_immutable_v1(),public.vendor_stock_reserve_v1(uuid,uuid,uuid,uuid,uuid,integer),
 public.vendor_stock_release_v1(uuid,uuid),public.vendor_stock_start_payment_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.vendor_stock_reserve_v1(uuid,uuid,uuid,uuid,uuid,integer),
 public.vendor_stock_release_v1(uuid,uuid),public.vendor_stock_start_payment_v1(uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
