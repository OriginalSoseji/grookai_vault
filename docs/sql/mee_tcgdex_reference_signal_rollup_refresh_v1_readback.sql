-- MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1 readback.

select
  count(*)::int as row_count,
  count(*) filter (where needs_review is not true)::int as needs_review_false_rows,
  count(*) filter (where publishable is not false)::int as publishable_leak_rows,
  count(*) filter (where app_visible is not false)::int as app_visible_leak_rows,
  count(*) filter (where market_truth is not false)::int as market_truth_leak_rows,
  count(*) filter (where currency <> 'USD')::int as non_usd_rows
from public.market_reference_signal_rollups
where rollup_version = 'MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1';

select review_status, count(*)::int as rows
from public.market_reference_signal_rollups
where rollup_version = 'MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1'
group by review_status
order by review_status;
