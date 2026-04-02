set search_path = public;

comment on table public.external_discovery_candidates is
'Non-canonical staging layer for external discovery candidates that already passed source-specific canon-gate classification or require printed-identity review before canon decision.';

comment on column public.external_discovery_candidates.candidate_bucket is
'External discovery staging accepts CLEAN_CANON_CANDIDATE rows plus PRINTED_IDENTITY_REVIEW rows that must remain non-canonical until reviewed.';

comment on column public.external_discovery_candidates.classifier_version is
'Version tag for the classifier that produced the staged row. Allows source-specific canon-gate and review lanes to coexist safely.';

alter table public.external_discovery_candidates
  drop constraint if exists external_discovery_candidates_match_status_check;

alter table public.external_discovery_candidates
  add constraint external_discovery_candidates_match_status_check
  check (match_status in ('UNMATCHED', 'AMBIGUOUS'));

alter table public.external_discovery_candidates
  drop constraint if exists external_discovery_candidates_candidate_bucket_check;

alter table public.external_discovery_candidates
  add constraint external_discovery_candidates_candidate_bucket_check
  check (candidate_bucket in ('CLEAN_CANON_CANDIDATE', 'PRINTED_IDENTITY_REVIEW'));

create index if not exists idx_ext_disc_classifier_version
  on public.external_discovery_candidates (classifier_version);
