-- SECURITY_ADVISOR_VIEW_AUTHORITY_HARDENING_V1
-- Removes five public security-definer views without changing their names,
-- columns, role grants, or row-selection behavior. Privileged reads are bounded
-- inside fixed-search-path functions; the app-facing views are invoker wrappers.

begin;

create or replace function public.card_stream_rows_v2()
returns table (
  vault_item_id uuid,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  card_print_id uuid,
  intent text,
  quantity integer,
  condition_label text,
  is_graded boolean,
  grade_company text,
  grade_value text,
  grade_label text,
  created_at timestamptz,
  gv_id text,
  name text,
  set_code text,
  set_name text,
  number text,
  image_url text,
  in_play_count integer,
  trade_count integer,
  sell_count integer,
  showcase_count integer,
  raw_count integer,
  slab_count integer,
  representative_image_url text,
  image_status text,
  image_note text,
  display_image_url text,
  display_image_kind text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with discoverable_instances as (
    select
      vii.legacy_vault_item_id as vault_item_id,
      vii.user_id as owner_user_id,
      pp.slug as owner_slug,
      pp.display_name as owner_display_name,
      coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
      vii.intent,
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
          and nullif(btrim(coalesce(vii.photo_url, vii.image_url)), '') is not null
          then 'exact'
        when nullif(btrim(coalesce(cp.image_url, cp.image_alt_url)), '') is not null
          then 'exact'
        when nullif(btrim(cp.representative_image_url), '') is not null
          then 'representative'
        else 'missing'
      end as display_image_kind,
      row_number() over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
        order by vii.created_at desc, vii.id desc
      ) as owner_card_rank,
      count(*) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as in_play_count,
      sum(case when vii.intent = 'trade' then 1 else 0 end) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as trade_count,
      sum(case when vii.intent = 'sell' then 1 else 0 end) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as sell_count,
      sum(case when vii.intent = 'showcase' then 1 else 0 end) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as showcase_count,
      sum(case when vii.slab_cert_id is null then 1 else 0 end) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as raw_count,
      sum(case when vii.slab_cert_id is not null then 1 else 0 end) over (
        partition by vii.user_id, coalesce(vii.card_print_id, sc.card_print_id)
      )::integer as slab_count
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
    case when in_play_count = 1 and slab_count = 0 then condition_label else null end,
    case when in_play_count = 1 and slab_count = 1 then true else false end,
    case when in_play_count = 1 and slab_count = 1 then grade_company else null end,
    case when in_play_count = 1 and slab_count = 1 then grade_value else null end,
    case when in_play_count = 1 and slab_count = 1 then grade_label else null end,
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
$function$;

create or replace function public.wall_card_rows_v2()
returns table (
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
  created_at timestamptz,
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
$function$;

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
    and pp.public_profile_enabled = true
    and pp.vault_sharing_enabled = true;
$function$;

create or replace function public.card_contact_target_rows_for_current_viewer_v2()
returns table (
  instance_id uuid,
  vault_item_id uuid,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  card_print_id uuid,
  intent text,
  condition_label text,
  is_graded boolean,
  grade_company text,
  grade_value text,
  grade_label text,
  created_at timestamptz,
  card_printing_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    vii.id,
    vii.legacy_vault_item_id,
    vii.user_id,
    pp.slug,
    pp.display_name,
    coalesce(vii.card_print_id, sc.card_print_id),
    vii.intent,
    vii.condition_label,
    vii.is_graded,
    vii.grade_company,
    vii.grade_value,
    vii.grade_label,
    vii.created_at,
    vii.card_printing_id
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  join public.public_profiles pp
    on pp.user_id = vii.user_id
  where vii.archived_at is null
    and vii.legacy_vault_item_id is not null
    and coalesce(vii.card_print_id, sc.card_print_id) is not null
    and pp.public_profile_enabled = true
    and pp.vault_sharing_enabled = true
    and not public.trust_block_exists_for_current_viewer_v1(vii.user_id);
$function$;

create or replace function public.vault_mobile_pricing_target_rows_for_current_user_v2()
returns table (
  instance_id uuid,
  card_print_id uuid,
  card_printing_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    vii.id,
    vii.card_print_id,
    vii.card_printing_id
  from public.vault_item_instances vii
  where auth.uid() is not null
    and vii.user_id = auth.uid()
    and vii.archived_at is null
    and vii.slab_cert_id is null
    and vii.card_print_id is not null;
$function$;

revoke all on function public.card_stream_rows_v2()
from public, anon, authenticated, service_role;
revoke all on function public.wall_card_rows_v2()
from public, anon, authenticated, service_role;
revoke all on function public.section_card_rows_v2()
from public, anon, authenticated, service_role;
revoke all on function public.card_contact_target_rows_for_current_viewer_v2()
from public, anon, authenticated, service_role;
revoke all on function public.vault_mobile_pricing_target_rows_for_current_user_v2()
from public, anon, authenticated, service_role;

grant execute on function public.card_stream_rows_v2()
to anon, authenticated, service_role;
grant execute on function public.wall_card_rows_v2()
to anon, authenticated, service_role;
grant execute on function public.section_card_rows_v2()
to anon, authenticated, service_role;
grant execute on function public.card_contact_target_rows_for_current_viewer_v2()
to anon, authenticated, service_role;
grant execute on function public.vault_mobile_pricing_target_rows_for_current_user_v2()
to authenticated, service_role;

create or replace view public.v_card_stream_v1
with (security_barrier = true, security_invoker = true)
as select * from public.card_stream_rows_v2();

create or replace view public.v_wall_cards_v1
with (security_barrier = true, security_invoker = true)
as select * from public.wall_card_rows_v2();

create or replace view public.v_section_cards_v1
with (security_barrier = true, security_invoker = true)
as select * from public.section_card_rows_v2();

create or replace view public.v_card_contact_targets_v1
with (security_barrier = true, security_invoker = true)
as select * from public.card_contact_target_rows_for_current_viewer_v2();

create or replace view public.v_vault_mobile_pricing_targets_v1
with (security_barrier = true, security_invoker = true)
as select * from public.vault_mobile_pricing_target_rows_for_current_user_v2();

revoke all on table public.v_card_stream_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_wall_cards_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_section_cards_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_card_contact_targets_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_vault_mobile_pricing_targets_v1
from public, anon, authenticated, service_role;

grant select on table public.v_card_stream_v1
to anon, authenticated, service_role;
grant select on table public.v_wall_cards_v1
to anon, authenticated, service_role;
grant select on table public.v_section_cards_v1
to anon, authenticated, service_role;
grant select on table public.v_card_contact_targets_v1
to anon, authenticated, service_role;
grant select on table public.v_vault_mobile_pricing_targets_v1
to authenticated, service_role;

comment on function public.card_stream_rows_v2() is
'Bounded public card-stream projection used by the security-invoker compatibility view. It emits only the established public contract.';
comment on function public.wall_card_rows_v2() is
'Bounded public Wall projection used by the security-invoker compatibility view. It emits only public profiles with vault sharing enabled.';
comment on function public.section_card_rows_v2() is
'Bounded public Wall section projection used by the security-invoker compatibility view. It emits only active sections for public shared profiles.';
comment on function public.card_contact_target_rows_for_current_viewer_v2() is
'Bounded contact-target projection. It preserves public-sharing requirements and excludes block relationships for the current viewer.';
comment on function public.vault_mobile_pricing_target_rows_for_current_user_v2() is
'Current-user-only raw vault pricing anchors. Anonymous callers have no execute grant and auth.uid() must match the instance owner.';

comment on view public.v_card_stream_v1 is
'Security-invoker compatibility view over the bounded public card-stream projection.';
comment on view public.v_wall_cards_v1 is
'Security-invoker compatibility view over the bounded public Wall projection.';
comment on view public.v_section_cards_v1 is
'Security-invoker compatibility view over the bounded public section projection.';
comment on view public.v_card_contact_targets_v1 is
'Security-invoker compatibility view over the bounded current-viewer contact projection.';
comment on view public.v_vault_mobile_pricing_targets_v1 is
'Security-invoker compatibility view over current-user-only pricing anchors.';

notify pgrst, 'reload schema';

commit;
