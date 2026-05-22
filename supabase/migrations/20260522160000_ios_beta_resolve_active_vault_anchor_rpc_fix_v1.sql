begin;

-- iOS beta 1.0.0+2 RPC blocker repair.
--
-- The security warning remediation correctly hid broad direct access to
-- SECURITY DEFINER helpers, but the mobile app still has one governed direct
-- read path through resolve_active_vault_anchor_v1(p_create_if_missing=false),
-- and vault_mobile_instance_detail_v1 depends on the same helper internally.
--
-- Keep the helper SECURITY DEFINER because it owns legacy anchor repair/write
-- behavior, but make authenticated execution owner-bound before restoring the
-- app grant. This prevents callers from resolving or mutating another user's
-- legacy vault anchor by passing an arbitrary p_user_id.

create or replace function public.resolve_active_vault_anchor_v1(
  p_user_id uuid,
  p_card_print_id uuid,
  p_gv_id text default null,
  p_condition_label text default 'NM',
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null,
  p_create_if_missing boolean default false
) returns public.vault_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := auth.uid();
  v_request_role text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
  v_anchor public.vault_items%rowtype;
  v_anchor_ids uuid[];
  v_primary_id uuid;
  v_extra_ids uuid[];
begin
  if p_user_id is null then
    raise exception 'p_user_id is required' using errcode = 'P0001';
  end if;

  if p_card_print_id is null then
    raise exception 'p_card_print_id is required' using errcode = 'P0001';
  end if;

  if v_request_role <> 'service_role' then
    if v_request_user_id is null then
      raise exception 'not_authenticated' using errcode = '28000';
    end if;

    if p_user_id <> v_request_user_id then
      raise exception 'vault_anchor_owner_mismatch' using errcode = '42501';
    end if;
  end if;

  select coalesce(array_agg(id order by created_at desc, id desc), array[]::uuid[])
  into v_anchor_ids
  from public.vault_items
  where user_id = p_user_id
    and card_id = p_card_print_id
    and archived_at is null;

  if coalesce(array_length(v_anchor_ids, 1), 0) = 0 then
    if not p_create_if_missing then
      return null;
    end if;

    insert into public.vault_items (
      user_id,
      card_id,
      gv_id,
      qty,
      condition_label,
      notes,
      name,
      set_name,
      photo_url
    )
    values (
      p_user_id,
      p_card_print_id,
      p_gv_id,
      0,
      p_condition_label,
      nullif(p_notes, ''),
      p_name,
      nullif(p_set_name, ''),
      nullif(p_photo_url, '')
    )
    returning *
    into v_anchor;

    return v_anchor;
  end if;

  v_primary_id := v_anchor_ids[1];

  if coalesce(array_length(v_anchor_ids, 1), 0) > 1 then
    v_extra_ids := v_anchor_ids[2:array_length(v_anchor_ids, 1)];

    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, now())
    where id = any(v_extra_ids)
      and archived_at is null;
  end if;

  select *
  into v_anchor
  from public.vault_items
  where id = v_primary_id;

  return v_anchor;
end;
$$;

revoke all on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
from public, anon;

grant execute on function public.resolve_active_vault_anchor_v1(uuid, uuid, text, text, text, text, text, text, boolean)
to authenticated, service_role;

-- Keep the public GVVI detail RPC anonymous-safe without requiring anon EXECUTE
-- on the privileged anchor helper. Public detail can use the exact instance's
-- stored legacy anchor id; it must not repair or collapse anchors.
create or replace function public.public_vault_instance_detail_v1(
  p_gv_vi_id text
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_normalized_gvvi text := nullif(btrim(p_gv_vi_id), '');
  v_instance public.vault_item_instances%rowtype;
  v_slab public.slab_certs%rowtype;
  v_card public.card_prints%rowtype;
  v_set public.sets%rowtype;
  v_profile public.public_profiles%rowtype;
  v_shared public.shared_cards%rowtype;
  v_card_print_id uuid;
  v_normalized_intent text;
  v_is_discoverable boolean := false;
begin
  if v_normalized_gvvi is null then
    return null;
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where gv_vi_id = v_normalized_gvvi
    and archived_at is null
  limit 1;

  if not found then
    return null;
  end if;

  if v_instance.slab_cert_id is not null then
    select *
    into v_slab
    from public.slab_certs
    where id = v_instance.slab_cert_id;
  end if;

  v_card_print_id := coalesce(v_instance.card_print_id, v_slab.card_print_id);
  if v_card_print_id is null then
    return null;
  end if;

  select *
  into v_card
  from public.card_prints
  where id = v_card_print_id;

  if not found then
    return null;
  end if;

  if v_card.set_id is not null then
    select *
    into v_set
    from public.sets
    where id = v_card.set_id;
  end if;

  select *
  into v_profile
  from public.public_profiles
  where user_id = v_instance.user_id
    and public_profile_enabled = true
    and vault_sharing_enabled = true;

  if not found then
    return null;
  end if;

  select *
  into v_shared
  from public.shared_cards
  where user_id = v_instance.user_id
    and card_id = v_card_print_id;

  v_normalized_intent := lower(coalesce(nullif(btrim(v_instance.intent), ''), 'hold'));
  v_is_discoverable := v_normalized_intent in ('trade', 'sell', 'showcase');

  if not v_is_discoverable and coalesce(v_shared.is_shared, false) is not true then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'owner_user_id', v_instance.user_id,
    'legacy_vault_item_id', v_instance.legacy_vault_item_id,
    'card_print_id', v_card_print_id,
    'condition_label', v_instance.condition_label,
    'intent', v_instance.intent,
    'created_at', v_instance.created_at,
    'grade_company', coalesce(v_slab.grader, v_instance.grade_company),
    'grade_value', coalesce(v_slab.grade::text, v_instance.grade_value),
    'grade_label', v_instance.grade_label,
    'cert_number', v_slab.cert_number,
    'image_url', v_instance.image_url,
    'image_back_url', v_instance.image_back_url,
    'image_display_mode', v_instance.image_display_mode,
    'pricing_mode', v_instance.pricing_mode,
    'asking_price_amount', v_instance.asking_price_amount,
    'asking_price_currency', v_instance.asking_price_currency,
    'asking_price_note', v_instance.asking_price_note,
    'public_note', v_shared.public_note,
    'is_shared_on_wall', coalesce(v_shared.is_shared, false),
    'is_discoverable', v_is_discoverable,
    'owner_slug', v_profile.slug,
    'owner_display_name', coalesce(nullif(btrim(v_profile.display_name), ''), v_profile.slug),
    'card_gv_id', v_card.gv_id,
    'card_name', v_card.name,
    'card_set_code', v_card.set_code,
    'card_set_name', coalesce(v_set.name, v_card.set_code, 'Unknown set'),
    'card_number', v_card.number,
    'card_image_url', v_card.image_url,
    'card_image_alt_url', v_card.image_alt_url
  );
end;
$$;

grant execute on function public.public_vault_instance_detail_v1(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
