begin;

-- Sold copies are archived by the sales flow, so the active-inventory batch
-- writer cannot backfill them. Keep the same exact GVVI ledger semantics while
-- allowing a verified sale copy to receive its historical COG.
create or replace function public.inventory_sold_cog_backfill_v1(
  p_instance_id uuid,
  p_gvvi_id text,
  p_paid_at timestamptz,
  p_cost_minor bigint
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  item public.vault_item_instances%rowtype;
  batch_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_instance_id is null or p_paid_at is null or p_cost_minor is null
     or p_cost_minor < 0 or p_cost_minor > 100000000000
     or p_gvvi_id is null or btrim(p_gvvi_id) = '' or length(btrim(p_gvvi_id)) > 200 then
    raise exception 'Invalid sold COG backfill' using errcode='22023';
  end if;
  select * into item
    from public.vault_item_instances
    where id=p_instance_id and user_id=actor
    for update;
  if not found or item.gv_vi_id is distinct from btrim(p_gvvi_id) then
    raise exception 'GVVI does not match this owned copy' using errcode='PT409';
  end if;
  if item.acquisition_cost is not null and item.acquisition_currency='USD' then
    raise exception 'This copy already has an exact COG' using errcode='PT409';
  end if;
  if not exists (
    select 1
      from public.vendor_sales_cart_receipts r
      cross join lateral jsonb_array_elements(r.request->'items') entry
     where r.owner_id=actor
       and r.receipt->>'kind' is distinct from 'purchase'
       and entry.value->>'instanceId'=p_instance_id::text
  ) then
    raise exception 'Sold copy not found' using errcode='PT409';
  end if;
  insert into public.inventory_acquisition_batches(id,owner_id,purchased_at,total_paid_minor,allocation_method,note)
    values(batch_id,actor,p_paid_at,p_cost_minor,'backfill','Sold card COG backfill');
  insert into public.inventory_acquisition_batch_lines(batch_id,owner_id,instance_id,gvvi_id,allocated_cost_minor)
    values(batch_id,actor,p_instance_id,btrim(p_gvvi_id),p_cost_minor);
  update public.vault_item_instances
    set acquisition_cost=(p_cost_minor::numeric/100), acquisition_currency='USD',
        acquisition_date=p_paid_at, acquisition_method='backfill', acquisition_batch_id=batch_id
    where id=p_instance_id and user_id=actor;
  return jsonb_build_object('batchId',batch_id,'instanceId',p_instance_id,'gvviId',btrim(p_gvvi_id),
    'purchasedAt',p_paid_at,'costMinor',p_cost_minor);
exception when unique_violation then
  raise exception 'This copy already has exact acquisition history' using errcode='PT409';
end $$;
revoke all on function public.inventory_sold_cog_backfill_v1(uuid,text,timestamptz,bigint) from public,anon;
grant execute on function public.inventory_sold_cog_backfill_v1(uuid,text,timestamptz,bigint) to authenticated;

commit;
