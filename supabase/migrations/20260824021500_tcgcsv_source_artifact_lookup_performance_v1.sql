-- TCGCSV_SOURCE_ARTIFACT_LOOKUP_PERFORMANCE_V1
-- Supports exact source-run provenance lookup without blocking warehouse writes.

create index concurrently if not exists
  tcgcsv_source_artifacts_sync_run_kind_latest_idx
on public.tcgcsv_source_artifacts (
  sync_run_id,
  artifact_kind,
  created_at desc,
  id desc
)
include (sha256);

comment on index public.tcgcsv_source_artifacts_sync_run_kind_latest_idx is
'Bounds publication provenance lookup to one TCGCSV source run and artifact kind while retaining the latest artifact hash as index-only evidence.';
