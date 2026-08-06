-- CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1
-- Closes the exact operational quarantine record after the disputed card is
-- proven suppressed and the verified canonical target remains active.

begin;

do $$
declare
  v_quarantine_id constant uuid := 'a0229cee-66a2-4cb4-a9c6-c548a51b57f1';
  v_disputed_id constant uuid := '77e73dcd-34f9-49a5-8807-efca3b2c3e6c';
  v_canonical_id constant uuid := 'a7e71718-4ffd-5da2-9275-2ff77c94b591';
  v_source_payload_hash constant text := 'f723beca5c53d070978bc6ea3631e7517085a5c6fde5e7edb46c37d082fee332';
  v_updated_count integer;
begin
  -- Fresh and shadow databases do not contain this production-only repair.
  if not exists (
    select 1 from public.quarantine_records where id = v_quarantine_id
  ) and not exists (
    select 1 from public.card_prints where id = v_disputed_id
  ) and not exists (
    select 1 from public.card_prints where id = v_canonical_id
  ) then
    return;
  end if;

  if not exists (
    select 1
    from public.quarantine_records
    where id = v_quarantine_id
      and source_system = 'app_store_connect'
      and execution_name = 'build_21_identity_image_conflict_repair_v1'
      and contract_name = 'CARD_PRINT_APP_VISIBILITY_GUARD_V1'
      and quarantine_reason = 'verified_identity_image_conflict'
      and source_payload_hash = v_source_payload_hash
      and canonical_write_blocked = true
      and resolved_at is null
      and payload_snapshot->>'disputed_card_print_id' = v_disputed_id::text
      and payload_snapshot->>'canonical_target_card_print_id' = v_canonical_id::text
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1 quarantine precondition failed';
  end if;

  if not exists (
    select 1
    from public.card_prints
    where id = v_disputed_id
      and gv_id = 'GV-PK-JPN-DPP-102'
      and name = 'ポッチャマ'
      and data_quality_flags #>> '{app_visibility_v1,status}' = 'suppressed'
      and data_quality_flags #>> '{app_visibility_v1,canonical_target_card_print_id}' = v_canonical_id::text
  ) or exists (
    select 1
    from public.card_print_identity
    where card_print_id = v_disputed_id
      and is_active = true
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1 disputed-row suppression precondition failed';
  end if;

  if not exists (
    select 1
    from public.card_prints cp
    join public.card_print_identity cpi
      on cpi.card_print_id = cp.id
     and cpi.is_active = true
    where cp.id = v_canonical_id
      and cp.gv_id = 'GV-PK-JPN-DPP-102-PIKACHU'
      and cp.name = 'Pikachu'
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1 canonical-target precondition failed';
  end if;

  update public.quarantine_records
  set
    resolved_at = now(),
    resolved_by = 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1',
    resolution_outcome = 'resolved_suppression_verified',
    resolution_notes = 'Disputed row remains preserved and client-suppressed; its identity assertion is inactive; verified Pikachu target remains active.'
  where id = v_quarantine_id
    and resolved_at is null;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 1 then
    raise exception 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1 expected one resolution update, got %', v_updated_count;
  end if;

  if not exists (
    select 1
    from public.quarantine_records
    where id = v_quarantine_id
      and resolved_at is not null
      and resolved_by = 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1'
      and resolution_outcome = 'resolved_suppression_verified'
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_QUARANTINE_RESOLUTION_V1 readback failed';
  end if;
end
$$;

commit;
