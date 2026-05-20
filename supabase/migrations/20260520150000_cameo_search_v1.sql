-- CAMEO_SEARCH_V1
-- Additive cameo metadata layer.
-- This migration creates storage and a public-safe read view only.
-- It does not seed cameo rows, alter card identity, or touch search resolver logic.

create table if not exists public.card_print_cameos (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  cameo_subject_type text not null,
  cameo_subject_name text not null,
  pokemon_ndex text,
  pokemon_species_id uuid references public.pokemon_species(id) on delete restrict,
  trainer_key text,
  source_name text not null,
  source_url text not null,
  source_tab text not null,
  source_gid text not null,
  source_row_index integer not null,
  source_row_hash text not null,
  card_name_raw text not null,
  set_name_raw text not null,
  number_raw text not null,
  notes_raw text,
  cameo_qualifiers text[] not null default '{}'::text[],
  match_status text not null,
  match_confidence text not null default 'deterministic',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_cameos_subject_type_check
    check (cameo_subject_type in ('pokemon', 'trainer')),
  constraint card_print_cameos_match_status_check
    check (match_status = 'APPROVED_MATCH'),
  constraint card_print_cameos_source_row_index_check
    check (source_row_index > 0),
  constraint card_print_cameos_pokemon_subject_check
    check (
      (cameo_subject_type = 'pokemon' and pokemon_ndex is not null)
      or cameo_subject_type = 'trainer'
    )
);

comment on table public.card_print_cameos is
  'CAMEO_SEARCH_V1 additive relationship table for source-provenanced Pokemon/trainer cameo metadata. This is searchable descriptive metadata, not card identity.';

comment on column public.card_print_cameos.card_print_id is
  'Parent card_print that contains the cameo. Does not affect card_print identity, Species Dex completion, pricing, scanner, or child printing identity.';

comment on column public.card_print_cameos.source_row_hash is
  'Stable hash of the source workbook row used as the idempotency key for governed cameo imports.';

create unique index if not exists card_print_cameos_source_row_hash_key
  on public.card_print_cameos (source_row_hash);

create index if not exists card_print_cameos_card_print_id_idx
  on public.card_print_cameos (card_print_id)
  where active;

create index if not exists card_print_cameos_subject_idx
  on public.card_print_cameos (cameo_subject_type, lower(cameo_subject_name))
  where active;

create index if not exists card_print_cameos_species_id_idx
  on public.card_print_cameos (pokemon_species_id)
  where active and pokemon_species_id is not null;

drop trigger if exists trg_card_print_cameos_updated_at on public.card_print_cameos;
create trigger trg_card_print_cameos_updated_at
before update on public.card_print_cameos
for each row
execute function public.set_timestamp_updated_at();

alter table public.card_print_cameos enable row level security;

revoke all on table public.card_print_cameos from anon;
revoke all on table public.card_print_cameos from authenticated;
grant all on table public.card_print_cameos to service_role;

drop policy if exists card_print_cameos_service_role_all_v1 on public.card_print_cameos;
create policy card_print_cameos_service_role_all_v1
on public.card_print_cameos
for all
to service_role
using (true)
with check (true);

create or replace view public.v_card_print_cameos_public_v1 as
select
  cpc.card_print_id,
  cp.gv_id,
  cp.name as card_name,
  cp.set_code,
  s.name as set_name,
  cp.number,
  cp.number_plain,
  cpc.cameo_subject_type,
  cpc.cameo_subject_name,
  cpc.pokemon_ndex,
  cpc.notes_raw,
  cpc.cameo_qualifiers,
  cpc.source_name
from public.card_print_cameos cpc
join public.card_prints cp
  on cp.id = cpc.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpc.active
  and cp.gv_id is not null;

comment on view public.v_card_print_cameos_public_v1 is
  'CAMEO_SEARCH_V1 public-safe cameo read model. Exposes cameo metadata for parent GV-ID card routes only and hides internal cameo row ids.';

revoke all on table public.v_card_print_cameos_public_v1 from anon;
revoke all on table public.v_card_print_cameos_public_v1 from authenticated;
grant select on table public.v_card_print_cameos_public_v1 to anon, authenticated;
