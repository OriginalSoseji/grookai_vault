-- PROPOSAL ONLY. NOT A MIGRATION. DO NOT APPLY TO PRODUCTION.
-- Known production PUBLIC TEMP and net routine privileges make this fail closed.
-- No credential, LOGIN activation, global PUBLIC revoke, or data write is included.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = pg_catalog, public;

DO $review$
DECLARE
  reader constant text := 'grookai_pricing_reader_v1';
  required constant text[] := ARRAY['sets','card_prints','card_print_identity',
    'external_mappings','tcgcsv_source_groups','tcgcsv_source_products',
    'tcgcsv_source_sync_runs','tcgcsv_source_price_daily_observations',
    'market_price_current_publication','market_price_publication_snapshots'];
  item record;
  actual_expr text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = reader) THEN
    RAISE EXCEPTION 'READER_ROLE_ALREADY_EXISTS';
  END IF;
  -- NOINHERIT does not remove PUBLIC privileges. Never revoke these globally.
  IF EXISTS (
    SELECT 1 FROM pg_database d,
      LATERAL aclexplode(coalesce(d.datacl, acldefault('d', d.datdba))) a
    WHERE d.datname=current_database() AND a.grantee=0
      AND a.privilege_type IN ('CREATE','TEMPORARY')
  ) THEN RAISE EXCEPTION 'PUBLIC_DATABASE_CREATE_OR_TEMP_BLOCKER'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_namespace n,
      LATERAL aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
      AND a.grantee=0 AND a.privilege_type='CREATE'
  ) THEN RAISE EXCEPTION 'PUBLIC_SCHEMA_CREATE_BLOCKER'; END IF;

  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY(required)
        AND c.relkind='r' AND c.relrowsecurity) <> 10 THEN
    RAISE EXCEPTION 'EXACT_TEN_RLS_TABLES_REQUIRED';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
      AND tablename=ANY(required) AND permissive='RESTRICTIVE') <> 4 THEN
    RAISE EXCEPTION 'RESTRICTIVE_POLICY_POPULATION_DRIFT';
  END IF;

  -- Full definitions pinned to accepted fixed metadata, not volatility labels.
  FOR item IN SELECT * FROM (VALUES
    ('public.catalog_set_visible_to_request_v1(uuid)', '16d45c754388e75f7da79e7f1250b29e'),
    ('public.catalog_card_print_visible_to_request_v1(uuid)', '7be124f653e91c142a03abae82d7bdb8'),
    ('public.catalog_game_visible_to_request_v1(text)', '825bb289f234f7733c288cbc1144608f'),
    ('public.catalog_game_id_visible_to_request_v1(uuid)', 'a62f8e2068b55aaedf09983b519ea133')
  ) AS pins(signature, definition_md5) LOOP
    IF to_regprocedure(item.signature) IS NULL OR NOT EXISTS (
      SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(item.signature)
        AND p.prosecdef AND p.provolatile='s' AND p.prokind='f'
        AND p.proconfig=ARRAY['search_path=public']::text[]
        AND md5(pg_get_functiondef(p.oid))=item.definition_md5
    ) THEN RAISE EXCEPTION 'VISIBILITY_HELPER_DEFINITION_DRIFT'; END IF;
  END LOOP;

  -- Preserve each old predicate for every other session, including SET ROLE.
  FOR item IN SELECT * FROM (VALUES
    ('sets','sets_catalog_release_visibility_v1','catalog_set_visible_to_request_v1(id)'),
    ('card_prints','card_prints_catalog_release_visibility_v1','catalog_card_print_visible_to_request_v1(id)'),
    ('card_print_identity','card_print_identity_catalog_release_visibility_v1','catalog_card_print_visible_to_request_v1(card_print_id)'),
    ('card_prints','card_prints_hide_explicitly_suppressed_v1',
      '(COALESCE((data_quality_flags #>> ''{app_visibility_v1,status}''::text[]), ''visible''::text) <> ''suppressed''::text)')
  ) AS pins(table_name, policy_name, expression) LOOP
    SELECT qual INTO actual_expr FROM pg_policies
      WHERE schemaname='public' AND tablename=item.table_name
        AND policyname=item.policy_name AND permissive='RESTRICTIVE'
        AND cmd='SELECT' AND roles=ARRAY['public']::name[] AND with_check IS NULL;
    IF actual_expr IS DISTINCT FROM item.expression THEN
      RAISE EXCEPTION 'RESTRICTIVE_POLICY_DRIFT';
    END IF;
  END LOOP;

  CREATE ROLE grookai_pricing_reader_v1 NOLOGIN NOINHERIT NOSUPERUSER
    NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;
  ALTER ROLE grookai_pricing_reader_v1 SET default_transaction_read_only=on;
  ALTER ROLE grookai_pricing_reader_v1 SET statement_timeout='120s';
  ALTER ROLE grookai_pricing_reader_v1 SET lock_timeout='5s';
  ALTER ROLE grookai_pricing_reader_v1 SET idle_in_transaction_session_timeout='120s';
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I',current_database(),reader);
  GRANT USAGE ON SCHEMA public TO grookai_pricing_reader_v1;
  FOREACH actual_expr IN ARRAY required LOOP
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO %I',actual_expr,reader);
    EXECUTE format('CREATE POLICY pricing_reader_select_v1 ON public.%I AS PERMISSIVE FOR SELECT TO %I USING (true)',actual_expr,reader);
  END LOOP;
  FOR item IN SELECT tablename,policyname,qual FROM pg_policies
    WHERE schemaname='public' AND (tablename,policyname) IN (
      ('sets','sets_catalog_release_visibility_v1'),
      ('card_prints','card_prints_catalog_release_visibility_v1'),
      ('card_print_identity','card_print_identity_catalog_release_visibility_v1'),
      ('card_prints','card_prints_hide_explicitly_suppressed_v1')) LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I USING (CASE WHEN current_user = %L::name AND session_user = %L::name THEN true ELSE (%s) END)',
      item.policyname,item.tablename,reader,reader,item.qual);
  END LOOP;
  -- PostgreSQL checks function ACLs even when this CASE branch is unselected.
  GRANT EXECUTE ON FUNCTION public.catalog_set_visible_to_request_v1(uuid),
    public.catalog_card_print_visible_to_request_v1(uuid) TO grookai_pricing_reader_v1;

  -- Effective privilege audit includes PUBLIC, column grants and invoker routines.
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=reader)) THEN
    RAISE EXCEPTION 'READER_MEMBERSHIP_BLOCKER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace n WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
    AND has_schema_privilege(reader,n.oid,'CREATE')) THEN
    RAISE EXCEPTION 'EFFECTIVE_SCHEMA_CREATE_BLOCKER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
      AND c.relkind IN ('r','p','v','m','f') AND (
        has_table_privilege(reader,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(reader,c.oid,'INSERT,UPDATE,REFERENCES')
        OR ((has_table_privilege(reader,c.oid,'SELECT') OR has_any_column_privilege(reader,c.oid,'SELECT'))
          AND NOT (n.nspname='public' AND c.relname=ANY(required))))) THEN
    RAISE EXCEPTION 'EFFECTIVE_RELATION_OR_COLUMN_BLOCKER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='S' AND n.nspname !~ '^pg_'
      AND has_sequence_privilege(reader,c.oid,'USAGE,SELECT,UPDATE')) THEN
    RAISE EXCEPTION 'EFFECTIVE_SEQUENCE_BLOCKER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname<>'information_schema'
      AND has_schema_privilege(reader,n.oid,'USAGE') AND has_function_privilege(reader,p.oid,'EXECUTE')
      AND p.oid NOT IN ('public.catalog_set_visible_to_request_v1(uuid)'::regprocedure,
                       'public.catalog_card_print_visible_to_request_v1(uuid)'::regprocedure)) THEN
    RAISE EXCEPTION 'EFFECTIVE_APP_ROUTINE_BLOCKER';
  END IF;
END
$review$;
-- NOLOGIN is intentional. This proposal grants no credential activation authority.
COMMIT;
