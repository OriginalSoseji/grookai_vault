-- Account-owned manual receipt book. Not a payment ledger or inventory writer.
-- Disabled until separately qualified and activated. No collector/catalog changes.
begin;
create table public.vendor_receipt_cloud_control (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.vendor_receipt_cloud_control(singleton) values(true);
alter table public.vendor_receipt_cloud_control enable row level security;
revoke all on public.vendor_receipt_cloud_control from public, anon, authenticated;

create table public.vendor_receipt_books (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  book jsonb not null default '{"version":1,"storeName":"","receipts":[],"customers":[]}',
  last_request_id uuid,
  updated_at timestamptz not null default now(),
  check (octet_length(book::text) <= 10000000)
);
alter table public.vendor_receipt_books enable row level security;
-- Reads also obey the rollback switch; base-table writes are never granted.
revoke all on public.vendor_receipt_books from public, anon, authenticated;

create function public.vendor_receipt_text_valid_v1(value jsonb, max_length integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(value) = 'string' and length(value #>> '{}') <= max_length
    and (value #>> '{}') !~ '[\x01-\x08\x0B\x0C\x0E-\x1F]', false)
$$;
revoke all on function public.vendor_receipt_text_valid_v1(jsonb,integer) from public,anon,authenticated;

create function public.vendor_receipt_book_validate_v1(payload jsonb, actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare row_data jsonb; r jsonb; c jsonb; item jsonb; total bigint; subtotal bigint;
  discount bigint; tax bigint; qty bigint; price bigint; field text;
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
  for row_data in select value from jsonb_array_elements(payload->'receipts') loop
    r := row_data->'receipt';
    if jsonb_typeof(row_data) is distinct from 'object' or jsonb_typeof(r) is distinct from 'object'
      or row_data - array['receipt','customerId'] <> '{}'::jsonb
      or not (row_data ? 'customerId')
      or (row_data->'customerId' <> 'null'::jsonb and not exists
        (select 1 from jsonb_array_elements(payload->'customers') x where x->'id'=row_data->'customerId'))
      or r->'version' is distinct from '1'::jsonb or (r->>'id') is null
      or (r->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.vendor_receipt_text_valid_v1(r->'storeName',120) or length(r->>'storeName')=0
      or not public.vendor_receipt_text_valid_v1(r->'customerName',120)
      or not public.vendor_receipt_text_valid_v1(r->'note',500)
      or not public.vendor_receipt_text_valid_v1(r->'createdAt',40)
      or (r->>'createdAt') !~ '^\d{4}-\d{2}-\d{2}T'
      or (r->>'number') is distinct from ('GV-' || replace(left(r->>'createdAt',10),'-','') || '-' || upper(left(r->>'id',8)))
      or coalesce(r->>'method','') not in ('Cash','Card (external terminal)','Bank / payment app','Other')
      or jsonb_typeof(r->'items') is distinct from 'array'
      or not (r ? 'sourceDispositionId')
      or r - array['version','id','number','createdAt','storeName','customerName','method','items','subtotalMinor','discountMinor','taxMinor','totalMinor','note','sourceDispositionId'] <> '{}'::jsonb then
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
    -- Existing immutable receipts retain their context if the source is later removed.
    if r->'sourceDispositionId' <> 'null'::jsonb and not exists
      (select 1 from public.vendor_receipt_books b, jsonb_array_elements(b.book->'receipts') old
       where b.owner_id=actor and old=row_data) then
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
revoke all on function public.vendor_receipt_book_validate_v1(jsonb,uuid) from public,anon,authenticated;

create function public.vendor_receipt_book_read_v1()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not exists(select 1 from public.vendor_receipt_cloud_control where enabled) then raise exception 'Receipt cloud unavailable' using errcode='55000'; end if;
  select jsonb_build_object('revision',revision,'book',book) into result from public.vendor_receipt_books where owner_id=actor;
  return coalesce(result,'{"revision":0,"book":{"version":1,"storeName":"","receipts":[],"customers":[]}}'::jsonb);
end
$$;

create function public.vendor_receipt_book_save_v1(p_revision bigint, p_request_id uuid, p_book jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_book public.vendor_receipt_books;
begin
  if actor is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if not exists(select 1 from public.vendor_receipt_cloud_control where enabled) then raise exception 'Receipt cloud unavailable' using errcode='55000'; end if;
  if p_request_id is null or p_revision is null or p_revision<0 or p_book is null then raise exception 'Invalid request' using errcode='22023'; end if;
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  select * into current_book from public.vendor_receipt_books where owner_id=actor for update;
  if current_book.last_request_id=p_request_id then
    if current_book.book is distinct from p_book then raise exception 'Request already used' using errcode='22023'; end if;
    return jsonb_build_object('revision',current_book.revision,'book',current_book.book);
  end if;
  if current_book.revision<>p_revision then raise exception 'Receipt book changed; reload before saving' using errcode='PT409'; end if;
  perform public.vendor_receipt_book_validate_v1(p_book,actor);
  if exists(select 1 from jsonb_array_elements(current_book.book->'receipts') old
    where not exists(select 1 from jsonb_array_elements(p_book->'receipts') fresh where fresh=old))
    or exists(select 1 from jsonb_array_elements(current_book.book->'customers') old
    where not exists(select 1 from jsonb_array_elements(p_book->'customers') fresh where fresh->'id'=old->'id')) then
    raise exception 'Saved receipts and customer identities must be retained' using errcode='22023';
  end if;
  update public.vendor_receipt_books set book=p_book,revision=revision+1,last_request_id=p_request_id,updated_at=now()
    where owner_id=actor returning * into current_book;
  return jsonb_build_object('revision',current_book.revision,'book',current_book.book);
end
$$;
revoke all on function public.vendor_receipt_book_read_v1() from public,anon;
revoke all on function public.vendor_receipt_book_save_v1(bigint,uuid,jsonb) from public,anon;
grant execute on function public.vendor_receipt_book_read_v1() to authenticated;
grant execute on function public.vendor_receipt_book_save_v1(bigint,uuid,jsonb) to authenticated;
commit;
