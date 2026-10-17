begin;

-- Bulk historical COG for archived sold copies. Every line remains anchored to
-- one exact GVVI instance; the function only accepts copies whose acquisition
-- evidence is still absent and verifies that each copy really appears in a sale.
create or replace function public.inventory_sold_cog_batch_backfill_v1(
  p_batch_id uuid,
  p_paid_at timestamptz,
  p_total_paid_minor bigint,
  p_lines jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  line jsonb;
  item public.vault_item_instances%rowtype;
  instance_id uuid;
  gvvi text;
  amount bigint;
  ids uuid[] := '{}';
  total bigint := 0;
  count_lines integer;
  prior public.inventory_acquisition_batches%rowtype;
  result jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_batch_id is null or p_paid_at is null or p_total_paid_minor is null
     or p_total_paid_minor < 0 or p_total_paid_minor > 100000000000
     or jsonb_typeof(p_lines) is distinct from 'array'
     or jsonb_array_length(p_lines) not between 1 and 1000 then
    raise exception 'Invalid sold COG batch' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('sold-cog:'||actor::text||':'||p_batch_id::text,0));
  select * into prior from public.inventory_acquisition_batches where owner_id=actor and id=p_batch_id;
  if found then
    select jsonb_build_object('batchId', prior.id, 'purchasedAt', prior.purchased_at,
      'totalPaidMinor', prior.total_paid_minor, 'allocationMethod', prior.allocation_method,
      'lineCount', count(*))
      from public.inventory_acquisition_batch_lines where owner_id=actor and batch_id=prior.id
      into result;
    return result;
  end if;

  count_lines := jsonb_array_length(p_lines);
  for line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(line) is distinct from 'object'
       or line - array['instanceId','gvviId','allocatedMinor'] <> '{}'::jsonb
       or jsonb_typeof(line->'instanceId') is distinct from 'string'
       or jsonb_typeof(line->'gvviId') is distinct from 'string'
       or jsonb_typeof(line->'allocatedMinor') is distinct from 'number'
       or coalesce(line->>'allocatedMinor','') !~ '^\d{1,12}$' then
      raise exception 'Invalid sold COG batch line' using errcode='22023';
    end if;
    begin
      instance_id := (line->>'instanceId')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid sold COG batch line' using errcode='22023';
    end;
    gvvi := btrim(line->>'gvviId');
    amount := (line->>'allocatedMinor')::bigint;
    if instance_id = any(ids) or length(gvvi) = 0 or length(gvvi) > 200 or amount < 0 then
      raise exception 'Repeated or invalid sold COG copy' using errcode='22023';
    end if;
    ids := array_append(ids, instance_id);
    total := total + amount;
    if total > 100000000000 then raise exception 'Sold COG total is too large' using errcode='22023'; end if;
  end loop;
  if p_total_paid_minor <> total then
    raise exception 'Allocated costs must equal the bulk paid total' using errcode='22023';
  end if;

  insert into public.inventory_acquisition_batches(id,owner_id,purchased_at,total_paid_minor,allocation_method,note)
    values(p_batch_id,actor,p_paid_at,p_total_paid_minor,'backfill','Sold card COG bulk backfill');

  for line in select value from jsonb_array_elements(p_lines) loop
    instance_id := (line->>'instanceId')::uuid;
    gvvi := btrim(line->>'gvviId');
    amount := (line->>'allocatedMinor')::bigint;
    select * into item
      from public.vault_item_instances
      where id=instance_id and user_id=actor
      for update;
    if not found or item.gv_vi_id is distinct from gvvi then
      raise exception 'GVVI does not match this owned copy' using errcode='PT409';
    end if;
    if item.acquisition_cost is not null or item.acquisition_currency is not null or item.acquisition_batch_id is not null then
      raise exception 'One or more copies already has exact COG' using errcode='PT409';
    end if;
    if not exists (
      select 1
        from public.vendor_sales_cart_receipts r
        cross join lateral jsonb_array_elements(r.request->'items') entry
       where r.owner_id=actor
         and r.receipt->>'kind' is distinct from 'purchase'
         and entry.value->>'instanceId'=instance_id::text
    ) then
      raise exception 'One or more sold copies was not found' using errcode='PT409';
    end if;
    insert into public.inventory_acquisition_batch_lines(batch_id,owner_id,instance_id,gvvi_id,allocated_cost_minor)
      values(p_batch_id,actor,instance_id,gvvi,amount);
    update public.vault_item_instances
      set acquisition_cost=(amount::numeric/100), acquisition_currency='USD',
          acquisition_date=p_paid_at, acquisition_method='backfill', acquisition_batch_id=p_batch_id
      where id=instance_id and user_id=actor;
  end loop;

  return jsonb_build_object('batchId',p_batch_id,'purchasedAt',p_paid_at,
    'totalPaidMinor',p_total_paid_minor,'allocationMethod','backfill','lineCount',count_lines);
exception when unique_violation then
  raise exception 'One or more copies already has exact acquisition history' using errcode='PT409';
end $$;
revoke all on function public.inventory_sold_cog_batch_backfill_v1(uuid,timestamptz,bigint,jsonb) from public,anon;
grant execute on function public.inventory_sold_cog_batch_backfill_v1(uuid,timestamptz,bigint,jsonb) to authenticated;

commit;
