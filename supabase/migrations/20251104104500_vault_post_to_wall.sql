-- Grookai Vault — Vault → Wall posting (safe, idempotent)

-- Ensure minimal columns exist on listings
alter table if exists public.listings add column if not exists card_print_id uuid;
alter table if exists public.listings add column if not exists vault_item_id uuid;
alter table if exists public.listings add column if not exists condition_tier text;
alter table if exists public.listings add column if not exists quantity integer default 1;
alter table if exists public.listings add column if not exists note text;
alter table if exists public.listings add column if not exists image_url text;

-- FKs (idempotent via existence checks)
do $$
begin
  -- auth.users always exists in Supabase local
  if not exists (
    select 1 from pg_constraint where conname = 'listings_owner_id_users_fkey'
  ) then
    alter table public.listings
      add constraint listings_owner_id_users_fkey
      foreign key (owner_id) references auth.users(id) not valid;
  end if;

  -- Only add FK to card_prints if table exists in this environment
  if not exists (
    select 1 from pg_constraint where conname = 'listings_card_print_id_fkey'
  ) and exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='card_prints'
  ) then
    alter table public.listings
      add constraint listings_card_print_id_fkey
      foreign key (card_print_id) references public.card_prints(id) not valid;
  end if;

  -- Only add FK to vault_items if table exists
  if not exists (
    select 1 from pg_constraint where conname = 'listings_vault_item_id_fkey'
  ) and exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='vault_items'
  ) then
    alter table public.listings
      add constraint listings_vault_item_id_fkey
      foreign key (vault_item_id) references public.vault_items(id) not valid;
  end if;
end $$;

-- RLS: owners can also read their own rows (in addition to public read policy)
drop policy if exists listings_owner_read on public.listings;
create policy listings_owner_read
on public.listings
for select
using (owner_id = public.auth_uid());

-- RPC to post from vault to wall
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

  -- Validate vault ownership and resolve defaults
  select vi.card_print_id,
         coalesce(condition, vi.condition_tier) as cond_effective,
         case when use_vault_image then vi.image_url else null end as img_effective
    into v_cp, v_cond, v_img
  from public.vault_items vi
  where vi.id = vault_item_id and vi.owner_id = v_uid;

  if v_cp is null then
    raise exception 'vault_item not found or not owned' using errcode = '42501';
  end if;

  v_qty := quantity;
  v_price := price_cents;

  insert into public.listings (
    owner_id, card_print_id, vault_item_id, condition_tier, quantity, price_cents, note,
    visibility, status, image_url
  ) values (
    v_uid, v_cp, vault_item_id, v_cond, v_qty, v_price, note,
    'public', 'active', v_img
  ) returning id into v_listing;

  return v_listing;
end;
$$;

-- Grants: allow only authenticated (not anon) to execute RPC
grant execute on function public.vault_post_to_wall(uuid, integer, integer, text, text, boolean) to authenticated;
