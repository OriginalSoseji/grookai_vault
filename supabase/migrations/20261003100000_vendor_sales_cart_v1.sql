-- Owner-asserted in-person sales. Never charges a buyer or creates inventory.
begin;
create table public.vendor_sales_cart_control (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.vendor_sales_cart_control(singleton) values(true);
alter table public.vendor_sales_cart_control enable row level security;
revoke all on public.vendor_sales_cart_control from public,anon,authenticated;

create table public.vendor_sales_cart_receipts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request jsonb not null,
  receipt jsonb not null,
  dispositions jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  check(octet_length(request::text)<=100000)
);
alter table public.vendor_sales_cart_receipts enable row level security;
revoke all on public.vendor_sales_cart_receipts from public,anon,authenticated;

create function public.vendor_sales_cart_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and coalesce((select enabled from public.vendor_sales_cart_control where singleton),false)
    and coalesce((select enabled from public.vendor_receipt_cloud_control where singleton),false)
$$;

-- Durable recovery remains readable even after new sales are switched off.
create function public.vendor_sales_cart_read_v1(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select receipt into result from public.vendor_sales_cart_receipts
    where owner_id=auth.uid() and request_id=p_request_id;
  return result;
end $$;

create function public.vendor_sales_cart_complete_v1(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); prior public.vendor_sales_cart_receipts%rowtype;
  book_row public.vendor_receipt_books%rowtype; book jsonb; receipt jsonb;
  item jsonb; items jsonb:='[]'; links jsonb:='[]'; sale jsonb;
  customer jsonb; customer_id uuid; item_id uuid; seen uuid[]:='{}';
  quantity bigint; price bigint; subtotal bigint:=0; tax bigint; stamp text;
  description text; gvvi text; customer_name text; source_id text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object'
    or octet_length(p_cart::text)>100000 then raise exception 'Invalid sale' using errcode='22023'; end if;
  -- All callers acquire the book lock before stock. Existing disposition writers
  -- take stock only; receipt writers take the book only. Never loop RPCs in a client.
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  select * into book_row from public.vendor_receipt_books where owner_id=actor for update;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if found then
    if prior.request is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
    return prior.receipt;
  end if;
  if not public.vendor_sales_cart_available_v1() then raise exception 'Sales desk unavailable' using errcode='42501'; end if;
  if p_cart - array['version','storeName','method','items','taxMinor','note','customer','customerId'] <> '{}'
    or p_cart->'version' is distinct from '1'::jsonb
    or not public.vendor_receipt_text_valid_v1(p_cart->'storeName',120) or length(btrim(p_cart->>'storeName'))=0
    or not public.vendor_receipt_text_valid_v1(p_cart->'note',500)
    or coalesce(p_cart->>'method','') not in ('Cash','Card (external terminal)','Bank / payment app','Other')
    or jsonb_typeof(p_cart->'items') is distinct from 'array'
    or jsonb_typeof(p_cart->'taxMinor') is distinct from 'number'
    or coalesce(p_cart->>'taxMinor','') !~ '^\d{1,9}$'
    or jsonb_typeof(p_cart->'customer') is distinct from 'object'
    or not (p_cart ? 'customerId') then raise exception 'Invalid sale' using errcode='22023'; end if;
  if jsonb_array_length(p_cart->'items') not between 1 and 50 then raise exception 'Use 1 to 50 sale lines' using errcode='22023'; end if;
  customer:=p_cart->'customer';
  if customer - array['name','email','phone','wants','notes'] <> '{}'
    or not public.vendor_receipt_text_valid_v1(customer->'name',120)
    or not public.vendor_receipt_text_valid_v1(customer->'email',254)
    or not public.vendor_receipt_text_valid_v1(customer->'phone',40)
    or not public.vendor_receipt_text_valid_v1(customer->'wants',1000)
    or not public.vendor_receipt_text_valid_v1(customer->'notes',2000) then raise exception 'Invalid customer' using errcode='22023'; end if;
  customer_name:=customer->>'name';
  stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  book:=book_row.book;
  if p_cart->'customerId' <> 'null'::jsonb then
    customer_id:=(p_cart->>'customerId')::uuid;
    if not exists(select 1 from jsonb_array_elements(book->'customers') c where c->>'id'=customer_id::text) then
      raise exception 'Customer unavailable' using errcode='22023';
    end if;
    -- Do not overwrite contact changes made on another device. Selecting an
    -- existing customer captures their current saved record; editing uses CRM.
    select c into customer from jsonb_array_elements(book->'customers') c where c->>'id'=customer_id::text;
    customer_name:=customer->>'name';
  elsif exists(select 1 from jsonb_each_text(customer) e where length(btrim(e.value))>0) then
    customer_id:=gen_random_uuid();
    customer:=customer||jsonb_build_object('id',customer_id,'updatedAt',stamp);
    book:=jsonb_set(book,'{customers}',(book->'customers')||jsonb_build_array(customer));
  end if;
  -- Validate the entire cart before any disposition; reject repeated exact copies.
  for item in select value from jsonb_array_elements(p_cart->'items') loop
    if jsonb_typeof(item) is distinct from 'object'
      or item - array['instanceId','description','quantity','unitMinor'] <> '{}'
      or not (item ? 'instanceId')
      or not public.vendor_receipt_text_valid_v1(item->'description',200) or length(btrim(item->>'description'))=0
      or jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^\d{1,3}$'
      or jsonb_typeof(item->'unitMinor') is distinct from 'number' or coalesce(item->>'unitMinor','') !~ '^\d{1,9}$' then
      raise exception 'Invalid sale line' using errcode='22023'; end if;
    quantity:=(item->>'quantity')::bigint; price:=(item->>'unitMinor')::bigint;
    if quantity not between 1 and 999 or price not between 1 and 100000000 then raise exception 'Invalid price or quantity' using errcode='22023'; end if;
    if item->'instanceId' <> 'null'::jsonb then
      item_id:=(item->>'instanceId')::uuid;
      if quantity<>1 or item_id=any(seen) then raise exception 'An exact copy can appear only once' using errcode='22023'; end if;
      seen:=array_append(seen,item_id);
    end if;
    subtotal:=subtotal+quantity*price;
  end loop;
  tax:=(p_cart->>'taxMinor')::bigint;
  if subtotal+tax not between 1 and 100000000 then raise exception 'Sale total outside supported range' using errcode='22023'; end if;
  -- Stable stock order prevents two overlapping carts from deadlocking. Recheck
  -- active ownership under lock. Existing stock triggers continue to arbitrate.
  for item_id in select unnest(seen) order by 1 loop
    perform 1 from public.vault_item_instances where id=item_id and user_id=actor and archived_at is null for update;
    if not found then raise exception 'A card is no longer available; review the cart' using errcode='PT409'; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_cart->'items') loop
    quantity:=(item->>'quantity')::bigint; price:=(item->>'unitMinor')::bigint;
    description:=btrim(item->>'description');
    if item->'instanceId' <> 'null'::jsonb then
      item_id:=(item->>'instanceId')::uuid;
      select gv_vi_id into gvvi from public.vault_item_instances where id=item_id and user_id=actor;
      sale:=public.vault_record_exact_instance_disposition_v2(item_id,'sale',price::numeric/100,'USD',nullif(customer_name,''));
      links:=links||jsonb_build_array(jsonb_build_object('instanceId',item_id,'dispositionId',sale->>'disposition_id'));
      source_id:=coalesce(source_id,sale->>'disposition_id');
      description:=left(description,155)||' · '||gvvi;
    end if;
    items:=items||jsonb_build_array(jsonb_build_object('description',description,'quantity',quantity,'unitMinor',price,'lineMinor',quantity*price));
  end loop;
  receipt:=jsonb_build_object('version',1,'id',p_request_id,'number','GV-'||replace(left(stamp,10),'-','')||'-'||upper(left(p_request_id::text,8)),
    'createdAt',stamp,'storeName',btrim(p_cart->>'storeName'),'customerName',customer_name,'method',p_cart->>'method',
    'items',items,'subtotalMinor',subtotal,'discountMinor',0,'taxMinor',tax,'totalMinor',subtotal+tax,'note',p_cart->>'note','sourceDispositionId',source_id);
  if exists(select 1 from jsonb_array_elements(book->'receipts') r where r->'receipt'->>'id'=p_request_id::text) then
    raise exception 'Receipt identifier already used' using errcode='22023'; end if;
  book:=jsonb_set(jsonb_set(book,'{storeName}',receipt->'storeName'),'{receipts}',(book->'receipts')||jsonb_build_array(jsonb_build_object('receipt',receipt,'customerId',customer_id)));
  -- Reuse existing bounds, immutable history, customer and money validation.
  perform public.vendor_receipt_book_save_v1(book_row.revision,p_request_id,book);
  insert into public.vendor_sales_cart_receipts(owner_id,request_id,request,receipt,dispositions)
    values(actor,p_request_id,p_cart,receipt,links);
  return receipt;
end $$;

-- Each disposition in a multi-copy sale resolves to the SAME receipt source.
create function public.vendor_sales_cart_source_v1(p_disposition_id uuid)
returns uuid language sql stable security definer set search_path='' as $$
  select (s.receipt->>'sourceDispositionId')::uuid from public.vendor_sales_cart_receipts s
    where s.owner_id=auth.uid() and s.dispositions @> jsonb_build_array(jsonb_build_object('dispositionId',p_disposition_id::text)) limit 1
$$;
revoke all on function public.vendor_sales_cart_available_v1() from public,anon;
revoke all on function public.vendor_sales_cart_read_v1(uuid) from public,anon;
revoke all on function public.vendor_sales_cart_complete_v1(uuid,jsonb) from public,anon;
revoke all on function public.vendor_sales_cart_source_v1(uuid) from public,anon;
grant execute on function public.vendor_sales_cart_available_v1(),public.vendor_sales_cart_read_v1(uuid),public.vendor_sales_cart_complete_v1(uuid,jsonb),public.vendor_sales_cart_source_v1(uuid) to authenticated;
commit;
