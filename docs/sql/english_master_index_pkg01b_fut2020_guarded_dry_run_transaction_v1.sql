-- English Master Index PKG-01B-FUT2020 guarded dry-run transaction V1
-- GENERATED ARTIFACT ONLY. This file has not been executed by Codex.
-- Scope: four fut2020 parent set_code updates and eight unsupported child printing delete candidates.
-- Package fingerprint: c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63
-- Fresh snapshot hash: 8749ef8504f894159f15cdb01f7d3c8ec2709d3caa41631f7c1480ca3ebcbe41
-- User approval captured for artifact preparation only: Approve PKG-01B-FUT2020 for final fresh snapshot and guarded dry-run transaction artifact preparation only. Fingerprint: c9539d98a7f883ce9b66ed12c57416ed68f0e9d1cad08b654f1470cb40baee63. Parent scope: 4 set_code updates. Child scope: 8 unsupported holo/reverse delete candidates. No real apply.
-- This artifact has no COMMIT path. It must roll back.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table pkg01b_fut2020_approved_card_prints (
  card_print_id uuid primary key,
  before_set_code text,
  before_number text not null,
  before_number_plain text,
  before_name text not null,
  after_set_code text not null,
  after_number text not null,
  after_name text not null,
  expected_child_printings_before int not null,
  expected_child_printings_after int not null,
  expected_keep_finish_keys text[] not null
) on commit drop;

insert into pkg01b_fut2020_approved_card_prints (
  card_print_id,
  before_set_code,
  before_number,
  before_number_plain,
  before_name,
  after_set_code,
  after_number,
  after_name,
  expected_child_printings_before,
  expected_child_printings_after,
  expected_keep_finish_keys
) values
  ('2f2942c8-6019-4446-806c-593dd351af98'::uuid, null, '2', '2', 'Eevee on the Ball', 'fut2020', '2', 'Eevee on the Ball', 3, 1, array['normal']::text[]),
  ('5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, null, '3', '3', 'Grookey on the Ball', 'fut2020', '3', 'Grookey on the Ball', 3, 1, array['normal']::text[]),
  ('53919228-7560-480c-9bdb-da99ad67250a'::uuid, null, '4', '4', 'Scorbunny on the Ball', 'fut2020', '4', 'Scorbunny on the Ball', 3, 1, array['normal']::text[]),
  ('82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, null, '5', '5', 'Sobble on the Ball', 'fut2020', '5', 'Sobble on the Ball', 3, 1, array['normal']::text[]);

create temporary table pkg01b_fut2020_child_keep_rows (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_keep_rows (
  card_printing_id,
  card_print_id,
  finish_key,
  snapshot_row
) values
  ('218f3d4f-35a3-47f9-abb8-df28252e55d9'::uuid, '2f2942c8-6019-4446-806c-593dd351af98'::uuid, 'normal', '{"id":"218f3d4f-35a3-47f9-abb8-df28252e55d9","image_url":null,"created_at":"2026-03-27T02:54:48.071112+00:00","created_by":"printing_ingestion_v2","finish_key":"normal","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"2f2942c8-6019-4446-806c-593dd351af98","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-2","provenance_source":"tcgdex"}'::jsonb),
  ('7a0707e1-2755-4a88-b90b-2f95ab2584d2'::uuid, '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, 'normal', '{"id":"7a0707e1-2755-4a88-b90b-2f95ab2584d2","image_url":null,"created_at":"2026-03-27T02:54:49.205645+00:00","created_by":"printing_ingestion_v2","finish_key":"normal","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"5029b53f-a1dd-4fe0-ae0c-b38021dd52c2","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-3","provenance_source":"tcgdex"}'::jsonb),
  ('f3455573-4d20-4621-a206-ef88d8c726de'::uuid, '53919228-7560-480c-9bdb-da99ad67250a'::uuid, 'normal', '{"id":"f3455573-4d20-4621-a206-ef88d8c726de","image_url":null,"created_at":"2026-03-27T02:54:50.219585+00:00","created_by":"printing_ingestion_v2","finish_key":"normal","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"53919228-7560-480c-9bdb-da99ad67250a","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-4","provenance_source":"tcgdex"}'::jsonb),
  ('ac1fe5dc-a0f5-4d67-9cf7-d6e4b3fe865d'::uuid, '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, 'normal', '{"id":"ac1fe5dc-a0f5-4d67-9cf7-d6e4b3fe865d","image_url":null,"created_at":"2026-03-27T02:54:51.259205+00:00","created_by":"printing_ingestion_v2","finish_key":"normal","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"82ebefc5-51bc-4dbd-ba14-a9a60186aa61","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-5","provenance_source":"tcgdex"}'::jsonb);

create temporary table pkg01b_fut2020_child_delete_candidates (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  provenance_source text,
  provenance_ref text,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_delete_candidates (
  card_printing_id,
  card_print_id,
  finish_key,
  provenance_source,
  provenance_ref,
  snapshot_row
) values
  ('f7011904-be70-4a4f-9704-6d0396359493'::uuid, '2f2942c8-6019-4446-806c-593dd351af98'::uuid, 'holo', 'tcgdex', 'fut2020-2', '{"id":"f7011904-be70-4a4f-9704-6d0396359493","image_url":null,"created_at":"2026-03-27T02:54:48.245929+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"2f2942c8-6019-4446-806c-593dd351af98","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-2","provenance_source":"tcgdex"}'::jsonb),
  ('3270eb0d-e4c8-43e8-9139-2b7d1f6440e7'::uuid, '2f2942c8-6019-4446-806c-593dd351af98'::uuid, 'reverse', 'tcgdex', 'fut2020-2', '{"id":"3270eb0d-e4c8-43e8-9139-2b7d1f6440e7","image_url":null,"created_at":"2026-03-27T02:54:48.338423+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"2f2942c8-6019-4446-806c-593dd351af98","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-2","provenance_source":"tcgdex"}'::jsonb),
  ('3a7e1fc6-d717-4299-8f60-e14c8b15fd20'::uuid, '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, 'holo', 'tcgdex', 'fut2020-3', '{"id":"3a7e1fc6-d717-4299-8f60-e14c8b15fd20","image_url":null,"created_at":"2026-03-27T02:54:49.301809+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"5029b53f-a1dd-4fe0-ae0c-b38021dd52c2","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-3","provenance_source":"tcgdex"}'::jsonb),
  ('b3ed0e51-8a8b-4a12-8fbf-04b6c6bc21f6'::uuid, '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, 'reverse', 'tcgdex', 'fut2020-3', '{"id":"b3ed0e51-8a8b-4a12-8fbf-04b6c6bc21f6","image_url":null,"created_at":"2026-03-27T02:54:49.394401+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"5029b53f-a1dd-4fe0-ae0c-b38021dd52c2","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-3","provenance_source":"tcgdex"}'::jsonb),
  ('ad2cc347-5873-4af7-8022-ed619176e708'::uuid, '53919228-7560-480c-9bdb-da99ad67250a'::uuid, 'holo', 'tcgdex', 'fut2020-4', '{"id":"ad2cc347-5873-4af7-8022-ed619176e708","image_url":null,"created_at":"2026-03-27T02:54:50.324649+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"53919228-7560-480c-9bdb-da99ad67250a","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-4","provenance_source":"tcgdex"}'::jsonb),
  ('6b846e08-a26b-45fc-8f68-628a80ef0d02'::uuid, '53919228-7560-480c-9bdb-da99ad67250a'::uuid, 'reverse', 'tcgdex', 'fut2020-4', '{"id":"6b846e08-a26b-45fc-8f68-628a80ef0d02","image_url":null,"created_at":"2026-03-27T02:54:50.414536+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"53919228-7560-480c-9bdb-da99ad67250a","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-4","provenance_source":"tcgdex"}'::jsonb),
  ('b4568669-93a5-412e-aa5f-704c75fe8518'::uuid, '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, 'holo', 'tcgdex', 'fut2020-5', '{"id":"b4568669-93a5-412e-aa5f-704c75fe8518","image_url":null,"created_at":"2026-03-27T02:54:51.352631+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"82ebefc5-51bc-4dbd-ba14-a9a60186aa61","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-5","provenance_source":"tcgdex"}'::jsonb),
  ('26d97bc4-f156-4a3d-8735-0120be57572f'::uuid, '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, 'reverse', 'tcgdex', 'fut2020-5', '{"id":"26d97bc4-f156-4a3d-8735-0120be57572f","image_url":null,"created_at":"2026-03-27T02:54:51.441904+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"82ebefc5-51bc-4dbd-ba14-a9a60186aa61","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-5","provenance_source":"tcgdex"}'::jsonb);

create temporary table pkg01b_fut2020_child_delete_rollback_snapshot (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null,
  snapshot_row jsonb not null
) on commit drop;

insert into pkg01b_fut2020_child_delete_rollback_snapshot (
  card_printing_id,
  card_print_id,
  finish_key,
  snapshot_row
) values
  ('f7011904-be70-4a4f-9704-6d0396359493'::uuid, '2f2942c8-6019-4446-806c-593dd351af98'::uuid, 'holo', '{"id":"f7011904-be70-4a4f-9704-6d0396359493","image_url":null,"created_at":"2026-03-27T02:54:48.245929+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"2f2942c8-6019-4446-806c-593dd351af98","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-2","provenance_source":"tcgdex"}'::jsonb),
  ('3270eb0d-e4c8-43e8-9139-2b7d1f6440e7'::uuid, '2f2942c8-6019-4446-806c-593dd351af98'::uuid, 'reverse', '{"id":"3270eb0d-e4c8-43e8-9139-2b7d1f6440e7","image_url":null,"created_at":"2026-03-27T02:54:48.338423+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"2f2942c8-6019-4446-806c-593dd351af98","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-2","provenance_source":"tcgdex"}'::jsonb),
  ('3a7e1fc6-d717-4299-8f60-e14c8b15fd20'::uuid, '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, 'holo', '{"id":"3a7e1fc6-d717-4299-8f60-e14c8b15fd20","image_url":null,"created_at":"2026-03-27T02:54:49.301809+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"5029b53f-a1dd-4fe0-ae0c-b38021dd52c2","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-3","provenance_source":"tcgdex"}'::jsonb),
  ('b3ed0e51-8a8b-4a12-8fbf-04b6c6bc21f6'::uuid, '5029b53f-a1dd-4fe0-ae0c-b38021dd52c2'::uuid, 'reverse', '{"id":"b3ed0e51-8a8b-4a12-8fbf-04b6c6bc21f6","image_url":null,"created_at":"2026-03-27T02:54:49.394401+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"5029b53f-a1dd-4fe0-ae0c-b38021dd52c2","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-3","provenance_source":"tcgdex"}'::jsonb),
  ('ad2cc347-5873-4af7-8022-ed619176e708'::uuid, '53919228-7560-480c-9bdb-da99ad67250a'::uuid, 'holo', '{"id":"ad2cc347-5873-4af7-8022-ed619176e708","image_url":null,"created_at":"2026-03-27T02:54:50.324649+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"53919228-7560-480c-9bdb-da99ad67250a","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-4","provenance_source":"tcgdex"}'::jsonb),
  ('6b846e08-a26b-45fc-8f68-628a80ef0d02'::uuid, '53919228-7560-480c-9bdb-da99ad67250a'::uuid, 'reverse', '{"id":"6b846e08-a26b-45fc-8f68-628a80ef0d02","image_url":null,"created_at":"2026-03-27T02:54:50.414536+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"53919228-7560-480c-9bdb-da99ad67250a","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-4","provenance_source":"tcgdex"}'::jsonb),
  ('b4568669-93a5-412e-aa5f-704c75fe8518'::uuid, '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, 'holo', '{"id":"b4568669-93a5-412e-aa5f-704c75fe8518","image_url":null,"created_at":"2026-03-27T02:54:51.352631+00:00","created_by":"printing_ingestion_v2","finish_key":"holo","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"82ebefc5-51bc-4dbd-ba14-a9a60186aa61","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-5","provenance_source":"tcgdex"}'::jsonb),
  ('26d97bc4-f156-4a3d-8735-0120be57572f'::uuid, '82ebefc5-51bc-4dbd-ba14-a9a60186aa61'::uuid, 'reverse', '{"id":"26d97bc4-f156-4a3d-8735-0120be57572f","image_url":null,"created_at":"2026-03-27T02:54:51.441904+00:00","created_by":"printing_ingestion_v2","finish_key":"reverse","image_note":null,"image_path":null,"image_source":null,"image_status":null,"card_print_id":"82ebefc5-51bc-4dbd-ba14-a9a60186aa61","image_alt_url":null,"is_provisional":false,"printing_gv_id":null,"provenance_ref":"fut2020-5","provenance_source":"tcgdex"}'::jsonb);

-- Guard 1: approved package cardinality must not change.
do $$
declare
  parent_count int;
  keep_count int;
  delete_count int;
  rollback_count int;
begin
  select count(*) into parent_count from pkg01b_fut2020_approved_card_prints;
  select count(*) into keep_count from pkg01b_fut2020_child_keep_rows;
  select count(*) into delete_count from pkg01b_fut2020_child_delete_candidates;
  select count(*) into rollback_count from pkg01b_fut2020_child_delete_rollback_snapshot;

  if parent_count <> 4 then
    raise exception 'PKG-01B parent target count changed: %', parent_count;
  end if;
  if keep_count <> 4 then
    raise exception 'PKG-01B keep-row count changed: %', keep_count;
  end if;
  if delete_count <> 8 then
    raise exception 'PKG-01B delete-candidate count changed: %', delete_count;
  end if;
  if rollback_count <> 8 then
    raise exception 'PKG-01B rollback snapshot count changed: %', rollback_count;
  end if;
end $$;

-- Guard 2: current parent DB state must match the final fresh snapshot.
do $$
declare
  drift_count int;
begin
  select count(*) into drift_count
  from pkg01b_fut2020_approved_card_prints approved
  join public.card_prints cp on cp.id = approved.card_print_id
  where cp.set_code is distinct from approved.before_set_code
     or cp.number is distinct from approved.before_number
     or cp.number_plain is distinct from approved.before_number_plain
     or cp.name is distinct from approved.before_name;

  if drift_count <> 0 then
    raise exception 'PKG-01B before-state drift detected: %', drift_count;
  end if;
end $$;

-- Guard 3: no vault ownership references may exist for these parent rows.
do $$
declare
  vault_count int;
begin
  select count(*) into vault_count
  from public.vault_items vi
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = vi.card_id;

  if vault_count <> 0 then
    raise exception 'PKG-01B vault reference blocker detected: %', vault_count;
  end if;
end $$;

-- Guard 4: each parent must still have exactly holo, normal, and reverse child rows.
do $$
declare
  mismatch_count int;
begin
  select count(*) into mismatch_count
  from pkg01b_fut2020_approved_card_prints approved
  where (
    select count(*)::int
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) <> approved.expected_child_printings_before
  or (
    select array_agg(cpr.finish_key order by cpr.finish_key)
    from public.card_printings cpr
    where cpr.card_print_id = approved.card_print_id
  ) is distinct from array['holo', 'normal', 'reverse']::text[];

  if mismatch_count <> 0 then
    raise exception 'PKG-01B child finish scope mismatch detected: %', mismatch_count;
  end if;
end $$;

-- Guard 5: delete candidates must still be exact unsupported holo/reverse rows.
do $$
declare
  delete_drift_count int;
begin
  select count(*) into delete_drift_count
  from pkg01b_fut2020_child_delete_candidates candidate
  left join public.card_printings cpr on cpr.id = candidate.card_printing_id
  where cpr.id is null
     or cpr.card_print_id is distinct from candidate.card_print_id
     or cpr.finish_key is distinct from candidate.finish_key
     or candidate.finish_key not in ('holo', 'reverse');

  if delete_drift_count <> 0 then
    raise exception 'PKG-01B delete-candidate drift detected: %', delete_drift_count;
  end if;
end $$;

-- Guard 6: keep rows must still be exact normal rows.
do $$
declare
  keep_drift_count int;
begin
  select count(*) into keep_drift_count
  from pkg01b_fut2020_child_keep_rows keep_row
  left join public.card_printings cpr on cpr.id = keep_row.card_printing_id
  where cpr.id is null
     or cpr.card_print_id is distinct from keep_row.card_print_id
     or cpr.finish_key is distinct from 'normal';

  if keep_drift_count <> 0 then
    raise exception 'PKG-01B keep-row drift detected: %', keep_drift_count;
  end if;
end $$;

-- Guard 7: supported child dependency tables must not reference delete candidates.
do $$
declare
  ref_count int;
begin
  select count(*) into ref_count
  from public.vault_item_instances vii
  join pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = vii.card_printing_id
  where vii.archived_at is null;

  if ref_count <> 0 then
    raise exception 'PKG-01B active vault_item_instances child dependency blocker: %', ref_count;
  end if;

  if to_regclass('public.external_printing_mappings') is not null then
    execute 'select count(*) from public.external_printing_mappings epm join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = epm.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B external_printing_mappings child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.canon_warehouse_candidates') is not null then
    execute 'select count(*) from public.canon_warehouse_candidates cwc join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = cwc.promoted_card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B canon_warehouse_candidates child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.card_printing_truth_reviews') is not null then
    execute 'select count(*) from public.card_printing_truth_reviews cptr join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = cptr.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B card_printing_truth_reviews child dependency blocker: %', ref_count;
    end if;
  end if;

  if to_regclass('public.justtcg_grookai_mappings') is not null then
    execute 'select count(*) from public.justtcg_grookai_mappings jgm join pg_temp.pkg01b_fut2020_child_delete_candidates candidate on candidate.card_printing_id = jgm.card_printing_id' into ref_count;
    if ref_count <> 0 then
      raise exception 'PKG-01B justtcg_grookai_mappings child dependency blocker: %', ref_count;
    end if;
  end if;
end $$;

create temporary table pkg01b_fut2020_updated_parent_rows (
  card_print_id uuid primary key
) on commit drop;

with updated as (
  update public.card_prints cp
  set set_code = approved.after_set_code
  from pkg01b_fut2020_approved_card_prints approved
  where cp.id = approved.card_print_id
    and cp.set_code is distinct from approved.after_set_code
  returning cp.id as card_print_id
)
insert into pkg01b_fut2020_updated_parent_rows (card_print_id)
select card_print_id from updated;

create temporary table pkg01b_fut2020_deleted_child_rows (
  card_printing_id uuid primary key,
  card_print_id uuid not null,
  finish_key text not null
) on commit drop;

with deleted as (
  delete from public.card_printings cpr
  using pkg01b_fut2020_child_delete_candidates candidate
  where cpr.id = candidate.card_printing_id
  returning cpr.id as card_printing_id, cpr.card_print_id, cpr.finish_key
)
insert into pkg01b_fut2020_deleted_child_rows (
  card_printing_id,
  card_print_id,
  finish_key
)
select card_printing_id, card_print_id, finish_key from deleted;

-- Guard 8: transient dry-run mutation must touch exactly four parents and eight child rows.
do $$
declare
  updated_count int;
  deleted_count int;
begin
  select count(*) into updated_count from pkg01b_fut2020_updated_parent_rows;
  select count(*) into deleted_count from pkg01b_fut2020_deleted_child_rows;

  if updated_count <> 4 then
    raise exception 'PKG-01B dry-run parent update count mismatch: %', updated_count;
  end if;
  if deleted_count <> 8 then
    raise exception 'PKG-01B dry-run child delete count mismatch: %', deleted_count;
  end if;
end $$;

-- Guard 9: transient final state must be four fut2020 parent rows with one normal child each.
do $$
declare
  final_parent_count int;
  final_child_count int;
  final_bad_finish_count int;
begin
  select count(*) into final_parent_count
  from public.card_prints cp
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cp.id
  where cp.set_code = approved.after_set_code
    and cp.number = approved.after_number
    and cp.name = approved.after_name;

  select count(*) into final_child_count
  from public.card_printings cpr
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cpr.card_print_id;

  select count(*) into final_bad_finish_count
  from public.card_printings cpr
  join pkg01b_fut2020_approved_card_prints approved on approved.card_print_id = cpr.card_print_id
  where cpr.finish_key <> 'normal';

  if final_parent_count <> 4 then
    raise exception 'PKG-01B final parent verification failed: %', final_parent_count;
  end if;
  if final_child_count <> 4 then
    raise exception 'PKG-01B final child count verification failed: %', final_child_count;
  end if;
  if final_bad_finish_count <> 0 then
    raise exception 'PKG-01B final child finish verification failed: %', final_bad_finish_count;
  end if;
end $$;

-- Required rollback-only ending for this dry-run artifact.
rollback;
