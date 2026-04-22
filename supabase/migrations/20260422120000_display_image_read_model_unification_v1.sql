begin;

create or replace view public.v_card_images with (security_invoker = true) as
select
  id,
  set_code,
  number,
  name,
  nullif(btrim(coalesce(image_url, image_alt_url, representative_image_url)), '') as image_best,
  image_url,
  image_alt_url,
  image_source,
  representative_image_url,
  image_status,
  image_note,
  nullif(btrim(coalesce(image_url, image_alt_url, representative_image_url)), '') as display_image_url,
  case
    when nullif(btrim(coalesce(image_url, image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind
from public.card_prints;

create or replace view public.v_card_search with (security_invoker = true) as
select
  cp.id,
  cp.name,
  cp.set_code,
  cp.number,
  cp.number as number_raw,
  regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) as number_digits,
  case
    when regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text) <> ''::text
      then lpad(regexp_replace(coalesce(cp.number, ''::text), '[^0-9]'::text, ''::text, 'g'::text), 3, '0'::text)
    else null::text
  end as number_padded,
  case
    when cp.number ~ '\d+\s*/\s*\d+'::text
      then (lpad(regexp_replace(cp.number, '^\D*?(\d+).*$'::text, '\1'::text), 3, '0'::text) || '/'::text) || regexp_replace(cp.number, '^.*?/(\d+).*$'::text, '\1'::text)
    else null::text
  end as number_slashed,
  coalesce(cp.rarity, null::text) as rarity,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as thumb_url,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_best,
  pr.latest_price_cents,
  case
    when pr.latest_price_cents is not null then pr.latest_price_cents::numeric / 100.0
    else null::numeric
  end as latest_price,
  lower(cp.name) as name_lc,
  null::numeric as search_rank,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as display_image_url,
  case
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind
from public.card_prints cp
left join lateral (
  select round(coalesce(p.price_mid, p.price_high, p.price_low) * 100::numeric)::integer as latest_price_cents
  from public.latest_card_prices_v p
  where p.card_id = cp.id
  order by
    case
      when lower(coalesce(p.condition, ''::text)) = any (array['nm'::text, 'near mint'::text, 'lp'::text, 'lightly played'::text, 'raw'::text]) then 0
      else 1
    end,
    p.observed_at desc nulls last
  limit 1
) pr on true;

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
    nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
    cp.representative_image_url,
    cp.image_status,
    cp.image_note,
    nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as display_image_url,
    case
      when nullif(btrim(coalesce(vii.photo_url, vii.image_url, cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
      when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
      else 'missing'
    end as display_image_kind,
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
  slab_count,
  representative_image_url,
  image_status,
  image_note,
  display_image_url,
  display_image_kind
from discoverable_instances
where owner_card_rank = 1
order by created_at desc, vault_item_id desc;

grant select on table public.v_card_images to anon, authenticated;
grant select on table public.v_card_search to anon, authenticated;
grant select on table public.v_card_stream_v1 to anon, authenticated;

create or replace function public.vault_mobile_collector_rows_v1()
returns table (
  id uuid,
  vault_item_id uuid,
  card_id uuid,
  gv_id text,
  condition_label text,
  created_at timestamptz,
  name text,
  set_name text,
  number text,
  photo_url text,
  image_url text,
  owned_count integer,
  gv_vi_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return query
  with active_instances as (
    select
      vii.id,
      vii.card_print_id,
      vii.gv_vi_id,
      vii.created_at,
      vii.legacy_vault_item_id,
      vii.condition_label,
      vii.photo_url
    from public.vault_item_instances vii
    where vii.user_id = v_uid
      and vii.archived_at is null
      and vii.card_print_id is not null
  ),
  latest_instance as (
    select distinct on (ai.card_print_id)
      ai.card_print_id,
      ai.gv_vi_id,
      ai.created_at,
      ai.legacy_vault_item_id,
      ai.condition_label,
      ai.photo_url
    from active_instances ai
    order by ai.card_print_id, ai.created_at desc, ai.id desc
  ),
  grouped as (
    select
      ai.card_print_id,
      count(*)::integer as owned_count,
      max(ai.created_at) as created_at
    from active_instances ai
    group by ai.card_print_id
  ),
  compatibility_bucket as (
    select distinct on (vi.card_id)
      vi.card_id,
      vi.id,
      vi.gv_id,
      vi.condition_label,
      vi.name,
      vi.set_name,
      vi.photo_url,
      vi.created_at
    from public.vault_items vi
    where vi.user_id = v_uid
      and vi.archived_at is null
    order by vi.card_id, vi.created_at desc, vi.id desc
  )
  select
    coalesce(cb.id, li.legacy_vault_item_id) as id,
    coalesce(cb.id, li.legacy_vault_item_id) as vault_item_id,
    g.card_print_id as card_id,
    coalesce(nullif(btrim(cp.gv_id), ''), nullif(btrim(cb.gv_id), ''), '') as gv_id,
    coalesce(
      nullif(btrim(cb.condition_label), ''),
      nullif(btrim(li.condition_label), ''),
      'Unknown'
    ) as condition_label,
    coalesce(g.created_at, cb.created_at) as created_at,
    coalesce(
      nullif(btrim(cp.name), ''),
      nullif(btrim(cb.name), ''),
      'Unknown card'
    ) as name,
    coalesce(
      nullif(btrim(s.name), ''),
      nullif(btrim(cb.set_name), ''),
      nullif(btrim(cp.set_code), ''),
      'Unknown set'
    ) as set_name,
    coalesce(nullif(btrim(cp.number), ''), '—') as number,
    nullif(btrim(coalesce(cb.photo_url, li.photo_url)), '') as photo_url,
    nullif(btrim(coalesce(cp.image_url, cp.image_alt_url, cp.representative_image_url)), '') as image_url,
    g.owned_count,
    case
      when g.owned_count = 1 then li.gv_vi_id
      else null
    end as gv_vi_id
  from grouped g
  join latest_instance li
    on li.card_print_id = g.card_print_id
  left join compatibility_bucket cb
    on cb.card_id = g.card_print_id
  left join public.card_prints cp
    on cp.id = g.card_print_id
  left join public.sets s
    on s.id = cp.set_id
  where coalesce(cb.id, li.legacy_vault_item_id) is not null
  order by
    coalesce(g.created_at, cb.created_at) desc nulls last,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(cb.name), ''), '') asc;
end;
$$;

revoke all on function public.vault_mobile_collector_rows_v1()
from public, anon;

grant execute on function public.vault_mobile_collector_rows_v1()
to authenticated, service_role;

commit;
