-- Owner-attested historical costs. Original sale, disposition and snapshot bytes remain unchanged.
begin;

create table if not exists public.vendor_sale_cost_correction_control (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into public.vendor_sale_cost_correction_control(singleton) values(true) on conflict do nothing;
create table if not exists public.vendor_sale_cost_correction_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  receipt_id uuid not null,
  line_index integer not null check(line_index between 0 and 49),
  request jsonb not null check(octet_length(request::text)<=65536),
  status text not null check(status in ('applied','cancelled')),
  revision bigint,
  source text,
  created_at timestamptz not null default now(),
  primary key(owner_id,request_id),
  unique(owner_id,receipt_id,line_index,revision),
  check((status='applied' and revision is not null and revision>0 and source is not null and source in ('canonical','legacy'))
    or (status='cancelled' and revision is null and source is null))
);
alter table public.vendor_sale_cost_correction_control enable row level security;
alter table public.vendor_sale_cost_correction_requests enable row level security;
revoke all on public.vendor_sale_cost_correction_control,public.vendor_sale_cost_correction_requests
  from public,anon,authenticated,service_role;

create or replace function public.vendor_sale_cost_correction_immutable_v1()
returns trigger language plpgsql set search_path='' as $$
begin
  raise exception 'Historical cost revision is immutable' using errcode='42501';
end $$;
create or replace trigger vendor_sale_cost_correction_immutable
  before update on public.vendor_sale_cost_correction_requests for each row
  execute function public.vendor_sale_cost_correction_immutable_v1();

create or replace function public.vendor_sale_cost_correction_validate_v1(p jsonb)
returns void language plpgsql immutable set search_path='' as $$
declare r jsonb;
begin
  if not public.vendor_event_fields_valid_v1(p,array['version','requestId','receipt','lineIndex','expectedRevision','action','cost','reason'])
    or p->'version' is distinct from '1'::jsonb or octet_length(p::text)>65536
    or not public.vendor_event_uuid_valid_v1(p->'requestId')
    or not public.vendor_event_decimal_valid_v1(p->'expectedRevision',9223372036854775806)
    or not public.vendor_event_text_valid_v1(p->'reason',1,500,true)
    or jsonb_typeof(p->'lineIndex') is distinct from 'number'
    or coalesce(p->>'lineIndex','') !~ '^(0|[1-9][0-9]?)$' then
    raise exception 'Invalid historical cost request' using errcode='22023'; end if;
  r:=p->'receipt';
  if jsonb_typeof(r) is distinct from 'object' or r->'version' is distinct from '1'::jsonb
    or jsonb_typeof(r->'id') is distinct from 'string'
    or coalesce(r->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(r->'items') is distinct from 'array' then
    raise exception 'Historical sale receipt required' using errcode='22023'; end if;
  if jsonb_array_length(r->'items') not between 1 and 50
    or (p->>'lineIndex')::integer>=jsonb_array_length(r->'items') then
    raise exception 'Invalid historical sale line' using errcode='22023'; end if;
  if p->>'action'='set' then
    if not public.vendor_event_fields_valid_v1(p->'cost',array['minor','currency'])
      or not public.vendor_event_decimal_valid_v1(p->'cost'->'minor',999999999999)
      or jsonb_typeof(p->'cost'->'currency') is distinct from 'string'
      or coalesce(p->'cost'->>'currency','') !~ '^[A-Z]{3}$' then
      raise exception 'Invalid full-line cost' using errcode='22023'; end if;
  elsif p->>'action'='restore' then
    if p->'cost' is distinct from 'null'::jsonb then raise exception 'Restore cannot contain a cost' using errcode='22023'; end if;
  else raise exception 'Invalid historical cost action' using errcode='22023'; end if;
end $$;

-- Internal owner-scoped authority lookup. No mutable inventory cost is read.
create or replace function public.vendor_sale_cost_receipt_v1(actor uuid,id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare canonical jsonb; saved jsonb; matches integer;
begin
  select receipt into canonical from public.vendor_sales_cart_receipts where owner_id=actor and request_id=id;
  select count(*),jsonb_agg(r->'receipt')->0 into matches,saved
    from public.vendor_receipt_books b cross join lateral jsonb_array_elements(b.book->'receipts') r
    where b.owner_id=actor and lower(r->'receipt'->>'id')=id::text;
  if matches>1 then return null; end if;
  if canonical is not null then
    if canonical->'version' is distinct from '1'::jsonb or lower(canonical->>'id') is distinct from id::text
      or (matches=1 and saved is distinct from canonical) then return null; end if;
    return jsonb_build_object('source','canonical','receipt',canonical);
  end if;
  if matches<>1 or saved->'version' is distinct from '1'::jsonb
    or exists(select 1 from public.vendor_sales_cart_receipts where request_id=id) then return null; end if;
  return jsonb_build_object('source','legacy','receipt',saved);
end $$;

create or replace function public.vendor_sale_cost_correction_outcome_v1(row_data public.vendor_sale_cost_correction_requests)
returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('version',1,'ownerId',row_data.owner_id,'request',row_data.request,
    'status',row_data.status,'revision',row_data.revision::text,'source',row_data.source,'recordedAt',row_data.created_at);
$$;

create or replace function public.vendor_sale_cost_correction_available_v1()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and coalesce((select enabled from public.vendor_sale_cost_correction_control where singleton),false);
$$;

create or replace function public.vendor_sale_cost_correction_recover_v1(p_request jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); prior public.vendor_sale_cost_correction_requests;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.vendor_sale_cost_correction_validate_v1(p_request);
  select * into prior from public.vendor_sale_cost_correction_requests where owner_id=actor and request_id=(p_request->>'requestId')::uuid;
  if not found then return null; end if;
  if prior.request is distinct from p_request then raise exception 'Historical cost request changed' using errcode='22023'; end if;
  return public.vendor_sale_cost_correction_outcome_v1(prior);
end $$;

create or replace function public.vendor_sale_cost_correction_apply_v1(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); outcome jsonb; authority jsonb; current_revision bigint; saved public.vendor_sale_cost_correction_requests;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.vendor_sale_cost_correction_validate_v1(p_request);
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  perform 1 from public.vendor_receipt_books where owner_id=actor for update;
  outcome:=public.vendor_sale_cost_correction_recover_v1(p_request);
  if outcome is not null then return outcome; end if;
  if not public.vendor_sale_cost_correction_available_v1() then raise exception 'Historical cost entry unavailable' using errcode='55000'; end if;
  authority:=public.vendor_sale_cost_receipt_v1(actor,(p_request->'receipt'->>'id')::uuid);
  if authority is null or authority->'receipt' is distinct from p_request->'receipt' then
    raise exception 'Saved sale changed or unavailable' using errcode='PT409'; end if;
  select coalesce(max(revision),0) into current_revision from public.vendor_sale_cost_correction_requests
    where owner_id=actor and receipt_id=(p_request->'receipt'->>'id')::uuid and line_index=(p_request->>'lineIndex')::integer;
  if current_revision<>(p_request->>'expectedRevision')::bigint then
    raise exception 'Historical cost changed; review latest revision' using errcode='PT409'; end if;
  insert into public.vendor_sale_cost_correction_requests(owner_id,request_id,receipt_id,line_index,request,status,revision,source)
    values(actor,(p_request->>'requestId')::uuid,(p_request->'receipt'->>'id')::uuid,(p_request->>'lineIndex')::integer,
      p_request,'applied',current_revision+1,authority->>'source') returning * into saved;
  return public.vendor_sale_cost_correction_outcome_v1(saved);
end $$;

create or replace function public.vendor_sale_cost_correction_cancel_v1(p_request jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); outcome jsonb; saved public.vendor_sale_cost_correction_requests;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  perform public.vendor_sale_cost_correction_validate_v1(p_request);
  insert into public.vendor_receipt_books(owner_id) values(actor) on conflict do nothing;
  perform 1 from public.vendor_receipt_books where owner_id=actor for update;
  outcome:=public.vendor_sale_cost_correction_recover_v1(p_request);
  if outcome is not null then return outcome; end if;
  insert into public.vendor_sale_cost_correction_requests(owner_id,request_id,receipt_id,line_index,request,status)
    values(actor,(p_request->>'requestId')::uuid,(p_request->'receipt'->>'id')::uuid,(p_request->>'lineIndex')::integer,p_request,'cancelled') returning * into saved;
  return public.vendor_sale_cost_correction_outcome_v1(saved);
end $$;

-- Explicit entries for every requested ID prevent partial reads being mistaken for no corrections.
create or replace function public.vendor_sale_cost_correction_read_v1(p_receipt_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); id uuid; authority jsonb; lines jsonb; result jsonb:='[]'::jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_receipt_ids is null or cardinality(p_receipt_ids) not between 1 and 100
    or array_position(p_receipt_ids,null) is not null
    or (select count(distinct v) from unnest(p_receipt_ids) v)<>cardinality(p_receipt_ids) then
    raise exception 'Invalid historical cost selection' using errcode='22023'; end if;
  foreach id in array p_receipt_ids loop
    authority:=public.vendor_sale_cost_receipt_v1(actor,id);
    select coalesce(jsonb_agg(public.vendor_sale_cost_correction_outcome_v1(latest) order by latest.line_index),'[]'::jsonb) into lines
      from public.vendor_sale_cost_correction_requests latest where latest.owner_id=actor and latest.request_id in
        (select distinct on (r.line_index) r.request_id from public.vendor_sale_cost_correction_requests r
          where r.owner_id=actor and r.receipt_id=id and r.status='applied' order by r.line_index,r.revision desc);
    result:=result||jsonb_build_array(jsonb_build_object('version',1,'ownerId',actor,'receiptId',id,
      'receipt',authority->'receipt','source',authority->'source','lines',lines));
  end loop;
  return result;
end $$;

create or replace function public.vendor_sale_cost_correction_history_v1(p_receipt_id uuid,p_line_index integer,p_before_revision bigint default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_receipt_id is null or p_line_index is null or p_line_index not between 0 and 49
    or (p_before_revision is not null and p_before_revision<=0) then raise exception 'Invalid cost history selection' using errcode='22023'; end if;
  select coalesce(jsonb_agg(public.vendor_sale_cost_correction_outcome_v1(r) order by r.revision desc),'[]'::jsonb) into result
    from public.vendor_sale_cost_correction_requests r where r.owner_id=actor and r.request_id in
      (select request_id from public.vendor_sale_cost_correction_requests where owner_id=actor and receipt_id=p_receipt_id
      and line_index=p_line_index and status='applied' and (p_before_revision is null or revision<p_before_revision)
      order by revision desc limit 50);
  return result;
end $$;

revoke all on function public.vendor_sale_cost_correction_immutable_v1() from public,anon,authenticated,service_role;
revoke all on function public.vendor_sale_cost_correction_validate_v1(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.vendor_sale_cost_receipt_v1(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.vendor_sale_cost_correction_outcome_v1(public.vendor_sale_cost_correction_requests) from public,anon,authenticated,service_role;
revoke all on function public.vendor_sale_cost_correction_available_v1() from public,anon,service_role;
revoke all on function public.vendor_sale_cost_correction_recover_v1(jsonb) from public,anon,service_role;
revoke all on function public.vendor_sale_cost_correction_apply_v1(jsonb) from public,anon,service_role;
revoke all on function public.vendor_sale_cost_correction_cancel_v1(jsonb) from public,anon,service_role;
revoke all on function public.vendor_sale_cost_correction_read_v1(uuid[]) from public,anon,service_role;
revoke all on function public.vendor_sale_cost_correction_history_v1(uuid,integer,bigint) from public,anon,service_role;
grant execute on function public.vendor_sale_cost_correction_available_v1() to authenticated;
grant execute on function public.vendor_sale_cost_correction_recover_v1(jsonb) to authenticated;
grant execute on function public.vendor_sale_cost_correction_apply_v1(jsonb) to authenticated;
grant execute on function public.vendor_sale_cost_correction_cancel_v1(jsonb) to authenticated;
grant execute on function public.vendor_sale_cost_correction_read_v1(uuid[]) to authenticated;
grant execute on function public.vendor_sale_cost_correction_history_v1(uuid,integer,bigint) to authenticated;
notify pgrst,'reload schema';
commit;
