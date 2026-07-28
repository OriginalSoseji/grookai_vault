begin;

create or replace view public.v_vault_mobile_pricing_targets_v1
with (security_barrier = true, security_invoker = false)
as
select
  vii.id as instance_id,
  vii.card_print_id,
  vii.card_printing_id
from public.vault_item_instances vii
where vii.user_id = (select auth.uid())
  and vii.archived_at is null
  and vii.slab_cert_id is null
  and vii.card_print_id is not null;

revoke all on table public.v_vault_mobile_pricing_targets_v1
from public, anon, authenticated, service_role;

grant select on table public.v_vault_mobile_pricing_targets_v1
to authenticated, service_role;

drop function if exists public.vault_mobile_card_copies_v1(uuid, uuid);

create function public.vault_mobile_card_copies_v1(
  p_card_print_id uuid,
  p_vault_item_id uuid default null
)
returns table (
  instance_id uuid,
  gv_vi_id text,
  legacy_vault_item_id uuid,
  condition_label text,
  intent text,
  notes text,
  created_at timestamptz,
  is_graded boolean,
  grader text,
  grade text,
  cert_number text,
  card_printing_id uuid
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

  if p_card_print_id is null and p_vault_item_id is null then
    raise exception 'card_print_id_or_vault_item_id_required'
      using errcode = 'P0001';
  end if;

  return query
  select
    vii.id as instance_id,
    vii.gv_vi_id,
    vii.legacy_vault_item_id,
    vii.condition_label,
    coalesce(nullif(btrim(vii.intent), ''), 'hold') as intent,
    vii.notes,
    vii.created_at,
    (vii.slab_cert_id is not null) as is_graded,
    coalesce(
      nullif(btrim(sc.grader), ''),
      nullif(btrim(vii.grade_company), '')
    ) as grader,
    coalesce(
      nullif(btrim(sc.grade::text), ''),
      nullif(btrim(vii.grade_label), ''),
      nullif(btrim(vii.grade_value), '')
    ) as grade,
    nullif(btrim(sc.cert_number), '') as cert_number,
    case
      when vii.slab_cert_id is null then vii.card_printing_id
      else null
    end as card_printing_id
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.archived_at is null
    and (
      (
        p_card_print_id is not null
        and coalesce(vii.card_print_id, sc.card_print_id) = p_card_print_id
      )
      or (
        p_vault_item_id is not null
        and vii.legacy_vault_item_id = p_vault_item_id
      )
    )
  order by vii.created_at desc, vii.id desc;
end;
$$;

revoke all on function public.vault_mobile_card_copies_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_mobile_card_copies_v1(uuid, uuid)
to authenticated, service_role;

create or replace function public.vault_mobile_instance_pricing_target_v1(
  p_gv_vi_id text
)
returns table (
  card_print_id uuid,
  card_printing_id uuid,
  is_graded boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_gv_vi_id text := nullif(btrim(p_gv_vi_id), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_gv_vi_id is null then
    return;
  end if;

  return query
  select
    coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
    case
      when vii.slab_cert_id is null then vii.card_printing_id
      else null
    end as card_printing_id,
    (vii.slab_cert_id is not null) as is_graded
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.gv_vi_id = v_gv_vi_id
    and vii.archived_at is null
  limit 1;
end;
$$;

revoke all on function public.vault_mobile_instance_pricing_target_v1(text)
from public, anon;

grant execute on function public.vault_mobile_instance_pricing_target_v1(text)
to authenticated, service_role;

create or replace function public.public_vault_instance_pricing_target_v1(
  p_gv_vi_id text
)
returns table (
  card_print_id uuid,
  card_printing_id uuid,
  is_graded boolean
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
    case
      when vii.slab_cert_id is null then vii.card_printing_id
      else null
    end as card_printing_id,
    (vii.slab_cert_id is not null) as is_graded
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  join public.public_profiles pp
    on pp.user_id = vii.user_id
   and pp.public_profile_enabled = true
   and pp.vault_sharing_enabled = true
  left join public.shared_cards shared
    on shared.user_id = vii.user_id
   and shared.card_id = coalesce(vii.card_print_id, sc.card_print_id)
   and shared.is_shared = true
  where vii.gv_vi_id = nullif(btrim(p_gv_vi_id), '')
    and vii.archived_at is null
    and (
      lower(coalesce(nullif(btrim(vii.intent), ''), 'hold'))
        in ('trade', 'sell', 'showcase')
      or shared.card_id is not null
    )
  limit 1;
$$;

revoke all on function public.public_vault_instance_pricing_target_v1(text)
from public;

grant execute on function public.public_vault_instance_pricing_target_v1(text)
to anon, authenticated, service_role;

create or replace function public.public_shared_card_pricing_targets_v1(
  p_owner_user_id uuid,
  p_card_print_ids uuid[]
)
returns table (
  card_print_id uuid,
  instance_id uuid,
  card_printing_id uuid
)
language sql
security definer
set search_path = public
as $$
  with requested_cards as (
    select distinct unnest(
      coalesce(p_card_print_ids, array[]::uuid[])
    ) as card_print_id
  ),
  public_owner as (
    select pp.user_id
    from public.public_profiles pp
    where pp.user_id = p_owner_user_id
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
  )
  select
    vii.card_print_id,
    vii.id as instance_id,
    vii.card_printing_id
  from public.vault_item_instances vii
  join public_owner owner
    on owner.user_id = vii.user_id
  join public.shared_cards shared
    on shared.user_id = vii.user_id
   and shared.card_id = vii.card_print_id
   and shared.is_shared = true
  join requested_cards requested
    on requested.card_print_id = vii.card_print_id
  where vii.archived_at is null
    and vii.slab_cert_id is null
    and vii.card_print_id is not null
  order by vii.card_print_id, vii.created_at desc, vii.id desc;
$$;

revoke all on function public.public_shared_card_pricing_targets_v1(
  uuid,
  uuid[]
)
from public;

grant execute on function public.public_shared_card_pricing_targets_v1(
  uuid,
  uuid[]
)
to anon, authenticated, service_role;

drop function if exists public.public_discoverable_card_copies_v1(
  uuid[],
  uuid[]
);

create function public.public_discoverable_card_copies_v1(
  p_owner_user_ids uuid[],
  p_card_print_ids uuid[] default null
)
returns table (
  owner_user_id uuid,
  card_print_id uuid,
  instance_id uuid,
  gv_vi_id text,
  legacy_vault_item_id uuid,
  intent text,
  condition_label text,
  is_graded boolean,
  grade_company text,
  grade_value text,
  grade_label text,
  cert_number text,
  created_at timestamptz,
  card_printing_id uuid
)
language sql
security definer
set search_path = public
as $$
  with requested_owners as (
    select distinct unnest(
      coalesce(p_owner_user_ids, array[]::uuid[])
    ) as user_id
  ),
  requested_cards as (
    select distinct unnest(
      coalesce(p_card_print_ids, array[]::uuid[])
    ) as card_print_id
  ),
  public_owners as (
    select requested.user_id
    from requested_owners requested
    join public.public_profiles profile
      on profile.user_id = requested.user_id
    where profile.public_profile_enabled = true
      and profile.vault_sharing_enabled = true
  )
  select
    vii.user_id as owner_user_id,
    coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
    vii.id as instance_id,
    nullif(btrim(vii.gv_vi_id), '') as gv_vi_id,
    vii.legacy_vault_item_id,
    coalesce(nullif(lower(btrim(vii.intent)), ''), 'hold') as intent,
    nullif(btrim(vii.condition_label), '') as condition_label,
    (vii.slab_cert_id is not null) as is_graded,
    coalesce(
      nullif(btrim(sc.grader), ''),
      nullif(btrim(vii.grade_company), '')
    ) as grade_company,
    coalesce(
      nullif(btrim(sc.grade::text), ''),
      nullif(btrim(vii.grade_value), '')
    ) as grade_value,
    nullif(btrim(vii.grade_label), '') as grade_label,
    nullif(btrim(sc.cert_number), '') as cert_number,
    vii.created_at,
    case
      when vii.slab_cert_id is null then vii.card_printing_id
      else null
    end as card_printing_id
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  join public_owners owner
    on owner.user_id = vii.user_id
  where vii.archived_at is null
    and vii.legacy_vault_item_id is not null
    and coalesce(vii.card_print_id, sc.card_print_id) is not null
    and coalesce(nullif(lower(btrim(vii.intent)), ''), 'hold')
      in ('trade', 'sell', 'showcase')
    and (
      cardinality(coalesce(p_card_print_ids, array[]::uuid[])) = 0
      or coalesce(vii.card_print_id, sc.card_print_id)
        in (select requested.card_print_id from requested_cards requested)
    )
  order by vii.created_at desc, vii.id desc;
$$;

revoke all on function public.public_discoverable_card_copies_v1(
  uuid[],
  uuid[]
)
from public;

grant execute on function public.public_discoverable_card_copies_v1(
  uuid[],
  uuid[]
)
to anon, authenticated, service_role;

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
      and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '')
        is not null then 'exact'
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '')
      is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '')
      is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category,
  case
    when vii.image_display_mode = 'uploaded'
    then nullif(btrim(vii.image_back_url), '')
  end as image_back_url,
  vii.image_display_mode,
  case
    when vii.slab_cert_id is null then vii.card_printing_id
    else null
  end as card_printing_id
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
      and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '')
        is not null then 'exact'
    when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '')
      is not null then 'exact'
    when nullif(btrim(cp.representative_image_url), '')
      is not null then 'representative'
    else 'missing'
  end as display_image_kind,
  shared.public_note,
  shared.price_display_mode,
  shared.wall_category as legacy_wall_category,
  case
    when vii.image_display_mode = 'uploaded'
    then nullif(btrim(vii.image_back_url), '')
  end as image_back_url,
  vii.image_display_mode,
  case
    when vii.slab_cert_id is null then vii.card_printing_id
    else null
  end as card_printing_id
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

grant select on table public.v_wall_cards_v1
to anon, authenticated, service_role;

grant select on table public.v_section_cards_v1
to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
