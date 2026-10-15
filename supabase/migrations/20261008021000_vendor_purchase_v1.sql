-- Buy-only external payouts, existing owner receipt authority, no canonical writes.
-- Baseline: product_buy_20261007/baseline-1791425138053 (live429/source431).
begin;

create table if not exists public.vendor_purchase_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_purchase_control(singleton) values(true) on conflict do nothing;
alter table public.vendor_purchase_control enable row level security;
revoke all on public.vendor_purchase_control from public,anon,authenticated;

create or replace function public.vendor_sales_purchase_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select public.vendor_sales_cart_available_v1()
    and coalesce((select enabled from public.vendor_purchase_control where singleton),false)
$$;
revoke all on function public.vendor_sales_purchase_available_v1() from public,anon;
grant execute on function public.vendor_sales_purchase_available_v1() to authenticated;

create or replace function public.vendor_purchase_text_valid_v1(value jsonb,max_length integer)
returns boolean language sql immutable set search_path='' as $$
  select public.vendor_receipt_text_valid_v1(value,max_length)
    and coalesce((value #>> '{}') !~ '[\x7F]',false)
    and coalesce(length(value #>> '{}')+regexp_count(value #>> '{}',U&'[\+010000-\+10FFFF]')<=max_length,false)
$$;
revoke all on function public.vendor_purchase_text_valid_v1(jsonb,integer) from public,anon,authenticated;

-- Shared request/receipt arithmetic; never trusts client totals or printing IDs.
create or replace function public.vendor_purchase_items_validate_v1(lines jsonb,recorded boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare item jsonb; field text; qty bigint; price bigint; total bigint:=0;
  fields text[]:=array['description','quantity','unitMinor','referenceMinor','rateBps','cardId','printingId','condition','addToVault'];
  seen uuid[]:='{}'; seen_gvvi text[]:='{}'; instance uuid;
begin
  if recorded is null or jsonb_typeof(lines) is distinct from 'array' then raise exception 'Invalid purchase items' using errcode='22023'; end if;
  if jsonb_array_length(lines) not between 1 and 50 then raise exception 'Use 1 to 50 purchase lines' using errcode='22023'; end if;
  if recorded then fields:=fields||array['lineMinor','printingGvId','instanceId','gvviId']; end if;
  for item in select value from jsonb_array_elements(lines) loop
    if jsonb_typeof(item) is distinct from 'object' or not item ?& fields or item-fields<>'{}'
      or not public.vendor_purchase_text_valid_v1(item->'description',200) or length(btrim(item->>'description'))=0
      or jsonb_typeof(item->'addToVault') is distinct from 'boolean' then raise exception 'Invalid purchase line' using errcode='22023'; end if;
    foreach field in array array['quantity','unitMinor'] loop
      if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid purchase money' using errcode='22023'; end if;
    end loop;
    qty:=(item->>'quantity')::bigint;price:=(item->>'unitMinor')::bigint;
    if qty not between 1 and 999 or price not between 0 and 100000000 or qty*price>100000000 then raise exception 'Invalid purchase amount or quantity' using errcode='22023'; end if;
    total:=total+qty*price;
    if total>100000000 then raise exception 'Purchase total outside supported range' using errcode='22023'; end if;
    if (item->'referenceMinor'='null'::jsonb) is distinct from (item->'rateBps'='null'::jsonb) then raise exception 'Reference value and percentage must be paired' using errcode='22023'; end if;
    if item->'referenceMinor'<>'null'::jsonb then
      foreach field in array array['referenceMinor','rateBps'] loop
        if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid purchase reference' using errcode='22023'; end if;
      end loop;
      if (item->>'referenceMinor')::bigint not between 1 and 100000000 or (item->>'rateBps')::bigint not between 1 and 10000 then raise exception 'Invalid purchase reference' using errcode='22023'; end if;
    end if;
    if item->'cardId'='null'::jsonb then
      if item->'printingId'<>'null'::jsonb or item->'condition'<>'null'::jsonb or item->'addToVault'<>'false'::jsonb then raise exception 'Quick purchases cannot create inventory' using errcode='22023'; end if;
      if recorded and item->'printingGvId'<>'null'::jsonb then raise exception 'Unexpected quick purchase identity' using errcode='22023'; end if;
    else
      foreach field in array array['cardId','printingId'] loop
        if jsonb_typeof(item->field) is distinct from 'string' or coalesce(item->>field,'') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid purchase identity' using errcode='22023'; end if;
      end loop;
      if qty<>1 or coalesce(item->>'condition','') not in ('NM','LP','MP','HP','DMG') then raise exception 'Choose one exact printing and condition per copy' using errcode='22023'; end if;
      if recorded and (not public.vendor_purchase_text_valid_v1(item->'printingGvId',100) or length(btrim(item->>'printingGvId'))=0) then raise exception 'Missing purchase printing evidence' using errcode='22023'; end if;
    end if;
    if recorded then
      if item->'lineMinor' is distinct from to_jsonb(qty*price) then raise exception 'Purchase line does not reconcile' using errcode='22023'; end if;
      if item->'addToVault'='true'::jsonb then
        if jsonb_typeof(item->'instanceId') is distinct from 'string' or coalesce(item->>'instanceId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not public.vendor_purchase_text_valid_v1(item->'gvviId',200) or coalesce(item->>'gvviId','') !~ '^GVVI-[A-Z0-9-]+$' then raise exception 'Missing purchase copy evidence' using errcode='22023'; end if;
        instance:=(item->>'instanceId')::uuid;
        if instance=any(seen) or (item->>'gvviId')=any(seen_gvvi) then raise exception 'Repeated purchase copy evidence' using errcode='22023'; end if;
        seen:=array_append(seen,instance);seen_gvvi:=array_append(seen_gvvi,item->>'gvviId');
      elsif item->'instanceId'<>'null'::jsonb or item->'gvviId'<>'null'::jsonb then raise exception 'Unexpected purchase copy evidence' using errcode='22023'; end if;
    end if;
  end loop;
  if total<1 then raise exception 'A purchase requires a positive payout' using errcode='22023'; end if;
  return total;
end $$;
revoke all on function public.vendor_purchase_items_validate_v1(jsonb,boolean) from public,anon,authenticated;

create or replace function public.vendor_purchase_receipt_validate_v1(r jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare total bigint; fields text[]:=array['version','kind','id','number','createdAt','storeName','customerName','currency','items','purchaseMinor','method','payments','note'];
begin
  if jsonb_typeof(r) is distinct from 'object' or not r ?& fields or r-fields<>'{}'
    or r->'version' is distinct from '2'::jsonb or r->'kind' is distinct from '"purchase"'::jsonb or r->'currency' is distinct from '"USD"'::jsonb
    or jsonb_typeof(r->'id') is distinct from 'string' or coalesce(r->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not public.vendor_purchase_text_valid_v1(r->'storeName',120) or length(btrim(r->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(r->'customerName',120) or not public.vendor_purchase_text_valid_v1(r->'note',500)
    or not public.vendor_purchase_text_valid_v1(r->'createdAt',24)
    or coalesce(r->>'createdAt','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or r->>'number' is distinct from ('GVB-'||replace(left(r->>'createdAt',10),'-','')||'-'||upper(left(r->>'id',8))) then raise exception 'Invalid purchase receipt' using errcode='22023'; end if;
  if to_char((r->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>r->>'createdAt' then raise exception 'Invalid purchase timestamp' using errcode='22023'; end if;
  total:=public.vendor_purchase_items_validate_v1(r->'items',true);
  if r->'purchaseMinor' is distinct from to_jsonb(total)
    or r->'payments' is distinct from public.vendor_sales_payment_snapshot_v1(r->'payments'->'entries',-total)
    or r->>'method' is distinct from public.vendor_sales_payment_method_v1(r->'payments'->'entries') then raise exception 'Purchase amounts do not reconcile' using errcode='22023'; end if;
end $$;
revoke all on function public.vendor_purchase_receipt_validate_v1(jsonb) from public,anon,authenticated;

-- Compatible book validator and sale-cost trigger are included below unchanged
-- except for explicit purchase dispatch. Historical migrations remain untouched.

create or replace function public.vendor_sales_cart_complete_v4(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.vendor_sales_cart_receipts%rowtype;
  book_row public.vendor_receipt_books%rowtype;book jsonb;receipt jsonb;
  item jsonb;items jsonb:='[]';total bigint;payments jsonb;stamp text;
  customer jsonb;customer_id uuid;customer_name text;parent uuid;printing uuid;
  option record;incoming jsonb;incoming_id uuid;incoming_gvvi text;description text;printing_gv text;
  fields text[]:=array['version','kind','storeName','items','payments','note','customerId','customer'];
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object' or octet_length(p_cart::text)>100000 then raise exception 'Invalid purchase' using errcode='22023'; end if;
  -- Same lock order and journal as sale/trade. Recovery precedes every switch.
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  select * into book_row from public.vendor_receipt_books where owner_id=actor for update;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if found then
    if prior.request is distinct from p_cart then raise exception 'Purchase request changed' using errcode='22023'; end if;
    return prior.receipt;
  end if;
  if not public.vendor_sales_purchase_available_v1() then raise exception 'Purchases unavailable' using errcode='42501'; end if;
  if not p_cart ?& fields or p_cart-fields<>'{}' or p_cart->'version' is distinct from '4'::jsonb or p_cart->'kind' is distinct from '"purchase"'::jsonb
    or not public.vendor_purchase_text_valid_v1(p_cart->'storeName',120) or length(btrim(p_cart->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(p_cart->'note',500)
    or jsonb_typeof(p_cart->'customer') is distinct from 'object' then raise exception 'Invalid purchase' using errcode='22023'; end if;
  total:=public.vendor_purchase_items_validate_v1(p_cart->'items',false);
  payments:=public.vendor_sales_payment_snapshot_v1(p_cart->'payments',-total);
  customer:=p_cart->'customer';
  if not customer ?& array['name','email','phone','wants','notes'] or customer-array['name','email','phone','wants','notes']<>'{}'
    or not public.vendor_purchase_text_valid_v1(customer->'name',120) or (customer->>'name') ~ E'[\r\n]'
    or not public.vendor_purchase_text_valid_v1(customer->'email',254)
    or (length(btrim(customer->>'email'))>0 and btrim(customer->>'email') !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')
    or not public.vendor_purchase_text_valid_v1(customer->'phone',40)
    or (length(btrim(customer->>'phone'))>0 and btrim(customer->>'phone') !~ '^\+?[0-9 ()-]{7,40}$')
    or not public.vendor_purchase_text_valid_v1(customer->'wants',1000) or not public.vendor_purchase_text_valid_v1(customer->'notes',2000) then raise exception 'Invalid seller details' using errcode='22023'; end if;
  stamp:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  book:=book_row.book;customer_name:=btrim(customer->>'name');
  if p_cart->'customerId'<>'null'::jsonb then
    if jsonb_typeof(p_cart->'customerId') is distinct from 'string' or coalesce(p_cart->>'customerId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid seller identity' using errcode='22023'; end if;
    customer_id:=(p_cart->>'customerId')::uuid;
    select c into customer from jsonb_array_elements(book->'customers') c where c->>'id'=customer_id::text;
    if not found then raise exception 'Seller unavailable' using errcode='22023'; end if;
    customer_name:=customer->>'name';
  elsif exists(select 1 from jsonb_each_text(customer) e where length(btrim(e.value))>0) then
    customer_id:=gen_random_uuid();
    customer:=customer||jsonb_build_object('id',customer_id,'updatedAt',stamp);
    book:=jsonb_set(book,'{customers}',(book->'customers')||jsonb_build_array(customer));
  end if;
  for item in select value from jsonb_array_elements(p_cart->'items') loop
    parent:=null;printing:=null;incoming_id:=null;incoming_gvvi:=null;printing_gv:=null;description:=btrim(item->>'description');
    if item->'cardId'<>'null'::jsonb then
      parent:=(item->>'cardId')::uuid;printing:=(item->>'printingId')::uuid;
      select p.* into option from public.get_public_card_printing_options_v1(array[parent],1000,0) p
        where p.id=printing and p.card_print_id=parent and nullif(p.printing_gv_id,'') is not null;
      if not found or not public.catalog_card_print_visible_to_request_v1(parent) then raise exception 'Purchase card or printing is unavailable' using errcode='22023'; end if;
      printing_gv:=option.printing_gv_id;
      select left(c.name||' · '||printing_gv||' · '||(item->>'condition'),200) into description from public.card_prints c where c.id=parent;
      if item->'addToVault'='true'::jsonb then
        incoming:=public.vault_add_card_instance_v1(p_card_print_id=>parent,p_quantity=>1,p_condition_label=>item->>'condition',p_card_printing_id=>printing);
        incoming_gvvi:=incoming->>'gv_vi_id';
        select id into strict incoming_id from public.vault_item_instances where user_id=actor and gv_vi_id=incoming_gvvi
          and card_print_id=parent and card_printing_id=printing and archived_at is null;
        -- Acquisition is transaction evidence, independent of the later edit switch.
        update public.vault_item_instances set acquisition_cost=(item->>'unitMinor')::numeric/100,acquisition_currency='USD'
          where id=incoming_id and user_id=actor;
      end if;
    end if;
    items:=items||jsonb_build_array(item||jsonb_build_object('description',description,'lineMinor',(item->>'quantity')::bigint*(item->>'unitMinor')::bigint,
      'printingGvId',printing_gv,'instanceId',incoming_id,'gvviId',incoming_gvvi));
  end loop;
  receipt:=jsonb_build_object('version',2,'kind','purchase','id',p_request_id,
    'number','GVB-'||replace(left(stamp,10),'-','')||'-'||upper(left(p_request_id::text,8)),
    'createdAt',stamp,'storeName',btrim(p_cart->>'storeName'),'customerName',customer_name,'currency','USD',
    'items',items,'purchaseMinor',total,'method',public.vendor_sales_payment_method_v1(payments->'entries'),'payments',payments,'note',p_cart->>'note');
  perform public.vendor_purchase_receipt_validate_v1(receipt);
  if exists(select 1 from jsonb_array_elements(book->'receipts') r where lower(r->'receipt'->>'id')=p_request_id::text) then raise exception 'Receipt identifier already used' using errcode='22023'; end if;
  book:=jsonb_set(jsonb_set(book,'{storeName}',receipt->'storeName'),'{receipts}',(book->'receipts')||jsonb_build_array(jsonb_build_object('receipt',receipt,'customerId',customer_id)));
  perform public.vendor_receipt_book_save_v1(book_row.revision,p_request_id,book);
  insert into public.vendor_sales_cart_receipts(owner_id,request_id,request,receipt,dispositions) values(actor,p_request_id,p_cart,receipt,'[]');
  return receipt;
end $$;
revoke all on function public.vendor_sales_cart_complete_v4(uuid,jsonb) from public,anon;
grant execute on function public.vendor_sales_cart_complete_v4(uuid,jsonb) to authenticated;

create or replace function public.vendor_receipt_book_validate_v1(payload jsonb, actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; r jsonb; c jsonb; item jsonb; total bigint; subtotal bigint;
  discount bigint; tax bigint; qty bigint; price bigint; field text;
  customer_ids jsonb; old_receipts jsonb;
begin
  if actor is null or jsonb_typeof(payload) is distinct from 'object' or payload->'version' is distinct from '1'::jsonb
    or not public.vendor_receipt_text_valid_v1(payload->'storeName',120)
    or jsonb_typeof(payload->'receipts') is distinct from 'array'
    or jsonb_typeof(payload->'customers') is distinct from 'array'
    or octet_length(payload::text) > 10000000
    or payload - array['version','storeName','receipts','customers'] <> '{}'::jsonb then
    raise exception 'Invalid receipt book' using errcode='22023';
  end if;
  if jsonb_array_length(payload->'receipts') > 10000 or jsonb_array_length(payload->'customers') > 10000 then
    raise exception 'Receipt book limit reached' using errcode='22023';
  end if;
  for c in select value from jsonb_array_elements(payload->'customers') loop
    if jsonb_typeof(c) <> 'object' or (c->>'id') is null
      or (c->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.vendor_receipt_text_valid_v1(c->'name',120)
      or not public.vendor_receipt_text_valid_v1(c->'email',254)
      or not public.vendor_receipt_text_valid_v1(c->'phone',40)
      or not public.vendor_receipt_text_valid_v1(c->'wants',1000)
      or not public.vendor_receipt_text_valid_v1(c->'notes',2000)
      or not public.vendor_receipt_text_valid_v1(c->'updatedAt',40)
      or c - array['id','name','email','phone','wants','notes','updatedAt'] <> '{}'::jsonb then
      raise exception 'Invalid customer' using errcode='22023';
    end if;
  end loop;
  if (select count(*) <> count(distinct value->>'id') from jsonb_array_elements(payload->'customers')) then
    raise exception 'Duplicate customer' using errcode='22023';
  end if;
  select coalesce(jsonb_object_agg(value->>'id',true),'{}'::jsonb) into customer_ids
    from jsonb_array_elements(payload->'customers');
  select coalesce(jsonb_object_agg(old->'receipt'->>'id',old),'{}'::jsonb) into old_receipts
    from public.vendor_receipt_books b cross join lateral jsonb_array_elements(b.book->'receipts') old
    where b.owner_id=actor;
  for row_data in select value from jsonb_array_elements(payload->'receipts') loop
    r := row_data->'receipt';
    if r->'version'='2'::jsonb and r->>'kind'='purchase' then
      if jsonb_typeof(row_data) is distinct from 'object' or row_data-array['receipt','customerId']<>'{}'
        or not row_data ? 'customerId' or (row_data->'customerId'<>'null'::jsonb and
          (jsonb_typeof(row_data->'customerId') is distinct from 'string' or not customer_ids ? (row_data->>'customerId'))) then
        raise exception 'Invalid purchase receipt association' using errcode='22023';
      end if;
      perform public.vendor_purchase_receipt_validate_v1(r);
      continue;
    end if;
    if jsonb_typeof(row_data) is distinct from 'object' or jsonb_typeof(r) is distinct from 'object'
      or row_data - array['receipt','customerId'] <> '{}'::jsonb
      or not (row_data ? 'customerId')
      or (row_data->'customerId' <> 'null'::jsonb and
        (jsonb_typeof(row_data->'customerId') <> 'string' or not customer_ids ? (row_data->>'customerId')))
      or r->'version' is distinct from '1'::jsonb or (r->>'id') is null
      or (r->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.vendor_receipt_text_valid_v1(r->'storeName',120) or length(r->>'storeName')=0
      or not public.vendor_receipt_text_valid_v1(r->'customerName',120)
      or not public.vendor_receipt_text_valid_v1(r->'note',500)
      or not public.vendor_receipt_text_valid_v1(r->'createdAt',40)
      or (r->>'createdAt') !~ '^\d{4}-\d{2}-\d{2}T'
      or (r->>'number') is distinct from ('GV-' || replace(left(r->>'createdAt',10),'-','') || '-' || upper(left(r->>'id',8)))
      or coalesce(r->>'method','') not in ('Cash','Card (external terminal)','Bank / payment app','Other','Split payment')
      or jsonb_typeof(r->'items') is distinct from 'array'
      or not (r ? 'sourceDispositionId')
      or r - array['version','id','number','createdAt','storeName','customerName','method','items','subtotalMinor','discountMinor','taxMinor','totalMinor','note','sourceDispositionId','tradeIn','payments'] <> '{}'::jsonb then
      raise exception 'Invalid receipt' using errcode='22023';
    end if;
    perform (r->>'createdAt')::timestamptz;
    if jsonb_array_length(r->'items') not between 1 and 50 then raise exception 'Invalid items' using errcode='22023'; end if;
    subtotal := 0;
    for item in select value from jsonb_array_elements(r->'items') loop
      if not public.vendor_receipt_text_valid_v1(item->'description',200) or length(item->>'description')=0
        or jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^\d{1,3}$'
        or jsonb_typeof(item->'unitMinor') is distinct from 'number' or coalesce(item->>'unitMinor','') !~ '^\d{1,9}$'
        or item - array['description','quantity','unitMinor','lineMinor'] <> '{}'::jsonb then
        raise exception 'Invalid item' using errcode='22023';
      end if;
      qty := (item->>'quantity')::bigint; price := (item->>'unitMinor')::bigint;
      if qty not between 1 and 999 or price not between 0 and 100000000
        or item->'lineMinor' is distinct from to_jsonb(qty*price) then raise exception 'Invalid item total' using errcode='22023'; end if;
      subtotal := subtotal+qty*price;
    end loop;
    foreach field in array array['subtotalMinor','discountMinor','taxMinor','totalMinor'] loop
      if jsonb_typeof(r->field) is distinct from 'number' or coalesce(r->>field,'') !~ '^\d{1,13}$' then
        raise exception 'Invalid money' using errcode='22023';
      end if;
    end loop;
    discount := (r->>'discountMinor')::bigint; tax := (r->>'taxMinor')::bigint; total := subtotal-discount+tax;
    if discount > subtotal or discount > 999999999 or tax > 999999999 or total not between 1 and 100000000
      or subtotal <> (r->>'subtotalMinor')::bigint or total <> (r->>'totalMinor')::bigint then
      raise exception 'Receipt totals do not match' using errcode='22023';
    end if;
    if r ? 'tradeIn' then
      perform public.vendor_sales_trade_snapshot_validate_v1(r->'tradeIn',total);
    end if;
    if r ? 'payments' then
      if r->'payments' is distinct from public.vendor_sales_payment_snapshot_v1(r->'payments'->'entries',coalesce((r->'tradeIn'->>'balanceMinor')::bigint,total)) or
       r->>'method' is distinct from public.vendor_sales_payment_method_v1(r->'payments'->'entries') then raise exception 'Invalid payment snapshot' using errcode='22023'; end if;
    elsif r->>'method'='Split payment' then raise exception 'Missing split payments' using errcode='22023'; end if;
    -- Existing immutable receipts retain their context if the source is later removed.
    if r->'sourceDispositionId' <> 'null'::jsonb and
      (old_receipts->(r->>'id')) is distinct from row_data then
      if not exists (select 1 from public.vault_item_instance_dispositions d
        where d.id::text=r->>'sourceDispositionId' and d.user_id=actor and d.disposition_type='sale' and d.sale_price_currency='USD') then
        raise exception 'Recorded sale unavailable' using errcode='22023';
      end if;
    end if;
  end loop;
  if (select count(*) <> count(distinct value->'receipt'->>'id') from jsonb_array_elements(payload->'receipts'))
    or (select count(value->'receipt'->>'sourceDispositionId') <> count(distinct value->'receipt'->>'sourceDispositionId') from jsonb_array_elements(payload->'receipts')) then
    raise exception 'Duplicate receipt or source sale' using errcode='22023';
  end if;
end
$$;

create or replace function public.vendor_sale_cost_capture_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  entry record; instance uuid; item public.vault_item_instances%rowtype;
  cost jsonb; lines jsonb:='[]'; status text;
begin
  if new.request->'version'='4'::jsonb and new.request->>'kind'='purchase' then return new; end if;
  if not coalesce((select capture_enabled from public.vendor_cost_evidence_control where singleton),false) then return new; end if;
  for entry in select value,ordinality from jsonb_array_elements(new.request->'items') with ordinality loop
    instance:=(entry.value->>'instanceId')::uuid;
    if instance is null then
      cost:=public.vendor_cost_classify_v1(null,null);status:='unlinked';
    else
      select * into item from public.vault_item_instances where id=instance and user_id=new.owner_id;
      if not found then raise exception 'Sale cost copy unavailable' using errcode='23514'; end if;
      cost:=public.vendor_cost_classify_v1(item.acquisition_cost,item.acquisition_currency);
      -- Legacy numeric/text fields were not bounded. Retain their fingerprint
      -- as unknown evidence instead of letting a 50-line sale exceed the journal
      -- size limit. The original private copy fields remain untouched.
      if octet_length(cost::text)>1500 then
        cost:=jsonb_build_object('amount',null,'currency',case when octet_length(item.acquisition_currency)<=32 then item.acquisition_currency else null end,
          'status','oversized_legacy_value','minor',null,
          'evidenceSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(cost::text,'UTF8')),'hex'));
      end if;
      status:=cost->>'status';
      if status='known' and cost->>'currency'<>'USD' then status:='foreign_currency'; end if;
    end if;
    lines:=lines||jsonb_build_array(jsonb_build_object('index',entry.ordinality-1,'instanceId',instance,
      'quantity',entry.value->'quantity','salesMinor',((entry.value->>'quantity')::bigint*(entry.value->>'unitMinor')::bigint)::text,
      'status',status,'cost',cost));
  end loop;
  insert into public.vendor_sale_cost_snapshots(owner_id,request_id,snapshot)
    values(new.owner_id,new.request_id,jsonb_build_object('version',1,'receiptId',new.request_id,
      'soldAt',new.receipt->>'createdAt','salesCurrency','USD','lines',lines));
  return new;
end $$;
commit;
