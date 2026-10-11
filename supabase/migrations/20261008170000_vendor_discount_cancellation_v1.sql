-- Durable cancellation for discounted-sale recovery. No external payment reversal.
-- Preserve v1-v6 completion bodies and all existing receipt/cost evidence.
begin;

create table if not exists public.vendor_sales_cart_cancellations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  check(jsonb_typeof(request)='object' and request->'version'='6'::jsonb and octet_length(request::text)<=100000)
);
alter table public.vendor_sales_cart_cancellations enable row level security;
revoke all on public.vendor_sales_cart_cancellations from public,anon,authenticated,service_role;

create or replace function public.vendor_sales_cart_cancellation_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Sale cancellation is immutable' using errcode='42501';
end $$;
create or replace trigger vendor_sales_cart_cancellations_immutable
  before update on public.vendor_sales_cart_cancellations for each row
  execute function public.vendor_sales_cart_cancellation_immutable_v1();

-- Every cart writer uses this journal. Reuse the same owner-book lock, and reject
-- insertion even when an old writer tries a cancelled ID with different terms.
-- Any earlier inventory, customer and book changes roll back with this exception.
create or replace function public.vendor_sales_cart_cancellation_guard_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.vendor_receipt_books where owner_id=new.owner_id for update;
  if exists(select 1 from public.vendor_sales_cart_cancellations
      where owner_id=new.owner_id and request_id=new.request_id) then
    raise exception 'Sale request cancelled; recover its outcome before editing' using errcode='PT409';
  end if;
  return new;
end $$;
create or replace trigger vendor_sales_cart_cancellation_guard
  before insert on public.vendor_sales_cart_receipts for each row
  execute function public.vendor_sales_cart_cancellation_guard_v1();

create or replace function public.vendor_sales_cart_read_v3(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); prior public.vendor_sales_cart_receipts%rowtype; cancelled jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(p_cart) is distinct from 'object' or p_cart->'version' is distinct from '6'::jsonb
    or octet_length(p_cart::text)>100000 then raise exception 'Invalid discounted sale recovery' using errcode='22023'; end if;
  select * into prior from public.vendor_sales_cart_receipts where owner_id=actor and request_id=p_request_id;
  if found then
    if prior.request is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
    return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',prior.request),'receipt',prior.receipt);
  end if;
  select request into cancelled from public.vendor_sales_cart_cancellations where owner_id=actor and request_id=p_request_id;
  if not found then return null; end if;
  if cancelled is distinct from p_cart then raise exception 'Sale request changed' using errcode='22023'; end if;
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',cancelled),'status','cancelled');
end $$;

create or replace function public.vendor_sales_cart_cancel_v1(p_request_id uuid,p_cart jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); book jsonb; outcome jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or p_request_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(p_cart) is distinct from 'object' or p_cart->'version' is distinct from '6'::jsonb
    or octet_length(p_cart::text)>100000 then raise exception 'Invalid sale cancellation' using errcode='22023'; end if;
  -- Lock first: an in-flight completion either commits before this read, or sees
  -- the durable fence when it eventually inserts its receipt. No empty read is
  -- interpreted as a terminal outcome without creating this fence.
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  select b.book into book from public.vendor_receipt_books b where b.owner_id=actor for update;
  outcome:=public.vendor_sales_cart_read_v3(p_request_id,p_cart);
  if outcome is not null then return outcome; end if;
  perform public.vendor_discount_request_validate_v1(p_cart);
  if exists(select 1 from jsonb_array_elements(book->'receipts') r where lower(r->'receipt'->>'id')=p_request_id::text) then
    raise exception 'Receipt identifier already used' using errcode='22023';
  end if;
  insert into public.vendor_sales_cart_cancellations(owner_id,request_id,request) values(actor,p_request_id,p_cart);
  return jsonb_build_object('version',1,'request',jsonb_build_object('id',p_request_id,'cart',p_cart),'status','cancelled');
end $$;

-- New entry requires this compatibility boundary, so source435 cannot expose
-- an entry flow whose return-to-editing authority has not been installed.
create or replace function public.vendor_sales_discount_entry_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select public.vendor_sales_discount_available_v1();
$$;

revoke all on function public.vendor_sales_cart_cancellation_immutable_v1() from public,anon,authenticated,service_role;
revoke all on function public.vendor_sales_cart_cancellation_guard_v1() from public,anon,authenticated,service_role;
revoke all on function public.vendor_sales_cart_read_v3(uuid,jsonb) from public,anon,service_role;
revoke all on function public.vendor_sales_cart_cancel_v1(uuid,jsonb) from public,anon,service_role;
revoke all on function public.vendor_sales_discount_entry_available_v1() from public,anon,service_role;
grant execute on function public.vendor_sales_cart_read_v3(uuid,jsonb) to authenticated;
grant execute on function public.vendor_sales_cart_cancel_v1(uuid,jsonb) to authenticated;
grant execute on function public.vendor_sales_discount_entry_available_v1() to authenticated;
notify pgrst,'reload schema';
commit;
