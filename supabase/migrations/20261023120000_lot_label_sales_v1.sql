begin;

-- LOT_LABEL_SALES_V1
-- A lot label identifies a sale bucket. It is deliberately separate from
-- exact card/GVVI ownership and can be reconciled later.
create table if not exists public.lot_label_lots (
  public_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint lot_label_lots_slug_check check (
    slug = btrim(slug)
    and char_length(slug) between 1 and 80
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint lot_label_lots_name_check check (
    name = btrim(name)
    and char_length(name) between 1 and 120
  ),
  constraint lot_label_lots_owner_slug_key unique (owner_user_id, slug)
);

create table if not exists public.lot_label_sales (
  id uuid primary key default gen_random_uuid(),
  lot_public_id uuid not null references public.lot_label_lots(public_id) on delete restrict,
  recorded_by_user_id uuid not null references auth.users(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  condition_label text not null default 'NM' check (condition_label in ('NM', 'LP', 'MP', 'HP', 'DMG')),
  quantity integer not null default 1 check (quantity between 1 and 999),
  sold_at timestamptz not null default now(),
  notes text null
);

create index if not exists lot_label_sales_lot_date_idx
  on public.lot_label_sales (lot_public_id, sold_at desc);

alter table public.lot_label_lots enable row level security;
alter table public.lot_label_sales enable row level security;

drop policy if exists lot_label_lots_owner_read on public.lot_label_lots;
create policy lot_label_lots_owner_read on public.lot_label_lots
  for select to authenticated
  using (owner_user_id = auth.uid());

drop policy if exists lot_label_lots_owner_insert on public.lot_label_lots;
create policy lot_label_lots_owner_insert on public.lot_label_lots
  for insert to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists lot_label_sales_owner_read on public.lot_label_sales;
create policy lot_label_sales_owner_read on public.lot_label_sales
  for select to authenticated
  using (
    exists (
      select 1 from public.lot_label_lots lots
      where lots.public_id = lot_label_sales.lot_public_id
        and lots.owner_user_id = auth.uid()
    )
  );

create or replace function public.lot_label_public_read_v1(p_public_id uuid)
returns table (
  public_id uuid,
  name text,
  slug text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select lots.public_id, lots.name, lots.slug, lots.created_at
  from public.lot_label_lots lots
  where lots.public_id = p_public_id;
$$;

create or replace function public.lot_label_record_sale_v1(
  p_public_id uuid,
  p_amount_cents integer,
  p_condition_label text default 'NM',
  p_quantity integer default 1,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
begin
  if auth.uid() is null then
    raise exception 'lot_label_auth_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.lot_label_lots
    where public_id = p_public_id and owner_user_id = auth.uid()
  ) then
    raise exception 'lot_label_not_owned' using errcode = '42501';
  end if;
  insert into public.lot_label_sales (
    lot_public_id, recorded_by_user_id, amount_cents, condition_label, quantity, notes
  ) values (
    p_public_id, auth.uid(), p_amount_cents, upper(coalesce(p_condition_label, 'NM')),
    coalesce(p_quantity, 1), nullif(btrim(p_notes), '')
  ) returning id into v_sale_id;
  return v_sale_id;
end;
$$;

revoke all on function public.lot_label_public_read_v1(uuid) from public;
grant execute on function public.lot_label_public_read_v1(uuid) to anon, authenticated;
revoke all on function public.lot_label_record_sale_v1(uuid, integer, text, integer, text) from public;
grant execute on function public.lot_label_record_sale_v1(uuid, integer, text, integer, text) to authenticated;

grant select, insert on public.lot_label_lots to authenticated;
grant select on public.lot_label_sales to authenticated;

commit;
