begin;

create or replace function public.vault_mobile_card_copies_v1(
  p_card_print_id uuid,
  p_vault_item_id uuid default null
) returns table (
  instance_id uuid,
  gv_vi_id text,
  legacy_vault_item_id uuid,
  condition_label text,
  intent text,
  notes text,
  created_at timestamptz,
  is_graded boolean,
  grader text,
  grade text,
  cert_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_card_print_id is null and p_vault_item_id is null then
    raise exception 'card_print_id_or_vault_item_id_required' using errcode = 'P0001';
  end if;

  return query
  select
    vii.id as instance_id,
    vii.gv_vi_id,
    vii.legacy_vault_item_id,
    vii.condition_label,
    coalesce(nullif(btrim(vii.intent), ''), 'hold') as intent,
    vii.notes,
    vii.created_at,
    (vii.slab_cert_id is not null) as is_graded,
    coalesce(nullif(btrim(sc.grader), ''), nullif(btrim(vii.grade_company), '')) as grader,
    coalesce(
      nullif(btrim(sc.grade::text), ''),
      nullif(btrim(vii.grade_label), ''),
      nullif(btrim(vii.grade_value), '')
    ) as grade,
    nullif(btrim(sc.cert_number), '') as cert_number
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.archived_at is null
    and (
      (p_card_print_id is not null and coalesce(vii.card_print_id, sc.card_print_id) = p_card_print_id)
      or (p_vault_item_id is not null and vii.legacy_vault_item_id = p_vault_item_id)
    )
  order by vii.created_at desc, vii.id desc;
end;
$$;

create or replace function public.vault_mobile_instance_detail_v1(
  p_gv_vi_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_normalized_gvvi text := nullif(btrim(p_gv_vi_id), '');
  v_instance public.vault_item_instances%rowtype;
  v_slab public.slab_certs%rowtype;
  v_card public.card_prints%rowtype;
  v_set public.sets%rowtype;
  v_profile public.public_profiles%rowtype;
  v_shared public.shared_cards%rowtype;
  v_bucket public.vault_items%rowtype;
  v_card_print_id uuid;
  v_outcomes jsonb := '[]'::jsonb;
  v_active_copy_count integer := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_normalized_gvvi is null then
    return null;
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where gv_vi_id = v_normalized_gvvi
    and user_id = v_uid
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
  where user_id = v_uid;

  select *
  into v_shared
  from public.shared_cards
  where user_id = v_uid
    and card_id = v_card_print_id;

  select *
  into v_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_uid,
    p_card_print_id => v_card_print_id,
    p_create_if_missing => false
  );

  select count(*)
  into v_active_copy_count
  from public.vault_item_instances vii
  left join public.slab_certs sc
    on sc.id = vii.slab_cert_id
  where vii.user_id = v_uid
    and vii.archived_at is null
    and coalesce(vii.card_print_id, sc.card_print_id) = v_card_print_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cio.id,
        'execution_event_id', cio.execution_event_id,
        'outcome_type', cio.outcome_type,
        'price_amount', cio.price_amount,
        'price_currency', cio.price_currency,
        'created_at', cio.created_at,
        'source_instance_id', cio.source_instance_id,
        'result_instance_id', cio.result_instance_id
      )
      order by cio.created_at desc, cio.id desc
    ),
    '[]'::jsonb
  )
  into v_outcomes
  from public.card_interaction_outcomes cio
  where cio.source_instance_id = v_instance.id
     or cio.result_instance_id = v_instance.id;

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'user_id', v_instance.user_id,
    'card_print_id', v_card_print_id,
    'legacy_vault_item_id', coalesce(v_instance.legacy_vault_item_id, v_bucket.id),
    'condition_label', v_instance.condition_label,
    'intent', v_instance.intent,
    'notes', v_instance.notes,
    'created_at', v_instance.created_at,
    'archived_at', v_instance.archived_at,
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
    'card_gv_id', v_card.gv_id,
    'card_name', v_card.name,
    'card_set_code', v_card.set_code,
    'card_set_name', coalesce(v_set.name, v_card.set_code, 'Unknown set'),
    'card_number', v_card.number,
    'card_image_url', v_card.image_url,
    'card_image_alt_url', v_card.image_alt_url,
    'public_slug', v_profile.slug,
    'public_profile_enabled', coalesce(v_profile.public_profile_enabled, false),
    'vault_sharing_enabled', coalesce(v_profile.vault_sharing_enabled, false),
    'is_shared_on_wall', coalesce(v_shared.is_shared, false),
    'active_copy_count', coalesce(v_active_copy_count, 0),
    'outcomes', v_outcomes
  );
end;
$$;

create or replace function public.public_vault_instance_detail_v1(
  p_gv_vi_id text
) returns jsonb
language plpgsql
security definer
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
  v_bucket public.vault_items%rowtype;
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

  select *
  into v_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_instance.user_id,
    p_card_print_id => v_card_print_id,
    p_create_if_missing => false
  );

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'owner_user_id', v_instance.user_id,
    'legacy_vault_item_id', coalesce(v_instance.legacy_vault_item_id, v_bucket.id),
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

create or replace function public.vault_save_instance_notes_v1(
  p_instance_id uuid,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_instance public.vault_item_instances%rowtype;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
    and archived_at is null
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  update public.vault_item_instances
  set notes = v_notes
  where id = v_instance.id
  returning *
  into v_instance;

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'notes', v_instance.notes
  );
end;
$$;

create or replace function public.vault_save_instance_media_path_v1(
  p_instance_id uuid,
  p_side text,
  p_storage_path text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_instance public.vault_item_instances%rowtype;
  v_side text := lower(coalesce(nullif(btrim(p_side), ''), ''));
  v_path text := nullif(btrim(coalesce(p_storage_path, '')), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_instance_id is null then
    raise exception 'instance_id_required' using errcode = 'P0001';
  end if;

  if v_side not in ('front', 'back') then
    raise exception 'invalid_media_side' using errcode = 'P0001';
  end if;

  select *
  into v_instance
  from public.vault_item_instances
  where id = p_instance_id
    and user_id = v_uid
    and archived_at is null
  for update;

  if not found then
    raise exception 'vault_instance_not_found_or_not_owned' using errcode = 'P0001';
  end if;

  if v_side = 'front' then
    update public.vault_item_instances
    set
      image_url = v_path,
      image_source = case when v_path is null then null else 'user_photo' end
    where id = v_instance.id
    returning *
    into v_instance;
  else
    update public.vault_item_instances
    set
      image_back_url = v_path,
      image_back_source = case when v_path is null then null else 'user_photo' end
    where id = v_instance.id
    returning *
    into v_instance;
  end if;

  return jsonb_build_object(
    'id', v_instance.id,
    'gv_vi_id', v_instance.gv_vi_id,
    'image_url', v_instance.image_url,
    'image_back_url', v_instance.image_back_url
  );
end;
$$;

revoke all on function public.vault_mobile_card_copies_v1(uuid, uuid)
from public, anon;

grant execute on function public.vault_mobile_card_copies_v1(uuid, uuid)
to authenticated, service_role;

revoke all on function public.vault_mobile_instance_detail_v1(text)
from public, anon;

grant execute on function public.vault_mobile_instance_detail_v1(text)
to authenticated, service_role;

revoke all on function public.public_vault_instance_detail_v1(text)
from public;

grant execute on function public.public_vault_instance_detail_v1(text)
to authenticated, anon, service_role;

revoke all on function public.vault_save_instance_notes_v1(uuid, text)
from public, anon;

grant execute on function public.vault_save_instance_notes_v1(uuid, text)
to authenticated, service_role;

revoke all on function public.vault_save_instance_media_path_v1(uuid, text, text)
from public, anon;

grant execute on function public.vault_save_instance_media_path_v1(uuid, text, text)
to authenticated, service_role;

commit;
