-- CARD_PRINT_APP_VISIBILITY_GUARD_V1
-- Preserves disputed canonical rows and their evidence while preventing an
-- explicitly suppressed row from being rendered by anon/authenticated clients.

begin;

do $$
declare
  v_disputed_id constant uuid := '77e73dcd-34f9-49a5-8807-efca3b2c3e6c';
  v_canonical_id constant uuid := 'a7e71718-4ffd-5da2-9275-2ff77c94b591';
begin
  if not exists (
    select 1
    from public.card_prints
    where id = v_disputed_id
      and gv_id = 'GV-PK-JPN-DPP-102'
      and name = 'ポッチャマ'
      and set_code = 'jpn-dpp'
      and number = '102'
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_GUARD_V1 disputed row precondition failed';
  end if;

  if not exists (
    select 1
    from public.card_prints
    where id = v_canonical_id
      and gv_id = 'GV-PK-JPN-DPP-102-PIKACHU'
      and name = 'Pikachu'
      and set_code = 'jpn-dpp'
      and number = '102'
  ) then
    raise exception 'CARD_PRINT_APP_VISIBILITY_GUARD_V1 canonical target precondition failed';
  end if;

  update public.card_prints
  set
    data_quality_flags = jsonb_set(
      coalesce(data_quality_flags, '{}'::jsonb),
      '{app_visibility_v1}',
      jsonb_build_object(
        'status', 'suppressed',
        'reason', 'verified_identity_image_conflict',
        'canonical_target_card_print_id', v_canonical_id,
        'canonical_target_gv_id', 'GV-PK-JPN-DPP-102-PIKACHU',
        'evidence', jsonb_build_array(
          'app_store_connect_build_21_feedback',
          'self_hosted_image_readback',
          'pokemon_card_official_jp_card_19509'
        ),
        'policy_version', 'CARD_PRINT_APP_VISIBILITY_GUARD_V1'
      ),
      true
    ),
    updated_at = now()
  where id = v_disputed_id;

  update public.card_print_identity
  set
    is_active = false,
    identity_payload = jsonb_set(
      coalesce(identity_payload, '{}'::jsonb),
      '{app_visibility_v1}',
      jsonb_build_object(
        'status', 'suppressed',
        'reason', 'verified_identity_image_conflict',
        'canonical_target_card_print_id', v_canonical_id,
        'canonical_target_gv_id', 'GV-PK-JPN-DPP-102-PIKACHU',
        'policy_version', 'CARD_PRINT_APP_VISIBILITY_GUARD_V1'
      ),
      true
    ),
    updated_at = now()
  where card_print_id = v_disputed_id
    and is_active = true;

  insert into public.quarantine_records (
    source_system,
    execution_name,
    contract_name,
    quarantine_reason,
    source_payload_hash,
    payload_snapshot,
    canonical_write_blocked
  )
  select
    'app_store_connect',
    'build_21_identity_image_conflict_repair_v1',
    'CARD_PRINT_APP_VISIBILITY_GUARD_V1',
    'verified_identity_image_conflict',
    encode(
      extensions.digest(
        v_disputed_id::text || '|' || v_canonical_id::text || '|102/DP-P',
        'sha256'
      ),
      'hex'
    ),
    jsonb_build_object(
      'disputed_card_print_id', v_disputed_id,
      'disputed_gv_id', 'GV-PK-JPN-DPP-102',
      'canonical_target_card_print_id', v_canonical_id,
      'canonical_target_gv_id', 'GV-PK-JPN-DPP-102-PIKACHU',
      'preservation', 'row_and_source_evidence_retained',
      'evidence', jsonb_build_array(
        'app_store_connect_build_21_feedback',
        'self_hosted_image_readback',
        'pokemon_card_official_jp_card_19509'
      )
    ),
    true
  where not exists (
    select 1
    from public.quarantine_records qr
    where qr.contract_name = 'CARD_PRINT_APP_VISIBILITY_GUARD_V1'
      and qr.source_payload_hash = encode(
        extensions.digest(
          v_disputed_id::text || '|' || v_canonical_id::text || '|102/DP-P',
          'sha256'
        ),
        'hex'
      )
  );
end
$$;

drop policy if exists card_prints_hide_explicitly_suppressed_v1
on public.card_prints;

create policy card_prints_hide_explicitly_suppressed_v1
on public.card_prints
as restrictive
for select
to public
using (
  coalesce(
    data_quality_flags #>> '{app_visibility_v1,status}',
    'visible'
  ) <> 'suppressed'
);

comment on policy card_prints_hide_explicitly_suppressed_v1
on public.card_prints is
'Restrictive client-read guard. Explicitly suppressed identity-conflict rows remain available to service-owned audit and repair workflows but cannot render through anon/authenticated card_prints reads or security-invoker views.';

notify pgrst, 'reload schema';

commit;
