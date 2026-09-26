-- Private future-stock planning. No publication, reservations, orders or payments.
begin;
create table if not exists public.vendor_preorders (
  id uuid primary key,
  store_id uuid not null references public.vendor_stores(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null default '' check (length(description)<=2000),
  expected_date date not null check (isfinite(expected_date)),
  price_cents integer not null check (price_cents between 1 and 100000000),
  currency text not null default 'USD' check (currency='USD'),
  allocation_limit integer not null check (allocation_limit between 1 and 100000),
  payment_mode text not null check (payment_mode in ('reservation','full','deposit')),
  deposit_cents integer,
  terms text not null check (length(btrim(terms)) between 1 and 4000),
  status text not null default 'draft' check (status in ('draft','archived')),
  version integer not null default 1 check (version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_preorders_deposit check (
    (payment_mode='deposit' and deposit_cents is not null and deposit_cents>0 and deposit_cents<price_cents)
    or (payment_mode in ('reservation','full') and deposit_cents is null))
);
create index if not exists vendor_preorders_store_idx on public.vendor_preorders(store_id,updated_at desc,id);
alter table public.vendor_preorders enable row level security;
revoke all on public.vendor_preorders from public,anon,authenticated,service_role;
grant select on public.vendor_preorders to authenticated,service_role;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='vendor_preorders' and policyname='vendor_preorders_owner_read') then
    create policy vendor_preorders_owner_read on public.vendor_preorders for select to authenticated
      using (exists(select 1 from public.vendor_stores s where s.id=store_id and s.owner_id=auth.uid()));
  end if;
end $$;

create or replace function public.vendor_preorders_owner_v1(p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare sid uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select id into sid from public.vendor_stores where owner_id=auth.uid();
  select coalesce(jsonb_agg(to_jsonb(p)-'store_id'),'[]'::jsonb) into result from
    (select * from public.vendor_preorders where store_id=sid order by updated_at desc,id limit 25 offset p_offset) p;
  return jsonb_build_object('items',result,'total',(select count(*) from public.vendor_preorders where store_id=sid));
end $$;

create or replace function public.vendor_preorders_save_v1(p_id uuid,p_version integer,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid; current_row public.vendor_preorders; candidate public.vendor_preorders; same_terms boolean;
begin
  if auth.uid() is null or not coalesce((public.vendor_store_capabilities_v1(auth.uid())->>'store_app')::boolean,false)
    or not exists(select 1 from public.vendor_store_rollout where app_enabled)
    then raise exception 'Store access unavailable' using errcode='42501'; end if;
  if p_id is null or p_version is null or p_version<0 or jsonb_typeof(p_data) is distinct from 'object'
    then raise exception 'Invalid preorder' using errcode='22023'; end if;
  select id into sid from public.vendor_stores where owner_id=auth.uid() for update;
  if sid is null then raise exception 'Create your store first' using errcode='22023'; end if;
  -- JSON conversion cannot set ownership, timestamps, version or currency.
  select * into candidate from jsonb_populate_record(null::public.vendor_preorders,p_data);
  candidate.title:=btrim(candidate.title); candidate.description:=btrim(coalesce(candidate.description,'')); candidate.terms:=btrim(candidate.terms);
  select * into current_row from public.vendor_preorders where id=p_id for update;
  if found then
    if current_row.store_id<>sid then raise exception 'Preorder unavailable' using errcode='42501'; end if;
    same_terms:= (to_jsonb(current_row)-array['id','store_id','currency','created_at','updated_at','version'])
      = (to_jsonb(candidate)-array['id','store_id','currency','created_at','updated_at','version']);
    -- A retried successful save returns the same row, without incrementing twice.
    if current_row.version=p_version+1 and same_terms then return to_jsonb(current_row)-'store_id'; end if;
    if current_row.version<>p_version then raise exception 'Preorder changed. Reload before editing.' using errcode='40001'; end if;
    update public.vendor_preorders set title=candidate.title,description=candidate.description,expected_date=candidate.expected_date,
      price_cents=candidate.price_cents,allocation_limit=candidate.allocation_limit,payment_mode=candidate.payment_mode,
      deposit_cents=candidate.deposit_cents,terms=candidate.terms,status=candidate.status,version=version+1,updated_at=now()
      where id=p_id returning * into current_row;
  else
    if p_version<>0 then raise exception 'Preorder unavailable' using errcode='22023'; end if;
    if (select count(*) from public.vendor_preorders where store_id=sid)>=1000 then raise exception 'Preorder draft limit reached' using errcode='22023'; end if;
    insert into public.vendor_preorders(id,store_id,title,description,expected_date,price_cents,allocation_limit,payment_mode,deposit_cents,terms,status)
      values(p_id,sid,candidate.title,candidate.description,candidate.expected_date,candidate.price_cents,candidate.allocation_limit,
        candidate.payment_mode,candidate.deposit_cents,candidate.terms,candidate.status) returning * into current_row;
  end if;
  return to_jsonb(current_row)-'store_id';
end $$;
revoke all on function public.vendor_preorders_owner_v1(integer),public.vendor_preorders_save_v1(uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.vendor_preorders_owner_v1(integer),public.vendor_preorders_save_v1(uuid,integer,jsonb) to authenticated;
comment on table public.vendor_preorders is 'Private preorder planning; payment_mode is a vendor preference, never payment or reservation evidence. No owned inventory is created.';
commit;
