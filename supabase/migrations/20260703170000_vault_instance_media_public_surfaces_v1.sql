begin;

-- LOCK: Exact-copy uploaded front photos are public presentation inputs only
-- when the copy's image_display_mode is uploaded. Canonical card art remains
-- the fallback path for cards that do not opt into uploaded presentation.

create or replace function public.vault_save_instance_media_path_v1(
  p_instance_id uuid,
  p_side text,
  p_storage_path text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_side text := lower(btrim(coalesce(p_side, '')));
  v_uid uuid := auth.uid();
  v_expected_path text;
  v_instance public.vault_item_instances%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_side not in ('front', 'back') then
    raise exception 'invalid_user_card_image_side';
  end if;

  if p_instance_id is null then
    raise exception 'invalid_vault_instance';
  end if;

  if p_storage_path is not null and btrim(p_storage_path) <> '' then
    v_expected_path := v_uid::text || '/vault-instances/' || p_instance_id::text || '/' || v_side || '/current';
    if btrim(p_storage_path) <> v_expected_path then
      raise exception 'invalid_user_card_image_path';
    end if;
  end if;

  update public.vault_item_instances
  set
    image_url = case when v_side = 'front' then nullif(btrim(p_storage_path), '') else image_url end,
    image_source = case
      when v_side = 'front' and nullif(btrim(p_storage_path), '') is not null then 'user_photo'
      when v_side = 'front' then null
      else image_source
    end,
    image_back_url = case when v_side = 'back' then nullif(btrim(p_storage_path), '') else image_back_url end,
    image_back_source = case
      when v_side = 'back' and nullif(btrim(p_storage_path), '') is not null then 'user_photo'
      when v_side = 'back' then null
      else image_back_source
    end,
    image_display_mode = case
      when v_side = 'front' and nullif(btrim(p_storage_path), '') is not null then 'uploaded'
      when v_side = 'front' then 'canonical'
      else image_display_mode
    end
  where id = p_instance_id
    and user_id = v_uid
    and archived_at is null
  returning *
  into v_instance;

  if not found then
    raise exception 'vault_item_instance_not_owned';
  end if;

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'image_url', v_instance.image_url,
    'image_back_url', v_instance.image_back_url,
    'image_display_mode', v_instance.image_display_mode
  );
end;
$$;

revoke execute on function public.vault_save_instance_media_path_v1(uuid, text, text) from public, anon;
grant execute on function public.vault_save_instance_media_path_v1(uuid, text, text) to authenticated;

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
    nullif(btrim(coalesce(
      case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
      case when vii.image_display_mode = 'uploaded' then vii.image_url end,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    )), '') as image_url,
    cp.representative_image_url,
    cp.image_status,
    cp.image_note,
    nullif(btrim(coalesce(
      case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
      case when vii.image_display_mode = 'uploaded' then vii.image_url end,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    )), '') as display_image_url,
    case
      when vii.image_display_mode = 'uploaded'
        and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null then 'exact'
      when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
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
  case when in_play_count = 1 and slab_count = 0 then condition_label else null end as condition_label,
  case when in_play_count = 1 and slab_count = 1 then true else false end as is_graded,
  case when in_play_count = 1 and slab_count = 1 then grade_company else null end as grade_company,
  case when in_play_count = 1 and slab_count = 1 then grade_value else null end as grade_value,
  case when in_play_count = 1 and slab_count = 1 then grade_label else null end as grade_label,
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

create or replace view public.v_wall_cards_v1 as
select
  vii.id as instance_id,
  vii.gv_vi_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
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
  sets.name as set_name,
  cp.number,
  nullif(btrim(coalesce(
    case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
    case when vii.image_display_mode = 'uploaded' then vii.image_url end,
    cp.image_url,
    cp.image_alt_url,
    cp.representative_image_url
  )), '') as image_url,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(
    case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
    case when vii.image_display_mode = 'uploaded' then vii.image_url end,
    cp.image_url,
    cp.image_alt_url,
    cp.representative_image_url
  )), '') as display_image_url,
  case
    when vii.image_display_mode = 'uploaded'
      and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null then 'exact'
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category,
  case when vii.image_display_mode = 'uploaded' then nullif(btrim(vii.image_back_url), '') end as image_back_url,
  vii.image_display_mode
from public.vault_item_instances vii
left join public.slab_certs slab
  on slab.id = vii.slab_cert_id
join public.card_prints cp
  on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
left join public.sets
  on sets.id = cp.set_id
join public.public_profiles pp
  on pp.user_id = vii.user_id
left join public.shared_cards shared
  on shared.user_id = vii.user_id
 and shared.card_id = cp.id
 and shared.is_shared = true
where vii.archived_at is null
  and vii.intent in ('trade', 'sell', 'showcase')
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true;

create or replace view public.v_section_cards_v1 as
select
  ws.id as section_id,
  ws.name as section_name,
  ws.position as section_position,
  vii.id as instance_id,
  vii.gv_vi_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
  vii.intent,
  vii.slab_cert_id,
  vii.condition_label,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  wsm.created_at as section_added_at,
  vii.created_at as instance_created_at,
  cp.gv_id,
  cp.name,
  cp.set_code,
  sets.name as set_name,
  cp.number,
  nullif(btrim(coalesce(
    case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
    case when vii.image_display_mode = 'uploaded' then vii.image_url end,
    cp.image_url,
    cp.image_alt_url,
    cp.representative_image_url
  )), '') as image_url,
  cp.representative_image_url,
  cp.image_status,
  cp.image_note,
  nullif(btrim(coalesce(
    case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
    case when vii.image_display_mode = 'uploaded' then vii.image_url end,
    cp.image_url,
    cp.image_alt_url,
    cp.representative_image_url
  )), '') as display_image_url,
  case
    when vii.image_display_mode = 'uploaded'
      and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null then 'exact'
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '') is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category,
  case when vii.image_display_mode = 'uploaded' then nullif(btrim(vii.image_back_url), '') end as image_back_url,
  vii.image_display_mode
from public.wall_sections ws
join public.public_profiles pp
  on pp.user_id = ws.user_id
join public.wall_section_memberships wsm
  on wsm.section_id = ws.id
join public.vault_item_instances vii
  on vii.id = wsm.vault_item_instance_id
 and vii.user_id = ws.user_id
 and vii.archived_at is null
left join public.slab_certs slab
  on slab.id = vii.slab_cert_id
join public.card_prints cp
  on cp.id = coalesce(vii.card_print_id, slab.card_print_id)
left join public.sets
  on sets.id = cp.set_id
left join public.shared_cards shared
  on shared.user_id = ws.user_id
 and shared.card_id = cp.id
 and shared.is_shared = true
where ws.is_active = true
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true;

grant select on table public.v_card_stream_v1 to anon, authenticated;
grant select on table public.v_wall_cards_v1 to anon, authenticated;
grant select on table public.v_section_cards_v1 to anon, authenticated;

commit;
