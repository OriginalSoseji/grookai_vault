begin;

create or replace function public.inventory_acquisition_batch_report_v1(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 100
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid := auth.uid(); rows jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_limit is null or p_limit not between 1 and 500 then raise exception 'Invalid acquisition report filter' using errcode='22023'; end if;
  with batch_lines as (
    select b.id as batch_id, b.purchased_at, b.total_paid_minor, b.allocation_method,
      l.instance_id, l.allocated_cost_minor, i.market_price,
      sold.sales_minor
    from public.inventory_acquisition_batches b
    join public.inventory_acquisition_batch_lines l on l.batch_id=b.id and l.owner_id=actor
    left join public.vault_item_instances i on i.id=l.instance_id and i.user_id=actor
    left join lateral (
      select (entry.value->>'unitMinor')::bigint as sales_minor
      from public.vendor_sales_cart_receipts receipt
      cross join lateral jsonb_array_elements(receipt.request->'items') entry
      where receipt.owner_id=actor
        and receipt.receipt->>'kind' is distinct from 'purchase'
        and entry.value->>'instanceId'=l.instance_id::text
      order by receipt.created_at asc
      limit 1
    ) sold on true
    where b.owner_id=actor
      and (p_from is null or b.purchased_at >= p_from)
      and (p_to is null or b.purchased_at < p_to)
  ), grouped as (
    select batch_id, min(purchased_at) as purchased_at, max(total_paid_minor) as total_paid_minor,
      max(allocation_method) as allocation_method, count(*)::integer as line_count,
      count(sales_minor)::integer as sold_count,
      coalesce(sum(allocated_cost_minor),0)::bigint as allocated_cog_minor,
      coalesce(sum(sales_minor),0)::bigint as sold_revenue_minor,
      coalesce(sum(allocated_cost_minor) filter (where sales_minor is not null),0)::bigint as realized_cog_minor,
      coalesce(sum(allocated_cost_minor) filter (where sales_minor is null),0)::bigint as remaining_cog_minor,
      coalesce(sum(sales_minor-allocated_cost_minor) filter (where sales_minor is not null),0)::bigint as realized_profit_minor,
      coalesce(sum((market_price*100)::bigint) filter (where market_price is not null and sales_minor is null),0)::bigint as remaining_estimated_value_minor
    from batch_lines
    group by batch_id
  ), limited as (
    select * from grouped order by purchased_at asc, batch_id limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'batchId', batch_id, 'purchasedAt', purchased_at, 'totalPaidMinor', total_paid_minor,
    'allocationMethod', allocation_method, 'lineCount', line_count, 'soldCount', sold_count,
    'remainingCount', line_count-sold_count, 'allocatedCogMinor', allocated_cog_minor,
    'soldRevenueMinor', sold_revenue_minor, 'realizedCogMinor', realized_cog_minor,
    'remainingCogMinor', remaining_cog_minor, 'realizedProfitMinor', realized_profit_minor,
    'remainingEstimatedValueMinor', remaining_estimated_value_minor
  ) order by purchased_at asc, batch_id),'[]'::jsonb)
  into rows from limited;
  return jsonb_build_object('ownerId',actor,'from',p_from,'to',p_to,'batches',rows);
end $$;
revoke all on function public.inventory_acquisition_batch_report_v1(timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.inventory_acquisition_batch_report_v1(timestamptz,timestamptz,integer) to authenticated;

commit;
