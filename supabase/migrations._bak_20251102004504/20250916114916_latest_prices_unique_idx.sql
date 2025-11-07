-- Guard: only create when latest_prices exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public' AND matviewname = 'latest_prices'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_latest_prices_row
             ON public.latest_prices (print_id, condition, grade_agency, grade_value, source)';
  END IF;
END
$$;

-- (optional) keep the non-unique print_id index or drop it if redundant:
-- drop index if exists idx_latest_prices_print;
