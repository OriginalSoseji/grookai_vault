-- One physical copy per durable request. Reuses canonical Vault creation.
begin;
create table public.vendor_sales_catalog_adds (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  check(octet_length(request::text)<=2000)
);
alter table public.vendor_sales_catalog_adds enable row level security;
revoke all on public.vendor_sales_catalog_adds from public,anon,authenticated;

create function public.vendor_sales_catalog_add_read_v1(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select a.result into result from public.vendor_sales_catalog_adds a
    where a.owner_id=auth.uid() and a.request_id=p_request_id;
  return result;
end $$;

create function public.vendor_sales_catalog_add_v1(p_request_id uuid,p_card jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); prior public.vendor_sales_catalog_adds%rowtype;
  parent uuid; printing uuid; price bigint; added jsonb; result jsonb;
  copy public.vault_item_instances%rowtype; option record;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_card) is distinct from 'object'
    or octet_length(p_card::text)>2000 then raise exception 'Invalid card request' using errcode='22023'; end if;
  -- Serializes duplicate requests without adding dependencies to inventory or catalog tables.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sales-catalog-add:'||actor::text,0));
  select * into prior from public.vendor_sales_catalog_adds where owner_id=actor and request_id=p_request_id;
  if found then
    if prior.request<>p_card then raise exception 'Request already used with different details' using errcode='22023'; end if;
    return prior.result;
  end if;
  if not public.vendor_sales_cart_available_v1() then raise exception 'Sales desk unavailable' using errcode='42501'; end if;
  if (select count(*) from jsonb_object_keys(p_card))<>5
    or not p_card ?& array['cardId','printingId','condition','intent','priceMinor']
    or jsonb_typeof(p_card->'cardId') is distinct from 'string'
    or jsonb_typeof(p_card->'printingId') is distinct from 'string'
    or coalesce(p_card->>'condition','') not in ('NM','LP','MP','HP','DMG')
    or coalesce(p_card->>'intent','') not in ('hold','sell')
    or (p_card->'priceMinor'<>'null'::jsonb and (jsonb_typeof(p_card->'priceMinor')<>'number'
      or (p_card->>'priceMinor')!~ '^[0-9]{1,9}$'))
  then raise exception 'Invalid copy details' using errcode='22023'; end if;
  parent:=(p_card->>'cardId')::uuid; printing:=(p_card->>'printingId')::uuid;
  price:=(p_card->>'priceMinor')::bigint;
  if (p_card->>'intent'='sell' and (price is null or price not between 1 and 100000000))
    or (p_card->>'intent'='hold' and price is not null)
  then raise exception 'Invalid asking price' using errcode='22023'; end if;
  select * into option from public.get_public_card_printing_options_v1(array[parent],1000,0) p
    where p.id=printing and p.card_print_id=parent and nullif(p.printing_gv_id,'') is not null;
  if not found or not public.catalog_card_print_visible_to_request_v1(parent)
  then raise exception 'Card or printing is no longer available' using errcode='22023'; end if;
  added:=public.vault_add_card_instance_v1(p_card_print_id=>parent,p_quantity=>1,
    p_condition_label=>p_card->>'condition',p_card_printing_id=>printing);
  select * into strict copy from public.vault_item_instances
    where user_id=actor and gv_vi_id=added->>'gv_vi_id' and archived_at is null;
  if copy.card_print_id<>parent or copy.card_printing_id is distinct from printing then
    raise exception 'Created copy could not be verified';
  end if;
  if p_card->>'intent'='sell' then
    update public.vault_item_instances set intent='sell',pricing_mode='asking',
      asking_price_amount=price::numeric/100,asking_price_currency='USD'
      where id=copy.id and user_id=actor and archived_at is null;
  end if;
  result:=jsonb_build_object('requestId',p_request_id,'instanceId',copy.id,'gvviId',copy.gv_vi_id,
    'cardId',parent,'printingId',printing,'printingGvId',option.printing_gv_id,
    'condition',p_card->>'condition','intent',p_card->>'intent');
  insert into public.vendor_sales_catalog_adds(owner_id,request_id,request,result)
    values(actor,p_request_id,p_card,result);
  return result;
end $$;

revoke all on function public.vendor_sales_catalog_add_v1(uuid,jsonb),
  public.vendor_sales_catalog_add_read_v1(uuid) from public,anon;
grant execute on function public.vendor_sales_catalog_add_v1(uuid,jsonb),
  public.vendor_sales_catalog_add_read_v1(uuid) to authenticated;
commit;
