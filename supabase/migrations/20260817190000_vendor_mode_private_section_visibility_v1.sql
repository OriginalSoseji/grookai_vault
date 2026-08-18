begin;

-- Custom section membership is durable organization, not publication
-- authority. Only exact copies whose intent currently publishes them may
-- cross the public section read boundary.
create or replace function public.section_card_rows_v2()
returns table (
  section_id uuid,
  section_name text,
  section_position integer,
  instance_id uuid,
  gv_vi_id text,
  vault_item_id uuid,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  card_print_id uuid,
  intent text,
  slab_cert_id uuid,
  condition_label text,
  is_graded boolean,
  grade_company text,
  grade_value text,
  grade_label text,
  section_added_at timestamptz,
  instance_created_at timestamptz,
  gv_id text,
  name text,
  set_code text,
  set_name text,
  number text,
  image_url text,
  representative_image_url text,
  image_status text,
  image_note text,
  display_image_url text,
  display_image_kind text,
  public_note text,
  price_display_mode text,
  legacy_wall_category text,
  image_back_url text,
  image_display_mode text,
  card_printing_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    ws.id,
    ws.name,
    ws.position,
    vii.id,
    vii.gv_vi_id,
    vii.legacy_vault_item_id,
    vii.user_id,
    pp.slug,
    pp.display_name,
    coalesce(vii.card_print_id, slab.card_print_id),
    vii.intent,
    vii.slab_cert_id,
    vii.condition_label,
    vii.is_graded,
    vii.grade_company,
    vii.grade_value,
    vii.grade_label,
    wsm.created_at,
    vii.created_at,
    cp.gv_id,
    cp.name,
    cp.set_code,
    sets.name,
    cp.number,
    nullif(btrim(coalesce(
      case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
      case when vii.image_display_mode = 'uploaded' then vii.image_url end,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    )), ''),
    cp.representative_image_url,
    cp.image_status,
    cp.image_note,
    nullif(btrim(coalesce(
      case when vii.image_display_mode = 'uploaded' then vii.photo_url end,
      case when vii.image_display_mode = 'uploaded' then vii.image_url end,
      cp.image_url,
      cp.image_alt_url,
      cp.representative_image_url
    )), ''),
    case
      when vii.image_display_mode = 'uploaded'
        and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null
        then 'exact'
      when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null
        then 'exact'
      when nullif(btrim(cp.representative_image_url), '') is not null
        then 'representative'
      else 'missing'
    end,
    shared.public_note,
    shared.price_display_mode,
    shared.wall_category,
    case
      when vii.image_display_mode = 'uploaded'
      then nullif(btrim(vii.image_back_url), '')
    end,
    vii.image_display_mode,
    case when vii.slab_cert_id is null then vii.card_printing_id else null end
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
    and lower(coalesce(nullif(btrim(vii.intent), ''), 'hold'))
      in ('trade', 'sell', 'showcase')
    and pp.public_profile_enabled = true
    and pp.vault_sharing_enabled = true;
$function$;

revoke all on function public.section_card_rows_v2()
from public, anon, authenticated, service_role;
grant execute on function public.section_card_rows_v2()
to anon, authenticated, service_role;

comment on function public.section_card_rows_v2() is
'Bounded public Wall section projection. Section membership persists for private copies, but only active public intents are emitted.';

notify pgrst, 'reload schema';

commit;
