-- SECURITY_ADVISOR_PRIVACY_HELPER_EXECUTE_HARDENING_V1
-- Removes anonymous direct RPC access from privacy predicates while preserving
-- authenticated RLS evaluation and service-owned internal composition.

begin;

revoke execute on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb)
from public, anon;
grant execute on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb)
to authenticated, service_role;

revoke execute on function public.interest_graph_collector_public_v1(uuid)
from public, anon;
grant execute on function public.interest_graph_collector_public_v1(uuid)
to authenticated, service_role;

revoke execute on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid)
from public, anon;
grant execute on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid)
to authenticated, service_role;

revoke execute on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text)
from public, anon;
grant execute on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text)
to authenticated, service_role;

-- Anonymous contact-target reads have no viewer identity, so they cannot have
-- a viewer-specific block relationship. Keep the authenticated block filter,
-- while removing the anonymous view's need to execute the internal predicate.
create or replace function public.trust_block_exists_for_current_viewer_v1(
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    else public.trust_block_exists_between_v1(auth.uid(), p_other_user_id)
  end;
$$;

revoke all on function public.trust_block_exists_for_current_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.trust_block_exists_for_current_viewer_v1(uuid)
to anon, authenticated, service_role;

comment on function public.trust_block_exists_for_current_viewer_v1(uuid) is
'Public-safe current-viewer block predicate. Anonymous callers always receive false; authenticated callers can evaluate only the relationship involving auth.uid().';

create or replace view public.v_card_contact_targets_v1 as
select
  vii.id as instance_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
  vii.intent,
  vii.condition_label,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  vii.created_at
from public.vault_item_instances vii
left join public.slab_certs sc
  on sc.id = vii.slab_cert_id
join public.public_profiles pp
  on pp.user_id = vii.user_id
where vii.archived_at is null
  and vii.legacy_vault_item_id is not null
  and coalesce(vii.card_print_id, sc.card_print_id) is not null
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true
  and not public.trust_block_exists_for_current_viewer_v1(vii.user_id);

alter view public.v_card_contact_targets_v1 set (security_invoker = false);
grant select on table public.v_card_contact_targets_v1 to anon, authenticated;

revoke execute on function public.trust_block_exists_between_v1(uuid, uuid)
from public, anon;
grant execute on function public.trust_block_exists_between_v1(uuid, uuid)
to authenticated, service_role;

comment on function public.card_events_resolve_visibility_v1(text, uuid, text, jsonb) is
'Internal write-time visibility predicate. Direct anonymous execution is prohibited; authenticated RLS and service composition remain supported.';

comment on function public.interest_graph_collector_public_v1(uuid) is
'Internal public-profile visibility predicate. Direct anonymous execution is prohibited; public RPCs may compose it under their governed authority.';

comment on function public.interest_graph_collectors_visible_to_viewer_v1(uuid, uuid, uuid) is
'Internal viewer privacy predicate. Direct anonymous execution is prohibited; authenticated RLS and governed RPC composition remain supported.';

comment on function public.interest_graph_card_event_visible_to_viewer_v1(uuid, uuid, uuid, text) is
'Internal event privacy predicate. Direct anonymous execution is prohibited; authenticated RLS and governed RPC composition remain supported.';

comment on function public.trust_block_exists_between_v1(uuid, uuid) is
'Internal block privacy predicate. Direct anonymous execution is prohibited; authenticated RLS and owner-context view composition remain supported.';

comment on view public.v_card_contact_targets_v1 is
'Public contact targets for card-specific collector messaging. Anonymous reads avoid viewer-specific block evaluation; authenticated reads preserve two-way block filtering.';

notify pgrst, 'reload schema';

commit;
