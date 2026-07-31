-- SECURITY_ADVISOR_HARDENING_V2
-- Closes confirmed Data API exposures without changing product-facing reads.

begin;

-- This is an internal canonical-mapping sidecar populated by governed service
-- scripts. It must not be readable or mutable through client roles.
alter table public.external_mapping_aliases enable row level security;

revoke all on table public.external_mapping_aliases
from public, anon, authenticated;

grant select, insert, update, delete
on table public.external_mapping_aliases
to service_role;

drop policy if exists external_mapping_aliases_service_role_all
on public.external_mapping_aliases;

create policy external_mapping_aliases_service_role_all
on public.external_mapping_aliases
for all
to service_role
using (true)
with check (true);

-- This lifecycle view is an internal MEE read model. As an owner-context view
-- it bypassed the service-only RLS policies on both base tables.
alter view public.v_market_evidence_lifecycle_current_v1
set (security_invoker = true);

revoke all on table public.v_market_evidence_lifecycle_current_v1
from public, anon, authenticated;

grant select
on table public.v_market_evidence_lifecycle_current_v1
to service_role;

-- Fix mutable search paths reported by the database security advisor. These
-- functions use only PostgreSQL built-ins and trigger records.
alter function public.card_events_block_mutation_v1()
  set search_path = pg_catalog;
alter function public.card_events_emit_failures_block_mutation_v1()
  set search_path = pg_catalog;
alter function public.interest_graph_watch_rank_v1(text)
  set search_path = pg_catalog;
alter function public.interest_graph_watch_strength_v1(text)
  set search_path = pg_catalog;
alter function public.normalize_market_evidence_finish_key_v1(text)
  set search_path = pg_catalog;
alter function public.normalize_tcgplayer_market_subtype_v1(text)
  set search_path = pg_catalog;
alter function public.set_card_printing_truth_reviews_updated_at_v1()
  set search_path = pg_catalog;
alter function public.set_master_identity_graph_jpn_review_tables_updated_at_v1()
  set search_path = pg_catalog;

-- Trigger and internal helper functions are never direct client RPCs.
do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'card_events_block_mutation_v1',
        'card_events_emit_failures_block_mutation_v1',
        'card_events_emit_failures_set_defaults_v1',
        'card_events_set_defaults_v1',
        'collector_memory_assert_owned_instance_v1',
        'enqueue_card_interaction_notification_v1',
        'interest_graph_collector_follows_after_delete_v1',
        'interest_graph_collector_follows_after_insert_v1',
        'interest_graph_owned_card_count_v1',
        'interest_graph_vault_instance_after_insert_v1',
        'interest_graph_vault_instance_after_update_v1',
        'interest_graph_wall_memberships_after_write_v1',
        'interest_graph_wall_sections_after_write_v1',
        'interest_graph_wishlist_after_delete_v1',
        'interest_graph_wishlist_after_insert_v1',
        'interest_graph_watch_rank_v1',
        'interest_graph_watch_strength_v1',
        'market_pricing_pipeline_phase_runs_append_only_guard_v1',
        'notification_dispatcher_claim_batch_v1',
        'notification_dispatcher_defer_outbox_v1',
        'notification_dispatcher_disable_token_v1',
        'notification_dispatcher_log_validation_failure_v1',
        'notification_dispatcher_mark_folded_v1',
        'notification_dispatcher_mark_retry_or_failed_v1',
        'notification_dispatcher_mark_send_started_v1',
        'notification_dispatcher_mark_sent_v1',
        'notification_dispatcher_mark_skipped_v1',
        'notification_dispatcher_release_budget_v1',
        'notification_dispatcher_reserve_budget_v1',
        'notification_dispatcher_scheduled_http_v1',
        'notification_log_emit_failure_v1',
        'onboarding_sync_user_card_intent_wishlist_v1',
        'prevent_notification_outbox_client_writes_v1',
        'prevent_notifications_log_client_writes_v1'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      v_function
    );
    execute format(
      'grant execute on function %s to service_role',
      v_function
    );
  end loop;
end;
$$;

-- These are authenticated app RPCs, not anonymous or public RPCs.
do $$
declare
  v_function regprocedure;
begin
  for v_function in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'mark_notification_tapped_v1',
        'notification_disable_device_token_v1',
        'notification_register_device_token_v1'
      ])
  loop
    execute format(
      'revoke execute on function %s from public, anon',
      v_function
    );
    execute format(
      'grant execute on function %s to authenticated, service_role',
      v_function
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
