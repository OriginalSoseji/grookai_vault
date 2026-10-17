begin;

-- Prefer governed current TCGPlayer Market prices, then eBay browse medians, for P&L valuation.
-- A saved vault estimate always wins; no inventory rows are mutated.
create or replace function public.inventory_card_profitability_read_v2(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_date_basis text default 'acquired',
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
  if p_date_basis not in ('acquired','sold')
     or p_income_tax_bps is null or p_income_tax_bps not between 0 and 10000
     or p_sales_tax_mode not in ('pass_through','include_in_offer')
     or p_limit is null or p_limit not between 1 and 5000 then
    raise exception 'Invalid card profitability filter' using errcode='22023';
  end if;
  with owner_card_ids as materialized (
    select coalesce(array_agg(distinct i.card_print_id) filter (where i.card_print_id is not null), '{}'::uuid[]) as ids
    from public.vault_item_instances i
    where i.user_id=actor
  ), governed_prices as materialized (
    select distinct on (price.card_print_id)
      price.card_print_id, price.market_close, price.observed_at
    from owner_card_ids owner
    cross join lateral public.get_market_pricing_read_model_v1(owner.ids, '{}'::uuid[]) price
    where price.pricing_scope='parent'
      and price.status='available'
      and price.currency='USD'
      and price.market_close is not null
      and price.market_close >= 0
    order by price.card_print_id, price.is_from_price asc, price.observed_at desc nulls last
  ), selected as (
    select i.id, i.gv_vi_id, i.name, i.set_name, i.condition_label,
      i.acquisition_cost, i.acquisition_currency, i.acquisition_date, i.created_at,
      coalesce(i.market_price, governed_price.market_close,
        case
          when lower(trim(coalesce(i.condition_label,''))) in ('lp','lightly played')
            then coalesce(active_price.lp_median, active_price.nm_median)
          when lower(trim(coalesce(i.condition_label,''))) in ('mp','moderately played','hp','heavily played','dmg','damaged')
            then active_price.lp_median
          else coalesce(active_price.nm_median, active_price.lp_median)
        end
      ) as effective_market_price,
      case when i.market_price is not null then 'saved'
           when governed_price.market_close is not null then 'tcgplayer'
           else active_price.source end as market_price_source,
      case when i.market_price is null then coalesce(governed_price.observed_at, active_price.updated_at) else null end as market_price_as_of,
      cp.name as card_name, cp.set_code as card_set_code, cp.number as card_number,
      sale.sale_at, sale.sale_request_id, sale.sale_minor, sale.tax_minor, sale.subtotal_minor, sale.selling_fee_minor
    from public.vault_item_instances i
    left join public.card_prints cp on cp.id=i.card_print_id
    left join governed_prices governed_price on governed_price.card_print_id=i.card_print_id
    left join lateral (
      select ap.nm_median, ap.lp_median, ap.source, ap.updated_at
      from public.card_print_active_prices ap
      where ap.card_print_id=i.card_print_id
        and ap.source='ebay_browse'
        and (ap.nm_median is not null or ap.lp_median is not null)
      order by ap.updated_at desc nulls last
      limit 1
    ) active_price on true
    left join lateral (
      select (r.receipt->>'createdAt')::timestamptz as sale_at,
        r.request_id as sale_request_id,
        (entry.value->>'unitMinor')::bigint as sale_minor,
        coalesce((r.receipt->>'taxMinor')::bigint,0) as tax_minor,
        coalesce((r.receipt->>'subtotalMinor')::bigint,0) as subtotal_minor,
        (select (fee->>'sellingFeeMinor')::bigint
           from public.inventory_sale_fee_snapshots snapshot
           cross join lateral jsonb_array_elements(snapshot.lines) fee
          where snapshot.owner_id=actor and snapshot.request_id=r.request_id
            and fee->>'instanceId'=i.id::text
          limit 1) as selling_fee_minor
      from public.vendor_sales_cart_receipts r
      cross join lateral jsonb_array_elements(r.request->'items') entry
      where r.owner_id=actor
        and r.receipt->>'kind' is distinct from 'purchase'
        and entry.value->>'instanceId'=i.id::text
      order by r.created_at asc
      limit 1
    ) sale on true
    where i.user_id=actor
      and ((p_date_basis='acquired' and (p_from is null or coalesce(i.acquisition_date,i.created_at) >= p_from) and (p_to is null or coalesce(i.acquisition_date,i.created_at) < p_to))
        or (p_date_basis='sold' and sale.sale_at is not null and (p_from is null or sale.sale_at >= p_from) and (p_to is null or sale.sale_at < p_to)))
    order by case when p_date_basis='sold' then sale.sale_at end asc nulls first, case when p_date_basis='acquired' then coalesce(i.acquisition_date,i.created_at) end asc nulls first, i.id
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
      case when sale_minor is null and acquisition_cost_minor is not null and effective_market_price is not null
        then round(effective_market_price*100)::bigint-acquisition_cost_minor else null end as estimated_gross_profit_minor
    from valued
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'instanceId',id,'gvviId',gv_vi_id,'name',coalesce(card_name,name,'Unknown card'),
    'setCode',coalesce(card_set_code,set_name,'—'),'number',coalesce(card_number,'—'),
    'condition',coalesce(condition_label,'Unknown'),'acquisitionDate',coalesce(acquisition_date,created_at),
    'acquisitionCostMinor',acquisition_cost_minor,'acquisitionCostKnown',acquisition_cost_minor is not null,
    'saleAt',sale_at,'saleRequestId',sale_request_id,'saleMinor',sale_minor,'allocatedSalesTaxMinor',
      case when sale_minor is not null and subtotal_minor > 0 then round(tax_minor::numeric*sale_minor/subtotal_minor)::bigint else 0 end,
    'sellingFeeMinor',selling_fee_minor,'sellingFeeRecorded',selling_fee_minor is not null,'netRevenueMinor',net_revenue_minor,'grossProfitMinor',gross_profit_minor,
    'incomeTaxMinor',case when gross_profit_minor is not null then income_tax_minor else null end,
    'profitAfterTaxMinor',profit_after_tax_minor,
    'marketPriceMinor',case when effective_market_price is not null then round(effective_market_price*100)::bigint else null end,
    'marketPriceSource',market_price_source,'marketPriceAsOf',market_price_as_of,
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
  return jsonb_build_object('ownerId',actor,'from',p_from,'to',p_to,'dateBasis',p_date_basis,'incomeTaxBps',p_income_tax_bps,
    'salesTaxMode',p_sales_tax_mode,'items',rows,'totals',totals);
end $$;
revoke all on function public.inventory_card_profitability_read_v2(timestamptz,timestamptz,text,integer,text,integer) from public,anon;
grant execute on function public.inventory_card_profitability_read_v2(timestamptz,timestamptz,text,integer,text,integer) to authenticated;

commit;
