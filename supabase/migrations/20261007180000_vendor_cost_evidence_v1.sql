-- Private exact-copy costs and immutable cost-at-sale evidence. Default off.
begin;

create table if not exists public.vendor_cost_evidence_control (
  singleton boolean primary key default true check (singleton),
  edit_enabled boolean not null default false,
  capture_enabled boolean not null default false
);
insert into public.vendor_cost_evidence_control(singleton) values(true) on conflict do nothing;
alter table public.vendor_cost_evidence_control enable row level security;
revoke all on public.vendor_cost_evidence_control from public,anon,authenticated;

create table if not exists public.vault_copy_cost_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  request jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  check(octet_length(request::text)<=10000)
);
alter table public.vault_copy_cost_requests enable row level security;
revoke all on public.vault_copy_cost_requests from public,anon,authenticated;

create table if not exists public.vendor_sale_cost_snapshots (
  owner_id uuid not null,
  request_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  foreign key(owner_id,request_id) references public.vendor_sales_cart_receipts(owner_id,request_id) on delete cascade,
  check(octet_length(snapshot::text)<=100000)
);
alter table public.vendor_sale_cost_snapshots enable row level security;
revoke all on public.vendor_sale_cost_snapshots from public,anon,authenticated;

create or replace function public.vendor_cost_evidence_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Cost evidence is immutable' using errcode='42501';
end $$;
create or replace trigger vendor_sale_cost_snapshots_immutable
  before update on public.vendor_sale_cost_snapshots for each row
  execute function public.vendor_cost_evidence_immutable_v1();
create or replace trigger vault_copy_cost_requests_immutable
  before update on public.vault_copy_cost_requests for each row
  execute function public.vendor_cost_evidence_immutable_v1();

-- Classification tolerates historical malformed values without rounding them.
create or replace function public.vendor_cost_classify_v1(p_amount numeric,p_currency text)
returns jsonb language plpgsql immutable set search_path='' as $$
declare status text; minor text;
begin
  if p_amount is null then status:='missing_amount';
  elsif p_amount::text in ('NaN','Infinity','-Infinity') or p_amount not between 0 and 9999999999.99
    or round(p_amount,2)<>p_amount then status:='invalid_amount';
  elsif p_currency is null or btrim(p_currency)='' then status:='missing_currency';
  elsif p_currency !~ '^[A-Z]{3}$' then status:='invalid_currency';
  else
    status:='known';minor:=(p_amount*100)::bigint::text;
  end if;
  return jsonb_build_object('amount',p_amount::text,'currency',p_currency,'status',status,'minor',minor);
end $$;

create or replace function public.vault_copy_cost_read_v1(p_instance_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_instance_ids is null or cardinality(p_instance_ids) not between 1 and 100
    or array_position(p_instance_ids,null) is not null then raise exception 'Use 1 to 100 copies' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('instanceId',i.id,'archived',i.archived_at is not null,
    'cost',public.vendor_cost_classify_v1(i.acquisition_cost,i.acquisition_currency)) order by i.id),'[]'::jsonb)
    into result from public.vault_item_instances i where i.user_id=actor and i.id=any(p_instance_ids);
  return jsonb_build_object('ownerId',actor,'editEnabled',coalesce((select edit_enabled from public.vendor_cost_evidence_control where singleton),false),'copies',result);
end $$;

create or replace function public.vault_copy_cost_request_read_v1(p_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='28000'; end if;
  select r.result into result from public.vault_copy_cost_requests r where r.owner_id=auth.uid() and r.request_id=p_request_id;
  return result;
end $$;

create or replace function public.vault_copy_cost_save_v1(
  p_request_id uuid,p_instance_id uuid,p_expected_amount numeric,p_expected_currency text,
  p_amount numeric,p_currency text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); payload jsonb; prior public.vault_copy_cost_requests%rowtype;
  item public.vault_item_instances%rowtype; result jsonb; cost jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null or p_instance_id is null then raise exception 'Invalid cost request' using errcode='22023'; end if;
  payload:=jsonb_build_object('instanceId',p_instance_id,'expectedAmount',p_expected_amount,
    'expectedCurrency',p_expected_currency,'amount',p_amount,'currency',p_currency);
  if octet_length(payload::text)>10000 then raise exception 'Invalid cost request' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('copy-cost:'||actor::text||':'||p_request_id::text,0));
  select * into prior from public.vault_copy_cost_requests r where r.owner_id=actor and r.request_id=p_request_id;
  if found then
    if prior.request is distinct from payload then raise exception 'Cost request changed' using errcode='22023'; end if;
    return prior.result;
  end if;
  if not coalesce((select edit_enabled from public.vendor_cost_evidence_control where singleton),false) then
    raise exception 'Cost editing unavailable' using errcode='42501'; end if;
  cost:=public.vendor_cost_classify_v1(p_amount,p_currency);
  if (p_amount is null)<>(p_currency is null) or (p_amount is not null and cost->>'status'<>'known') then
    raise exception 'Enter a nonnegative cost with at most two decimals and its currency' using errcode='22023'; end if;
  select * into item from public.vault_item_instances where id=p_instance_id and user_id=actor for update;
  if not found or item.archived_at is not null then raise exception 'Copy unavailable' using errcode='PT409'; end if;
  if item.acquisition_cost is distinct from p_expected_amount or item.acquisition_currency is distinct from p_expected_currency then
    raise exception 'Cost changed; review the current value' using errcode='PT409'; end if;
  update public.vault_item_instances set acquisition_cost=p_amount,acquisition_currency=p_currency where id=item.id and user_id=actor;
  result:=jsonb_build_object('ownerId',actor,'requestId',p_request_id,'instanceId',item.id,'cost',cost);
  insert into public.vault_copy_cost_requests(owner_id,request_id,request,result) values(actor,p_request_id,payload,result);
  return result;
end $$;

create or replace function public.vendor_sale_cost_capture_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  entry record; instance uuid; item public.vault_item_instances%rowtype;
  cost jsonb; lines jsonb:='[]'; status text;
begin
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
create or replace trigger vendor_sales_cart_cost_capture
  after insert on public.vendor_sales_cart_receipts for each row
  execute function public.vendor_sale_cost_capture_v1();

create or replace function public.vendor_sale_cost_read_v1(p_request_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_ids is null or cardinality(p_request_ids) not between 1 and 100
    or array_position(p_request_ids,null) is not null then raise exception 'Use 1 to 100 receipts' using errcode='22023'; end if;
  select coalesce(jsonb_agg(s.snapshot order by s.request_id),'[]'::jsonb) into result
    from public.vendor_sale_cost_snapshots s where s.owner_id=actor and s.request_id=any(p_request_ids);
  return jsonb_build_object('ownerId',actor,'snapshots',result);
end $$;

revoke all on function public.vendor_cost_evidence_immutable_v1() from public,anon,authenticated;
revoke all on function public.vendor_cost_classify_v1(numeric,text) from public,anon,authenticated;
revoke all on function public.vendor_sale_cost_capture_v1() from public,anon,authenticated;
revoke all on function public.vault_copy_cost_read_v1(uuid[]) from public,anon;
revoke all on function public.vault_copy_cost_request_read_v1(uuid) from public,anon;
revoke all on function public.vault_copy_cost_save_v1(uuid,uuid,numeric,text,numeric,text) from public,anon;
revoke all on function public.vendor_sale_cost_read_v1(uuid[]) from public,anon;
grant execute on function public.vault_copy_cost_read_v1(uuid[]) to authenticated;
grant execute on function public.vault_copy_cost_request_read_v1(uuid) to authenticated;
grant execute on function public.vault_copy_cost_save_v1(uuid,uuid,numeric,text,numeric,text) to authenticated;
grant execute on function public.vendor_sale_cost_read_v1(uuid[]) to authenticated;
commit;
