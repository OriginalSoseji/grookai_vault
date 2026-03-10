drop view if exists public.v_best_prices_all_gv_v1;

create view public.v_best_prices_all_gv_v1 as
select
  cap.card_print_id as card_id,
  gv.grookai_value_nm::numeric(10,2) as base_market,
  case
    when gv.grookai_value_nm is null then null::text
    else 'grookai.value.v1'
  end as base_source,
  case
    when gv.grookai_value_nm is null then null::timestamptz
    else coalesce(cap.last_snapshot_at, cap.updated_at)
  end as base_ts,
  null::text as condition_label,
  null::numeric as cond_market,
  null::text as cond_source,
  null::timestamp with time zone as cond_ts,
  null::text as grade_company,
  null::numeric as grade_value,
  null::text as grade_label,
  null::numeric as grad_market,
  null::text as grad_source,
  null::timestamp with time zone as grad_ts
from public.card_print_active_prices cap
left join public.v_grookai_value_v1 gv on gv.card_print_id = cap.card_print_id
where cap.card_print_id is not null;

create or replace view public.v_vault_items as
with base as (
  select
    vi.id,
    vi.user_id,
    vi.card_id,
    vi.qty,
    vi.acquisition_cost,
    vi.condition_label,
    vi.condition_score,
    vi.is_graded,
    vi.grade_company,
    vi.grade_value,
    vi.notes,
    vi.created_at,
    vi.name,
    vi.set_name,
    vi.photo_url,
    vi.market_price,
    vi.last_price_update,
    coalesce(img.name, c.name, '(unknown)'::text) as card_name,
    img.set_code,
    img.number as img_number,
    c.number as c_number,
    c.variant,
    c.tcgplayer_id,
    c.game,
    img.image_url as card_image_url,
    img.image_best,
    img.image_alt_url,
    vi.image_source,
    vi.image_url,
    vi.image_back_source,
    vi.image_back_url
  from public.vault_items vi
  left join public.cards c on c.id = vi.card_id
  left join public.v_card_images img on img.id = vi.card_id
),
norm as (
  select
    base.id,
    base.user_id,
    base.card_id,
    base.qty,
    base.acquisition_cost,
    base.condition_label,
    base.condition_score,
    base.is_graded,
    base.grade_company,
    base.grade_value,
    base.notes,
    base.created_at,
    base.name,
    base.set_name,
    base.photo_url,
    base.market_price,
    base.last_price_update,
    base.card_name,
    base.set_code,
    base.img_number,
    base.c_number,
    base.variant,
    base.tcgplayer_id,
    base.game,
    base.image_url,
    base.image_best,
    base.image_alt_url,
    base.image_source,
    base.image_back_source,
    base.image_back_url,
    nullif(
      ltrim(
        regexp_replace(
          regexp_replace(coalesce(base.img_number, base.c_number, ''::text), '/.*$'::text, ''::text),
          '\D'::text,
          ''::text,
          'g'::text
        ),
        '0'::text
      ),
      ''::text
    ) as card_digits,
    lower(regexp_replace(coalesce(base.img_number, base.c_number, ''::text), '[^0-9a-z]'::text, ''::text, 'g'::text)) as card_num_norm
  from base
)
select
  n.id,
  n.user_id,
  n.card_id,
  coalesce(n.qty, 1) as qty,
  coalesce(n.qty, 1) as quantity,
  p.base_market::numeric(10,2) as market_price_raw,
  nullif(p.base_market, 0::numeric)::numeric(10,2) as market_price,
  nullif(p.base_market, 0::numeric)::numeric(10,2) as price,
  coalesce(n.qty, 1)::numeric * p.base_market as line_total_raw,
  coalesce(n.qty, 1)::numeric * nullif(p.base_market, 0::numeric) as line_total,
  coalesce(n.qty, 1)::numeric * nullif(p.base_market, 0::numeric) as total,
  p.base_source as price_source,
  p.base_ts as price_ts,
  n.created_at,
  n.card_name as name,
  coalesce(n.img_number, n.c_number) as number,
  n.set_code,
  n.variant,
  n.tcgplayer_id,
  n.game,
  n.card_num_norm,
  n.card_digits,
  n.set_name,
  n.photo_url,
  n.image_url,
  n.image_best,
  n.image_alt_url,
  n.image_source,
  n.image_back_source,
  n.image_back_url,
  coalesce(n.image_url, n.image_alt_url, n.image_best, n.photo_url) as image_url_first,
  coalesce(n.image_alt_url, n.image_url, n.image_best, n.photo_url) as image_url_second
from norm n
left join public.v_best_prices_all_gv_v1 p on p.card_id = n.card_id;

create or replace view public.v_vault_items_ext as
select
  vvi.id,
  vvi.user_id,
  vvi.card_id,
  vvi.qty,
  vvi.quantity,
  vvi.market_price_raw,
  vvi.market_price,
  vvi.price,
  vvi.line_total_raw,
  vvi.line_total,
  vvi.total,
  vvi.price_source,
  vvi.price_ts,
  vvi.created_at,
  vvi.name,
  vvi.number,
  vvi.set_code,
  vvi.variant,
  vvi.tcgplayer_id,
  vvi.game,
  null::text as rarity,
  vvi.image_url,
  vvi.image_best,
  vvi.image_alt_url,
  vvi.image_source,
  vvi.image_back_source,
  vvi.image_back_url,
  vvi.image_url_first,
  vvi.image_url_second,
  vi.id as vault_item_id,
  vi.condition_label,
  vi.is_graded,
  vi.grade_company,
  vi.grade_value,
  vi.grade_label,
  cm.multiplier as condition_multiplier,
  null::timestamp with time zone as cm_updated_at,
  bp.base_market,
  bp.base_source,
  bp.base_ts,
  bp.condition_label as bp_condition_label,
  bp.cond_market,
  bp.cond_source,
  bp.cond_ts,
  bp.grade_company as bp_grade_company,
  bp.grade_value as bp_grade_value,
  bp.grade_label as bp_grade_label,
  bp.grad_market,
  bp.grad_source,
  bp.grad_ts,
  case
    when vi.is_graded and bp.grad_market is not null then bp.grad_market
    when bp.cond_market is not null then bp.cond_market
    when vvi.price is not null and vi.condition_label is not null and cm.multiplier is not null then vvi.price * cm.multiplier
    else vvi.price
  end as effective_price,
  case
    when vi.is_graded and bp.grad_market is not null then 'graded'::text
    when bp.cond_market is not null then 'condition'::text
    when vvi.price is not null and vi.condition_label is not null and cm.multiplier is not null then 'derived'::text
    else 'base'::text
  end as effective_mode,
  case
    when vi.is_graded and bp.grad_market is not null then 'graded.market'::text
    when bp.cond_market is not null then 'condition.market'::text
    when vvi.price is not null and vi.condition_label is not null and cm.multiplier is not null then 'multiplier'::text
    else 'base'::text
  end as effective_source
from public.v_vault_items vvi
join public.vault_items vi on vi.id = vvi.id
left join public.v_best_prices_all_gv_v1 bp on bp.card_id = vvi.card_id
left join public.condition_multipliers cm on cm.condition_label = vi.condition_label;
