begin;

alter table public.vault_item_instances
  add column if not exists card_printing_id uuid null references public.card_printings(id) on delete restrict;

comment on column public.vault_item_instances.card_printing_id is
'Optional child printing/finish owned for this vault instance. Parent card_print_id remains the canonical card identity.';

create index if not exists vault_item_instances_card_printing_id_idx
  on public.vault_item_instances (card_printing_id);

create index if not exists vault_item_instances_active_user_card_printing_idx
  on public.vault_item_instances (user_id, card_printing_id, created_at desc)
  where archived_at is null and card_printing_id is not null;

create or replace function public.assert_vault_item_instance_card_printing_parent_v1()
returns trigger
language plpgsql
as $$
declare
  v_parent_card_print_id uuid;
begin
  if new.card_printing_id is null then
    return new;
  end if;

  if new.card_print_id is null then
    raise exception 'card_printing_id requires card_print_id';
  end if;

  select cp.card_print_id
  into v_parent_card_print_id
  from public.card_printings cp
  where cp.id = new.card_printing_id;

  if v_parent_card_print_id is null then
    raise exception 'card_printing_id does not exist: %', new.card_printing_id;
  end if;

  if v_parent_card_print_id <> new.card_print_id then
    raise exception 'card_printing_id % does not belong to card_print_id %', new.card_printing_id, new.card_print_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vault_item_instances_card_printing_parent_v1 on public.vault_item_instances;

create trigger trg_vault_item_instances_card_printing_parent_v1
before insert or update of card_print_id, card_printing_id
on public.vault_item_instances
for each row
execute function public.assert_vault_item_instance_card_printing_parent_v1();

create or replace function public.admin_vault_instance_create_v1(
  p_user_id uuid,
  p_card_print_id uuid default null,
  p_slab_cert_id uuid default null,
  p_legacy_vault_item_id uuid default null,
  p_acquisition_cost numeric default null,
  p_condition_label text default null,
  p_condition_score integer default null,
  p_is_graded boolean default false,
  p_grade_company text default null,
  p_grade_value text default null,
  p_grade_label text default null,
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null,
  p_market_price numeric default null,
  p_last_price_update timestamptz default null,
  p_image_source text default null,
  p_image_url text default null,
  p_image_back_source text default null,
  p_image_back_url text default null,
  p_created_at timestamptz default null,
  p_archived_at timestamptz default null,
  p_card_printing_id uuid default null
) returns public.vault_item_instances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner public.vault_owners%rowtype;
  v_allocated_index bigint;
  v_gv_vi_id text;
  v_is_graded boolean := coalesce(p_is_graded, false);
  v_printing_parent_card_print_id uuid;
  v_inserted public.vault_item_instances%rowtype;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if ((p_card_print_id is not null)::integer + (p_slab_cert_id is not null)::integer) <> 1 then
    raise exception 'exactly one of p_card_print_id or p_slab_cert_id is required';
  end if;

  if p_card_printing_id is not null then
    if p_card_print_id is null then
      raise exception 'p_card_printing_id requires p_card_print_id';
    end if;

    select card_print_id
    into v_printing_parent_card_print_id
    from public.card_printings
    where id = p_card_printing_id;

    if v_printing_parent_card_print_id is null then
      raise exception 'p_card_printing_id not found: %', p_card_printing_id;
    end if;

    if v_printing_parent_card_print_id <> p_card_print_id then
      raise exception 'p_card_printing_id % does not belong to p_card_print_id %', p_card_printing_id, p_card_print_id;
    end if;
  end if;

  if p_acquisition_cost is not null and p_acquisition_cost < 0 then
    raise exception 'p_acquisition_cost must be >= 0';
  end if;

  if p_market_price is not null and p_market_price < 0 then
    raise exception 'p_market_price must be >= 0';
  end if;

  if p_slab_cert_id is not null then
    v_is_graded := true;
  end if;

  perform public.ensure_vault_owner_v1(p_user_id);

  select *
  into v_owner
  from public.vault_owners
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'vault_owner_not_found_after_ensure: %', p_user_id;
  end if;

  v_allocated_index := v_owner.next_instance_index;
  v_gv_vi_id := public.generate_gv_vi_id_v1(v_owner.owner_code, v_allocated_index);

  insert into public.vault_item_instances (
    user_id,
    gv_vi_id,
    card_print_id,
    card_printing_id,
    slab_cert_id,
    legacy_vault_item_id,
    acquisition_cost,
    condition_label,
    condition_score,
    is_graded,
    grade_company,
    grade_value,
    grade_label,
    notes,
    name,
    set_name,
    photo_url,
    market_price,
    last_price_update,
    image_source,
    image_url,
    image_back_source,
    image_back_url,
    created_at,
    archived_at
  ) values (
    p_user_id,
    v_gv_vi_id,
    p_card_print_id,
    p_card_printing_id,
    p_slab_cert_id,
    p_legacy_vault_item_id,
    p_acquisition_cost,
    p_condition_label,
    p_condition_score,
    v_is_graded,
    p_grade_company,
    p_grade_value,
    p_grade_label,
    p_notes,
    p_name,
    p_set_name,
    p_photo_url,
    p_market_price,
    p_last_price_update,
    p_image_source,
    p_image_url,
    p_image_back_source,
    p_image_back_url,
    coalesce(p_created_at, now()),
    p_archived_at
  )
  returning *
  into v_inserted;

  update public.vault_owners
  set next_instance_index = v_allocated_index + 1
  where user_id = p_user_id;

  return v_inserted;
end;
$$;

revoke all on function public.admin_vault_instance_create_v1(
  uuid, uuid, uuid, uuid, numeric, text, integer, boolean, text, text, text, text, text, text, text, numeric, timestamptz, text, text, text, text, timestamptz, timestamptz, uuid
)
from public, anon, authenticated;

grant execute on function public.admin_vault_instance_create_v1(
  uuid, uuid, uuid, uuid, numeric, text, integer, boolean, text, text, text, text, text, text, text, numeric, timestamptz, text, text, text, text, timestamptz, timestamptz, uuid
)
to service_role;

commit;
