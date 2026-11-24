-- Forward-only522-to523: one equivalent catalog reader. No row/grant/RLS/config/index changes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $guard$
declare helper pg_catalog.pg_proc; dependency record;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261123220000')
    or not exists(select 1 from pg_catalog.pg_index where indexrelid='public.card_prints_catalog_visible_counts_v1_idx'::regclass and indisvalid and indisready)
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
  then raise exception 'BULK_CATALOG_DEPENDENCY_DRIFT' using errcode='23514';end if;
  for dependency in select * from (values
    ('public.get_prismatic_discovery_exclusions_v1()','29c3b68ca84096e7044ead4d165d3b86'),
    ('public.get_paldean_fates_discovery_exclusions_v1()','8ff7bf56c6b65189e585f746164edbf0'),
    ('public.get_pokemon_go_discovery_exclusions_v1()','edec96d9eee27c54b4235392460cb119'),
    ('public.get_mcdonalds_2021_discovery_exclusions_v1()','48ffa0c0ae25344ce6a9d0ae882add96'),
    ('public.get_latios_discovery_exclusions_v1()','233a4b24181915dccafe4fea71833b02'),
    ('public.get_shrouded_fable_discovery_exclusions_v1()','7f8f5d50a8c0f1cd4b39ffffa13f9019'),
    ('public.get_shrouded_fable_discovery_projection_v1()','53b0c3de12ca0ab8fb35c9988f9eae42'),
    ('public.get_best_of_game_discovery_projection_v1()','b5d1836d5cb1a50b491cc166ece08716'),
    ('public.get_jungle_edition_discovery_exclusions_v1()','785a73c557969ea38c3e9dab388da5af'),
    ('public.get_best_of_game_discovery_exclusions_v1()','7ffa99efe2fc79f231cfb207a5d0eb1e'),
    ('public.catalog_set_visible_to_request_v1(uuid)','2c32ea19630a1e4a18b654fbb2660c56'),
    ('public.catalog_card_print_visible_to_request_v1(uuid)','62c6ad0751432656e094e830254470d6'),
    ('public.catalog_parent_gv_id_visible_to_request_v1(text)','067c47d2e75deb97c01f5ec58455bfbb')
  ) pinned(signature,body_md5) loop
    if (select md5(prosrc)from pg_catalog.pg_proc where oid=dependency.signature::regprocedure) is distinct from dependency.body_md5 then
      raise exception 'BULK_CATALOG_DEPENDENCY_DRIFT: %',dependency.signature using errcode='23514';end if;
  end loop;
  select * into helper from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure;
  if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
    or helper.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or helper.prokind<>'f' or helper.provolatile<>'s' or not helper.prosecdef or helper.proisstrict or helper.proleakproof
    or not helper.proretset or helper.proparallel<>'u' or helper.pronargs<>1 or helper.pronargdefaults<>1
    or helper.procost<>100 or helper.prorows<>1000 or helper.proargtypes::text<>'25' or helper.prorettype<>'record'::regtype
    or helper.proargnames is distinct from array['p_game_code','id','game','code','name','hero_image_url','hero_image_source','set_role','catalog_set_type','printed_set_abbrev','printed_total','release_date','created_at','card_count']::text[]
    or helper.proargmodes is distinct from array['i','t','t','t','t','t','t','t','t','t','t','t','t','t']::"char"[]
    or helper.proallargtypes is distinct from array[25,2950,25,25,25,25,25,25,25,25,23,1082,1184,20]::oid[]
    or pg_catalog.pg_get_function_arguments(helper.oid)<>'p_game_code text DEFAULT NULL::text'
    or helper.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
    or md5(helper.prosrc) not in ('6edf060cb9c5161d2c5e623bbccf912e','d153e2448c31fe99b83f0e4df2c02cba')
    or exists(select 1 from pg_catalog.aclexplode(coalesce(helper.proacl,pg_catalog.acldefault('f',helper.proowner))) permission where permission.grantee=0)
    or exists(select 1 from unnest(array['anon','authenticated','service_role']) role_name where not pg_catalog.has_function_privilege(role_name,helper.oid,'EXECUTE'))
  then raise exception 'BULK_CATALOG_BASELINE_DRIFT' using errcode='23514';end if;
end $guard$;

-- Six frozen authority policies share one bulk alias scan. Keep the exact clauses aligned
-- with their delegated helpers when future authority or Pokemon visibility policy changes.
CREATE OR REPLACE FUNCTION public.get_public_catalog_sets_v2(p_game_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, game text, code text, name text, hero_image_url text, hero_image_source text, set_role text, catalog_set_type text, printed_set_abbrev text, printed_total integer, release_date date, created_at timestamp with time zone, card_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  request_role text := coalesce(auth.role(), '');
  jungle_exclusions uuid[] := public.get_jungle_edition_discovery_exclusions_v1();
  discovery_exclusions uuid[];
  prismatic_exclusions uuid[];
  paldean_exclusions uuid[];
  pokemon_go_exclusions uuid[];
  mcdonalds_2021_exclusions uuid[];
  latios_exclusions uuid[];
  shrouded_exclusions uuid[];
  best_of_game_exclusions uuid[];
  requested_game text := nullif(lower(btrim(coalesce(p_game_code, ''))), '');
begin
  with catalog_alias_policies(family,legacy_code,canonical_code,audit_name,classification_sha256,collision_sha256) as materialized(values
    ('prismatic','sv08.5','sv8pt5','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'),
    ('paldean_fates','sv04.5','sv4pt5','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'),
    ('pokemon_go','swsh10.5','pgo','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'),
    ('mcdonalds_2021','2021swsh','mcd21','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'),
    ('latios','tk-ex-latio','tk1b','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'),
    ('shrouded_fable','sv06.5','sv6pt5','collectr_catalog_review_20261009','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'))
  select coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='prismatic'),array[]::uuid[]),
    coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='paldean_fates'),array[]::uuid[]),
    coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='pokemon_go'),array[]::uuid[]),
    coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='mcdonalds_2021'),array[]::uuid[]),
    coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='latios'),array[]::uuid[]),
    coalesce(array_agg(legacy.id order by legacy.id) filter(where policy.family='shrouded_fable'),array[]::uuid[])
  into prismatic_exclusions,paldean_exclusions,pokemon_go_exclusions,mcdonalds_2021_exclusions,latios_exclusions,shrouded_exclusions
  from catalog_alias_policies policy
  cross join public.card_print_identity_aliases alias
  join public.card_prints legacy on legacy.id = alias.legacy_card_print_id
  join public.card_prints canonical on canonical.id = alias.canonical_card_print_id
  join public.sets legacy_set on legacy_set.id = legacy.set_id
  join public.sets canonical_set on canonical_set.id = canonical.set_id
  left join public.catalog_set_release_controls legacy_control on legacy_control.set_id = legacy_set.id
  left join public.catalog_set_release_controls canonical_control on canonical_control.set_id = canonical_set.id
  where alias.active and alias.authority_status = 'approved'
    and alias.legacy_set_code = policy.legacy_code and alias.canonical_set_code = policy.canonical_code
    and legacy.set_code = policy.legacy_code and canonical.set_code = policy.canonical_code
    and legacy_set.code = policy.legacy_code and canonical_set.code = policy.canonical_code
    and legacy_set.game = 'pokemon' and canonical_set.game = 'pokemon'
    and legacy.identity_domain = 'pokemon_eng_standard'
    and canonical.identity_domain = legacy.identity_domain
    and legacy.gv_id is not null and canonical.gv_id is not null
    and alias.created_from_audit = policy.audit_name
    and alias.authority_decision ->> 'classification_sha256' = policy.classification_sha256
    and alias.authority_decision ->> 'collision_matrix_sha256' = policy.collision_sha256
    and lower(regexp_replace(btrim(legacy.name), '\s+', ' ', 'g'))
      = lower(regexp_replace(btrim(canonical.name), '\s+', ' ', 'g'))
    and coalesce(nullif(ltrim(upper(btrim(split_part(replace(legacy.number, '#', ''), '/', 1))), '0'), ''), '0')
      = coalesce(nullif(ltrim(upper(btrim(split_part(replace(canonical.number, '#', ''), '/', 1))), '0'), ''), '0')
    and coalesce(lower(btrim(legacy.variant_key)), '') = coalesce(lower(btrim(canonical.variant_key)), '')
    and coalesce(lower(btrim(legacy.printed_identity_modifier)), '') = coalesce(lower(btrim(canonical.printed_identity_modifier)), '')
    and (coalesce(legacy.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed' and case when legacy_control.set_id is not null then legacy_control.release_status = 'public' or (legacy_control.release_status = 'signed_in' and request_role in ('authenticated', 'service_role')) else true end)
    and (coalesce(canonical.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed' and case when canonical_control.set_id is not null then canonical_control.release_status = 'public' or (canonical_control.release_status = 'signed_in' and request_role in ('authenticated', 'service_role')) else true end)
    and not exists (
      select 1 from public.card_print_identity_aliases chained
      where chained.legacy_card_print_id = canonical.id and chained.active
    );
  discovery_exclusions := jungle_exclusions || prismatic_exclusions;
  best_of_game_exclusions := public.get_best_of_game_discovery_exclusions_v1();
  if requested_game is not null and length(requested_game) > 64 then
    raise exception 'get_public_catalog_sets_v2 game code is too long';
  end if;

  return query
  with visible_sets as materialized (
    select
      target.id,
      target.game,
      target.code,
      target.name,
      target.hero_image_url,
      target.hero_image_source,
      target.set_role,
      target.source #>> '{scryfall,set_type}' as catalog_set_type,
      target.printed_set_abbrev,
      target.printed_total,
      target.release_date,
      target.created_at,
      lower(target.code) as normalized_code
    from public.sets target
    left join public.catalog_set_release_controls set_control
      on set_control.set_id = target.id
    left join public.catalog_game_release_controls game_control
      on lower(game_control.game_code) = lower(target.game)
    where (requested_game is null or lower(target.game) = requested_game)
      and case
        when set_control.set_id is not null then
          set_control.release_status = 'public'
          or (
            set_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
        when lower(target.game) = 'pokemon' then true
        else
          game_control.release_status = 'public'
          or (
            game_control.release_status = 'signed_in'
            and request_role in ('authenticated', 'service_role')
          )
      end
  ),
  shrouded_policy as materialized (
    select (
with eligible as materialized (
   select shrouded_exclusions as ids
 ), family as materialized (
   select legacy_set.id as legacy_set_id, canonical_set.id as canonical_set_id
   from public.sets legacy_set cross join public.sets canonical_set
   where legacy_set.code='sv06.5' and canonical_set.code='sv6pt5'
     and legacy_set.game='pokemon' and canonical_set.game='pokemon'
     and legacy_set.printed_total=64 and canonical_set.printed_total=64
     and legacy_set.printed_set_abbrev='SFA' and canonical_set.printed_set_abbrev='SFA'
     and public.catalog_set_visible_to_request_v1(legacy_set.id)
     and public.catalog_set_visible_to_request_v1(canonical_set.id)
 )
 select jsonb_build_object('parent_id',stamp.id,'set_id',family.canonical_set_id,'set_code','sv6pt5')
 from public.card_prints stamp cross join family cross join eligible
 where cardinality(eligible.ids)=99
   and (select count(*) from public.card_prints legacy where legacy.set_id=family.legacy_set_id and legacy.set_code='sv06.5')=100
   and stamp.set_id=family.legacy_set_id and stamp.set_code='sv06.5'
   and stamp.gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP'
   and stamp.name='Galvantula' and coalesce(nullif(ltrim(stamp.number,'0'),''),'0')='2'
   and stamp.variant_key='prize_pack_stamp' and stamp.printed_identity_modifier='prize_pack_stamp'
   and stamp.identity_domain='pokemon_eng_standard'
   and public.catalog_card_print_visible_to_request_v1(stamp.id)
   and stamp.external_ids #>> '{verified_master_index_v1,source_package_id}'='PKG-17E-STAMPED-ACTIVE-FINISH-WEB-EVIDENCE'
   and stamp.external_ids #>> '{verified_master_index_v1,source_fingerprint_sha256}'='1e655ea689401abeb9be3805bb266b471be3adc758dd19f7c18befdc0a0a5714'
   and exists(select 1 from public.card_print_identity_aliases base_alias
     join public.card_prints base on base.id=base_alias.legacy_card_print_id
     join public.card_prints target on target.id=base_alias.canonical_card_print_id
     where base_alias.legacy_card_print_id=any(eligible.ids)
       and base_alias.legacy_card_print_id::text=stamp.external_ids #>> '{verified_master_index_v1,selected_base_parent_id}'
       and base.name=stamp.name and target.name=stamp.name
       and coalesce(nullif(ltrim(base.number,'0'),''),'0')='2'
       and coalesce(nullif(ltrim(target.number,'0'),''),'0')='2'
       and coalesce(base.variant_key,'')='' and coalesce(target.variant_key,'')=''
       and coalesce(base.printed_identity_modifier,'')='' and coalesce(target.printed_identity_modifier,'')='')
   and (select count(*) from public.card_printings child where child.card_print_id=stamp.id)=1
   and exists(select 1 from public.card_printings child where child.card_print_id=stamp.id
     and child.finish_key='cosmos' and child.printing_gv_id='GV-PK-SV06-5-002-PRIZE-PACK-STAMP-COSMOS'
     and not child.is_provisional)
   and not exists(select 1 from public.card_print_identity_aliases chained where chained.legacy_card_print_id=stamp.id and chained.active)
   and not exists(select 1 from public.card_prints candidate where candidate.set_id=family.canonical_set_id
     and lower(regexp_replace(btrim(candidate.name),'\s+',' ','g'))=lower(stamp.name)
     and coalesce(nullif(ltrim(upper(btrim(split_part(replace(candidate.number,'#',''),'/',1))),'0'),''),'0')='2'
     and (coalesce(lower(btrim(candidate.variant_key)),'')='prize_pack_stamp'
       or coalesce(lower(btrim(candidate.printed_identity_modifier)),'')='prize_pack_stamp'))
    ) as value
  ),
  best_of_game_policy as materialized (
    select (
select case when cardinality(best_of_game_exclusions)=9
  then '{"parent_ids":["03e8e4c7-ad3d-470b-adb3-69082a7f6181","33126ebf-99f6-4d76-a9bc-179c89e2eb34","614efd10-0ce3-438b-8466-6584bebb88cb","c0204042-56f4-42a8-878c-7908a2925863"],"set_id":"c8debb57-da6f-46ce-8777-13ecedfe2856","set_code":"bp"}'::jsonb else null::jsonb end
    ) as value
  ),
  projections as materialized (
    select (s.value ->> 'parent_id')::uuid as parent_id,
           (s.value ->> 'set_id')::uuid as set_id,
           s.value ->> 'set_code' as set_code
    from shrouded_policy s where s.value is not null
    union all
    select member.id::uuid, (b.value ->> 'set_id')::uuid, b.value ->> 'set_code'
    from best_of_game_policy b
    cross join lateral pg_catalog.jsonb_array_elements_text(b.value -> 'parent_ids') member(id)
  ),
  countable_cards as materialized (
    select card.id,card.set_id,card.set_code
    from public.card_prints card
    join visible_sets countable_set on countable_set.id=card.set_id
    where card.gv_id is not null
      and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}','visible') <> 'suppressed'
      and card.id not in (select projection.parent_id from projections projection)
    union all
    select card.id,projection.set_id,projection.set_code
    from public.card_prints card
    join projections projection on projection.parent_id=card.id
    join visible_sets countable_set on countable_set.id=projection.set_id
    where card.gv_id is not null
      and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}','visible') <> 'suppressed'
  ),
  visible_card_counts as materialized (
    select
      lower(card.set_code) as normalized_code,
      count(*)::bigint as card_count
    from countable_cards card
    join visible_sets visible_set
      on visible_set.id = card.set_id
    where discovery_exclusions is not null
      and card.id not in (select unnest(discovery_exclusions))
      and card.id not in (select unnest(paldean_exclusions))
      and card.id not in (select unnest(pokemon_go_exclusions))
      and card.id not in (select unnest(mcdonalds_2021_exclusions))
      and card.id not in (select unnest(latios_exclusions))
      and card.id not in (select unnest(shrouded_exclusions))
      and card.id not in (select unnest(best_of_game_exclusions))
    group by lower(card.set_code)
  )
  select
    visible_set.id,
    visible_set.game,
    visible_set.code,
    visible_set.name,
    visible_set.hero_image_url,
    visible_set.hero_image_source,
    visible_set.set_role,
    visible_set.catalog_set_type,
    visible_set.printed_set_abbrev,
    visible_set.printed_total,
    visible_set.release_date,
    visible_set.created_at,
    count_row.card_count
  from visible_sets visible_set
  join visible_card_counts count_row
    on count_row.normalized_code = visible_set.normalized_code
  where count_row.card_count > 0
  order by visible_set.game, visible_set.code, visible_set.id;
end;
$function$;

do $guard$
declare helper pg_catalog.pg_proc; dependency record;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261123220000')
    or not exists(select 1 from pg_catalog.pg_index where indexrelid='public.card_prints_catalog_visible_counts_v1_idx'::regclass and indisvalid and indisready)
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
  then raise exception 'BULK_CATALOG_DEPENDENCY_DRIFT' using errcode='23514';end if;
  for dependency in select * from (values
    ('public.get_prismatic_discovery_exclusions_v1()','29c3b68ca84096e7044ead4d165d3b86'),
    ('public.get_paldean_fates_discovery_exclusions_v1()','8ff7bf56c6b65189e585f746164edbf0'),
    ('public.get_pokemon_go_discovery_exclusions_v1()','edec96d9eee27c54b4235392460cb119'),
    ('public.get_mcdonalds_2021_discovery_exclusions_v1()','48ffa0c0ae25344ce6a9d0ae882add96'),
    ('public.get_latios_discovery_exclusions_v1()','233a4b24181915dccafe4fea71833b02'),
    ('public.get_shrouded_fable_discovery_exclusions_v1()','7f8f5d50a8c0f1cd4b39ffffa13f9019'),
    ('public.get_shrouded_fable_discovery_projection_v1()','53b0c3de12ca0ab8fb35c9988f9eae42'),
    ('public.get_best_of_game_discovery_projection_v1()','b5d1836d5cb1a50b491cc166ece08716'),
    ('public.get_jungle_edition_discovery_exclusions_v1()','785a73c557969ea38c3e9dab388da5af'),
    ('public.get_best_of_game_discovery_exclusions_v1()','7ffa99efe2fc79f231cfb207a5d0eb1e'),
    ('public.catalog_set_visible_to_request_v1(uuid)','2c32ea19630a1e4a18b654fbb2660c56'),
    ('public.catalog_card_print_visible_to_request_v1(uuid)','62c6ad0751432656e094e830254470d6'),
    ('public.catalog_parent_gv_id_visible_to_request_v1(text)','067c47d2e75deb97c01f5ec58455bfbb')
  ) pinned(signature,body_md5) loop
    if (select md5(prosrc)from pg_catalog.pg_proc where oid=dependency.signature::regprocedure) is distinct from dependency.body_md5 then
      raise exception 'BULK_CATALOG_DEPENDENCY_DRIFT: %',dependency.signature using errcode='23514';end if;
  end loop;
  select * into helper from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure;
  if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
    or helper.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or helper.prokind<>'f' or helper.provolatile<>'s' or not helper.prosecdef or helper.proisstrict or helper.proleakproof
    or not helper.proretset or helper.proparallel<>'u' or helper.pronargs<>1 or helper.pronargdefaults<>1
    or helper.procost<>100 or helper.prorows<>1000 or helper.proargtypes::text<>'25' or helper.prorettype<>'record'::regtype
    or helper.proargnames is distinct from array['p_game_code','id','game','code','name','hero_image_url','hero_image_source','set_role','catalog_set_type','printed_set_abbrev','printed_total','release_date','created_at','card_count']::text[]
    or helper.proargmodes is distinct from array['i','t','t','t','t','t','t','t','t','t','t','t','t','t']::"char"[]
    or helper.proallargtypes is distinct from array[25,2950,25,25,25,25,25,25,25,25,23,1082,1184,20]::oid[]
    or pg_catalog.pg_get_function_arguments(helper.oid)<>'p_game_code text DEFAULT NULL::text'
    or helper.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
    or md5(helper.prosrc) <> 'd153e2448c31fe99b83f0e4df2c02cba'
    or exists(select 1 from pg_catalog.aclexplode(coalesce(helper.proacl,pg_catalog.acldefault('f',helper.proowner))) permission where permission.grantee=0)
    or exists(select 1 from unnest(array['anon','authenticated','service_role']) role_name where not pg_catalog.has_function_privilege(role_name,helper.oid,'EXECUTE'))
  then raise exception 'BULK_CATALOG_BASELINE_DRIFT' using errcode='23514';end if;
end $guard$;
commit;
