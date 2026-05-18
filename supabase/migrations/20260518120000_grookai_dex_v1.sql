begin;

-- GROOKAI_DEX_V1
-- Canonical species catalogue and card-print membership for Pokemon progress.

create table if not exists public.pokemon_species (
  id uuid primary key default gen_random_uuid(),
  national_dex_number integer not null,
  canonical_name text not null,
  display_name text not null,
  slug text not null,
  generation integer,
  types text[] not null default '{}'::text[],
  is_form boolean not null default false,
  base_species_id uuid references public.pokemon_species(id),
  active boolean not null default true,
  source text not null default 'grookai_dex_seed_v1',
  source_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pokemon_species_national_dex_positive check (national_dex_number > 0),
  constraint pokemon_species_canonical_name_nonempty check (btrim(canonical_name) <> ''),
  constraint pokemon_species_display_name_nonempty check (btrim(display_name) <> ''),
  constraint pokemon_species_slug_nonempty check (btrim(slug) <> ''),
  constraint pokemon_species_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint pokemon_species_generation_positive check (generation is null or generation > 0),
  constraint pokemon_species_form_base_check check (
    (is_form = false and base_species_id is null)
    or (is_form = true and base_species_id is not null)
  )
);

comment on table public.pokemon_species is
'Grookai Dex V1 Pokemon species catalogue. This is the durable Dex index and must not be inferred from card names at request time.';

comment on column public.pokemon_species.slug is
'Stable route slug for /dex/[speciesSlug].';

create unique index if not exists pokemon_species_slug_unique_idx
  on public.pokemon_species (slug);

create unique index if not exists pokemon_species_national_dex_base_unique_idx
  on public.pokemon_species (national_dex_number)
  where is_form = false;

create index if not exists pokemon_species_active_dex_idx
  on public.pokemon_species (active, national_dex_number);

drop trigger if exists trg_pokemon_species_updated_at on public.pokemon_species;

create trigger trg_pokemon_species_updated_at
before update on public.pokemon_species
for each row
execute function public.set_timestamp_updated_at();

create table if not exists public.card_print_species (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  species_id uuid not null references public.pokemon_species(id) on delete cascade,
  role text not null,
  counts_for_completion boolean not null default true,
  source text not null,
  confidence numeric,
  evidence jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_print_species_role_check check (
    role in (
      'primary',
      'tag_team',
      'multi_subject',
      'trainer_owned',
      'form_subject',
      'cameo',
      'manual_override'
    )
  ),
  constraint card_print_species_source_nonempty check (btrim(source) <> ''),
  constraint card_print_species_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.card_print_species is
'Explicit Grookai Dex V1 membership between card_prints and Pokemon species. Completion must use this table, not live substring matching.';

comment on column public.card_print_species.counts_for_completion is
'Only active rows with counts_for_completion=true contribute to Grookai Dex denominators.';

create unique index if not exists card_print_species_active_unique_idx
  on public.card_print_species (card_print_id, species_id, role)
  where active = true;

create index if not exists card_print_species_species_completion_idx
  on public.card_print_species (species_id, active, counts_for_completion);

create index if not exists card_print_species_card_print_idx
  on public.card_print_species (card_print_id);

drop trigger if exists trg_card_print_species_updated_at on public.card_print_species;

create trigger trg_card_print_species_updated_at
before update on public.card_print_species
for each row
execute function public.set_timestamp_updated_at();

create or replace view public.v_grookai_dex_species_v1
with (security_invoker = true)
as
select
  ps.id as species_id,
  ps.national_dex_number,
  ps.canonical_name,
  ps.display_name,
  ps.slug,
  ps.generation,
  ps.types,
  ps.is_form,
  ps.base_species_id,
  ps.active,
  count(distinct cps.card_print_id) filter (
    where cps.active = true
      and cps.counts_for_completion = true
  )::integer as total_print_count
from public.pokemon_species ps
left join public.card_print_species cps
  on cps.species_id = ps.id
group by
  ps.id,
  ps.national_dex_number,
  ps.canonical_name,
  ps.display_name,
  ps.slug,
  ps.generation,
  ps.types,
  ps.is_form,
  ps.base_species_id,
  ps.active;

comment on view public.v_grookai_dex_species_v1 is
'App-facing Grookai Dex species index with denominator count. User progress is added by authenticated server helpers.';

create or replace view public.v_grookai_dex_card_prints_v1
with (security_invoker = true)
as
select
  ps.id as species_id,
  ps.slug as species_slug,
  ps.display_name as species_display_name,
  ps.national_dex_number,
  cps.card_print_id,
  cp.gv_id,
  cp.name,
  cp.set_id,
  cp.set_code,
  s.name as set_name,
  cp.number,
  cp.number_plain,
  cp.rarity,
  cp.variant_key,
  cp.image_url,
  cp.image_alt_url,
  cp.image_source,
  cp.image_path,
  cp.representative_image_url,
  cps.role,
  cps.counts_for_completion,
  cps.source,
  cps.confidence,
  cps.evidence,
  cps.active as mapping_active
from public.card_print_species cps
join public.pokemon_species ps
  on ps.id = cps.species_id
join public.card_prints cp
  on cp.id = cps.card_print_id
left join public.sets s
  on s.id = cp.set_id;

comment on view public.v_grookai_dex_card_prints_v1 is
'App-facing Grookai Dex species-to-card-print read model. Ownership state is added by authenticated server helpers.';

alter table public.pokemon_species enable row level security;
alter table public.card_print_species enable row level security;

revoke all on table public.pokemon_species from anon;
revoke all on table public.pokemon_species from authenticated;
grant select on table public.pokemon_species to anon, authenticated;
grant all on table public.pokemon_species to service_role;

revoke all on table public.card_print_species from anon;
revoke all on table public.card_print_species from authenticated;
grant select on table public.card_print_species to anon, authenticated;
grant all on table public.card_print_species to service_role;

grant select on table public.v_grookai_dex_species_v1 to anon, authenticated;
grant select on table public.v_grookai_dex_card_prints_v1 to anon, authenticated;

drop policy if exists pokemon_species_public_select_v1 on public.pokemon_species;
drop policy if exists pokemon_species_service_role_all_v1 on public.pokemon_species;
drop policy if exists card_print_species_public_select_v1 on public.card_print_species;
drop policy if exists card_print_species_service_role_all_v1 on public.card_print_species;

create policy pokemon_species_public_select_v1
on public.pokemon_species
for select
to anon, authenticated
using (active = true);

create policy pokemon_species_service_role_all_v1
on public.pokemon_species
for all
to service_role
using (true)
with check (true);

create policy card_print_species_public_select_v1
on public.card_print_species
for select
to anon, authenticated
using (
  active = true
  and exists (
    select 1
    from public.pokemon_species ps
    where ps.id = card_print_species.species_id
      and ps.active = true
  )
);

create policy card_print_species_service_role_all_v1
on public.card_print_species
for all
to service_role
using (true)
with check (true);

commit;
