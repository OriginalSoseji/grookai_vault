-- CATALOG_RELEASE_DEFINER_BOUNDARY_V1
-- Enforces catalog release controls inside privileged public read models.

begin;

create or replace function public.card_print_public_traits_v1(
  p_card_print_id uuid
)
returns table (
  hp integer,
  national_dex integer,
  types text[],
  supertype text,
  card_category text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    traits.hp,
    traits.national_dex,
    traits.types,
    traits.supertype,
    traits.card_category
  from public.card_print_traits traits
  where traits.card_print_id = p_card_print_id
    and public.catalog_card_print_visible_to_request_v1(p_card_print_id)
  order by
    (
      traits.hp is not null
      or traits.national_dex is not null
      or cardinality(coalesce(traits.types, '{}'::text[])) > 0
      or nullif(btrim(traits.supertype), '') is not null
      or nullif(btrim(traits.card_category), '') is not null
    ) desc,
    traits.confidence desc nulls last,
    traits.id asc
  limit 1;
$function$;

revoke all on function public.card_print_public_traits_v1(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.card_print_public_traits_v1(uuid)
to anon, authenticated, service_role;

comment on function public.card_print_public_traits_v1(uuid) is
'Release-aware public card trait projection. Service-owned trait rows are exposed only when the parent catalog is visible to the current request.';

alter function public.card_stream_rows_v2()
  rename to card_stream_rows_unfiltered_internal_v2;
alter function public.wall_card_rows_v2()
  rename to wall_card_rows_unfiltered_internal_v2;
alter function public.section_card_rows_v2()
  rename to section_card_rows_unfiltered_internal_v2;

revoke all on function public.card_stream_rows_unfiltered_internal_v2()
from public, anon, authenticated, service_role;
revoke all on function public.wall_card_rows_unfiltered_internal_v2()
from public, anon, authenticated, service_role;
revoke all on function public.section_card_rows_unfiltered_internal_v2()
from public, anon, authenticated, service_role;

create function public.card_stream_rows_v2()
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
  select source.*
  from public.card_stream_rows_unfiltered_internal_v2() source
  where public.catalog_card_print_visible_to_request_v1(source.card_print_id)
  order by source.created_at desc, source.vault_item_id desc;
$function$;

create function public.wall_card_rows_v2()
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
  select source.*
  from public.wall_card_rows_unfiltered_internal_v2() source
  where public.catalog_card_print_visible_to_request_v1(source.card_print_id);
$function$;

create function public.section_card_rows_v2()
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
  select source.*
  from public.section_card_rows_unfiltered_internal_v2() source
  where public.catalog_card_print_visible_to_request_v1(source.card_print_id);
$function$;

revoke all on function public.card_stream_rows_v2()
from public, anon, authenticated, service_role;
revoke all on function public.wall_card_rows_v2()
from public, anon, authenticated, service_role;
revoke all on function public.section_card_rows_v2()
from public, anon, authenticated, service_role;

grant execute on function public.card_stream_rows_v2()
to anon, authenticated, service_role;
grant execute on function public.wall_card_rows_v2()
to anon, authenticated, service_role;
grant execute on function public.section_card_rows_v2()
to anon, authenticated, service_role;

create or replace view public.v_card_stream_v1
with (security_barrier = true, security_invoker = true)
as select * from public.card_stream_rows_v2();

create or replace view public.v_wall_cards_v1
with (security_barrier = true, security_invoker = true)
as select * from public.wall_card_rows_v2();

create or replace view public.v_section_cards_v1
with (security_barrier = true, security_invoker = true)
as select * from public.section_card_rows_v2();

revoke all on table public.v_card_stream_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_wall_cards_v1
from public, anon, authenticated, service_role;
revoke all on table public.v_section_cards_v1
from public, anon, authenticated, service_role;

grant select on table public.v_card_stream_v1
to anon, authenticated, service_role;
grant select on table public.v_wall_cards_v1
to anon, authenticated, service_role;
grant select on table public.v_section_cards_v1
to anon, authenticated, service_role;

alter function public.public_vault_instance_detail_v1(text)
  rename to public_vault_instance_detail_unfiltered_internal_v1;

revoke all on function public.public_vault_instance_detail_unfiltered_internal_v1(text)
from public, anon, authenticated, service_role;

create function public.public_vault_instance_detail_v1(
  p_gv_vi_id text
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select case
    when exists (
      select 1
      from public.vault_item_instances instance
      left join public.slab_certs slab
        on slab.id = instance.slab_cert_id
      where instance.gv_vi_id = nullif(btrim(p_gv_vi_id), '')
        and instance.archived_at is null
        and public.catalog_card_print_visible_to_request_v1(
          coalesce(instance.card_print_id, slab.card_print_id)
        )
    ) then public.public_vault_instance_detail_unfiltered_internal_v1(p_gv_vi_id)
    else null
  end;
$function$;

revoke all on function public.public_vault_instance_detail_v1(text)
from public, anon, authenticated, service_role;
grant execute on function public.public_vault_instance_detail_v1(text)
to anon, authenticated, service_role;

alter function public.card_journey_public_counts_v1(uuid)
  rename to card_journey_public_counts_unfiltered_internal_v1;

revoke all on function public.card_journey_public_counts_unfiltered_internal_v1(uuid)
from public, anon, authenticated, service_role;

create function public.card_journey_public_counts_v1(
  p_card_print_id uuid
)
returns table (
  card_print_id uuid,
  public_owner_count integer,
  public_trade_count integer,
  public_sale_count integer,
  public_want_count integer,
  has_public_activity boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select source.*
  from public.card_journey_public_counts_unfiltered_internal_v1(p_card_print_id) source
  where public.catalog_card_print_visible_to_request_v1(source.card_print_id);
$function$;

revoke all on function public.card_journey_public_counts_v1(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.card_journey_public_counts_v1(uuid)
to anon, authenticated, service_role;

create or replace function public.binder_target_enabled_v1(p_binder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce((
    select
      public.binder_feature_enabled_v1('schema_internal')
      and case binder.target_kind
        when 'species' then public.binder_feature_enabled_v1('personal')
        when 'custom' then public.binder_feature_enabled_v1('custom')
        when 'set' then
          public.binder_feature_enabled_v1('set_binders')
          and to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null
          and exists (
            select 1
            from public.sets target_set
            where target_set.id = binder.set_id
              and public.catalog_game_visible_to_request_v1(target_set.game)
          )
        else false
      end
    from public.binders binder
    where binder.id = p_binder_id
  ), false);
$function$;

create or replace function public.binder_card_json_v1(
  p_card_print_id uuid,
  p_card_printing_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'card_print_id', card.id,
    'card_printing_id', printing.id,
    'gv_id', nullif(btrim(card.gv_id), ''),
    'name', left(coalesce(nullif(btrim(card.name), ''), 'Unknown card'), 160),
    'set_code', nullif(btrim(card.set_code), ''),
    'set_name', left(coalesce(nullif(btrim(card_set.name), ''), nullif(btrim(card.set_code), ''), 'Unknown set'), 120),
    'number', left(nullif(btrim(card.number), ''), 40),
    'finish_label', left(nullif(btrim(finish.label), ''), 100),
    'image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/' || image.proxy_gv_id || '/image'
      else null
    end,
    'canonical_image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/' || image.proxy_gv_id || '/image'
      else null
    end,
    'image_source', case
      when image.hosted_image then 'hosted'
      when image.proxy_gv_id is not null then 'canonical_proxy'
      else null
    end,
    'hosted_image', image.hosted_image
  ))
  from public.card_prints card
  left join public.sets card_set on card_set.id = card.set_id
  left join public.card_printings printing
    on printing.id = p_card_printing_id
   and printing.card_print_id = card.id
  left join public.finish_keys finish on finish.key = printing.finish_key
  left join lateral (
    select
      coalesce(
        case
          when lower(btrim(coalesce(printing.image_source, ''))) = 'identity'
            and nullif(btrim(printing.image_path), '') is not null
            and nullif(btrim(printing.printing_gv_id), '') is not null
            then btrim(printing.printing_gv_id)
          else null
        end,
        nullif(btrim(card.gv_id), '')
      ) as proxy_gv_id,
      case
        when lower(btrim(coalesce(printing.image_source, ''))) = 'identity'
          and nullif(btrim(printing.image_path), '') is not null
          and nullif(btrim(printing.printing_gv_id), '') is not null
        then true
        when lower(btrim(coalesce(card.image_source, ''))) = 'identity'
          and nullif(btrim(card.image_path), '') is not null
          and nullif(btrim(card.gv_id), '') is not null
        then true
        else false
      end as hosted_image
  ) image on true
  where card.id = p_card_print_id
    and public.catalog_card_print_visible_to_request_v1(card.id);
$function$;

create or replace function public.binder_target_json_v1(p_binder_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_strip_nulls(jsonb_build_object(
    'kind', binder.target_kind,
    'id', case
      when binder.target_kind = 'species' then binder.species_id
      when binder.target_kind = 'set' then binder.set_id
      else null
    end,
    'key', case
      when binder.target_kind = 'species' then species.slug
      when binder.target_kind = 'set' then target_set.code
      else 'custom'
    end,
    'label', case
      when binder.target_kind = 'species' then species.display_name
      when binder.target_kind = 'set' then coalesce(nullif(btrim(target_set.name), ''), nullif(btrim(target_set.code), ''), 'Set')
      else 'Custom collection'
    end
  ))
  from public.binders binder
  left join public.pokemon_species species on species.id = binder.species_id
  left join public.sets target_set on target_set.id = binder.set_id
  where binder.id = p_binder_id
    and (
      binder.target_kind <> 'set'
      or public.catalog_game_visible_to_request_v1(target_set.game)
    );
$function$;

create or replace function public.binder_slot_rows_v1(p_binder_id uuid)
returns table (
  "position" integer,
  slot_id uuid,
  card_print_id uuid,
  card_printing_id uuid,
  required_quantity integer
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  with binder_row as (
    select *
    from public.binders
    where id = p_binder_id
      and public.binder_target_enabled_v1(id)
  ),
  species_slots as (
    select
      (row_number() over (
        order by card_set.release_date nulls last, card.set_code nulls last,
                 card.number_plain nulls last, card.number nulls last, card.id
      ) - 1)::integer as position,
      card.id as slot_id,
      card.id as card_print_id,
      null::uuid as card_printing_id,
      1::integer as required_quantity
    from binder_row binder
    join public.card_print_species species_link
      on species_link.species_id = binder.species_id
     and species_link.active is true
     and species_link.counts_for_completion is true
    join public.card_prints card on card.id = species_link.card_print_id
    left join public.sets card_set on card_set.id = card.set_id
    where binder.target_kind = 'species'
      and public.catalog_card_print_visible_to_request_v1(card.id)
    group by card.id, card_set.release_date, card.set_code, card.number_plain, card.number
  ),
  custom_slots as (
    select
      custom_slot.position,
      custom_slot.id as slot_id,
      custom_slot.card_print_id,
      custom_slot.card_printing_id,
      custom_slot.required_quantity
    from binder_row binder
    join public.binder_custom_slots custom_slot
      on custom_slot.binder_id = binder.id
     and custom_slot.definition_revision = binder.definition_revision
     and custom_slot.active is true
    where binder.target_kind = 'custom'
      and public.catalog_card_print_visible_to_request_v1(custom_slot.card_print_id)
  )
  select * from species_slots
  union all
  select * from custom_slots;
$function$;

comment on function public.card_stream_rows_v2() is
'Release-aware public card-stream projection. Hidden catalog rows are removed inside the definer boundary.';
comment on function public.wall_card_rows_v2() is
'Release-aware public Wall projection. Hidden catalog rows are removed inside the definer boundary.';
comment on function public.section_card_rows_v2() is
'Release-aware public Wall section projection. Hidden catalog rows are removed inside the definer boundary.';
comment on function public.public_vault_instance_detail_v1(text) is
'Release-aware public GVVI detail wrapper. Hidden catalog instances return null.';
comment on function public.card_journey_public_counts_v1(uuid) is
'Release-aware public Journey counts wrapper. Hidden catalog cards return no row.';
comment on function public.binder_card_json_v1(uuid, uuid) is
'Release-aware Binder card projection. Hidden catalog cards return no JSON value.';

notify pgrst, 'reload schema';

commit;
