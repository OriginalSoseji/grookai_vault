begin;

-- Remove the pre-child-printing overload. Its defaults overlap with the
-- child-printing-aware overload and make named RPC calls ambiguous.
drop function if exists public.admin_vault_instance_create_v1(
  uuid, uuid, uuid, uuid, numeric, text, integer, boolean, text, text, text,
  text, text, text, text, numeric, timestamptz, text, text, text, text,
  timestamptz, timestamptz
);

drop function if exists public.vault_add_card_instance_v1(
  uuid, integer, text, text, text, text, text
);

create or replace function public.vault_add_card_instance_v1(
  p_card_print_id uuid,
  p_quantity integer default 1,
  p_condition_label text default 'NM',
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null,
  p_card_printing_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_quantity integer := greatest(1, coalesce(p_quantity, 1));
  v_gv_id text;
  v_name text;
  v_set_name text;
  v_bucket public.vault_items%rowtype;
  v_instance public.vault_item_instances%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_card_print_id is null then
    raise exception 'p_card_print_id is required';
  end if;

  select
    cp.gv_id,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(p_name), ''), 'Unknown card'),
    coalesce(nullif(btrim(s.name), ''), nullif(btrim(p_set_name), ''), '')
  into
    v_gv_id,
    v_name,
    v_set_name
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id = p_card_print_id;

  if v_gv_id is null or btrim(v_gv_id) = '' then
    raise exception 'vault_card_print_missing_identity' using errcode = 'P0001';
  end if;

  select *
  into v_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_uid,
    p_card_print_id => p_card_print_id,
    p_gv_id => v_gv_id,
    p_condition_label => p_condition_label,
    p_notes => nullif(p_notes, ''),
    p_name => v_name,
    p_set_name => nullif(v_set_name, ''),
    p_photo_url => nullif(p_photo_url, ''),
    p_create_if_missing => true
  );

  for i in 1..v_quantity loop
    select *
    into v_instance
    from public.admin_vault_instance_create_v1(
      p_user_id => v_uid,
      p_card_print_id => p_card_print_id,
      p_slab_cert_id => null::uuid,
      p_legacy_vault_item_id => v_bucket.id,
      p_acquisition_cost => null::numeric,
      p_condition_label => p_condition_label,
      p_condition_score => null::integer,
      p_is_graded => false,
      p_grade_company => null::text,
      p_grade_value => null::text,
      p_grade_label => null::text,
      p_notes => nullif(p_notes, ''),
      p_name => v_name,
      p_set_name => nullif(v_set_name, ''),
      p_photo_url => nullif(p_photo_url, ''),
      p_market_price => null::numeric,
      p_last_price_update => null::timestamptz,
      p_image_source => null::text,
      p_image_url => null::text,
      p_image_back_source => null::text,
      p_image_back_url => null::text,
      p_created_at => null::timestamptz,
      p_archived_at => null::timestamptz,
      p_card_printing_id => p_card_printing_id
    );
  end loop;

  update public.vault_items
  set
    qty = coalesce(public.vault_items.qty, 0) + v_quantity,
    condition_label = coalesce(p_condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(p_notes, ''), public.vault_items.notes)
  where id = v_bucket.id
    and user_id = v_uid
    and archived_at is null
  returning *
  into v_bucket;

  return jsonb_build_object(
    'gv_vi_id', v_instance.gv_vi_id,
    'created_count', v_quantity,
    'legacy_vault_item_id', v_bucket.id,
    'bucket_qty', v_bucket.qty,
    'card_print_id', p_card_print_id,
    'card_printing_id', p_card_printing_id
  );
end;
$$;

revoke all on function public.vault_add_card_instance_v1(
  uuid, integer, text, text, text, text, text, uuid
)
from public, anon;

grant execute on function public.vault_add_card_instance_v1(
  uuid, integer, text, text, text, text, text, uuid
)
to authenticated, service_role;

create or replace function public.vault_add_or_increment(
  p_card_id uuid,
  p_delta_qty integer,
  p_name text,
  p_condition_label text default 'NM',
  p_notes text default null
) returns setof public.vault_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.vault_items%rowtype;
  v_gv_id text;
  v_name text;
  v_set_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select
    cp.gv_id,
    coalesce(nullif(btrim(cp.name), ''), nullif(btrim(p_name), ''), 'Unknown card'),
    nullif(btrim(s.name), '')
  into
    v_gv_id,
    v_name,
    v_set_name
  from public.card_prints cp
  left join public.sets s
    on s.id = cp.set_id
  where cp.id = p_card_id;

  if v_gv_id is null or btrim(v_gv_id) = '' then
    raise exception 'vault_card_print_missing_identity' using errcode = 'P0001';
  end if;

  update public.vault_items
  set
    qty = coalesce(public.vault_items.qty, 0) + greatest(1, coalesce(p_delta_qty, 1)),
    condition_label = coalesce(p_condition_label, public.vault_items.condition_label),
    notes = coalesce(nullif(p_notes, ''), public.vault_items.notes),
    name = coalesce(public.vault_items.name, v_name),
    set_name = coalesce(public.vault_items.set_name, v_set_name)
  where user_id = v_uid
    and card_id = p_card_id
    and archived_at is null
  returning *
  into v_result;

  if found then
    return next v_result;
    return;
  end if;

  insert into public.vault_items (
    user_id,
    card_id,
    gv_id,
    qty,
    condition_label,
    notes,
    name,
    set_name
  )
  values (
    v_uid,
    p_card_id,
    v_gv_id,
    greatest(1, coalesce(p_delta_qty, 1)),
    p_condition_label,
    nullif(p_notes, ''),
    v_name,
    v_set_name
  )
  returning *
  into v_result;

  return next v_result;
end;
$$;

revoke all on function public.vault_add_or_increment(uuid, integer, text, text, text)
from public, anon;

grant execute on function public.vault_add_or_increment(uuid, integer, text, text, text)
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
