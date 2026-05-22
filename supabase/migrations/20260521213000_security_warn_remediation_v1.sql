begin;

-- Security Advisor WARN remediation, phase 1.
-- Mechanical search_path hardening for project-owned public functions.
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
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) c
        where c like 'search_path=%'
      )
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = public', v_function);
  end loop;
end;
$$;

-- Public bucket URLs do not require broad storage.objects listing.
drop policy if exists "identity-images read" on storage.objects;

-- Keep anonymous waitlist signup, but make the INSERT policy non-trivial.
drop policy if exists waitlist_insert_public on public.waitlist;
create policy waitlist_insert_public
on public.waitlist
for insert
to anon
with check (
  email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  and length(email) <= 320
  and (source is null or length(source) <= 120)
);

-- Matviews should not be directly selectable through PostgREST. Public/API
-- surfaces should read governed views/RPCs instead.
revoke all on table public.wall_thumbs_3x4 from public, anon, authenticated;
revoke all on table public.latest_card_prices_mv from public, anon, authenticated;
revoke all on table public.latest_prices from public, anon, authenticated;

-- Revoke anonymous direct access from write/internal SECURITY DEFINER RPCs.
-- Public read/search/profile RPCs are intentionally left unchanged in this phase.
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
      and p.prosecdef
      and p.proname = any(array[
        'condition_snapshots_insert_identity_v1',
        'condition_snapshots_insert_v1',
        'embedding_lookup_v1',
        'enforce_wall_section_membership_owner_v1',
        'enqueue_refresh_latest_card_prices',
        'gv_enqueue_condition_analysis_job_v1',
        'job_log',
        'local_community_collectors_are_blocked_v1',
        'pricing_backfill_candidates',
        'process_jobs',
        'refresh_latest_card_prices_mv',
        'refresh_vault_market_prices_all',
        'refresh_wall_thumbs_3x4',
        'resolve_active_vault_anchor_v1',
        'rpc_refresh_wall',
        'rpc_set_item_condition',
        'sync_card_interaction_group_states_v1',
        'vault_add_card_instance_v1',
        'vault_add_item',
        'vault_add_or_increment',
        'vault_archive_all_instances_v1',
        'vault_archive_exact_instance_v1',
        'vault_archive_one_instance_v1',
        'vault_item_delete_user_photo',
        'vault_item_set_image_mode',
        'vault_item_set_user_photo',
        'vault_items_pricing_watch_user_vault_fn',
        'vault_items_unshare_on_archive_fn',
        'vault_post_to_wall',
        'vault_save_instance_media_path_v1',
        'vault_save_instance_notes_v1',
        'warehouse_intake_v1'
      ])
  loop
    execute format('revoke execute on function %s from public, anon', v_function);
  end loop;
end;
$$;

-- Trigger/helper functions should not be directly callable through the Data API.
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
        'assert_vault_item_instance_card_printing_parent_v1',
        'card_comments_set_insert_defaults_v1',
        'card_comments_validate_parent_v1',
        'card_feed_events_block_mutation_v1',
        'card_feed_events_set_insert_defaults_v1',
        'fill_price_obs_print_id',
        'guard_contract_violations_append_only_v1',
        'guard_quarantine_records_append_only_v1',
        'gv_condition_analysis_failures_block_mutation',
        'gv_condition_analysis_failures_set_auth_uid',
        'gv_condition_snapshot_analyses_block_mutation',
        'gv_condition_snapshot_analyses_set_auth_uid',
        'gv_condition_snapshots_block_mutation',
        'gv_condition_snapshots_set_auth_uid',
        'gv_identity_scan_event_results_block_mutation',
        'gv_identity_scan_event_results_set_auth_uid',
        'gv_identity_scan_events_block_mutation',
        'gv_identity_scan_events_set_auth_uid',
        'gv_identity_scan_selections_block_mutation',
        'gv_identity_scan_selections_set_auth_uid',
        'gv_slab_provenance_events_block_mutation',
        'set_timestamp_updated_at',
        'trg_canon_warehouse_candidates_transition_guard_v1',
        'trg_canon_warehouse_credits_guard_v1',
        'trg_canon_warehouse_events_insert_only_v1',
        'trg_canon_warehouse_evidence_insert_only_v1',
        'trg_canon_warehouse_set_updated_at_v1',
        'trg_staging_payload_immutability_v1',
        'trg_staging_success_immutable',
        'vault_items_unshare_on_archive_fn'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_function);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
