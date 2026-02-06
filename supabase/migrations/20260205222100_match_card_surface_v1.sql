-- View: v_condition_snapshot_analyses_match_card_v1
-- Contract: Resolve fingerprint match candidate snapshot to card_print details (read-only).
-- JSON paths: measurements#>>'{fingerprint,match,best_candidate_snapshot_id}' and measurements#>>'{fingerprint,match,debug,score}'.

create or replace view public.v_condition_snapshot_analyses_match_card_v1 as
with extracted as (
  select
    a.snapshot_id                        as analysis_snapshot_id,
    a.analysis_key,
    a.analysis_version,
    a.created_at                         as analysis_created_at,
    a.measurements #>> '{fingerprint,match,decision}'                as decision,
    a.measurements #>> '{fingerprint,match,debug,score}'             as raw_confidence,
    a.measurements #>> '{fingerprint,match,best_candidate_snapshot_id}' as best_candidate_snapshot_id_raw
  from public.condition_snapshot_analyses a
)
select
  e.analysis_snapshot_id,
  e.analysis_key,
  e.analysis_version,
  e.analysis_created_at,
  e.decision,
  case
    when e.raw_confidence ~* '^-?[0-9]+(\\.[0-9]+)?([eE]-?[0-9]+)?$' then e.raw_confidence::numeric
    else null
  end                                   as confidence_0_1,
  e.best_candidate_snapshot_id_raw,
  coalesce(e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', false)
                                        as best_candidate_uuid_valid,
  case
    when e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then e.best_candidate_snapshot_id_raw::uuid
    else null
  end                                   as best_candidate_snapshot_id,
  cs2.vault_item_id                     as best_candidate_vault_item_id,
  cp.id                                 as best_candidate_card_print_id,
  cp.name                               as best_candidate_name,
  cp.set_code                           as best_candidate_set_code,
  cp.number                             as best_candidate_number,
  cp.image_best                         as best_candidate_image_best
from extracted e
left join public.condition_snapshots cs2
  on cs2.id = case
    when e.best_candidate_snapshot_id_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then e.best_candidate_snapshot_id_raw::uuid
    else null
  end
left join public.vault_items vi
  on vi.id = cs2.vault_item_id
left join public.v_card_prints cp
  on cp.id = vi.card_id;

comment on view public.v_condition_snapshot_analyses_match_card_v1 is
'Fingerprints: resolves measurements.fingerprint.match.best_candidate_snapshot_id -> condition_snapshots -> vault_items -> v_card_prints. Safe casts only; exposes decision, confidence_0_1, and candidate card display fields.';

-- Verification (run manually):
-- 1) Recent analyses with decisions and resolved cards
-- select analysis_snapshot_id, analysis_key, analysis_version, decision,
--        best_candidate_snapshot_id_raw, best_candidate_uuid_valid,
--        best_candidate_card_print_id, best_candidate_name, best_candidate_set_code, best_candidate_number
-- from public.v_condition_snapshot_analyses_match_card_v1
-- where decision is not null
-- order by analysis_created_at desc
-- limit 20;
--
-- 2) Rows with invalid uuid raw values
-- select analysis_snapshot_id, analysis_key, best_candidate_snapshot_id_raw
-- from public.v_condition_snapshot_analyses_match_card_v1
-- where best_candidate_snapshot_id_raw is not null and best_candidate_uuid_valid = false;
