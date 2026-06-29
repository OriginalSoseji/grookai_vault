-- MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1 readback plan.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1_READBACK'::text as package_id,
  count(*) filter (where table_name = 'market_evidence_review_dispositions')::int as table_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'market_evidence_review_dispositions';

select
  'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1_COLUMNS'::text as package_id,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'market_evidence_review_dispositions'
order by ordinal_position;

select
  'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1_PUBLIC_GRANTS'::text as package_id,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'market_evidence_review_dispositions'
  and grantee in ('public', 'anon', 'authenticated')
order by grantee, privilege_type;

select
  'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1_FLAG_PROOF'::text as package_id,
  count(*)::int as disposition_rows,
  count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
  count(*) filter (where can_publish_price_directly)::int as direct_publish_rows,
  count(*) filter (where publishable)::int as publishable_rows,
  count(*) filter (where app_visible)::int as app_visible_rows,
  count(*) filter (where market_truth)::int as market_truth_rows
from public.market_evidence_review_dispositions;
