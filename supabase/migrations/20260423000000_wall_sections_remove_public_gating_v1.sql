begin;

-- LOCK: Custom sections surface automatically when active; is_public is compatibility data only.
update public.wall_sections
set is_public = true
where is_public = false;

comment on column public.wall_sections.is_public is
  'Compatibility flag only. Product visibility is derived from section existence, active state, and public profile gates.';

drop policy if exists wall_sections_public_select_v1 on public.wall_sections;

create policy wall_sections_public_select_v1
on public.wall_sections
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.public_profiles pp
    where pp.user_id = wall_sections.user_id
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
  )
);

drop policy if exists wall_section_memberships_public_select_v1 on public.wall_section_memberships;

create policy wall_section_memberships_public_select_v1
on public.wall_section_memberships
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.wall_sections ws
    join public.public_profiles pp
      on pp.user_id = ws.user_id
    join public.vault_item_instances vii
      on vii.id = wall_section_memberships.vault_item_instance_id
     and vii.user_id = ws.user_id
    where ws.id = wall_section_memberships.section_id
      and ws.is_active = true
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
      and vii.archived_at is null
  )
);

create or replace view public.v_wall_sections_v1 as
select
  ws.id,
  ws.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  ws.name,
  ws.position,
  ws.is_active,
  ws.is_public,
  ws.created_at,
  ws.updated_at,
  count(wsm.vault_item_instance_id) filter (
    where vii.id is not null
      and vii.archived_at is null
      and vii.user_id = ws.user_id
  )::integer as item_count
from public.wall_sections ws
join public.public_profiles pp
  on pp.user_id = ws.user_id
left join public.wall_section_memberships wsm
  on wsm.section_id = ws.id
left join public.vault_item_instances vii
  on vii.id = wsm.vault_item_instance_id
where ws.is_active = true
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true
group by
  ws.id,
  ws.user_id,
  pp.slug,
  pp.display_name,
  ws.name,
  ws.position,
  ws.is_active,
  ws.is_public,
  ws.created_at,
  ws.updated_at;

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
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category
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

grant select on table public.v_wall_sections_v1 to anon, authenticated;
grant select on table public.v_section_cards_v1 to anon, authenticated;

commit;
