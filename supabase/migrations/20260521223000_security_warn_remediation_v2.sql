begin;

-- Security Advisor WARN remediation, phase 2.
-- Move unaccent out of public when the linked project still has it there.
create schema if not exists extensions;

do $$
declare
  v_schema text;
begin
  select n.nspname
  into v_schema
  from pg_extension e
  join pg_namespace n
    on n.oid = e.extnamespace
  where e.extname = 'unaccent';

  if v_schema = 'public' then
    alter extension unaccent set schema extensions;
  end if;
end;
$$;

-- gv_norm_name calls unaccent unqualified in older migrations. Keep it working
-- after the extension move while retaining an explicit search_path.
alter function public.gv_norm_name(text) set search_path = public, extensions;

-- Allow legacy user-photo helpers to run as invoker instead of definer.
drop policy if exists user_card_images_owner_select_v1 on public.user_card_images;
drop policy if exists user_card_images_owner_insert_v1 on public.user_card_images;
drop policy if exists user_card_images_owner_update_v1 on public.user_card_images;
drop policy if exists user_card_images_owner_delete_v1 on public.user_card_images;

create policy user_card_images_owner_select_v1
on public.user_card_images
for select
to authenticated
using (user_id = auth.uid());

create policy user_card_images_owner_insert_v1
on public.user_card_images
for insert
to authenticated
with check (user_id = auth.uid());

create policy user_card_images_owner_update_v1
on public.user_card_images
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_card_images_owner_delete_v1
on public.user_card_images
for delete
to authenticated
using (user_id = auth.uid());

-- Convert read-only and RLS-compatible app RPCs away from SECURITY DEFINER.
-- This keeps public/authenticated callability while removing definer escalation.
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
        'get_market_price',
        'list_set_codes',
        'local_community_feed_v1',
        'public_collector_follow_counts_v1',
        'public_collector_relationship_rows_v1',
        'public_discoverable_card_copies_v1',
        'public_shared_card_primary_gvvi_v1',
        'public_vault_instance_detail_v1',
        'search_card_prints_v1',
        'search_cards',
        'search_print_identity_v1',
        'vault_add_or_increment',
        'vault_archive_all_instances_v1',
        'vault_archive_exact_instance_v1',
        'vault_archive_one_instance_v1',
        'vault_item_delete_user_photo',
        'vault_item_set_image_mode',
        'vault_item_set_user_photo',
        'vault_mobile_card_copies_v1',
        'vault_mobile_collector_rows_v1',
        'vault_mobile_instance_detail_v1',
        'vault_owned_counts_v1',
        'vault_save_instance_media_path_v1',
        'vault_save_instance_notes_v1'
      ])
  loop
    execute format('alter function %s security invoker', v_function);
  end loop;
end;
$$;

-- Hide internal maintenance/job/refresh/helper functions from signed-in direct API
-- execution. Service role and owner execution are unaffected.
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
        'vault_add_item',
        'vault_items_pricing_watch_user_vault_fn',
        'vault_items_unshare_on_archive_fn',
        'vault_post_to_wall'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', v_function);
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
