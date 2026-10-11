-- Explicit agreed whole-line credit. Existing sale, trade and purchase writers stay unchanged.
-- Read-only baseline: product_negotiated_trade_20261007/baseline-1791436404656.
begin;

create table if not exists public.vendor_negotiated_trade_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_negotiated_trade_control(singleton) values(true) on conflict do nothing;
alter table public.vendor_negotiated_trade_control enable row level security;
revoke all on public.vendor_negotiated_trade_control from public,anon,authenticated;

create or replace function public.vendor_sales_negotiated_trade_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select public.vendor_sales_trade_available_v1() and public.vendor_sales_payments_available_v1()
    and coalesce((select enabled from public.vendor_negotiated_trade_control where singleton),false)
$$;
revoke all on function public.vendor_sales_negotiated_trade_available_v1() from public,anon;
grant execute on function public.vendor_sales_negotiated_trade_available_v1() to authenticated;

-- Match client trim semantics without changing the exact persisted request.
create or replace function public.vendor_negotiated_trade_trim_v1(value text)
returns text language sql immutable set search_path='' as $$
  select btrim(value,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;
revoke all on function public.vendor_negotiated_trade_trim_v1(text) from public,anon,authenticated;

create or replace function public.vendor_negotiated_trade_lines_v1(lines jsonb,recorded boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; field text; qty bigint; value_minor bigint; credit bigint;
  credit_total bigint:=0; reference_total bigint:=0; all_known boolean:=true;
  fields text[]:=array['description','valueMinor','rateBps','quantity','cardId','printingId','condition','addToVault','creditMinor'];
  seen uuid[]:='{}'; labels text[]:='{}'; instance uuid;
begin
  if recorded is null or jsonb_typeof(lines) is distinct from 'array' then raise exception 'Invalid negotiated trades' using errcode='22023'; end if;
  if jsonb_array_length(lines) not between 1 and 50 then raise exception 'Use 1 to 50 trade lines' using errcode='22023'; end if;
  if recorded then fields:=fields||array['printingGvId','instanceId','gvviId']; end if;
  for item in select value from jsonb_array_elements(lines) loop
    if jsonb_typeof(item) is distinct from 'object' or not item ?& fields or item-fields<>'{}'
      or not public.vendor_purchase_text_valid_v1(item->'description',200)
      or length(public.vendor_negotiated_trade_trim_v1(item->>'description'))=0
      or (item->>'description') ~ '[\x01-\x1F\x7F]'
      or jsonb_typeof(item->'addToVault') is distinct from 'boolean' then raise exception 'Invalid trade line' using errcode='22023'; end if;
    foreach field in array array['quantity','creditMinor'] loop
      if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid trade quantity or credit' using errcode='22023'; end if;
    end loop;
    qty:=(item->>'quantity')::bigint;credit:=(item->>'creditMinor')::bigint;
    if qty not between 1 and 999 or credit not between 0 and 100000000 then raise exception 'Invalid trade quantity or credit' using errcode='22023'; end if;
    credit_total:=credit_total+credit;
    if (item->'valueMinor'='null'::jsonb) is distinct from (item->'rateBps'='null'::jsonb) then raise exception 'Reference and percentage must be paired' using errcode='22023'; end if;
    if item->'valueMinor'='null'::jsonb then all_known:=false;
    else
      foreach field in array array['valueMinor','rateBps'] loop
        if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid trade reference' using errcode='22023'; end if;
      end loop;
      value_minor:=(item->>'valueMinor')::bigint;
      if value_minor not between 1 and 100000000 or (item->>'rateBps')::bigint not between 1 and 10000 then raise exception 'Invalid trade reference' using errcode='22023'; end if;
      reference_total:=reference_total+value_minor*qty;
    end if;
    if credit_total>100000000 or reference_total>100000000 then raise exception 'Trade totals outside supported range' using errcode='22023'; end if;
    if item->'cardId'='null'::jsonb then
      if item->'printingId'<>'null'::jsonb or item->'condition'<>'null'::jsonb or item->'addToVault'<>'false'::jsonb then raise exception 'Quick trades cannot create inventory' using errcode='22023'; end if;
      if recorded and item->'printingGvId'<>'null'::jsonb then raise exception 'Unexpected quick trade identity' using errcode='22023'; end if;
    else
      foreach field in array array['cardId','printingId'] loop
        if jsonb_typeof(item->field) is distinct from 'string' or coalesce(item->>field,'') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid trade identity' using errcode='22023'; end if;
      end loop;
      if qty<>1 or coalesce(item->>'condition','') not in ('NM','LP','MP','HP','DMG') then raise exception 'Choose one exact printing and condition per copy' using errcode='22023'; end if;
      if recorded and (not public.vendor_purchase_text_valid_v1(item->'printingGvId',100)
        or length(public.vendor_negotiated_trade_trim_v1(item->>'printingGvId'))=0
        or (item->>'printingGvId') ~ '[\x01-\x1F\x7F]') then raise exception 'Missing trade printing evidence' using errcode='22023'; end if;
    end if;
    if recorded then
      if item->'addToVault'='true'::jsonb then
        if jsonb_typeof(item->'instanceId') is distinct from 'string' or coalesce(item->>'instanceId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not public.vendor_purchase_text_valid_v1(item->'gvviId',100) or coalesce(item->>'gvviId','') !~ '^GVVI-[A-Z0-9-]+$' then raise exception 'Missing trade copy evidence' using errcode='22023'; end if;
        instance:=(item->>'instanceId')::uuid;
        if instance=any(seen) or (item->>'gvviId')=any(labels) then raise exception 'Repeated trade copy evidence' using errcode='22023'; end if;
        seen:=array_append(seen,instance);labels:=array_append(labels,item->>'gvviId');
      elsif item->'instanceId'<>'null'::jsonb or item->'gvviId'<>'null'::jsonb then raise exception 'Unexpected trade copy evidence' using errcode='22023'; end if;
    end if;
  end loop;
  return jsonb_build_object('items',lines,'totalValueMinor',case when all_known then reference_total else null end,'totalCreditMinor',credit_total);
end $$;
revoke all on function public.vendor_negotiated_trade_lines_v1(jsonb,boolean) from public,anon,authenticated;

create or replace function public.vendor_sales_trade_snapshot_validate_v2(trade jsonb,sale_total bigint)
returns void language plpgsql security definer set search_path='' as $$
declare totals jsonb; fields text[]:=array['version','items','totalValueMinor','totalCreditMinor','balanceMinor'];
begin
  if jsonb_typeof(trade) is distinct from 'object' or not trade ?& fields or trade-fields<>'{}'
    or trade->'version' is distinct from '2'::jsonb or sale_total is null or sale_total not between 1 and 100000000 then raise exception 'Invalid negotiated trade snapshot' using errcode='22023'; end if;
  totals:=public.vendor_negotiated_trade_lines_v1(trade->'items',true);
  if trade->'totalValueMinor' is distinct from totals->'totalValueMinor' or trade->'totalCreditMinor' is distinct from totals->'totalCreditMinor'
    or trade->'balanceMinor' is distinct from to_jsonb(sale_total-(totals->>'totalCreditMinor')::bigint) then raise exception 'Trade snapshot does not reconcile' using errcode='22023'; end if;
end $$;
revoke all on function public.vendor_sales_trade_snapshot_validate_v2(jsonb,bigint) from public,anon,authenticated;

-- Common outgoing arithmetic, with exact request/receipt field sets.
create or replace function public.vendor_negotiated_trade_sales_v1(lines jsonb,recorded boolean)
returns bigint language plpgsql security definer set search_path='' as $$
declare item jsonb; field text; qty bigint; price bigint; total bigint:=0; seen uuid[]:='{}'; instance uuid;
  fields text[]:=array['description','quantity','unitMinor'];
begin
  if recorded is null or jsonb_typeof(lines) is distinct from 'array' then raise exception 'Invalid sale lines' using errcode='22023'; end if;
  if jsonb_array_length(lines) not between 1 and 50 then raise exception 'Use 1 to 50 sale lines' using errcode='22023'; end if;
  fields:=fields||case when recorded then array['lineMinor'] else array['instanceId'] end;
  for item in select value from jsonb_array_elements(lines) loop
    if jsonb_typeof(item) is distinct from 'object' or not item ?& fields or item-fields<>'{}'
      or not public.vendor_purchase_text_valid_v1(item->'description',200)
      or length(public.vendor_negotiated_trade_trim_v1(item->>'description'))=0 then raise exception 'Invalid sale line' using errcode='22023'; end if;
    foreach field in array array['quantity','unitMinor'] loop
      if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid sale amount' using errcode='22023'; end if;
    end loop;
    qty:=(item->>'quantity')::bigint;price:=(item->>'unitMinor')::bigint;
    if qty not between 1 and 999 or price not between 1 and 100000000 then raise exception 'Invalid sale amount' using errcode='22023'; end if;
    total:=total+qty*price;
    if total>100000000 then raise exception 'Sale total outside supported range' using errcode='22023'; end if;
    if recorded then
      if item->'lineMinor' is distinct from to_jsonb(qty*price) then raise exception 'Sale line does not reconcile' using errcode='22023'; end if;
    elsif item->'instanceId'<>'null'::jsonb then
      if jsonb_typeof(item->'instanceId') is distinct from 'string' or coalesce(item->>'instanceId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid sale copy' using errcode='22023'; end if;
      instance:=(item->>'instanceId')::uuid;
      if qty<>1 or instance=any(seen) then raise exception 'An exact copy can appear only once' using errcode='22023'; end if;
      seen:=array_append(seen,instance);
    end if;
  end loop;
  return total;
end $$;
revoke all on function public.vendor_negotiated_trade_sales_v1(jsonb,boolean) from public,anon,authenticated;

create or replace function public.vendor_negotiated_trade_request_validate_v1(p_cart jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare subtotal bigint; tax bigint; trades jsonb; payments jsonb; customer jsonb;
  fields text[]:=array['version','storeName','method','items','taxMinor','note','customer','customerId','trades','payments'];
begin
  if jsonb_typeof(p_cart) is distinct from 'object' or not p_cart ?& fields or p_cart-fields<>'{}'
    or p_cart->'version' is distinct from '5'::jsonb
    or not public.vendor_purchase_text_valid_v1(p_cart->'storeName',120) or length(public.vendor_negotiated_trade_trim_v1(p_cart->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(p_cart->'note',350)
    or jsonb_typeof(p_cart->'taxMinor') is distinct from 'number' or coalesce(p_cart->>'taxMinor','') !~ '^\d{1,9}$'
    or jsonb_typeof(p_cart->'customer') is distinct from 'object' then raise exception 'Invalid negotiated trade' using errcode='22023'; end if;
  if p_cart->'customerId'<>'null'::jsonb and (jsonb_typeof(p_cart->'customerId') is distinct from 'string'
    or coalesce(p_cart->>'customerId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then raise exception 'Invalid customer identity' using errcode='22023'; end if;
  customer:=p_cart->'customer';
  if not customer ?& array['name','email','phone','wants','notes'] or customer-array['name','email','phone','wants','notes']<>'{}'
    or not public.vendor_purchase_text_valid_v1(customer->'name',120) or (customer->>'name') ~ E'[\r\n]'
    or not public.vendor_purchase_text_valid_v1(customer->'email',254)
    or ((customer->>'email')<>'' and (customer->>'email') !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$')
    or not public.vendor_purchase_text_valid_v1(customer->'phone',40)
    or ((customer->>'phone')<>'' and (customer->>'phone') !~ '^\+?[0-9 ()-]{7,40}$')
    or not public.vendor_purchase_text_valid_v1(customer->'wants',1000) or not public.vendor_purchase_text_valid_v1(customer->'notes',2000) then raise exception 'Invalid customer details' using errcode='22023'; end if;
  subtotal:=public.vendor_negotiated_trade_sales_v1(p_cart->'items',false);tax:=(p_cart->>'taxMinor')::bigint;
  if tax>100000000 or subtotal+tax>100000000 then raise exception 'Sale total outside supported range' using errcode='22023'; end if;
  trades:=public.vendor_negotiated_trade_lines_v1(p_cart->'trades',false);
  payments:=public.vendor_sales_payment_snapshot_v1(p_cart->'payments',subtotal+tax-(trades->>'totalCreditMinor')::bigint);
  if p_cart->>'method' is distinct from public.vendor_sales_payment_method_v1(payments->'entries') then raise exception 'Payment method mismatch' using errcode='22023'; end if;
end $$;
revoke all on function public.vendor_negotiated_trade_request_validate_v1(jsonb) from public,anon,authenticated;

create or replace function public.vendor_negotiated_trade_receipt_validate_v1(r jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare subtotal bigint; tax bigint; total bigint;
  fields text[]:=array['version','id','number','createdAt','storeName','customerName','method','items','subtotalMinor','discountMinor','taxMinor','totalMinor','note','sourceDispositionId','tradeIn','payments'];
begin
  if jsonb_typeof(r) is distinct from 'object' or not r ?& fields or r-fields<>'{}' or r->'version' is distinct from '1'::jsonb
    or jsonb_typeof(r->'id') is distinct from 'string' or coalesce(r->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not public.vendor_purchase_text_valid_v1(r->'storeName',120) or length(public.vendor_negotiated_trade_trim_v1(r->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(r->'customerName',120) or not public.vendor_purchase_text_valid_v1(r->'note',350)
    or not public.vendor_purchase_text_valid_v1(r->'createdAt',24) or coalesce(r->>'createdAt','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or r->>'number' is distinct from ('GV-'||replace(left(r->>'createdAt',10),'-','')||'-'||upper(left(r->>'id',8))) then raise exception 'Invalid negotiated trade receipt' using errcode='22023'; end if;
  if to_char((r->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>r->>'createdAt' then raise exception 'Invalid receipt timestamp' using errcode='22023'; end if;
  if r->'sourceDispositionId'<>'null'::jsonb and (jsonb_typeof(r->'sourceDispositionId') is distinct from 'string'
    or coalesce(r->>'sourceDispositionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then raise exception 'Invalid source sale identity' using errcode='22023'; end if;
  subtotal:=public.vendor_negotiated_trade_sales_v1(r->'items',true);
  if jsonb_typeof(r->'taxMinor') is distinct from 'number' or coalesce(r->>'taxMinor','') !~ '^\d{1,9}$' then raise exception 'Invalid receipt tax' using errcode='22023'; end if;
  tax:=(r->>'taxMinor')::bigint;total:=subtotal+tax;
  if tax>100000000 or total>100000000 or r->'subtotalMinor' is distinct from to_jsonb(subtotal)
    or r->'discountMinor' is distinct from '0'::jsonb or r->'totalMinor' is distinct from to_jsonb(total) then raise exception 'Receipt totals do not reconcile' using errcode='22023'; end if;
  perform public.vendor_sales_trade_snapshot_validate_v2(r->'tradeIn',total);
  if r->'payments' is distinct from public.vendor_sales_payment_snapshot_v1(r->'payments'->'entries',(r->'tradeIn'->>'balanceMinor')::bigint)
    or r->>'method' is distinct from public.vendor_sales_payment_method_v1(r->'payments'->'entries') then raise exception 'Payment snapshot does not reconcile' using errcode='22023'; end if;
end $$;
revoke all on function public.vendor_negotiated_trade_receipt_validate_v1(jsonb) from public,anon,authenticated;


create or replace function public.vendor_sales_cart_complete_v5(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); prior public.vendor_sales_cart_receipts%rowtype;
  book_row public.vendor_receipt_books%rowtype; book jsonb; receipt jsonb;
  item jsonb; items jsonb:='[]'; links jsonb:='[]'; sale jsonb;
  customer jsonb; customer_id uuid; item_id uuid; seen uuid[]:='{}';
  quantity bigint; price bigint; subtotal bigint:=0; tax bigint; stamp text;
  trade jsonb; trades jsonb:='[]'; trade_credit bigint:=0; trade_value bigint:=0;
  credit bigint; parent uuid; printing uuid;
  option record; incoming jsonb; incoming_id uuid; incoming_gvvi text; trade_description text; printing_gv text;
  payments jsonb;
  description text; customer_name text; source_id text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object'
    or p_cart->'version' is distinct from '5'::jsonb
    or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or octet_length(p_cart::text)>100000 then raise exception 'Invalid sale' using errcode='22023'; end if;
  -- All callers acquire the book lock before stock. Existing disposition writers
  -- take stock only; receipt writers take the book only. Never loop RPCs in a client.
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  select * into book_row from public.vendor_receipt_books where owner_id=actor for update;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if found then
    if prior.request is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
    return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',prior.request),'receipt',prior.receipt);
  end if;
  if not public.vendor_sales_negotiated_trade_available_v1() then raise exception 'Negotiated trades unavailable' using errcode='42501'; end if;
  perform public.vendor_negotiated_trade_request_validate_v1(p_cart);
  -- Validate the whole request before effects; the book lock serializes retries.
  for trade in select value from jsonb_array_elements(p_cart->'trades') loop
    quantity:=(trade->>'quantity')::bigint;credit:=(trade->>'creditMinor')::bigint;
    trade_credit:=trade_credit+credit;
    -- SQL null propagation preserves unknown reference totals.
    trade_value:=trade_value+(trade->>'valueMinor')::bigint*quantity;
    parent:=null; printing:=null; incoming_id:=null; incoming_gvvi:=null; printing_gv:=null;
    trade_description:=public.vendor_negotiated_trade_trim_v1(trade->>'description');
    if trade->'cardId'='null'::jsonb then
      if trade->'printingId'<>'null'::jsonb or trade->'condition'<>'null'::jsonb or trade->'addToVault'<>'false'::jsonb then
        raise exception 'Quick trades cannot create inventory' using errcode='22023'; end if;
    else
      if jsonb_typeof(trade->'cardId') is distinct from 'string' or jsonb_typeof(trade->'printingId') is distinct from 'string' or
        coalesce(trade->>'condition','') not in ('NM','LP','MP','HP','DMG') or quantity<>1 then
        raise exception 'Choose one exact canonical printing per trade line' using errcode='22023'; end if;
      parent:=(trade->>'cardId')::uuid; printing:=(trade->>'printingId')::uuid;
      select p.* into option from public.get_public_card_printing_options_v1(array[parent],1000,0) p
        where p.id=printing and p.card_print_id=parent and nullif(p.printing_gv_id,'') is not null and p.finish_is_active=true;
      if not found or not public.catalog_card_print_visible_to_request_v1(parent) then
        raise exception 'Trade card or printing is no longer available' using errcode='22023'; end if;
      printing_gv:=option.printing_gv_id;
      select left(c.name||' · '||printing_gv||' · '||(trade->>'condition'),200) into trade_description from public.card_prints c where c.id=parent;
      if trade->'addToVault'='true'::jsonb then
        incoming:=public.vault_add_card_instance_v1(p_card_print_id=>parent,p_quantity=>1,
          p_condition_label=>trade->>'condition',p_card_printing_id=>printing);
        incoming_gvvi:=incoming->>'gv_vi_id';
        select id into strict incoming_id from public.vault_item_instances where user_id=actor and gv_vi_id=incoming_gvvi
          and card_print_id=parent and card_printing_id=printing and archived_at is null;
        -- Agreed consideration is exact USD cost evidence, even when zero.
        update public.vault_item_instances set acquisition_cost=credit::numeric/100,acquisition_currency='USD'
          where id=incoming_id and user_id=actor;
      end if;
    end if;
    trades:=trades||jsonb_build_array(trade||jsonb_build_object('description',trade_description,'creditMinor',credit,
      'printingGvId',printing_gv,
      'instanceId',incoming_id,'gvviId',incoming_gvvi));
  end loop;
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
  elsif exists(select 1 from jsonb_each_text(customer) e where length(public.vendor_negotiated_trade_trim_v1(e.value))>0) then
    customer_id:=gen_random_uuid();
    customer:=customer||jsonb_build_object('id',customer_id,'updatedAt',stamp);
    book:=jsonb_set(book,'{customers}',(book->'customers')||jsonb_build_array(customer));
  end if;
  -- Validate the entire cart before any disposition; reject repeated exact copies.
  for item in select value from jsonb_array_elements(p_cart->'items') loop
    if jsonb_typeof(item) is distinct from 'object'
      or item - array['instanceId','description','quantity','unitMinor'] <> '{}'
      or not (item ? 'instanceId')
      or not public.vendor_receipt_text_valid_v1(item->'description',200) or length(public.vendor_negotiated_trade_trim_v1(item->>'description'))=0
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
  payments:=public.vendor_sales_payment_snapshot_v1(p_cart->'payments',subtotal+tax-trade_credit);
  if p_cart->>'method' is distinct from public.vendor_sales_payment_method_v1(payments->'entries') then raise exception 'Payment method mismatch' using errcode='22023'; end if;
  -- Stable stock order prevents two overlapping carts from deadlocking. Recheck
  -- active ownership under lock. Existing stock triggers continue to arbitrate.
  for item_id in select unnest(seen) order by 1 loop
    perform 1 from public.vault_item_instances where id=item_id and user_id=actor and archived_at is null for update;
    if not found then raise exception 'A card is no longer available; review the cart' using errcode='PT409'; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_cart->'items') loop
    quantity:=(item->>'quantity')::bigint; price:=(item->>'unitMinor')::bigint;
    description:=public.vendor_negotiated_trade_trim_v1(item->>'description');
    if item->'instanceId' <> 'null'::jsonb then
      item_id:=(item->>'instanceId')::uuid;
      sale:=public.vault_record_exact_instance_disposition_v2(item_id,'sale',price::numeric/100,'USD',nullif(customer_name,''));
      links:=links||jsonb_build_array(jsonb_build_object('instanceId',item_id,'dispositionId',sale->>'disposition_id'));
      source_id:=coalesce(source_id,sale->>'disposition_id');
    end if;
    items:=items||jsonb_build_array(jsonb_build_object('description',description,'quantity',quantity,'unitMinor',price,'lineMinor',quantity*price));
  end loop;
  receipt:=jsonb_build_object('version',1,'id',p_request_id,'number','GV-'||replace(left(stamp,10),'-','')||'-'||upper(left(p_request_id::text,8)),
    'createdAt',stamp,'storeName',public.vendor_negotiated_trade_trim_v1(p_cart->>'storeName'),'customerName',customer_name,'method',p_cart->>'method',
    'items',items,'subtotalMinor',subtotal,'discountMinor',0,'taxMinor',tax,'totalMinor',subtotal+tax,'note',p_cart->>'note','sourceDispositionId',source_id);
  receipt:=receipt||jsonb_build_object('tradeIn',jsonb_build_object('version',2,'items',trades,
    'totalValueMinor',trade_value,'totalCreditMinor',trade_credit,'balanceMinor',subtotal+tax-trade_credit));
  receipt:=receipt||jsonb_build_object('payments',payments);
  perform public.vendor_negotiated_trade_receipt_validate_v1(receipt);
  if exists(select 1 from jsonb_array_elements(book->'receipts') r where lower(r->'receipt'->>'id')=p_request_id::text) then
    raise exception 'Receipt identifier already used' using errcode='22023'; end if;
  book:=jsonb_set(jsonb_set(book,'{storeName}',receipt->'storeName'),'{receipts}',(book->'receipts')||jsonb_build_array(jsonb_build_object('receipt',receipt,'customerId',customer_id)));
  -- Reuse existing bounds, immutable history, customer and money validation.
  perform public.vendor_receipt_book_save_v1(book_row.revision,p_request_id,book);
  insert into public.vendor_sales_cart_receipts(owner_id,request_id,request,receipt,dispositions)
    values(actor,p_request_id,p_cart,receipt,links);
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',p_cart),'receipt',receipt);
end $$;


revoke all on function public.vendor_sales_cart_complete_v5(uuid,jsonb) from public,anon;
grant execute on function public.vendor_sales_cart_complete_v5(uuid,jsonb) to authenticated;

-- Read the existing owner journal; disabled entry never blocks recovery.
create or replace function public.vendor_sales_cart_read_v2(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.vendor_sales_cart_receipts%rowtype;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object'
    or p_cart->'version' is distinct from '5'::jsonb or octet_length(p_cart::text)>100000 then raise exception 'Invalid negotiated trade recovery' using errcode='22023'; end if;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if not found then return null; end if;
  if prior.request is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',prior.request),'receipt',prior.receipt);
end $$;
revoke all on function public.vendor_sales_cart_read_v2(uuid,jsonb) from public,anon;
grant execute on function public.vendor_sales_cart_read_v2(uuid,jsonb) to authenticated;

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
      if r->'tradeIn'->'version'='2'::jsonb then
        perform public.vendor_negotiated_trade_receipt_validate_v1(r);
      else
        perform public.vendor_sales_trade_snapshot_validate_v1(r->'tradeIn',total);
      end if;
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

commit;
