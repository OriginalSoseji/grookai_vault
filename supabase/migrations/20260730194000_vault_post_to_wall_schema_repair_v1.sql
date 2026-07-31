-- VAULT_POST_TO_WALL_SCHEMA_REPAIR_V1
-- Repairs stale vault_items column references in the service-only legacy RPC.

begin;

create or replace function public.vault_post_to_wall(
  vault_item_id uuid,
  price_cents integer,
  quantity integer,
  condition text default null,
  note text default null,
  use_vault_image boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_cp uuid;
  v_cond text;
  v_img text;
  v_qty integer;
  v_price integer;
  v_listing uuid;
begin
  v_uid := public.auth_uid();
  if v_uid is null then
    raise exception 'auth required' using errcode = '28000';
  end if;
  if quantity is null or quantity <= 0 then
    raise exception 'quantity must be > 0' using errcode = '22023';
  end if;
  if price_cents is null or price_cents < 0 then
    raise exception 'price_cents must be >= 0' using errcode = '22023';
  end if;

  select
    vi.card_id,
    coalesce(vault_post_to_wall.condition, vi.condition_label),
    case when use_vault_image then vi.image_url else null end
  into v_cp, v_cond, v_img
  from public.vault_items vi
  where vi.id = vault_post_to_wall.vault_item_id
    and vi.user_id = v_uid
    and vi.archived_at is null;

  if v_cp is null then
    raise exception 'vault_item not found or not owned' using errcode = '42501';
  end if;

  v_qty := quantity;
  v_price := price_cents;

  insert into public.listings (
    owner_id,
    card_print_id,
    vault_item_id,
    condition_tier,
    quantity,
    price_cents,
    note,
    visibility,
    status,
    image_url
  )
  values (
    v_uid,
    v_cp,
    vault_item_id,
    v_cond,
    v_qty,
    v_price,
    note,
    'public',
    'active',
    v_img
  )
  returning id into v_listing;

  return v_listing;
end;
$$;

revoke execute
on function public.vault_post_to_wall(uuid, integer, integer, text, text, boolean)
from public, anon, authenticated;

grant execute
on function public.vault_post_to_wall(uuid, integer, integer, text, text, boolean)
to service_role;

notify pgrst, 'reload schema';

commit;
