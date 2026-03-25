begin;

create or replace view public.v_card_stream_v1 as
with discoverable_instances as (
  select
    vii.id as instance_id,
    vii.legacy_vault_item_id as vault_item_id,
    vii.user_id as owner_user_id,
    pp.slug as owner_slug,
    pp.display_name as owner_display_name,
    coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
    vii.intent,
    vii.slab_cert_id,
    vii.condition_label,
    vii.is_graded,
    vii.grade_company,
    vii.grade_value,
    vii.grade_label,
    vii.created_at,
    cp.gv_id,
    cp.name,
    cp.set_code,
    s.name as set_name,
    cp.number,
    coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url) as image_url,
    row_number() over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      order by vii.created_at desc, vii.id desc
    ) as owner_card_rank,
    (count(*) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as in_play_count,
    (sum(case when vii.intent = 'trade' then 1 else 0 end) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as trade_count,
    (sum(case when vii.intent = 'sell' then 1 else 0 end) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as sell_count,
    (sum(case when vii.intent = 'showcase' then 1 else 0 end) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as showcase_count,
    (sum(case when vii.slab_cert_id is null then 1 else 0 end) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as raw_count,
    (sum(case when vii.slab_cert_id is not null then 1 else 0 end) over (
      partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
    ))::integer as slab_count
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  join public.card_prints cp
    on cp.id = coalesce(vii.card_print_id, sc.card_print_id)
  left join public.sets s
    on s.id = cp.set_id
  join public.public_profiles pp
    on pp.user_id = vii.user_id
  where vii.archived_at is null
    and vii.legacy_vault_item_id is not null
    and vii.intent in ('trade', 'sell', 'showcase')
    and pp.public_profile_enabled = true
    and pp.vault_sharing_enabled = true
)
select
  vault_item_id,
  owner_user_id,
  owner_slug,
  owner_display_name,
  card_print_id,
  case
    when trade_count > 0 and sell_count = 0 and showcase_count = 0 then 'trade'
    when sell_count > 0 and trade_count = 0 and showcase_count = 0 then 'sell'
    when showcase_count > 0 and trade_count = 0 and sell_count = 0 then 'showcase'
    else null
  end as intent,
  in_play_count as quantity,
  case
    when in_play_count = 1 and slab_count = 0 then condition_label
    else null
  end as condition_label,
  case
    when in_play_count = 1 and slab_count = 1 then true
    else false
  end as is_graded,
  case
    when in_play_count = 1 and slab_count = 1 then grade_company
    else null
  end as grade_company,
  case
    when in_play_count = 1 and slab_count = 1 then grade_value
    else null
  end as grade_value,
  case
    when in_play_count = 1 and slab_count = 1 then grade_label
    else null
  end as grade_label,
  created_at,
  gv_id,
  name,
  set_code,
  set_name,
  number,
  image_url,
  in_play_count,
  trade_count,
  sell_count,
  showcase_count,
  raw_count,
  slab_count
from discoverable_instances
where owner_card_rank = 1
order by created_at desc, vault_item_id desc;

grant select on table public.v_card_stream_v1 to anon;
grant select on table public.v_card_stream_v1 to authenticated;

commit;
