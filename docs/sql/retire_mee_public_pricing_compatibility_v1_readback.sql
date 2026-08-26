-- RETIRE-MEE-PUBLIC-PRICING-COMPATIBILITY-V1-READBACK

with view_state as (
  select definition
  from pg_views
  where schemaname = 'public'
    and viewname = 'v_card_pricing_ui_v1'
), grants as (
  select grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'v_card_pricing_ui_v1'
)
select
  to_regclass('public.v_card_pricing_ui_v1') is not null as view_exists,
  (select count(*) from public.v_card_pricing_ui_v1) as row_count,
  coalesce((select definition not ilike '%market_evidence%' from view_state), false)
    as no_market_evidence_reference,
  coalesce((select definition not ilike '%ebay_active_prices%' from view_state), false)
    as no_ebay_active_price_reference,
  coalesce((select definition not ilike '%market_price_publication%' from view_state), false)
    as no_market_publication_reference,
  not exists (
    select 1 from grants
    where grantee in ('PUBLIC', 'anon', 'authenticated')
  ) as app_roles_denied,
  exists (
    select 1 from grants
    where grantee = 'service_role' and privilege_type = 'SELECT'
  ) as service_readback_allowed;

select
  has_function_privilege('anon', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute')
    as anon_market_rpc_execute,
  has_function_privilege('authenticated', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute')
    as authenticated_market_rpc_execute,
  has_function_privilege('service_role', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute')
    as service_market_rpc_execute;
