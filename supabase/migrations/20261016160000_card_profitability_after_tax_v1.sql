begin;

-- Owner-scoped exact-copy P&L. GVVI is the join key from acquisition evidence to
-- the immutable sale request, so a grouped card quantity can never hide its COG.
create or replace function public.inventory_card_profitability_read_v1(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_income_tax_bps integer default 2500,
  p_sales_tax_mode text default 'pass_through',
  p_limit integer default 500
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  rows jsonb;
  totals jsonb;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_income_tax_bps is null or p_income_tax_bps not between 0 and 10000
     or p_sales_tax_mode not in ('pass_through','include_in_offer')
     or p_limit is null or p_limit not between 1 and 1000 then
    raise exception 'Invalid card profitability filter' using errcode='22023';
  end if;
  with selected as (
    select i.id, i.gv_vi_id, i.name, i.set_name, i.condition_label,
      i.acquisition_cost, i.acquisition_currency, i.acquisition_date, i.created_at,
      i.market_price, cp.name as card_name, cp.set_code as card_set_code, cp.number as card_number,
      sale.sale_at, sale.sale_minor, sale.tax_minor, sale.subtotal_minor
    from public.vault_item_instances i
    left join public.card_prints cp on cp.id=i.card_print_id
    left join lateral (
      select (r.receipt->>'createdAt')::timestamptz as sale_at,
        (entry.value->>'unitMinor')::bigint as sale_minor,
        coalesce((r.receipt->>'taxMinor')::bigint,0) as tax_minor,
        coalesce((r.receipt->>'subtotalMinor')::bigint,0) as subtotal_minor
      from public.vendor_sales_cart_receipts r
      cross join lateral jsonb_array_elements(r.request->'items') entry
      where r.owner_id=actor
        and r.receipt->>'kind' is distinct from 'purchase'
        and entry.value->>'instanceId'=i.id::text
      order by r.created_at asc
      limit 1
    ) sale on true
    where i.user_id=actor
      and (p_from is null or coalesce(i.acquisition_date,i.created_at) >= p_from)
      and (p_to is null or coalesce(i.acquisition_date,i.created_at) < p_to)
    order by coalesce(i.acquisition_date,i.created_at) asc nulls first, i.id
    limit p_limit
  ), calculated as (
    select selected.*,
      case when sale_minor is null then null::bigint
        when p_sales_tax_mode = 'include_in_offer' then sale_minor -
          case when subtotal_minor > 0 then round(tax_minor::numeric * sale_minor / subtotal_minor)::bigint else 0 end
        else sale_minor end as net_revenue_minor,
      case when acquisition_cost is not null and acquisition_currency='USD' then round(acquisition_cost*100)::bigint else null end as acquisition_cost_minor
    from selected
  ), valued as (
    select calculated.*,
      case when sale_minor is not null and acquisition_cost_minor is not null then net_revenue_minor-acquisition_cost_minor else null end as gross_profit_minor,
      case when sale_minor is not null and acquisition_cost_minor is not null and net_revenue_minor-acquisition_cost_minor > 0
        then round((net_revenue_minor-acquisition_cost_minor)::numeric * p_income_tax_bps / 10000)::bigint else 0 end as income_tax_minor
    from calculated
  ), final_rows as (
    select valued.*,
      case when gross_profit_minor is not null then gross_profit_minor-income_tax_minor else null end as profit_after_tax_minor,
      case when sale_minor is null and acquisition_cost_minor is not null and market_price is not null
        then round(market_price*100)::bigint-acquisition_cost_minor else null end as estimated_gross_profit_minor
    from valued
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'instanceId',id,'gvviId',gv_vi_id,'name',coalesce(card_name,name,'Unknown card'),
    'setCode',coalesce(card_set_code,set_name,'—'),'number',coalesce(card_number,'—'),
    'condition',coalesce(condition_label,'Unknown'),'acquisitionDate',coalesce(acquisition_date,created_at),
    'acquisitionCostMinor',acquisition_cost_minor,'acquisitionCostKnown',acquisition_cost_minor is not null,
    'saleAt',sale_at,'saleMinor',sale_minor,'allocatedSalesTaxMinor',
      case when sale_minor is not null and subtotal_minor > 0 then round(tax_minor::numeric*sale_minor/subtotal_minor)::bigint else 0 end,
    'netRevenueMinor',net_revenue_minor,'grossProfitMinor',gross_profit_minor,
    'incomeTaxMinor',case when gross_profit_minor is not null then income_tax_minor else null end,
    'profitAfterTaxMinor',profit_after_tax_minor,'marketPriceMinor',case when market_price is not null then round(market_price*100)::bigint else null end,
    'estimatedGrossProfitMinor',estimated_gross_profit_minor,
    'status',case when sale_minor is null then 'unsold' when acquisition_cost_minor is null then 'sold_unknown_cost' else 'realized' end
  ) order by coalesce(acquisition_date,created_at) asc nulls first,id),'[]'::jsonb)
  into rows
  from final_rows;

  with items as (
    select * from jsonb_to_recordset(rows) as x(
      "saleMinor" bigint, "acquisitionCostMinor" bigint, "grossProfitMinor" bigint,
      "incomeTaxMinor" bigint, "profitAfterTaxMinor" bigint, "status" text)
  )
  select jsonb_build_object(
    'realizedRevenueMinor',coalesce(sum("saleMinor") filter (where "status"='realized'),0),
    'realizedCogMinor',coalesce(sum("acquisitionCostMinor") filter (where "status"='realized'),0),
    'grossProfitMinor',coalesce(sum("grossProfitMinor") filter (where "status"='realized'),0),
    'incomeTaxMinor',coalesce(sum("incomeTaxMinor") filter (where "status"='realized'),0),
    'profitAfterTaxMinor',coalesce(sum("profitAfterTaxMinor") filter (where "status"='realized'),0),
    'knownSoldCount',count(*) filter (where "status"='realized'),
    'unknownCostCount',count(*) filter (where "status"='sold_unknown_cost'),
    'unsoldCount',count(*) filter (where "status"='unsold')
  ) into totals from items;
  return jsonb_build_object('ownerId',actor,'from',p_from,'to',p_to,'incomeTaxBps',p_income_tax_bps,
    'salesTaxMode',p_sales_tax_mode,'items',rows,'totals',totals);
end $$;
revoke all on function public.inventory_card_profitability_read_v1(timestamptz,timestamptz,integer,text,integer) from public,anon;
grant execute on function public.inventory_card_profitability_read_v1(timestamptz,timestamptz,integer,text,integer) to authenticated;

commit;
