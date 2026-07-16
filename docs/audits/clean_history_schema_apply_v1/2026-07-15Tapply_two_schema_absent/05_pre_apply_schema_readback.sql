select jsonb_build_object(
  'printing_truth', jsonb_build_object(
    'table_exists', to_regclass('public.card_printing_truth_reviews') is not null,
    'view_exists', to_regclass('public.v_card_printing_truth_current_v1') is not null,
    'function_exists', exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'set_card_printing_truth_reviews_updated_at_v1'
    )
  ),
  'trust_safety', jsonb_build_object(
    'trust_blocks_exists', to_regclass('public.trust_blocks') is not null,
    'trust_reports_exists', to_regclass('public.trust_reports') is not null,
    'trust_function_exists', exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'trust_block_exists_between_v1'
    ),
    'card_contact_targets_exists', to_regclass('public.v_card_contact_targets_v1') is not null,
    'card_interactions_insert_sender_policy_exists', exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'card_interactions'
        and policyname = 'card_interactions_insert_sender'
    )
  ),
  'card_visual_description', jsonb_build_object(
    'runs_table_exists', to_regclass('public.card_visual_description_runs') is not null,
    'descriptions_table_exists', to_regclass('public.card_print_visual_descriptions') is not null
  )
) as pre_apply_schema_state;
