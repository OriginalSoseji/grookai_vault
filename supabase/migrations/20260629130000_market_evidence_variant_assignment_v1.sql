-- MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1
-- Internal sidecar model for assigning market evidence to card_printings finish lanes.
-- Boundary: no public pricing, no identity writes, no vault writes, no image/storage writes.

begin;

create or replace function public.normalize_market_evidence_finish_key_v1(raw_hint text)
returns text
language sql
immutable
as $$
  with normalized as (
    select regexp_replace(lower(coalesce(raw_hint, '')), '[^a-z0-9]+', ' ', 'g') as value
  )
  select case
    when btrim(value) = '' then null
    when value ~ '(^| )cracked ice( |$)' then 'cracked_ice'
    when value ~ '(^| )rocket reverse( |$)' then 'rocket_reverse'
    when value ~ '(^| )reverse( |$)' or value like '%reverseholo%' then 'reverse'
    when value ~ '(^| )cosmos( |$)' or value ~ '(^| )crosshatch( |$)' then 'cosmos'
    when value ~ '(^| )master ball( |$)' or value like '%masterball%' then 'masterball'
    when value ~ '(^| )poke ball( |$)' or value like '%pokeball%' then 'pokeball'
    when value like '%holofoil%' or value ~ '(^| )holo( |$)' then 'holo'
    when value ~ '(^| )normal( |$)' or value ~ '(^| )regular( |$)' then 'normal'
    else null
  end
  from normalized;
$$;

create table if not exists public.market_evidence_variant_assignments (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1',
  source_family text not null,
  source_table text not null,
  source_row_id uuid not null,
  observation_id uuid,
  raw_snapshot_id uuid,
  card_print_id uuid not null references public.card_prints(id),
  gv_id text,
  card_printing_id uuid references public.card_printings(id),
  printing_gv_id text,
  source_finish_hint text,
  normalized_finish_key text,
  assigned_finish_key text,
  variant_assignment_status text not null,
  variant_assignment_confidence numeric(5,4) not null,
  variant_assignment_version text not null default 'MEE_VARIANT_ASSIGNMENT_RULES_V1',
  variant_assignment_reason text not null,
  variant_assignment_flags text[] not null default '{}'::text[],
  assignment_payload jsonb not null default '{}'::jsonb,
  needs_review boolean not null default true,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_evidence_variant_assignments_source_family_check check (
    source_family in ('market_reference', 'market_listing')
  ),
  constraint market_evidence_variant_assignments_source_table_check check (
    source_table in ('market_reference_candidates', 'market_listing_card_candidates')
  ),
  constraint market_evidence_variant_assignments_status_check check (
    variant_assignment_status in (
      'exact_child_finish',
      'single_child_inferred',
      'parent_has_no_child',
      'unknown_finish_needs_review',
      'ambiguous_finish_conflict',
      'no_matching_child_finish'
    )
  ),
  constraint market_evidence_variant_assignments_public_boundary_check check (
    publishable = false
    and app_visible = false
    and market_truth = false
  ),
  constraint market_evidence_variant_assignments_unique_source_version unique (
    source_family,
    source_row_id,
    variant_assignment_version
  )
);

create index if not exists idx_market_evidence_variant_assignments_card
  on public.market_evidence_variant_assignments(card_print_id, variant_assignment_status);

create index if not exists idx_market_evidence_variant_assignments_printing
  on public.market_evidence_variant_assignments(card_printing_id, assigned_finish_key);

create index if not exists idx_market_evidence_variant_assignments_source
  on public.market_evidence_variant_assignments(source_family, source_table, source_row_id);

create index if not exists idx_market_evidence_variant_assignments_flags
  on public.market_evidence_variant_assignments using gin(variant_assignment_flags);

create index if not exists idx_market_evidence_variant_assignments_public_boundary
  on public.market_evidence_variant_assignments(publishable, app_visible, market_truth);

alter table public.market_evidence_variant_assignments enable row level security;

drop policy if exists market_evidence_variant_assignments_service_role_select
  on public.market_evidence_variant_assignments;

create policy market_evidence_variant_assignments_service_role_select
  on public.market_evidence_variant_assignments
  for select
  to service_role
  using (true);

drop policy if exists market_evidence_variant_assignments_service_role_insert
  on public.market_evidence_variant_assignments;

create policy market_evidence_variant_assignments_service_role_insert
  on public.market_evidence_variant_assignments
  for insert
  to service_role
  with check (
    publishable = false
    and app_visible = false
    and market_truth = false
  );

create or replace view public.v_market_evidence_variant_assignment_current_v1 as
select
  assignment.id as variant_assignment_id,
  assignment.contract_version,
  assignment.source_family,
  assignment.source_table,
  assignment.source_row_id,
  assignment.observation_id,
  assignment.raw_snapshot_id,
  assignment.card_print_id,
  assignment.gv_id,
  parent.name as card_name,
  parent.set_code,
  parent.number as card_number,
  assignment.card_printing_id,
  assignment.printing_gv_id,
  child.finish_key as card_printing_finish_key,
  assignment.source_finish_hint,
  assignment.normalized_finish_key,
  assignment.assigned_finish_key,
  assignment.variant_assignment_status,
  assignment.variant_assignment_confidence,
  assignment.variant_assignment_version,
  assignment.variant_assignment_reason,
  assignment.variant_assignment_flags,
  assignment.assignment_payload,
  assignment.needs_review,
  assignment.publishable,
  assignment.app_visible,
  assignment.market_truth,
  assignment.created_at as variant_assignment_created_at
from public.market_evidence_variant_assignments assignment
join public.card_prints parent
  on parent.id = assignment.card_print_id
left join public.card_printings child
  on child.id = assignment.card_printing_id;

create or replace view public.v_market_evidence_variant_assignment_card_summary_v1 as
select
  current_state.card_print_id,
  current_state.gv_id,
  current_state.card_name,
  current_state.set_code,
  current_state.card_number,
  current_state.source_family,
  count(*)::bigint as assignment_rows,
  count(*) filter (where current_state.variant_assignment_status = 'exact_child_finish')::bigint as exact_child_finish_rows,
  count(*) filter (where current_state.variant_assignment_status = 'single_child_inferred')::bigint as single_child_inferred_rows,
  count(*) filter (where current_state.variant_assignment_status = 'parent_has_no_child')::bigint as parent_has_no_child_rows,
  count(*) filter (where current_state.variant_assignment_status = 'unknown_finish_needs_review')::bigint as unknown_finish_needs_review_rows,
  count(*) filter (where current_state.variant_assignment_status = 'ambiguous_finish_conflict')::bigint as ambiguous_finish_conflict_rows,
  count(*) filter (where current_state.variant_assignment_status = 'no_matching_child_finish')::bigint as no_matching_child_finish_rows,
  count(distinct current_state.card_printing_id) filter (where current_state.card_printing_id is not null)::bigint as assigned_child_finish_count,
  array_remove(array_agg(distinct current_state.assigned_finish_key order by current_state.assigned_finish_key), null) as assigned_finish_keys,
  count(*) filter (
    where current_state.publishable
       or current_state.app_visible
       or current_state.market_truth
  )::bigint as public_boundary_leak_rows,
  max(current_state.variant_assignment_created_at) as latest_variant_assignment_at
from public.v_market_evidence_variant_assignment_current_v1 current_state
group by
  current_state.card_print_id,
  current_state.gv_id,
  current_state.card_name,
  current_state.set_code,
  current_state.card_number,
  current_state.source_family;

create or replace view public.v_market_evidence_variant_assignment_lane_summary_v1 as
select
  current_state.card_print_id,
  current_state.gv_id,
  current_state.card_name,
  current_state.set_code,
  current_state.card_number,
  current_state.card_printing_id,
  current_state.printing_gv_id,
  current_state.assigned_finish_key,
  current_state.source_family,
  count(*)::bigint as assignment_rows,
  count(*) filter (where current_state.variant_assignment_status = 'exact_child_finish')::bigint as exact_child_finish_rows,
  count(*) filter (where current_state.variant_assignment_status = 'single_child_inferred')::bigint as single_child_inferred_rows,
  count(*) filter (where current_state.variant_assignment_status not in ('exact_child_finish', 'single_child_inferred'))::bigint as unresolved_or_blocked_rows,
  min(current_state.variant_assignment_confidence) as min_variant_assignment_confidence,
  max(current_state.variant_assignment_confidence) as max_variant_assignment_confidence,
  count(*) filter (
    where current_state.publishable
       or current_state.app_visible
       or current_state.market_truth
  )::bigint as public_boundary_leak_rows,
  max(current_state.variant_assignment_created_at) as latest_variant_assignment_at
from public.v_market_evidence_variant_assignment_current_v1 current_state
group by
  current_state.card_print_id,
  current_state.gv_id,
  current_state.card_name,
  current_state.set_code,
  current_state.card_number,
  current_state.card_printing_id,
  current_state.printing_gv_id,
  current_state.assigned_finish_key,
  current_state.source_family;

revoke all on function public.normalize_market_evidence_finish_key_v1(text) from public, anon, authenticated;
grant execute on function public.normalize_market_evidence_finish_key_v1(text) to service_role;

revoke all on public.market_evidence_variant_assignments from public, anon, authenticated;
grant select, insert on public.market_evidence_variant_assignments to service_role;

revoke all on public.v_market_evidence_variant_assignment_current_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_variant_assignment_current_v1 to service_role;

revoke all on public.v_market_evidence_variant_assignment_card_summary_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_variant_assignment_card_summary_v1 to service_role;

revoke all on public.v_market_evidence_variant_assignment_lane_summary_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_variant_assignment_lane_summary_v1 to service_role;

commit;
