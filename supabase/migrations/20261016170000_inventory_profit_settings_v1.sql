begin;

create table if not exists public.inventory_profit_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  income_tax_bps integer not null default 2500 check (income_tax_bps between 0 and 10000),
  sales_tax_mode text not null default 'pass_through' check (sales_tax_mode in ('pass_through','include_in_offer')),
  sales_tax_rate_bps integer not null default 0 check (sales_tax_rate_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);
alter table public.inventory_profit_settings enable row level security;
drop policy if exists inventory_profit_settings_owner_read_v1 on public.inventory_profit_settings;
create policy inventory_profit_settings_owner_read_v1 on public.inventory_profit_settings for select to authenticated using (owner_id=auth.uid());
revoke all on public.inventory_profit_settings from public, anon, authenticated;
grant select on public.inventory_profit_settings to authenticated;

create or replace function public.inventory_profit_settings_read_v1()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'incomeTaxBps', coalesce(s.income_tax_bps,2500),
    'salesTaxMode', coalesce(s.sales_tax_mode,'pass_through'),
    'salesTaxRateBps', coalesce(s.sales_tax_rate_bps,0)
  )
  from (select auth.uid() as owner_id) viewer
  left join public.inventory_profit_settings s on s.owner_id=viewer.owner_id
  where viewer.owner_id is not null;
$$;

create or replace function public.inventory_profit_settings_save_v1(
  p_income_tax_bps integer,
  p_sales_tax_mode text,
  p_sales_tax_rate_bps integer
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null then raise exception 'Sign in required' using errcode='28000'; end if;
  if p_income_tax_bps is null or p_income_tax_bps not between 0 and 10000
     or p_sales_tax_mode not in ('pass_through','include_in_offer')
     or p_sales_tax_rate_bps is null or p_sales_tax_rate_bps not between 0 and 10000 then
    raise exception 'Invalid profit settings' using errcode='22023';
  end if;
  insert into public.inventory_profit_settings(owner_id,income_tax_bps,sales_tax_mode,sales_tax_rate_bps)
    values(actor,p_income_tax_bps,p_sales_tax_mode,p_sales_tax_rate_bps)
    on conflict (owner_id) do update set income_tax_bps=excluded.income_tax_bps,
      sales_tax_mode=excluded.sales_tax_mode,sales_tax_rate_bps=excluded.sales_tax_rate_bps,updated_at=clock_timestamp();
  return public.inventory_profit_settings_read_v1();
end $$;
revoke all on function public.inventory_profit_settings_read_v1() from public,anon;
revoke all on function public.inventory_profit_settings_save_v1(integer,text,integer) from public,anon;
grant execute on function public.inventory_profit_settings_read_v1(),public.inventory_profit_settings_save_v1(integer,text,integer) to authenticated;

commit;
