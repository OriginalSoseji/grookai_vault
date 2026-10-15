-- Explicit sale discount and immutable net-line evidence; old writers are preserved.
-- Read-only baseline: product_discount_20261008/baseline-1791474532222.
begin;

create table if not exists public.vendor_discount_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_discount_control(singleton) values(true) on conflict do nothing;
alter table public.vendor_discount_control enable row level security;
revoke all on public.vendor_discount_control from public,anon,authenticated,service_role;

create or replace function public.vendor_sales_discount_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select public.vendor_sales_payments_available_v1()
    and coalesce((select capture_enabled from public.vendor_cost_evidence_control where singleton),false)
    and coalesce((select enabled from public.vendor_discount_control where singleton),false)
$$;
revoke all on function public.vendor_sales_discount_available_v1() from public,anon,service_role;
grant execute on function public.vendor_sales_discount_available_v1() to authenticated;

-- Exact integer floors, then largest remainder with stable original-line ties.
create or replace function public.vendor_sale_discount_allocation_v1(p_items jsonb,p_discount jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; field text; quantity bigint; price bigint; subtotal bigint:=0;
  discount bigint; gross bigint[]:='{}'; shares bigint[]:='{}'; remainder bigint;
  index integer; ranked record; lines jsonb:='[]';
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_typeof(p_discount) is distinct from 'number'
    or coalesce(p_discount #>> '{}','') !~ '^\d{1,9}$' then raise exception 'Invalid discount allocation' using errcode='22023'; end if;
  if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Use 1 to 50 sale lines' using errcode='22023'; end if;
  discount:=(p_discount #>> '{}')::bigint;
  if discount not between 0 and 100000000 then raise exception 'Discount outside supported range' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' then raise exception 'Invalid sale line' using errcode='22023'; end if;
    foreach field in array array['quantity','unitMinor'] loop
      if jsonb_typeof(item->field) is distinct from 'number' or coalesce(item->>field,'') !~ '^\d{1,9}$' then raise exception 'Invalid sale amount' using errcode='22023'; end if;
    end loop;
    quantity:=(item->>'quantity')::bigint;price:=(item->>'unitMinor')::bigint;
    if quantity not between 1 and 999 or price not between 1 and 100000000 then raise exception 'Invalid sale amount' using errcode='22023'; end if;
    subtotal:=subtotal+quantity*price;
    if subtotal>100000000 then raise exception 'Sale subtotal outside supported range' using errcode='22023'; end if;
    gross:=array_append(gross,quantity*price);
  end loop;
  if discount>subtotal then raise exception 'Discount exceeds item subtotal' using errcode='22023'; end if;
  remainder:=discount;
  for index in 1..cardinality(gross) loop
    shares:=array_append(shares,gross[index]*discount/subtotal);remainder:=remainder-shares[index];
  end loop;
  for ranked in select g.ordinality::integer as index from unnest(gross) with ordinality g(value,ordinality)
    order by (g.value*discount)%subtotal desc,g.ordinality loop
    exit when remainder=0;
    shares[ranked.index]:=shares[ranked.index]+1;remainder:=remainder-1;
  end loop;
  if remainder<>0 then raise exception 'Discount did not reconcile' using errcode='23514'; end if;
  for index in 1..cardinality(gross) loop
    lines:=lines||jsonb_build_array(jsonb_build_object('index',index-1,'grossMinor',gross[index]::text,
      'discountMinor',shares[index]::text,'netMinor',(gross[index]-shares[index])::text));
  end loop;
  return jsonb_build_object('version',1,'method','proportional_largest_remainder_v1','subtotalMinor',subtotal::text,
    'discountMinor',discount::text,'netSalesMinor',(subtotal-discount)::text,'lines',lines);
end $$;
revoke all on function public.vendor_sale_discount_allocation_v1(jsonb,jsonb) from public,anon,authenticated,service_role;

-- A rounded whole-sale discount can legitimately assign zero proceeds to a copy.
-- Existing v2 entry remains positive-only; the private v6 helper is zero-capable.
alter table public.vault_item_instance_dispositions
  drop constraint if exists vault_item_instance_dispositions_sale_price,
  add constraint vault_item_instance_dispositions_sale_price check(sale_price_amount is null or sale_price_amount>=0);


create or replace function public.vendor_discount_request_validate_v1(p_cart jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare subtotal bigint; tax bigint; allocation jsonb; total bigint; payments jsonb; customer jsonb;
  fields text[]:=array['version','storeName','method','items','taxMinor','note','customer','customerId','discountMinor','payments'];
begin
  if jsonb_typeof(p_cart) is distinct from 'object' or not p_cart ?& fields or p_cart-fields<>'{}'
    or p_cart->'version' is distinct from '6'::jsonb
    or not public.vendor_purchase_text_valid_v1(p_cart->'storeName',120) or length(public.vendor_negotiated_trade_trim_v1(p_cart->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(p_cart->'note',500)
    or jsonb_typeof(p_cart->'taxMinor') is distinct from 'number' or coalesce(p_cart->>'taxMinor','') !~ '^\d{1,9}$'
    or jsonb_typeof(p_cart->'customer') is distinct from 'object' then raise exception 'Invalid discounted sale' using errcode='22023'; end if;
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
  allocation:=public.vendor_sale_discount_allocation_v1(p_cart->'items',p_cart->'discountMinor');
  total:=(allocation->>'netSalesMinor')::bigint+tax;
  if tax>100000000 or total not between 1 and 100000000 then raise exception 'Sale total outside supported range' using errcode='22023'; end if;
  payments:=public.vendor_sales_payment_snapshot_v1(p_cart->'payments',total);
  if p_cart->>'method' is distinct from public.vendor_sales_payment_method_v1(payments->'entries') then raise exception 'Payment method mismatch' using errcode='22023'; end if;
end $$;

create or replace function public.vendor_discount_receipt_validate_v1(r jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare subtotal bigint; tax bigint; total bigint; allocation jsonb;
  fields text[]:=array['version','id','number','createdAt','storeName','customerName','method','items','subtotalMinor','discountMinor','taxMinor','totalMinor','note','sourceDispositionId','payments'];
begin
  if jsonb_typeof(r) is distinct from 'object' or not r ?& fields or r-fields<>'{}' or r->'version' is distinct from '1'::jsonb
    or jsonb_typeof(r->'id') is distinct from 'string' or coalesce(r->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or not public.vendor_purchase_text_valid_v1(r->'storeName',120) or length(public.vendor_negotiated_trade_trim_v1(r->>'storeName'))=0
    or not public.vendor_purchase_text_valid_v1(r->'customerName',120) or not public.vendor_purchase_text_valid_v1(r->'note',500)
    or not public.vendor_purchase_text_valid_v1(r->'createdAt',24) or coalesce(r->>'createdAt','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
    or r->>'number' is distinct from ('GV-'||replace(left(r->>'createdAt',10),'-','')||'-'||upper(left(r->>'id',8))) then raise exception 'Invalid discounted sale receipt' using errcode='22023'; end if;
  if to_char((r->>'createdAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')<>r->>'createdAt' then raise exception 'Invalid receipt timestamp' using errcode='22023'; end if;
  if r->'sourceDispositionId'<>'null'::jsonb and (jsonb_typeof(r->'sourceDispositionId') is distinct from 'string'
    or coalesce(r->>'sourceDispositionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then raise exception 'Invalid source sale identity' using errcode='22023'; end if;
  subtotal:=public.vendor_negotiated_trade_sales_v1(r->'items',true);
  if jsonb_typeof(r->'taxMinor') is distinct from 'number' or coalesce(r->>'taxMinor','') !~ '^\d{1,9}$' then raise exception 'Invalid receipt tax' using errcode='22023'; end if;
  allocation:=public.vendor_sale_discount_allocation_v1(r->'items',r->'discountMinor');
  tax:=(r->>'taxMinor')::bigint;total:=(allocation->>'netSalesMinor')::bigint+tax;
  if tax>100000000 or total not between 1 and 100000000 or r->'subtotalMinor' is distinct from to_jsonb(subtotal)
    or r->'totalMinor' is distinct from to_jsonb(total) then raise exception 'Receipt totals do not reconcile' using errcode='22023'; end if;
  if r->'payments' is distinct from public.vendor_sales_payment_snapshot_v1(r->'payments'->'entries',total)
    or r->>'method' is distinct from public.vendor_sales_payment_method_v1(r->'payments'->'entries') then raise exception 'Payment snapshot does not reconcile' using errcode='22023'; end if;
end $$;

create or replace function public.vendor_discount_disposition_v1(
  p_instance_id uuid,
  p_disposition_type text,
  p_sale_price_amount numeric default null,
  p_sale_price_currency text default null,
  p_counterparty_label text default null,
  p_trade_received_description text default null,
  p_trade_cash_direction text default null,
  p_trade_cash_amount numeric default null,
  p_trade_cash_currency text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_disposition_type text := lower(btrim(coalesce(p_disposition_type, '')));
  v_sale_price_currency text := upper(nullif(btrim(p_sale_price_currency), ''));
  v_counterparty_label text := nullif(btrim(p_counterparty_label), '');
  v_trade_received_description text := nullif(btrim(p_trade_received_description), '');
  v_trade_cash_direction text := lower(nullif(btrim(p_trade_cash_direction), ''));
  v_trade_cash_currency text := upper(nullif(btrim(p_trade_cash_currency), ''));
  v_instance public.vault_item_instances%rowtype;
  v_card_print_id uuid;
  v_event public.vault_item_instance_dispositions%rowtype;
  v_archive jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = '22023';
  end if;

  if v_disposition_type <> 'sale' then
    raise exception 'invalid_disposition_type' using errcode = '22023';
  end if;

  if v_counterparty_label is not null and char_length(v_counterparty_label) > 120 then
    raise exception 'counterparty_too_long' using errcode = '22023';
  end if;

  if v_disposition_type = 'sale' then
    if p_sale_price_amount is null or p_sale_price_amount not between 0 and 1000000 or round(p_sale_price_amount,2) <> p_sale_price_amount then
      raise exception 'sale_price_required' using errcode = '22023';
    end if;
    if v_sale_price_currency is null or char_length(v_sale_price_currency) <> 3 then
      raise exception 'sale_currency_required' using errcode = '22023';
    end if;
    if v_trade_received_description is not null
       or v_trade_cash_direction is not null
       or p_trade_cash_amount is not null
       or v_trade_cash_currency is not null then
      raise exception 'sale_trade_fields_not_allowed' using errcode = '22023';
    end if;
  else
    if p_sale_price_amount is not null or v_sale_price_currency is not null then
      raise exception 'trade_sale_fields_not_allowed' using errcode = '22023';
    end if;
    if v_trade_received_description is null then
      raise exception 'trade_received_description_required' using errcode = '22023';
    end if;
    if char_length(v_trade_received_description) > 1000 then
      raise exception 'trade_received_description_too_long' using errcode = '22023';
    end if;
    if (
      v_trade_cash_direction is null
      and (p_trade_cash_amount is not null or v_trade_cash_currency is not null)
    ) or (
      v_trade_cash_direction is not null
      and (
        v_trade_cash_direction not in ('received', 'paid')
        or p_trade_cash_amount is null
        or p_trade_cash_amount <= 0
        or v_trade_cash_currency is null
        or char_length(v_trade_cash_currency) <> 3
      )
    ) then
      raise exception 'invalid_trade_cash_adjustment' using errcode = '22023';
    end if;
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0002';
  end if;

  if v_instance.archived_at is not null then
    raise exception 'vault_instance_already_archived' using errcode = '23514';
  end if;

  if v_instance.gv_vi_id is null or btrim(v_instance.gv_vi_id) = '' then
    raise exception 'vault_instance_missing_gvvi' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.vault_item_instance_dispositions d
    where d.vault_item_instance_id = v_instance.id
  ) then
    raise exception 'vault_instance_disposition_already_recorded' using errcode = '23505';
  end if;

  v_card_print_id := v_instance.card_print_id;
  if v_card_print_id is null and v_instance.slab_cert_id is not null then
    select sc.card_print_id
    into v_card_print_id
    from public.slab_certs sc
    where sc.id = v_instance.slab_cert_id;
  end if;

  if v_card_print_id is null then
    raise exception 'vault_instance_missing_card_print' using errcode = '23514';
  end if;

  insert into public.vault_item_instance_dispositions (
    user_id,
    vault_item_instance_id,
    card_print_id,
    card_printing_id,
    gv_vi_id,
    disposition_type,
    condition_label,
    intent_at_disposition,
    asking_price_amount,
    asking_price_currency,
    counterparty_label,
    sale_price_amount,
    sale_price_currency,
    trade_received_description,
    trade_cash_direction,
    trade_cash_amount,
    trade_cash_currency
  ) values (
    v_uid,
    v_instance.id,
    v_card_print_id,
    v_instance.card_printing_id,
    upper(btrim(v_instance.gv_vi_id)),
    v_disposition_type,
    v_instance.condition_label,
    v_instance.intent,
    v_instance.asking_price_amount,
    case
      when v_instance.asking_price_amount is null then null
      else upper(coalesce(nullif(btrim(v_instance.asking_price_currency), ''), 'USD'))
    end,
    v_counterparty_label,
    p_sale_price_amount,
    v_sale_price_currency,
    v_trade_received_description,
    v_trade_cash_direction,
    p_trade_cash_amount,
    v_trade_cash_currency
  )
  returning * into v_event;

  v_archive := public.vault_archive_exact_instance_v1(v_instance.id);

  if coalesce(v_archive ->> 'archived_instance_id', '') <> v_instance.id::text
     or coalesce(v_archive ->> 'gv_vi_id', '') <> upper(btrim(v_instance.gv_vi_id))
     or coalesce(v_archive ->> 'card_print_id', '') <> v_card_print_id::text then
    raise exception 'vault_instance_archive_readback_mismatch' using errcode = 'P0001';
  end if;

  return v_archive || jsonb_build_object(
    'disposition_id', v_event.id,
    'disposition_type', v_event.disposition_type,
    'counterparty_label', v_event.counterparty_label,
    'sale_price_amount', v_event.sale_price_amount,
    'sale_price_currency', v_event.sale_price_currency,
    'trade_received_description', v_event.trade_received_description,
    'trade_cash_direction', v_event.trade_cash_direction,
    'trade_cash_amount', v_event.trade_cash_amount,
    'trade_cash_currency', v_event.trade_cash_currency,
    'asking_price_snapshot_amount', v_event.asking_price_amount,
    'asking_price_snapshot_currency', v_event.asking_price_currency,
    'recorded_at', v_event.created_at
  );
end;
$$;

create or replace function public.vendor_sale_cost_capture_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  entry record; instance uuid; item public.vault_item_instances%rowtype;
  cost jsonb; lines jsonb:='[]'; status text; snapshot jsonb; allocation jsonb; discounted boolean:=coalesce(new.request->'version'='6'::jsonb,false);
begin
  if new.request->'version'='4'::jsonb and new.request->>'kind'='purchase' then return new; end if;
  if not discounted and not coalesce((select capture_enabled from public.vendor_cost_evidence_control where singleton),false) then return new; end if;
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
  snapshot:=jsonb_build_object('version',1,'receiptId',new.request_id,
    'soldAt',new.receipt->>'createdAt','salesCurrency','USD','lines',lines);
  if discounted then
    allocation:=public.vendor_sale_discount_allocation_v1(new.request->'items',new.request->'discountMinor');
    if new.receipt->'discountMinor' is distinct from new.request->'discountMinor'
      or new.receipt->>'subtotalMinor' is distinct from allocation->>'subtotalMinor' then
      raise exception 'Discount receipt and allocation disagree' using errcode='23514';
    end if;
    snapshot:=snapshot||jsonb_build_object('version',2,'allocation',allocation);
  end if;
  insert into public.vendor_sale_cost_snapshots(owner_id,request_id,snapshot) values(new.owner_id,new.request_id,snapshot);
  return new;
end $$;

create or replace function public.vendor_sales_cart_complete_v6(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); prior public.vendor_sales_cart_receipts%rowtype;
  book_row public.vendor_receipt_books%rowtype; book jsonb; receipt jsonb;
  item jsonb; items jsonb:='[]'; links jsonb:='[]'; sale jsonb;
  customer jsonb; customer_id uuid; item_id uuid; seen uuid[]:='{}';
  quantity bigint; price bigint; subtotal bigint:=0; tax bigint; stamp text;
  allocation jsonb; discount bigint; total bigint; net_minor bigint; line_index integer:=0;
  payments jsonb;
  description text; customer_name text; source_id text;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object'
    or p_cart->'version' is distinct from '6'::jsonb
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
  if not public.vendor_sales_discount_available_v1() then raise exception 'Discounted sales unavailable' using errcode='42501'; end if;
  perform public.vendor_discount_request_validate_v1(p_cart);
  -- Validate the whole request before effects; the book lock serializes retries.
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
  allocation:=public.vendor_sale_discount_allocation_v1(p_cart->'items',p_cart->'discountMinor');
  discount:=(p_cart->>'discountMinor')::bigint;total:=subtotal-discount+tax;
  if total not between 1 and 100000000 then raise exception 'Sale total outside supported range' using errcode='22023'; end if;
  payments:=public.vendor_sales_payment_snapshot_v1(p_cart->'payments',total);
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
      net_minor:=(allocation->'lines'->line_index->>'netMinor')::bigint;
      sale:=public.vendor_discount_disposition_v1(item_id,'sale',net_minor::numeric/100,'USD',nullif(customer_name,''));
      links:=links||jsonb_build_array(jsonb_build_object('instanceId',item_id,'dispositionId',sale->>'disposition_id'));
      source_id:=coalesce(source_id,sale->>'disposition_id');
    end if;
    items:=items||jsonb_build_array(jsonb_build_object('description',description,'quantity',quantity,'unitMinor',price,'lineMinor',quantity*price));
    line_index:=line_index+1;
  end loop;
  receipt:=jsonb_build_object('version',1,'id',p_request_id,'number','GV-'||replace(left(stamp,10),'-','')||'-'||upper(left(p_request_id::text,8)),
    'createdAt',stamp,'storeName',public.vendor_negotiated_trade_trim_v1(p_cart->>'storeName'),'customerName',customer_name,'method',p_cart->>'method',
    'items',items,'subtotalMinor',subtotal,'discountMinor',discount,'taxMinor',tax,'totalMinor',total,'note',p_cart->>'note','sourceDispositionId',source_id);
  receipt:=receipt||jsonb_build_object('payments',payments);
  perform public.vendor_discount_receipt_validate_v1(receipt);
  if exists(select 1 from jsonb_array_elements(book->'receipts') r where lower(r->'receipt'->>'id')=p_request_id::text) then
    raise exception 'Receipt identifier already used' using errcode='22023'; end if;
  book:=jsonb_set(jsonb_set(book,'{storeName}',receipt->'storeName'),'{receipts}',(book->'receipts')||jsonb_build_array(jsonb_build_object('receipt',receipt,'customerId',customer_id)));
  -- Reuse existing bounds, immutable history, customer and money validation.
  perform public.vendor_receipt_book_save_v1(book_row.revision,p_request_id,book);
  insert into public.vendor_sales_cart_receipts(owner_id,request_id,request,receipt,dispositions)
    values(actor,p_request_id,p_cart,receipt,links);
  if not exists(select 1 from public.vendor_sale_cost_snapshots s where s.owner_id=actor and s.request_id=p_request_id
      and s.snapshot->'version'='2'::jsonb and s.snapshot->'allocation'=allocation) then
    raise exception 'Complete discount evidence required' using errcode='23514';
  end if;
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',p_cart),'receipt',receipt);
end $$;

create or replace function public.vendor_sales_cart_read_v3(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();prior public.vendor_sales_cart_receipts%rowtype;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or jsonb_typeof(p_cart) is distinct from 'object'
    or p_cart->'version' is distinct from '6'::jsonb or octet_length(p_cart::text)>100000 then raise exception 'Invalid discounted sale recovery' using errcode='22023'; end if;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if not found then return null; end if;
  if prior.request is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',prior.request),'receipt',prior.receipt);
end $$;

revoke all on function public.vendor_discount_request_validate_v1(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.vendor_discount_receipt_validate_v1(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.vendor_discount_disposition_v1(uuid,text,numeric,text,text,text,text,numeric,text) from public,anon,authenticated,service_role;
revoke all on function public.vendor_sale_cost_capture_v1() from public,anon,authenticated,service_role;
revoke all on function public.vendor_sales_cart_complete_v6(uuid,jsonb) from public,anon,service_role;
grant execute on function public.vendor_sales_cart_complete_v6(uuid,jsonb) to authenticated;
revoke all on function public.vendor_sales_cart_read_v3(uuid,jsonb) from public,anon,service_role;
grant execute on function public.vendor_sales_cart_read_v3(uuid,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
