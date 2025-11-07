-- Performance indexes for hot paths (created 2025-11-03)
-- Adjust table/column names if they differ in this schema.

-- Latest prices lookup (example; skip if table is a view or MV without direct indexes)
do $$
begin
  if to_regclass('public.latest_prices_card_condition_idx') is null then
    execute 'create index latest_prices_card_condition_idx on public.latest_card_prices(card_id, condition_label)';
  end if;
exception when others then
  -- leave a breadcrumb; some deployments use a MV/view here
  raise notice 'Skipping latest_card_prices index (table/view may differ)';
end$$;

-- Listings for wall feed
do $$
begin
  if to_regclass('public.listings_status_created_idx') is null then
    execute 'create index listings_status_created_idx on public.listings(status, created_at desc)';
  end if;
  if to_regclass('public.listings_card_print_id_idx') is null then
    execute 'create index listings_card_print_id_idx on public.listings(card_print_id)';
  end if;
end$$;

