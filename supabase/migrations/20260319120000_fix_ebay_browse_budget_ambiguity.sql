-- Fix ambiguous column reference in consume function

DROP FUNCTION IF EXISTS public.consume_ebay_browse_daily_budget_v1;

CREATE OR REPLACE FUNCTION public.consume_ebay_browse_daily_budget_v1(
  p_provider text,
  p_usage_date date,
  p_increment integer DEFAULT 1
)
RETURNS TABLE (
  remaining_calls integer,
  consumed_calls integer,
  daily_budget integer,
  usage_date date
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_daily_budget integer := 4200;
BEGIN
  INSERT INTO public.ebay_browse_daily_budget_v1 (provider, usage_date, consumed_calls)
  VALUES (p_provider, p_usage_date, 0)
  ON CONFLICT (provider, usage_date) DO NOTHING;

  UPDATE public.ebay_browse_daily_budget_v1 b
  SET consumed_calls = b.consumed_calls + p_increment
  WHERE b.provider = p_provider
    AND b.usage_date = p_usage_date;

  RETURN QUERY
  SELECT
    (v_daily_budget - b.consumed_calls),
    b.consumed_calls,
    v_daily_budget,
    b.usage_date
  FROM public.ebay_browse_daily_budget_v1 b
  WHERE b.provider = p_provider
    AND b.usage_date = p_usage_date;

END;
$$;