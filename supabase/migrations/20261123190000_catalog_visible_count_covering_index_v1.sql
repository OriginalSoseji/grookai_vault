-- Exact 520-to521 access-path correction. No row or reader-definition changes.
begin;
set local lock_timeout='3s';
set local statement_timeout='60s';

do $guard$
declare
  reader pg_catalog.pg_proc;
  existing_index oid := pg_catalog.to_regclass('public.card_prints_catalog_visible_counts_v1_idx');
  expected_definition constant text := 'CREATE INDEX card_prints_catalog_visible_counts_v1_idx ON public.card_prints USING btree (set_id, id) INCLUDE (set_code) WHERE ((gv_id IS NOT NULL) AND (COALESCE((data_quality_flags #>> ''{app_visibility_v1,status}''::text[]), ''visible''::text) <> ''suppressed''::text))';
begin
  select * into reader from pg_catalog.pg_proc
    where oid='public.get_public_catalog_sets_v2(text)'::regprocedure;
  if reader.proowner<>(select oid from pg_catalog.pg_roles where rolname='postgres')
    or reader.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or reader.prokind<>'f' or reader.provolatile<>'s' or not reader.prosecdef
    or reader.pronargs<>1 or reader.proargtypes::text<>'25'
    or reader.prorettype<>'record'::regtype
    or reader.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
    or md5(reader.prosrc)<>'6edf060cb9c5161d2c5e623bbccf912e'
    or not exists(select 1 from supabase_migrations.schema_migrations where version='20261123050000')
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
  then
    raise exception 'BEST_OF_GAME_CATALOG_COVER_BASELINE_DRIFT' using errcode='23514';
  end if;
  if existing_index is not null and (
    pg_catalog.pg_get_indexdef(existing_index) is distinct from expected_definition
    or not exists (
      select 1 from pg_catalog.pg_index i
      join pg_catalog.pg_class c on c.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=c.relam
      where i.indexrelid=existing_index and i.indrelid='public.card_prints'::regclass
        and i.indisvalid and i.indisready and not i.indisunique and not i.indisprimary
        and i.indnkeyatts=2 and i.indnatts=3 and am.amname='btree'
        and c.relowner=(select oid from pg_catalog.pg_roles where rolname='postgres')
    )
  ) then
    raise exception 'BEST_OF_GAME_CATALOG_COVER_INDEX_DRIFT' using errcode='23514';
  end if;
end $guard$;

create index if not exists card_prints_catalog_visible_counts_v1_idx
  on public.card_prints(set_id,id) include(set_code)
  where gv_id is not null
    and coalesce(data_quality_flags #>> '{app_visibility_v1,status}','visible') <> 'suppressed';

do $guard$
declare
  expected_definition constant text := 'CREATE INDEX card_prints_catalog_visible_counts_v1_idx ON public.card_prints USING btree (set_id, id) INCLUDE (set_code) WHERE ((gv_id IS NOT NULL) AND (COALESCE((data_quality_flags #>> ''{app_visibility_v1,status}''::text[]), ''visible''::text) <> ''suppressed''::text))';
begin
  if pg_catalog.pg_get_indexdef('public.card_prints_catalog_visible_counts_v1_idx'::regclass) is distinct from expected_definition
    or not exists (
      select 1 from pg_catalog.pg_index i
      join pg_catalog.pg_class c on c.oid=i.indexrelid
      join pg_catalog.pg_am am on am.oid=c.relam
      where i.indexrelid='public.card_prints_catalog_visible_counts_v1_idx'::regclass
        and i.indrelid='public.card_prints'::regclass and i.indisvalid and i.indisready
        and not i.indisunique and not i.indisprimary
        and i.indnkeyatts=2 and i.indnatts=3 and am.amname='btree'
        and c.relowner=(select oid from pg_catalog.pg_roles where rolname='postgres')
    )
    or (select md5(prosrc) from pg_catalog.pg_proc where oid='public.get_public_catalog_sets_v2(text)'::regprocedure)<>'6edf060cb9c5161d2c5e623bbccf912e'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_set_family_discovery_v1'::regclass,true))<>'75886415346b7f934cf4bac73d5de9fe'
    or md5(pg_catalog.pg_get_viewdef('public.v_card_prints_discovery_v1'::regclass,true))<>'01146b933952b2ea8e524705043e9eaf'
  then
    raise exception 'BEST_OF_GAME_CATALOG_COVER_POSTCONDITION_DRIFT' using errcode='23514';
  end if;
end $guard$;
commit;
