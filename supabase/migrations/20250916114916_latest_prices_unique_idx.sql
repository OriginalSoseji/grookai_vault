-- Unique row identity required for CONCURRENT refresh
create unique index if not exists uq_latest_prices_row
  on public.latest_prices (print_id, condition, grade_agency, grade_value, source);

-- (optional) keep the non-unique print_id index or drop it if redundant:
-- drop index if exists idx_latest_prices_print;
