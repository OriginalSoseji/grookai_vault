-- Identity Scan envelope adapter: inserts a condition_snapshot without a vault_item_id
-- Validates presence of front image path and returns snapshot id.

create or replace function public.condition_snapshots_insert_identity_v1(
  p_images jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_id uuid;
  v_front text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  v_front := coalesce(
    p_images -> 'paths' ->> 'front',
    p_images ->> 'front',
    p_images -> 'front' ->> 'path',
    ''
  );

  if v_front is null or length(trim(v_front)) = 0 then
    raise exception 'missing_front_image';
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
    gen_random_uuid(),
    null,
    v_uid,
    now(),
    coalesce(p_images, '{}'::jsonb),
    jsonb_build_object('ok', false, 'pending', true, 'source', 'identity_scan_v1'),
    '{}'::jsonb,
    '{}'::jsonb,
    0,
    '{}'::jsonb,
    null,
    null
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.condition_snapshots_insert_identity_v1(jsonb) is
'Identity scan envelope only; inserts condition_snapshot without vault_item_id, validates front image path, does not start condition scan.';

revoke all on function public.condition_snapshots_insert_identity_v1(jsonb) from public;
grant execute on function public.condition_snapshots_insert_identity_v1(jsonb) to authenticated;
