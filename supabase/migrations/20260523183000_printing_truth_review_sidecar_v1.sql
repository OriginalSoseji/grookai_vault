-- PRINTING_TRUTH_REVIEW_SIDECAR_V1
-- Non-destructive review layer for Phase 2 printing truth quarantine.
--
-- This migration does not update, delete, or hide canonical card_printings.
-- It creates an internal service-role surface where audit classifications can
-- be reviewed before any future normalization pass.

begin;

create table if not exists public.card_printing_truth_reviews (
  id uuid primary key default gen_random_uuid(),
  card_printing_id uuid not null
    references public.card_printings(id) on delete restrict,
  review_status text not null check (
    review_status in (
      'verified',
      'unsupported',
      'conflicting',
      'unverifiable',
      'quarantined_candidate'
    )
  ),
  public_visibility text not null default 'visible' check (
    public_visibility in (
      'visible',
      'hidden_pending_review',
      'hidden_unsupported'
    )
  ),
  active boolean not null default true,
  reason text not null,
  confidence text not null default 'low' check (
    confidence in ('high', 'medium', 'low')
  ),
  evidence_sources_checked text[] not null default array[]::text[],
  evidence_sources_for_finish text[] not null default array[]::text[],
  expected_finish_keys text[] not null default array[]::text[],
  evidence jsonb not null default '{}'::jsonb,
  source_report_path text null,
  reviewed_by text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_printing_truth_reviews_one_active_idx
  on public.card_printing_truth_reviews (card_printing_id)
  where active;

create index if not exists idx_card_printing_truth_reviews_status
  on public.card_printing_truth_reviews (review_status, active);

create index if not exists idx_card_printing_truth_reviews_visibility
  on public.card_printing_truth_reviews (public_visibility, active);

comment on table public.card_printing_truth_reviews is
  'Internal non-destructive review sidecar for Phase 2 printing truth classifications. It must not mutate canonical card_printings.';

comment on column public.card_printing_truth_reviews.public_visibility is
  'Review recommendation only in V1. No public catalog surface consumes this column until a later approved migration wires it in.';

create or replace function public.set_card_printing_truth_reviews_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_card_printing_truth_reviews_updated_at_v1
  on public.card_printing_truth_reviews;

create trigger trg_card_printing_truth_reviews_updated_at_v1
before update on public.card_printing_truth_reviews
for each row
execute function public.set_card_printing_truth_reviews_updated_at_v1();

create or replace view public.v_card_printing_truth_current_v1
with (security_invoker = true)
as
select
  cp.id as card_printing_id,
  cp.card_print_id,
  cp.finish_key,
  cp.printing_gv_id,
  r.review_status,
  r.public_visibility,
  r.reason,
  r.confidence,
  r.evidence_sources_checked,
  r.evidence_sources_for_finish,
  r.expected_finish_keys,
  r.evidence,
  r.source_report_path,
  r.reviewed_by,
  r.reviewed_at,
  r.updated_at as review_updated_at
from public.card_printings cp
left join public.card_printing_truth_reviews r
  on r.card_printing_id = cp.id
  and r.active = true;

comment on view public.v_card_printing_truth_current_v1 is
  'Internal current printing truth review view. V1 is service-role only and does not drive public visibility.';

alter table public.card_printing_truth_reviews enable row level security;

revoke all on table public.card_printing_truth_reviews from anon, authenticated;
revoke all on table public.v_card_printing_truth_current_v1 from anon, authenticated;

grant select, insert, update on table public.card_printing_truth_reviews to service_role;
grant select on table public.v_card_printing_truth_current_v1 to service_role;

drop policy if exists security_info_deny_all_anon_v1
  on public.card_printing_truth_reviews;
drop policy if exists security_info_deny_all_authenticated_v1
  on public.card_printing_truth_reviews;

create policy security_info_deny_all_anon_v1
on public.card_printing_truth_reviews
for all
to anon
using (false)
with check (false);

create policy security_info_deny_all_authenticated_v1
on public.card_printing_truth_reviews
for all
to authenticated
using (false)
with check (false);

comment on policy security_info_deny_all_anon_v1
on public.card_printing_truth_reviews is
  'PRINTING_TRUTH_REVIEW_SIDECAR_V1: explicit deny-all policy for internal review table.';

comment on policy security_info_deny_all_authenticated_v1
on public.card_printing_truth_reviews is
  'PRINTING_TRUTH_REVIEW_SIDECAR_V1: explicit deny-all policy for internal review table.';

commit;
