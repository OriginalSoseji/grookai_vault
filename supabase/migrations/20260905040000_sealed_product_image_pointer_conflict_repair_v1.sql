-- SEALED_PRODUCT_IMAGE_POINTER_CONFLICT_REPAIR_V1
-- Repairs an ambiguous PL/pgSQL output-variable reference in the image-release
-- pointer compare-and-swap function. No data or visibility is changed.

begin;

create or replace function public.sealed_product_set_active_image_release_v1(
  p_target_image_release_id uuid,
  p_expected_current_image_release_id uuid,
  p_changed_by uuid
)
returns table (
  game_key text,
  active_image_release_id uuid,
  previous_image_release_id uuid,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sealed_product_image_releases%rowtype;
  v_current_release_id uuid;
  v_current_price_release_id uuid;
  v_computed_manifest_fingerprint text;
begin
  if p_changed_by is null then
    raise exception 'changed_by is required' using errcode = '22004';
  end if;

  select * into v_release
  from public.sealed_product_image_releases
  where id = p_target_image_release_id;

  if not found or v_release.release_state <> 'frozen' then
    raise exception 'target image release must exist and be frozen'
      using errcode = '23514';
  end if;

  lock table public.sealed_product_release_members in share mode;
  lock table public.sealed_product_image_evidence in share mode;
  lock table public.sealed_product_variant_image_assertions in share mode;

  v_computed_manifest_fingerprint :=
    public.sealed_product_assert_image_release_complete_v1(
      p_target_image_release_id
    );
  if v_computed_manifest_fingerprint <> v_release.manifest_fingerprint then
    raise exception 'computed image release manifest fingerprint mismatch'
      using errcode = '23514';
  end if;

  lock table public.sealed_product_release_pointer in share mode;

  select price_pointer.release_id into v_current_price_release_id
  from public.sealed_product_release_pointer price_pointer
  where price_pointer.game_key = v_release.game_key
  for share;

  if v_current_price_release_id is distinct from v_release.source_price_release_id then
    raise exception 'target image release is not bound to the active price release'
      using errcode = '23514';
  end if;

  lock table public.sealed_product_image_release_pointer in exclusive mode;

  select pointer.image_release_id into v_current_release_id
  from public.sealed_product_image_release_pointer pointer
  where pointer.game_key = v_release.game_key
  for update;

  if v_current_release_id is distinct from p_expected_current_image_release_id then
    raise exception 'active image release changed concurrently'
      using errcode = '40001';
  end if;

  insert into public.sealed_product_image_release_pointer (
    game_key, image_release_id, previous_image_release_id,
    pointer_contract_version, changed_by, changed_at
  ) values (
    v_release.game_key, p_target_image_release_id, v_current_release_id,
    'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1', p_changed_by, now()
  )
  on conflict on constraint sealed_product_image_release_pointer_pkey
  do update set
    image_release_id = excluded.image_release_id,
    previous_image_release_id = excluded.previous_image_release_id,
    pointer_contract_version = excluded.pointer_contract_version,
    changed_by = excluded.changed_by,
    changed_at = excluded.changed_at;

  return query
  select pointer.game_key, pointer.image_release_id,
    pointer.previous_image_release_id, pointer.changed_at
  from public.sealed_product_image_release_pointer pointer
  where pointer.game_key = v_release.game_key;
end;
$$;

revoke all on function public.sealed_product_set_active_image_release_v1(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.sealed_product_set_active_image_release_v1(
  uuid, uuid, uuid
) to service_role;

comment on function public.sealed_product_set_active_image_release_v1(
  uuid, uuid, uuid
) is
  'Activates one complete frozen sealed image release with compare-and-swap price-release binding; output-variable-safe conflict handling.';

commit;
