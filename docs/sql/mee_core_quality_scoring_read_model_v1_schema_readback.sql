-- MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1 readback.
-- Run only after a separately approved targeted remote schema apply.

select
  'MEE-CORE-QUALITY-SCORING-READ-MODEL-SCHEMA-CANDIDATE-V1_READBACK'::text as package_id,
  to_regclass('public.v_market_evidence_candidate_quality_scores_v1') is not null as view_exists,
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'v_market_evidence_candidate_quality_scores_v1'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
  ) as public_or_client_grant_rows,
  (
    select count(*)::int
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'v_market_evidence_candidate_quality_scores_v1'
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
  ) as service_role_select_grant_rows,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth;
