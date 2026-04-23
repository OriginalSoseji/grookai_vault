with
contract_runtime_tables as (
  select
    'contract_runtime_tables_missing'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    (
      (case when to_regclass('public.contract_violations') is null then 1 else 0 end) +
      (case when to_regclass('public.quarantine_records') is null then 1 else 0 end)
    )::bigint as row_count,
    'Runtime evidence tables must exist.'::text as notes
),
contract_runtime_triggers as (
  select
    'contract_runtime_append_only_triggers_missing'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    (
      select count(*)::bigint
      from (
        values
          ('trg_contract_violations_append_only_v1'),
          ('trg_quarantine_records_append_only_v1')
      ) required(trigger_name)
      left join pg_trigger t
        on t.tgname = required.trigger_name
       and not t.tgisinternal
      where t.oid is null
    ) as row_count,
    'Append-only triggers must protect ledger and quarantine tables.'::text as notes
),
active_identity_duplicate_card_print as (
  select
    'identity_active_duplicate_card_print_id'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'More than one active card_print_identity row points at the same card_print.'::text as notes
  from (
    select card_print_id
    from public.card_print_identity
    where is_active = true
    group by card_print_id
    having count(*) > 1
  ) dupes
),
active_identity_duplicate_hash as (
  select
    'identity_active_duplicate_domain_hash'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Active identity domain hashes must remain unique.'::text as notes
  from (
    select identity_domain, identity_key_version, identity_key_hash
    from public.card_print_identity
    where is_active = true
      and identity_key_hash is not null
    group by identity_domain, identity_key_version, identity_key_hash
    having count(*) > 1
  ) dupes
),
active_identity_missing as (
  select
    'identity_active_missing_for_canonical_card_print'::text as issue_name,
    'deferred_known_debt'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Canonical card_prints without active identity rows remain deferred debt.'::text as notes
  from public.card_prints cp
  left join public.card_print_identity cpi
    on cpi.card_print_id = cp.id
   and cpi.is_active = true
  where cpi.id is null
),
gv_id_missing as (
  select
    'card_prints_missing_gv_id'::text as issue_name,
    'deferred_known_debt'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Legacy canonical card_prints still missing gv_id.'::text as notes
  from public.card_prints
  where gv_id is null
),
external_mapping_source_external_dupes as (
  select
    'external_mappings_source_external_duplicates'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'source/external_id ownership must stay unique.'::text as notes
  from (
    select source, external_id
    from public.external_mappings
    group by source, external_id
    having count(*) > 1
  ) dupes
),
external_mapping_source_card_dupes as (
  select
    'external_mappings_source_card_duplicates'::text as issue_name,
    'deferred_known_debt'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Historical many-to-one source/card mapping groups remain deferred repair debt.'::text as notes
  from (
    select source, card_print_id
    from public.external_mappings
    where active = true
    group by source, card_print_id
    having count(*) > 1
  ) dupes
),
external_mapping_orphans as (
  select
    'external_mappings_missing_card_print_owner'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Active mappings must point at a real card_print.'::text as notes
  from public.external_mappings em
  left join public.card_prints cp
    on cp.id = em.card_print_id
  where em.active = true
    and cp.id is null
),
warehouse_staging_without_founder as (
  select
    'warehouse_staging_without_founder_approval'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Promotion staging rows require founder approval identity and timestamp.'::text as notes
  from public.canon_warehouse_promotion_staging
  where founder_approved_by_user_id is null
     or founder_approved_at is null
),
wall_membership_owner_drift as (
  select
    'wall_membership_owner_drift'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Section membership owner must match both section owner and exact copy owner.'::text as notes
  from public.wall_section_memberships wsm
  join public.wall_sections ws
    on ws.id = wsm.section_id
  join public.vault_item_instances vii
    on vii.id = wsm.vault_item_instance_id
  where ws.user_id <> vii.user_id
),
quarantine_view_leakage as (
  select
    'quarantine_view_leakage'::text as issue_name,
    'critical_enforce_now'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Canonical/public views must not reference quarantine_records.'::text as notes
  from pg_views
  where schemaname = 'public'
    and definition ilike '%quarantine_records%'
),
compatibility_views_missing as (
  select
    'compatibility_views_missing'::text as issue_name,
    'unexpected_regression'::text as severity_bucket,
    count(*)::bigint as row_count,
    'Stabilization-critical compatibility/public views must exist.'::text as notes
  from (
    values
      ('v_vault_items_web'),
      ('v_best_prices_all_gv_v1'),
      ('v_wall_cards_v1'),
      ('v_wall_sections_v1'),
      ('v_section_cards_v1')
  ) required(view_name)
  left join pg_views v
    on v.schemaname = 'public'
   and v.viewname = required.view_name
  where v.viewname is null
)
select *
from (
  select * from contract_runtime_tables
  union all
  select * from contract_runtime_triggers
  union all
  select * from active_identity_duplicate_card_print
  union all
  select * from active_identity_duplicate_hash
  union all
  select * from active_identity_missing
  union all
  select * from gv_id_missing
  union all
  select * from external_mapping_source_external_dupes
  union all
  select * from external_mapping_source_card_dupes
  union all
  select * from external_mapping_orphans
  union all
  select * from warehouse_staging_without_founder
  union all
  select * from wall_membership_owner_drift
  union all
  select * from quarantine_view_leakage
  union all
  select * from compatibility_views_missing
) audit_rows
order by
  case severity_bucket
    when 'critical_enforce_now' then 1
    when 'unexpected_regression' then 2
    when 'deferred_known_debt' then 3
    else 4
  end,
  issue_name;
