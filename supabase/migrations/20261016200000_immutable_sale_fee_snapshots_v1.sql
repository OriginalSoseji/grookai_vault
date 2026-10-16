begin;

create table public.inventory_sale_fee_snapshots (
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key(owner_id, request_id),
  check(jsonb_typeof(lines) is distinct from 'object'),
  check(octet_length(lines::text) <= 100000)
);
alter table public.inventory_sale_fee_snapshots enable row level security;
revoke all on public.inventory_sale_fee_snapshots from public, anon, authenticated;

create or replace function public.inventory_sale_fee_snapshot_save_v1(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  cart jsonb;
  lines jsonb;
  fee_bps integer;
  fixed_minor bigint;
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_request_id is null then raise exception 'Invalid sale request' using errcode='22023'; end if;
  select request into cart
    from public.vendor_sales_cart_receipts
    where owner_id=actor and request_id=p_request_id and receipt->>'kind' is distinct from 'purchase';
  if cart is null then raise exception 'Sale request not found' using errcode='22023'; end if;
  select coalesce(s.selling_fee_bps,0), coalesce(s.selling_fee_fixed_minor,0)
    into fee_bps, fixed_minor
    from (select actor as owner_id) viewer
    left join public.inventory_profit_settings s on s.owner_id=viewer.owner_id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'instanceId', item->>'instanceId',
      'sellingFeeMinor', (round((item->>'unitMinor')::numeric * fee_bps / 10000)::bigint + fixed_minor)
    ) order by item->>'instanceId'),'[]'::jsonb)
    into lines
    from jsonb_array_elements(cart->'items') item
    where item->>'instanceId' is not null;
  insert into public.inventory_sale_fee_snapshots(owner_id,request_id,lines)
    values(actor,p_request_id,lines)
    on conflict (owner_id,request_id) do nothing;
  return jsonb_build_object('requestId',p_request_id,'lines',lines);
end $$;
revoke all on function public.inventory_sale_fee_snapshot_save_v1(uuid) from public,anon;
grant execute on function public.inventory_sale_fee_snapshot_save_v1(uuid) to authenticated;

-- The function below is the date-basis v2 reader with immutable fee evidence.
-- Owner-scoped exact-copy P&L. GVVI is the join key from acquisition evidence to
-- the immutable sale request, so a grouped card quantity can never hide its COG.
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
     or p_limit is null or p_limit not between 1 and 1000 then
    raise exception 'Invalid card profitability filter' using errcode='22023';
  end if;
  with selected as (
    select i.id, i.gv_vi_id, i.name, i.set_name, i.condition_label,
      i.acquisition_cost, i.acquisition_currency, i.acquisition_date, i.created_at,
      i.market_price, cp.name as card_name, cp.set_code as card_set_code, cp.number as card_number,
      sale.sale_at, sale.sale_minor, sale.tax_minor, sale.subtotal_minor, sale.selling_fee_minor
    from public.vault_item_instances i
    left join public.card_prints cp on cp.id=i.card_print_id
    left join lateral (
      select (r.receipt->>'createdAt')::timestamptz as sale_at,
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
    'sellingFeeMinor',selling_fee_minor,'netRevenueMinor',net_revenue_minor,'grossProfitMinor',gross_profit_minor,
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
  return jsonb_build_object('ownerId',actor,'from',p_from,'to',p_to,'dateBasis',p_date_basis,'incomeTaxBps',p_income_tax_bps,
    'salesTaxMode',p_sales_tax_mode,'items',rows,'totals',totals);
end $$;
revoke all on function public.inventory_card_profitability_read_v2(timestamptz,timestamptz,text,integer,text,integer) from public,anon;
grant execute on function public.inventory_card_profitability_read_v2(timestamptz,timestamptz,text,integer,text,integer) to authenticated;

commit;

