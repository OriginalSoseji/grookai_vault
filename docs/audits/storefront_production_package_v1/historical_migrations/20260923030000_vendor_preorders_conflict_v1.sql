-- Optimistic edit conflicts are HTTP 409, not retryable transaction failures.
begin;
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
    if current_row.version<>p_version then raise exception 'Preorder changed. Reload before editing.' using errcode='PT409'; end if;
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
commit;
