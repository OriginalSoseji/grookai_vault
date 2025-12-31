-- ============================================================================
-- Phase 0: RPC insert for condition_snapshots (append-only, auth-bound)
-- Purpose: allow authenticated clients to insert immutable snapshots without
--          direct table INSERT from SQL editor contexts (auth.uid() = null there).
-- Contract: no stored grades/bands; server sets user_id; append-only.
-- ============================================================================

create or replace function public.condition_snapshots_insert_v1(
  p_id uuid,
  p_vault_item_id uuid,
  p_images jsonb,
  p_scan_quality jsonb,
  p_measurements jsonb,
  p_defects jsonb,
  p_confidence numeric,
  p_device_meta jsonb default '{}'::jsonb,
  p_fingerprint_id uuid default null,
  p_card_print_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  insert into public.condition_snapshots (
    id,
    vault_item_id,
    user_id,
    created_at,
    images,
    scan_quality,
    measurements,
    defects,
    confidence,
    device_meta,
    fingerprint_id,
    card_print_id
  )
  values (
    p_id,
    p_vault_item_id,
    v_uid,
    now(),
    coalesce(p_images, '{}'::jsonb),
    coalesce(p_scan_quality, '{}'::jsonb),
    coalesce(p_measurements, '{}'::jsonb),
    coalesce(p_defects, jsonb_build_object('items', jsonb_build_array(), 'version', 1)),
    coalesce(p_confidence, 0.0),
    coalesce(p_device_meta, '{}'::jsonb),
    p_fingerprint_id,
    p_card_print_id
  );

  return p_id;
end;
$$;

-- Grant to authenticated callers
revoke all on function public.condition_snapshots_insert_v1(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb, numeric, jsonb, uuid, uuid
) from public;

grant execute on function public.condition_snapshots_insert_v1(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb, numeric, jsonb, uuid, uuid
) to authenticated;
