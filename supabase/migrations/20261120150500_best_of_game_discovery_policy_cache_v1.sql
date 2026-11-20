-- Forward-only scalar policy evaluation repair. Zero canonical or operational data writes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';
do $guard$
declare helper pg_catalog.pg_proc; family pg_catalog.pg_class;
begin
 select * into helper from pg_catalog.pg_proc where oid='public.get_best_of_game_discovery_projection_v1()'::regprocedure;
 select * into family from pg_catalog.pg_class where oid='public.v_card_prints_set_family_discovery_v1'::regclass;
 if helper.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
  or not helper.prosecdef or helper.provolatile<>'s' or helper.pronargs<>0
  or helper.prorettype<>'jsonb'::regtype or helper.proconfig is distinct from array['search_path=""']::text[]
  or helper.prosrc not in('
 select jsonb_build_object(''parent_ids'',e.value->''winner_ids'',''set_id'',e.value->>''canonical_set_id'',''set_code'',''bp'')
 from (select public.get_best_of_game_discovery_evidence_v1() as value) e
 where e.value is not null and cardinality(public.get_best_of_game_discovery_exclusions_v1())=9;
','
 select case when cardinality(public.get_best_of_game_discovery_exclusions_v1())=9
  then ''{"parent_ids":["03e8e4c7-ad3d-470b-adb3-69082a7f6181","33126ebf-99f6-4d76-a9bc-179c89e2eb34","614efd10-0ce3-438b-8466-6584bebb88cb","c0204042-56f4-42a8-878c-7908a2925863"],"set_id":"c8debb57-da6f-46ce-8777-13ecedfe2856","set_code":"bp"}''::jsonb else null::jsonb end;
')
  or family.relkind<>'v' or family.relowner<>helper.proowner
  or family.reloptions is distinct from array['security_invoker=true']::text[]
  or (select array_agg(attname::text order by attnum) from pg_catalog.pg_attribute where attrelid=family.oid and attnum>0 and not attisdropped)
     is distinct from array['id','game_id','set_id','name','number','variant_key','rarity','image_url','tcgplayer_id','external_ids','updated_at','set_code','artist','regulation_mark','image_alt_url','image_source','variants','created_at','last_synced_at','print_identity_key','ai_metadata','image_hash','data_quality_flags','image_status','image_res','image_last_checked_at','printed_set_abbrev','printed_total','number_plain','gv_id','image_path','identity_domain','printed_identity_modifier','set_identity_model','representative_image_url','image_note']::text[]
  or not exists(select 1 from supabase_migrations.schema_migrations where version='20261120081500')
  or cardinality(public.get_best_of_game_discovery_exclusions_v1())<>9
 then raise exception 'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT' using errcode='23514';end if;
 if exists(select 1 from unnest(array['anon','authenticated','service_role'])role_name
  where not has_table_privilege(role_name,family.oid,'SELECT')
   or has_table_privilege(role_name,family.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN'))
 then raise exception 'BEST_OF_GAME_POLICY_CACHE_PERMISSION_DRIFT' using errcode='23514';end if;
end $guard$;
-- The unchanged exclusions helper already validates every frozen evidence and alias fact.
-- Nine exclusions imply the exact four Winner IDs and BP set below; missing authority returns NULL.
create or replace function public.get_best_of_game_discovery_projection_v1()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select case when cardinality(public.get_best_of_game_discovery_exclusions_v1())=9
  then '{"parent_ids":["03e8e4c7-ad3d-470b-adb3-69082a7f6181","33126ebf-99f6-4d76-a9bc-179c89e2eb34","614efd10-0ce3-438b-8466-6584bebb88cb","c0204042-56f4-42a8-878c-7908a2925863"],"set_id":"c8debb57-da6f-46ce-8777-13ecedfe2856","set_code":"bp"}'::jsonb else null::jsonb end;
$function$;
-- Each scalar policy is evaluated once per statement; all36 columns and UNION ALL arms stay intact.
create or replace view public.v_card_prints_set_family_discovery_v1 with(security_invoker=true) as
with shrouded_policy as materialized(select public.get_shrouded_fable_discovery_projection_v1() as value),
 best_of_game_policy as materialized(select public.get_best_of_game_discovery_projection_v1() as value),
 projections as materialized(
 select (value->>'parent_id')::uuid as parent_id,(value->>'set_id')::uuid as set_id,value->>'set_code' as set_code
 from shrouded_policy s where value is not null
 union all
 select member.id::uuid,(value->>'set_id')::uuid,value->>'set_code'
 from best_of_game_policy b
 cross join lateral jsonb_array_elements_text(value->'parent_ids') member(id)
)
select card."id",
card."game_id",
card."set_id",
card."name",
card."number",
card."variant_key",
card."rarity",
card."image_url",
card."tcgplayer_id",
card."external_ids",
card."updated_at",
card."set_code",
card."artist",
card."regulation_mark",
card."image_alt_url",
card."image_source",
card."variants",
card."created_at",
card."last_synced_at",
card."print_identity_key",
card."ai_metadata",
card."image_hash",
card."data_quality_flags",
card."image_status",
card."image_res",
card."image_last_checked_at",
card."printed_set_abbrev",
card."printed_total",
card."number_plain",
card."gv_id",
card."image_path",
card."identity_domain",
card."printed_identity_modifier",
card."set_identity_model",
card."representative_image_url",
card."image_note" from public.card_prints card where card.id not in(select parent_id from projections)
union all
select card."id",
card."game_id",
projection.set_id,
card."name",
card."number",
card."variant_key",
card."rarity",
card."image_url",
card."tcgplayer_id",
card."external_ids",
card."updated_at",
projection.set_code,
card."artist",
card."regulation_mark",
card."image_alt_url",
card."image_source",
card."variants",
card."created_at",
card."last_synced_at",
card."print_identity_key",
card."ai_metadata",
card."image_hash",
card."data_quality_flags",
card."image_status",
card."image_res",
card."image_last_checked_at",
card."printed_set_abbrev",
card."printed_total",
card."number_plain",
card."gv_id",
card."image_path",
card."identity_domain",
card."printed_identity_modifier",
card."set_identity_model",
card."representative_image_url",
card."image_note" from public.card_prints card join projections projection on projection.parent_id=card.id;
notify pgrst,'reload schema';
commit;
