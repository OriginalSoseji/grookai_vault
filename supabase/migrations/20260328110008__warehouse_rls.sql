set search_path = public;

alter table public.canon_warehouse_candidates enable row level security;
alter table public.canon_warehouse_candidate_evidence enable row level security;
alter table public.canon_warehouse_candidate_events enable row level security;
alter table public.canon_warehouse_candidate_credits enable row level security;
alter table public.canon_warehouse_promotion_staging enable row level security;

drop policy if exists service_role_only on public.canon_warehouse_candidates;
create policy service_role_only
on public.canon_warehouse_candidates
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists warehouse_candidates_select_own on public.canon_warehouse_candidates;
create policy warehouse_candidates_select_own
on public.canon_warehouse_candidates
for select
to authenticated
using (submitted_by_user_id = auth.uid());

drop policy if exists service_role_only on public.canon_warehouse_candidate_evidence;
create policy service_role_only
on public.canon_warehouse_candidate_evidence
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists warehouse_candidate_evidence_select_own on public.canon_warehouse_candidate_evidence;
create policy warehouse_candidate_evidence_select_own
on public.canon_warehouse_candidate_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.canon_warehouse_candidates c
    where c.id = candidate_id
      and c.submitted_by_user_id = auth.uid()
  )
);

drop policy if exists service_role_only on public.canon_warehouse_candidate_events;
create policy service_role_only
on public.canon_warehouse_candidate_events
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists warehouse_candidate_events_select_own on public.canon_warehouse_candidate_events;
create policy warehouse_candidate_events_select_own
on public.canon_warehouse_candidate_events
for select
to authenticated
using (
  exists (
    select 1
    from public.canon_warehouse_candidates c
    where c.id = candidate_id
      and c.submitted_by_user_id = auth.uid()
  )
);

drop policy if exists service_role_only on public.canon_warehouse_candidate_credits;
create policy service_role_only
on public.canon_warehouse_candidate_credits
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists warehouse_candidate_credits_select_own on public.canon_warehouse_candidate_credits;
create policy warehouse_candidate_credits_select_own
on public.canon_warehouse_candidate_credits
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists service_role_only on public.canon_warehouse_promotion_staging;
create policy service_role_only
on public.canon_warehouse_promotion_staging
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
