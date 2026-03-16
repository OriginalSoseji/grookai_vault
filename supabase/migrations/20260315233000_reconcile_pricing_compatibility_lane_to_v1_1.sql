create or replace view public.v_best_prices_all_gv_v1 as
select
  cap.card_print_id as card_id,
  gv.grookai_value_nm::numeric(10,2) as base_market,
  case
    when gv.grookai_value_nm is null then null::text
    else 'grookai.value.v1_1'
  end as base_source,
  case
    when gv.grookai_value_nm is null then null::timestamptz
    else coalesce(cap.last_snapshot_at, cap.updated_at)
  end as base_ts,
  null::text as condition_label,
  null::numeric as cond_market,
  null::text as cond_source,
  null::timestamptz as cond_ts,
  null::text as grade_company,
  null::numeric as grade_value,
  null::text as grade_label,
  null::numeric as grad_market,
  null::text as grad_source,
  null::timestamptz as grad_ts
from public.card_print_active_prices cap
left join public.v_grookai_value_v1_1 gv
  on gv.card_print_id = cap.card_print_id
where cap.card_print_id is not null;
