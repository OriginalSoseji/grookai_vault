with expected (
  migration_id,
  file_name,
  object_kind,
  schema_name,
  relation_name,
  column_name
) as (
  values
    ('20260523183000', '20260523183000_printing_truth_review_sidecar_v1.sql', 'table', 'public', 'card_printing_truth_reviews', null),
    ('20260523183000', '20260523183000_printing_truth_review_sidecar_v1.sql', 'view', 'public', 'v_card_printing_truth_current_v1', null),
    ('20260629190000', '20260629190000_market_listing_price_events_observation_idx.sql', 'index', 'public', 'market_listing_price_events_observation_idx', null),
    ('20260703090000', '20260703090000_trade_execution_second_leg_any_trade_copy_v1.sql', 'function', 'public', 'execute_card_interaction_outcome_v1', null),
    ('20260706100000', '20260706100000_product_evolution_e1_interest_graph_schema_v1.sql', 'table', 'public', 'watches', null),
    ('20260706100000', '20260706100000_product_evolution_e1_interest_graph_schema_v1.sql', 'table', 'public', 'card_events', null),
    ('20260706100000', '20260706100000_product_evolution_e1_interest_graph_schema_v1.sql', 'column', 'public', 'card_events', 'dedupe_key'),
    ('20260706110000', '20260706110000_product_evolution_e1_emission_triggers_v1.sql', 'function', 'public', 'interest_graph_emit_event_v1', null),
    ('20260706110000', '20260706110000_product_evolution_e1_emission_triggers_v1.sql', 'function', 'public', 'interest_graph_wishlist_after_insert_v1', null),
    ('20260706120000', '20260706120000_product_evolution_e2_notification_schema_v1.sql', 'table', 'public', 'device_tokens', null),
    ('20260706120000', '20260706120000_product_evolution_e2_notification_schema_v1.sql', 'table', 'public', 'notification_outbox', null),
    ('20260706120000', '20260706120000_product_evolution_e2_notification_schema_v1.sql', 'column', 'public', 'notification_outbox', 'dedupe_key'),
    ('20260706121000', '20260706121000_product_evolution_e2_notification_dispatcher_rpcs_v1.sql', 'function', 'public', 'notification_dispatcher_claim_batch_v1', null),
    ('20260706121000', '20260706121000_product_evolution_e2_notification_dispatcher_rpcs_v1.sql', 'function', 'public', 'notification_dispatcher_mark_sent_v1', null),
    ('20260706122000', '20260706122000_product_evolution_e2_notification_dispatcher_schedule_v1.sql', 'function', 'public', 'notification_dispatcher_scheduled_http_v1', null),
    ('20260706123000', '20260706123000_product_evolution_e2_notification_app_rpcs_v1.sql', 'function', 'public', 'notification_register_device_token_v1', null),
    ('20260706123000', '20260706123000_product_evolution_e2_notification_app_rpcs_v1.sql', 'function', 'public', 'mark_notification_tapped_v1', null),
    ('20260708174000', '20260708174000_product_evolution_e5_card_journey_moment_rollups_v1.sql', 'function', 'public', 'card_journey_moments_v1', null),
    ('20260712090000', '20260712090000_pricing_pipeline_phase_runs_v1.sql', 'table', 'public', 'market_pricing_pipeline_phase_runs', null),
    ('20260712090000', '20260712090000_pricing_pipeline_phase_runs_v1.sql', 'view', 'public', 'v_market_pricing_pipeline_phase_latest_status', null),
    ('20260713190000', '20260713190000_trust_safety_block_report_v1.sql', 'table', 'public', 'trust_blocks', null),
    ('20260713190000', '20260713190000_trust_safety_block_report_v1.sql', 'table', 'public', 'trust_reports', null),
    ('20260713190000', '20260713190000_trust_safety_block_report_v1.sql', 'function', 'public', 'trust_block_exists_between_v1', null),
    ('20260715104500', '20260715104500_mobile_vault_variant_and_canonical_image_contract_v1.sql', 'function', 'public', 'vault_mobile_collector_rows_v1', null),
    ('20260715110000', '20260715110000_tcgcsv_full_source_warehouse_v1.sql', 'table', 'public', 'tcgcsv_source_sync_runs', null),
    ('20260715110000', '20260715110000_tcgcsv_full_source_warehouse_v1.sql', 'table', 'public', 'tcgcsv_source_products', null),
    ('20260715110000', '20260715110000_tcgcsv_full_source_warehouse_v1.sql', 'table', 'public', 'tcgcsv_source_price_daily_observations', null),
    ('20260715120000', '20260715120000_card_visual_description_agent_v1.sql', 'table', 'public', 'card_visual_description_runs', null),
    ('20260715120000', '20260715120000_card_visual_description_agent_v1.sql', 'table', 'public', 'card_print_visual_descriptions', null)
),
checks as (
  select
    e.migration_id,
    e.file_name,
    e.object_kind,
    e.schema_name,
    e.relation_name,
    e.column_name,
    case
      when e.object_kind = 'table' then exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = e.schema_name
          and c.relname = e.relation_name
          and c.relkind in ('r', 'p')
      )
      when e.object_kind = 'view' then exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = e.schema_name
          and c.relname = e.relation_name
          and c.relkind in ('v', 'm')
      )
      when e.object_kind = 'index' then exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = e.schema_name
          and c.relname = e.relation_name
          and c.relkind = 'i'
      )
      when e.object_kind = 'function' then exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = e.schema_name
          and p.proname = e.relation_name
      )
      when e.object_kind = 'column' then exists (
        select 1
        from information_schema.columns c
        where c.table_schema = e.schema_name
          and c.table_name = e.relation_name
          and c.column_name = e.column_name
      )
      else false
    end as exists_remote
  from expected e
)
select *
from checks
order by migration_id, file_name, object_kind, relation_name, column_name nulls first;
