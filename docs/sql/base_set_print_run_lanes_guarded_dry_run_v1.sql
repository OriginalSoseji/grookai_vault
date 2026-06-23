-- BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1
-- Contract: BASE_SET_PRINT_RUN_LANES_V1
-- Scope: rollback-only dry-run for three derived Base Set print-run set rows and 304 missing lane identity rows.
-- This artifact must not be used as a real apply without a separate approval gate.

begin;

do $$
declare
  v_source_set public.sets%rowtype;
  v_ordinary_slots integer;
  v_existing_derived_sets integer;
  v_existing_proposed_gv_ids integer;
begin
  select * into v_source_set
  from public.sets
  where code = 'base1'
  limit 1;

  if not found then
    raise exception 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1: source set base1 is missing';
  end if;

  select count(*)::int
  into v_ordinary_slots
  from public.card_prints cp
  where cp.set_code = 'base1'
    and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
    and coalesce(cp.variant_key, '') = ''
    and cp.printed_identity_modifier is null
    and cp.number_plain ~ '^[0-9]+$';

  if v_ordinary_slots <> 102 then
    raise exception 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1: expected 102 ordinary Base Set slots, found %', v_ordinary_slots;
  end if;

  select count(*)::int
  into v_existing_derived_sets
  from public.sets
  where code in ('base1-shadowless', 'base1-first-edition', 'base1-1999-2000');

  if v_existing_derived_sets <> 0 then
    raise exception 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1: derived set rows already exist; rerun the read-only audit before applying';
  end if;

  with lane_config(lane_code, label, required_modifier) as (
    values
    ('base1-shadowless', 'Base Set Shadowless', 'print_run:shadowless'),
    ('base1-first-edition', 'Base Set 1st Edition', 'edition:first_edition;print_run:shadowless'),
    ('base1-1999-2000', 'Base Set 1999-2000', 'print_run:1999-2000')
  ),
  proposed as (
    select
      case
        when lc.lane_code = 'base1-shadowless' then 'GV-PK-BASE1-' || cp.number_plain || '-SHADOWLESS'
        when lc.lane_code = 'base1-first-edition' then 'GV-PK-BASE1-' || cp.number_plain || '-FIRST-EDITION'
        when lc.lane_code = 'base1-1999-2000' then 'GV-PK-BASE1-' || cp.number_plain || '-1999-2000'
      end as proposed_gv_id
    from lane_config lc
    cross join public.card_prints cp
    where cp.set_code = 'base1'
      and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
      and coalesce(cp.variant_key, '') = ''
      and cp.printed_identity_modifier is null
      and cp.number_plain ~ '^[0-9]+$'
      and not (cp.number_plain = '58' and lc.lane_code in ('base1-shadowless', 'base1-first-edition'))
  )
  select count(*)::int
  into v_existing_proposed_gv_ids
  from proposed p
  join public.card_prints existing on existing.gv_id = p.proposed_gv_id;

  if v_existing_proposed_gv_ids <> 0 then
    raise exception 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1: proposed gv_id collisions found: %', v_existing_proposed_gv_ids;
  end if;
end $$;

with lane_config(lane_code, label, required_modifier) as (
  values
    ('base1-shadowless', 'Base Set Shadowless', 'print_run:shadowless'),
    ('base1-first-edition', 'Base Set 1st Edition', 'edition:first_edition;print_run:shadowless'),
    ('base1-1999-2000', 'Base Set 1999-2000', 'print_run:1999-2000')
),
source_set as (
  select * from public.sets where code = 'base1' limit 1
),
inserted_sets as (
  insert into public.sets (
    game,
    code,
    name,
    release_date,
    source,
    logo_url,
    symbol_url,
    printed_total,
    printed_set_abbrev,
    set_role,
    identity_domain_default,
    hero_image_url,
    hero_image_source,
    identity_model
  )
  select
    'pokemon',
    lc.lane_code,
    lc.label,
    source_set.release_date,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'contract', 'BASE_SET_PRINT_RUN_LANES_V1',
        'package_id', 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1',
        'source_set_code', 'base1',
        'lane_code', lc.lane_code,
        'audit_fingerprint_sha256', '0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee'
      )
    ),
    source_set.logo_url,
    source_set.symbol_url,
    102,
    source_set.printed_set_abbrev,
    null,
    source_set.identity_domain_default,
    source_set.hero_image_url,
    source_set.hero_image_source,
    'standard'
  from lane_config lc
  cross join source_set
  where not exists (
    select 1 from public.sets existing where existing.code = lc.lane_code
  )
  returning id, code
),
ordinary_base as (
  select cp.*
  from public.card_prints cp
  where cp.set_code = 'base1'
    and nullif(btrim(coalesce(cp.gv_id, '')), '') is not null
    and coalesce(cp.variant_key, '') = ''
    and cp.printed_identity_modifier is null
    and cp.number_plain ~ '^[0-9]+$'
),
planned_rows as (
  select
    inserted_sets.id as target_set_id,
    lc.lane_code,
    ordinary_base.id as source_card_print_id,
    ordinary_base.gv_id as source_gv_id,
    ordinary_base.name,
    ordinary_base.number,
    ordinary_base.number_plain,
    ordinary_base.rarity,
    ordinary_base.artist,
    ordinary_base.regulation_mark,
    ordinary_base.variants,
    case
      when lc.lane_code = 'base1-shadowless' then 'shadowless'
      when lc.lane_code = 'base1-first-edition' then 'first_edition'
      when lc.lane_code = 'base1-1999-2000' then '1999_2000'
    end as variant_key,
    lc.required_modifier as printed_identity_modifier,
    case
      when lc.lane_code = 'base1-shadowless' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-SHADOWLESS'
      when lc.lane_code = 'base1-first-edition' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-FIRST-EDITION'
      when lc.lane_code = 'base1-1999-2000' then 'GV-PK-BASE1-' || ordinary_base.number_plain || '-1999-2000'
    end as proposed_gv_id
  from lane_config lc
  join inserted_sets on inserted_sets.code = lc.lane_code
  cross join ordinary_base
  where not (ordinary_base.number_plain = '58' and lc.lane_code in ('base1-shadowless', 'base1-first-edition'))
),
inserted_card_prints as (
  insert into public.card_prints (
    set_id,
    name,
    number,
    variant_key,
    rarity,
    image_url,
    tcgplayer_id,
    external_ids,
    set_code,
    artist,
    regulation_mark,
    image_alt_url,
    image_source,
    variants,
    print_identity_key,
    ai_metadata,
    image_hash,
    data_quality_flags,
    image_status,
    image_res,
    image_last_checked_at,
    printed_set_abbrev,
    printed_total,
    gv_id,
    image_path,
    identity_domain,
    printed_identity_modifier,
    set_identity_model,
    representative_image_url,
    image_note
  )
  select
    target_set_id,
    name,
    number,
    variant_key,
    rarity,
    null,
    null,
    jsonb_build_object(
      'grookai',
      jsonb_build_object(
        'contract', 'BASE_SET_PRINT_RUN_LANES_V1',
        'package_id', 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1',
        'source_set_code', 'base1',
        'source_card_print_id', source_card_print_id,
        'source_gv_id', source_gv_id,
        'lane_code', lane_code,
        'audit_fingerprint_sha256', '0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee'
      )
    ),
    lane_code,
    artist,
    regulation_mark,
    null,
    null,
    variants,
    'base1:' || lane_code || ':' || number_plain,
    jsonb_build_object(
      'contract', 'BASE_SET_PRINT_RUN_LANES_V1',
      'package_id', 'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1',
      'source_set_code', 'base1',
      'source_gv_id', source_gv_id,
      'lane_code', lane_code
    ),
    null,
    jsonb_build_object(
      'contract', 'BASE_SET_PRINT_RUN_LANES_V1',
      'source_image_truth', 'exact_lane_image_not_cataloged',
      'source_set_code', 'base1'
    ),
    'missing',
    null,
    null,
    'BS',
    102,
    proposed_gv_id,
    null,
    'pokemon_eng_standard',
    printed_identity_modifier,
    'standard',
    null,
    'BASE_SET_PRINT_RUN_LANES_V1: exact physical lane image not cataloged yet; do not display Unlimited imagery as exact'
  from planned_rows
  returning id, set_code, number_plain, gv_id, variant_key, printed_identity_modifier, image_status
),
lane_slot_proof as (
  select
    'base1-shadowless'::text as lane_code,
    count(distinct number_plain)::int as inserted_slots,
    1::int as existing_special_pikachu_slot,
    count(distinct number_plain)::int + 1 as covered_slots_after_plan
  from inserted_card_prints
  where set_code = 'base1-shadowless'
  union all
  select
    'base1-first-edition',
    count(distinct number_plain)::int,
    1::int,
    count(distinct number_plain)::int + 1
  from inserted_card_prints
  where set_code = 'base1-first-edition'
  union all
  select
    'base1-1999-2000',
    count(distinct number_plain)::int,
    0::int,
    count(distinct number_plain)::int
  from inserted_card_prints
  where set_code = 'base1-1999-2000'
),
forbidden_rows as (
  select count(*)::int as forbidden_count
  from inserted_card_prints
  where gv_id in ('GV-PK-BASE1-58-SHADOWLESS', 'GV-PK-BASE1-58-FIRST-EDITION')
     or variant_key = 'ghost_stamp_shadowless'
     or image_status <> 'missing'
)
select
  'BASE-SET-PRINT-RUN-LANES-GUARDED-DRY-RUN-V1'::text as package_id,
  'BASE_SET_PRINT_RUN_LANES_V1'::text as contract_key,
  '0591c77f3be63792f0b03a1c980e728604d7abb57d563eba94fae38ff8faf3ee'::text as audit_fingerprint_sha256,
  (select count(*)::int from inserted_sets) as inserted_set_rows,
  (select count(*)::int from inserted_card_prints) as inserted_card_print_rows,
  (select forbidden_count from forbidden_rows) as forbidden_rows,
  jsonb_agg(
    jsonb_build_object(
      'lane_code', lane_code,
      'inserted_slots', inserted_slots,
      'existing_special_pikachu_slot', existing_special_pikachu_slot,
      'covered_slots_after_plan', covered_slots_after_plan
    )
    order by lane_code
  ) as lane_slot_proof
from lane_slot_proof;

rollback;
