-- Draft-only custom product batches. Existing product mutation remains authoritative.
begin;

create table if not exists public.vendor_store_custom_imports (
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  id uuid not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  product_ids uuid[] not null check (
    cardinality(product_ids) between 1 and 100 and array_ndims(product_ids)=1
    and array_position(product_ids,null) is null
  ),
  created_at timestamptz not null default now(),
  primary key (store_id,id)
);
alter table public.vendor_store_custom_imports enable row level security;
revoke all on public.vendor_store_custom_imports from public,anon,authenticated;
grant select on public.vendor_store_custom_imports to authenticated;
do $$ begin
  if not exists (select 1 from pg_policy where polrelid='public.vendor_store_custom_imports'::regclass and polname='custom_import_owner_read') then
    create policy custom_import_owner_read on public.vendor_store_custom_imports
      for select to authenticated using (exists (
        select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()
      ));
  end if;
end $$;

create or replace function public.vendor_store_custom_import_v1(p_import_id uuid,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  s public.vendor_stores;
  batch public.vendor_store_custom_imports;
  request_hash text;
  item jsonb;
  result jsonb;
  product_ids uuid[] := '{}';
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_import_id is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Invalid import batch' using errcode='22023';
  end if;
  if jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>1048576 then
    raise exception 'Import limit exceeded' using errcode='22023';
  end if;
  request_hash:=encode(sha256(convert_to(p_rows::text,'UTF8')),'hex');
  -- Same owner/store lock order as ordinary custom edits, including nested writes.
  perform pg_advisory_xact_lock(hashtextextended('vendor-store:'||auth.uid()::text,0));
  select * into s from public.vendor_stores where owner_id=auth.uid() for update;
  if s.id is null then raise exception 'Store unavailable' using errcode='42501'; end if;
  select * into batch from public.vendor_store_custom_imports where store_id=s.id and id=p_import_id;
  if batch.id is not null then
    if batch.request_sha256<>request_hash then
      raise exception 'Import batch payload changed' using errcode='PT409';
    end if;
    -- Retained receipts remain readable after downgrade, without creating products.
    return jsonb_build_object('id',batch.id,'product_ids',batch.product_ids,'created_at',batch.created_at);
  end if;
  for item in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'title') is distinct from 'string'
      or coalesce(btrim(item->>'title'),'')='' or not (item ? 'available_quantity') then
      raise exception 'Import requires a title and quantity for each product' using errcode='22023';
    end if;
    -- Governs all field limits, ownership, active package and rollout. Creates only
    -- a new private draft; any failure rolls back every product/event in this batch.
    result:=public.vendor_store_custom_mutate_v1(null,null,'save',item);
    if result#>>'{products,0,id}' is null then
      raise exception 'Import product readback missing' using errcode='55000';
    end if;
    product_ids:=array_append(product_ids,(result#>>'{products,0,id}')::uuid);
  end loop;
  insert into public.vendor_store_custom_imports(store_id,id,request_sha256,product_ids)
    values(s.id,p_import_id,request_hash,product_ids) returning * into batch;
  return jsonb_build_object('id',batch.id,'product_ids',batch.product_ids,'created_at',batch.created_at);
end $$;
revoke all on function public.vendor_store_custom_import_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.vendor_store_custom_import_v1(uuid,jsonb) to authenticated;

commit;
