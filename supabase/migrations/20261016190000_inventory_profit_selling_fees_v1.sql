begin;

alter table public.inventory_profit_settings
  add column if not exists selling_fee_bps integer not null default 0,
  add column if not exists selling_fee_fixed_minor bigint not null default 0;
alter table public.inventory_profit_settings
  drop constraint if exists inventory_profit_settings_selling_fee_bps_check,
  drop constraint if exists inventory_profit_settings_selling_fee_fixed_minor_check;
alter table public.inventory_profit_settings
  add constraint inventory_profit_settings_selling_fee_bps_check check (selling_fee_bps between 0 and 10000),
  add constraint inventory_profit_settings_selling_fee_fixed_minor_check check (selling_fee_fixed_minor between 0 and 1000000);

create or replace function public.inventory_profit_settings_read_v1()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'incomeTaxBps', coalesce(s.income_tax_bps,2500),
    'salesTaxMode', coalesce(s.sales_tax_mode,'pass_through'),
    'salesTaxRateBps', coalesce(s.sales_tax_rate_bps,0),
    'sellingFeeBps', coalesce(s.selling_fee_bps,0),
    'sellingFeeFixedMinor', coalesce(s.selling_fee_fixed_minor,0)
  )
  from (select auth.uid() as owner_id) viewer
  left join public.inventory_profit_settings s on s.owner_id=viewer.owner_id
  where viewer.owner_id is not null;
$$;

create or replace function public.inventory_profit_settings_save_v2(
  p_income_tax_bps integer,
  p_sales_tax_mode text,
  p_sales_tax_rate_bps integer,
  p_selling_fee_bps integer,
  p_selling_fee_fixed_minor bigint
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_income_tax_bps is null or p_income_tax_bps not between 0 and 10000
     or p_sales_tax_mode not in ('pass_through','include_in_offer')
     or p_sales_tax_rate_bps is null or p_sales_tax_rate_bps not between 0 and 10000
     or p_selling_fee_bps is null or p_selling_fee_bps not between 0 and 10000
     or p_selling_fee_fixed_minor is null or p_selling_fee_fixed_minor not between 0 and 1000000 then
    raise exception 'Invalid profit settings' using errcode='22023';
  end if;
  insert into public.inventory_profit_settings(owner_id,income_tax_bps,sales_tax_mode,sales_tax_rate_bps,selling_fee_bps,selling_fee_fixed_minor)
    values(actor,p_income_tax_bps,p_sales_tax_mode,p_sales_tax_rate_bps,p_selling_fee_bps,p_selling_fee_fixed_minor)
    on conflict (owner_id) do update set income_tax_bps=excluded.income_tax_bps,
      sales_tax_mode=excluded.sales_tax_mode,sales_tax_rate_bps=excluded.sales_tax_rate_bps,
      selling_fee_bps=excluded.selling_fee_bps,selling_fee_fixed_minor=excluded.selling_fee_fixed_minor,updated_at=clock_timestamp();
  return public.inventory_profit_settings_read_v1();
end $$;
revoke all on function public.inventory_profit_settings_read_v1() from public,anon;
revoke all on function public.inventory_profit_settings_save_v2(integer,text,integer,integer,bigint) from public,anon;
grant execute on function public.inventory_profit_settings_read_v1(),public.inventory_profit_settings_save_v2(integer,text,integer,integer,bigint) to authenticated;

commit;
