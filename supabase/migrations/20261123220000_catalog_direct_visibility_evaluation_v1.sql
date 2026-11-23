-- Forward-only 521-to522 direct visibility evaluation. No row, grant or policy changes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';

do $guard$
declare
  expected record;
  helper pg_catalog.pg_proc;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261123190000')
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.catalog_game_visible_to_request_v1(text)'::regprocedure)<>'785d1717fff0f3e53876a595660850db'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.catalog_game_id_visible_to_request_v1(uuid)'::regprocedure)<>'1e4d65031725afa480e39ca7cb4104b6'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure)<>'6edf060cb9c5161d2c5e623bbccf912e'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.search_print_identity_v1(text,text,text,text,integer,integer)'::regprocedure)<>'c44d11a2093a3d678f5378b3d7fda7c7'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
    or not exists(select 1 from pg_catalog.pg_index where indexrelid='public.card_prints_catalog_visible_counts_v1_idx'::regclass and indisvalid and indisready)
  then raise exception 'DIRECT_VISIBILITY_DEPENDENCY_DRIFT' using errcode='23514'; end if;
  for expected in select * from (values
    ('public.catalog_set_visible_to_request_v1(uuid)',2950,'p_set_id','9ecce9142b42047383b5a4f9a36e95f6','2c32ea19630a1e4a18b654fbb2660c56'),
    ('public.catalog_card_print_visible_to_request_v1(uuid)',2950,'p_card_print_id','8e4be8b953220324bee9d2a8a280a302','62c6ad0751432656e094e830254470d6'),
    ('public.catalog_parent_gv_id_visible_to_request_v1(text)',25,'p_parent_gv_id','1d60d86cdeeaa17e54d167390ce7a33d','067c47d2e75deb97c01f5ec58455bfbb')
  ) as pinned(signature,input_type,input_name,old_body,new_body) loop
    select * into helper from pg_catalog.pg_proc where oid=expected.signature::regprocedure;
    if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
      or helper.prolang<>(select oid from pg_catalog.pg_language where lanname='sql')
      or helper.prokind<>'f' or helper.provolatile<>'s' or not helper.prosecdef
      or helper.proisstrict or helper.proleakproof or helper.proretset or helper.proparallel<>'u'
      or helper.pronargs<>1 or helper.pronargdefaults<>0 or helper.procost<>100
      or helper.proargtypes::text<>expected.input_type::text or helper.prorettype<>'boolean'::regtype
      or helper.proargnames is distinct from array[expected.input_name]::text[]
      or helper.proconfig is distinct from array['search_path=public']::text[]
      or md5(helper.prosrc) not in(expected.old_body,expected.new_body)
      or exists(select 1 from pg_catalog.aclexplode(coalesce(helper.proacl,pg_catalog.acldefault('f',helper.proowner))) permission where permission.grantee=0)
      or exists(select 1 from unnest(array['anon','authenticated','service_role']) role_name where not pg_catalog.has_function_privilege(role_name,helper.oid,'EXECUTE'))
    then raise exception 'DIRECT_VISIBILITY_BASELINE_DRIFT: %',expected.signature using errcode='23514'; end if;
  end loop;
end $guard$;

-- These CASE/EXISTS expressions preserve the live set override and game policy,
-- including Pokemon inheritance, missing targets, JWT roles and suppression.
-- Keep these three definitions aligned with future game/set policy changes.
create or replace function public.catalog_set_visible_to_request_v1(p_set_id uuid) returns boolean language sql stable security definer set search_path = public as $function$
 select coalesce((select case when set_control.set_id is not null then set_control.release_status = 'public' or (set_control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')) else case when lower(coalesce(target_set.game, '')) = 'pokemon' then true when lower(coalesce(target_set.game, '')) = '' then false else exists (select 1 from public.catalog_game_release_controls control where lower(control.game_code) = lower(target_set.game) and (control.release_status = 'public' or (control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')))) end end from public.sets target_set left join public.catalog_set_release_controls set_control on set_control.set_id = target_set.id where target_set.id = p_set_id), false);
$function$;

create or replace function public.catalog_card_print_visible_to_request_v1(p_card_print_id uuid) returns boolean language sql stable security definer set search_path = public as $function$
 select coalesce((select case when card.set_id is not null then case when target_set.id is null then false else case when set_control.set_id is not null then set_control.release_status = 'public' or (set_control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')) else case when lower(coalesce(target_set.game, '')) = 'pokemon' then true when lower(coalesce(target_set.game, '')) = '' then false else exists (select 1 from public.catalog_game_release_controls control where lower(control.game_code) = lower(target_set.game) and (control.release_status = 'public' or (control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')))) end end end else case when lower(coalesce(target_game.code, '')) = 'pokemon' then true when lower(coalesce(target_game.code, '')) = '' then false else exists (select 1 from public.catalog_game_release_controls control where lower(control.game_code) = lower(target_game.code) and (control.release_status = 'public' or (control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')))) end end from public.card_prints card left join public.sets target_set on target_set.id = card.set_id left join public.catalog_set_release_controls set_control on set_control.set_id = target_set.id left join public.games target_game on card.set_id is null and target_game.id = card.game_id where card.id = p_card_print_id and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'), false);
$function$;

create or replace function public.catalog_parent_gv_id_visible_to_request_v1(p_parent_gv_id text) returns boolean language sql stable security definer set search_path = public as $function$
 select coalesce((select case when card.set_id is not null then case when target_set.id is null then false else case when set_control.set_id is not null then set_control.release_status = 'public' or (set_control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')) else case when lower(coalesce(target_set.game, '')) = 'pokemon' then true when lower(coalesce(target_set.game, '')) = '' then false else exists (select 1 from public.catalog_game_release_controls control where lower(control.game_code) = lower(target_set.game) and (control.release_status = 'public' or (control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')))) end end end else case when lower(coalesce(target_game.code, '')) = 'pokemon' then true when lower(coalesce(target_game.code, '')) = '' then false else exists (select 1 from public.catalog_game_release_controls control where lower(control.game_code) = lower(target_game.code) and (control.release_status = 'public' or (control.release_status = 'signed_in' and coalesce(auth.role(), '') in ('authenticated', 'service_role')))) end end from public.card_prints card left join public.sets target_set on target_set.id = card.set_id left join public.catalog_set_release_controls set_control on set_control.set_id = target_set.id left join public.games target_game on card.set_id is null and target_game.id = card.game_id where card.gv_id = p_parent_gv_id and coalesce(card.data_quality_flags #>> '{app_visibility_v1,status}', 'visible') <> 'suppressed'), false);
$function$;

do $guard$
declare
  expected record;
  helper pg_catalog.pg_proc;
begin
  if not exists(select 1 from supabase_migrations.schema_migrations where version='20261123190000')
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.catalog_game_visible_to_request_v1(text)'::regprocedure)<>'785d1717fff0f3e53876a595660850db'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.catalog_game_id_visible_to_request_v1(uuid)'::regprocedure)<>'1e4d65031725afa480e39ca7cb4104b6'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure)<>'6edf060cb9c5161d2c5e623bbccf912e'
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.search_print_identity_v1(text,text,text,text,integer,integer)'::regprocedure)<>'c44d11a2093a3d678f5378b3d7fda7c7'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
    or not exists(select 1 from pg_catalog.pg_index where indexrelid='public.card_prints_catalog_visible_counts_v1_idx'::regclass and indisvalid and indisready)
  then raise exception 'DIRECT_VISIBILITY_DEPENDENCY_DRIFT' using errcode='23514'; end if;
  for expected in select * from (values
    ('public.catalog_set_visible_to_request_v1(uuid)',2950,'p_set_id','9ecce9142b42047383b5a4f9a36e95f6','2c32ea19630a1e4a18b654fbb2660c56'),
    ('public.catalog_card_print_visible_to_request_v1(uuid)',2950,'p_card_print_id','8e4be8b953220324bee9d2a8a280a302','62c6ad0751432656e094e830254470d6'),
    ('public.catalog_parent_gv_id_visible_to_request_v1(text)',25,'p_parent_gv_id','1d60d86cdeeaa17e54d167390ce7a33d','067c47d2e75deb97c01f5ec58455bfbb')
  ) as pinned(signature,input_type,input_name,old_body,new_body) loop
    select * into helper from pg_catalog.pg_proc where oid=expected.signature::regprocedure;
    if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
      or helper.prolang<>(select oid from pg_catalog.pg_language where lanname='sql')
      or helper.prokind<>'f' or helper.provolatile<>'s' or not helper.prosecdef
      or helper.proisstrict or helper.proleakproof or helper.proretset or helper.proparallel<>'u'
      or helper.pronargs<>1 or helper.pronargdefaults<>0 or helper.procost<>100
      or helper.proargtypes::text<>expected.input_type::text or helper.prorettype<>'boolean'::regtype
      or helper.proargnames is distinct from array[expected.input_name]::text[]
      or helper.proconfig is distinct from array['search_path=public']::text[]
      or md5(helper.prosrc)<>expected.new_body
      or exists(select 1 from pg_catalog.aclexplode(coalesce(helper.proacl,pg_catalog.acldefault('f',helper.proowner))) permission where permission.grantee=0)
      or exists(select 1 from unnest(array['anon','authenticated','service_role']) role_name where not pg_catalog.has_function_privilege(role_name,helper.oid,'EXECUTE'))
    then raise exception 'DIRECT_VISIBILITY_POSTCONDITION_DRIFT: %',expected.signature using errcode='23514'; end if;
  end loop;
end $guard$;

notify pgrst,'reload schema';
commit;
