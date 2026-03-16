begin;

create table public.vault_item_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gv_vi_id text null unique,
  card_print_id uuid null references public.card_prints(id),
  slab_cert_id uuid null references public.slab_certs(id),
  legacy_vault_item_id uuid null references public.vault_items(id),
  acquisition_cost numeric null,
  condition_label text null,
  condition_score integer null,
  is_graded boolean not null default false,
  grade_company text null,
  grade_value text null,
  grade_label text null,
  notes text null,
  name text null,
  set_name text null,
  photo_url text null,
  market_price numeric null,
  last_price_update timestamptz null,
  image_source text null,
  image_url text null,
  image_back_source text null,
  image_back_url text null,
  created_at timestamptz not null default now(),
  archived_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint vault_item_instances_identity_anchor_exactly_one
    check (((card_print_id is not null)::integer + (slab_cert_id is not null)::integer) = 1),
  constraint vault_item_instances_gv_vi_id_normalized
    check (gv_vi_id is null or (btrim(gv_vi_id) <> '' and gv_vi_id = upper(btrim(gv_vi_id)))),
  constraint vault_item_instances_market_price_nonnegative
    check (market_price is null or market_price >= 0),
  constraint vault_item_instances_acquisition_cost_nonnegative
    check (acquisition_cost is null or acquisition_cost >= 0),
  constraint vault_item_instances_image_source_check
    check (image_source is null or image_source = any (array['user_photo'::text, 'official'::text, 'identity'::text])),
  constraint vault_item_instances_image_back_source_check
    check (image_back_source is null or image_back_source = any (array['user_photo'::text, 'official'::text, 'identity'::text])),
  constraint vault_item_instances_slab_rows_are_graded
    check (slab_cert_id is null or is_graded = true)
);

comment on table public.vault_item_instances is
'Shadow owned-instance lane. One row per owned object. Parallel to legacy bucketed vault_items; no backfill or GVVI allocation yet.';

create index vault_item_instances_user_id_idx
  on public.vault_item_instances (user_id);

create index vault_item_instances_card_print_id_idx
  on public.vault_item_instances (card_print_id);

create index vault_item_instances_slab_cert_id_idx
  on public.vault_item_instances (slab_cert_id);

create index vault_item_instances_legacy_vault_item_id_idx
  on public.vault_item_instances (legacy_vault_item_id);

create index vault_item_instances_archived_at_idx
  on public.vault_item_instances (archived_at);

create index vault_item_instances_user_archived_at_idx
  on public.vault_item_instances (user_id, archived_at);

create index vault_item_instances_active_user_created_idx
  on public.vault_item_instances (user_id, created_at desc)
  where archived_at is null;

create trigger trg_vault_item_instances_updated_at
before update on public.vault_item_instances
for each row
execute function public.set_timestamp_updated_at();

alter table public.vault_item_instances enable row level security;

drop policy if exists service_role_only on public.vault_item_instances;

create policy service_role_only
on public.vault_item_instances
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

commit;
