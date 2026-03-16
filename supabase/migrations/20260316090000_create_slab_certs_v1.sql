create or replace function public.normalize_slab_grader_v1(input text)
returns text
language sql
immutable
as $$
  select case
    when input is null then null::text
    when btrim(input) = '' then null::text
    else upper(btrim(input))
  end;
$$;

create or replace function public.normalize_slab_cert_number_v1(input text)
returns text
language sql
immutable
as $$
  select case
    when input is null then null::text
    when btrim(input) = '' then null::text
    else nullif(replace(regexp_replace(btrim(input), '\s+', '', 'g'), '-', ''), '')
  end;
$$;

create or replace function public.generate_gv_slab_id(grader text, cert_number text)
returns text
language sql
immutable
as $$
  with normalized as (
    select
      public.normalize_slab_grader_v1(grader) as normalized_grader,
      public.normalize_slab_cert_number_v1(cert_number) as normalized_cert_number
  )
  select case
    when normalized.normalized_grader is null
      or normalized.normalized_cert_number is null
      then null::text
    else 'GV-SLAB-' || normalized.normalized_grader || '-' || normalized.normalized_cert_number
  end
  from normalized;
$$;

create table public.slab_certs (
  id uuid primary key default gen_random_uuid(),
  gv_slab_id text generated always as (public.generate_gv_slab_id(grader, cert_number)) stored,
  grader text not null,
  cert_number text not null,
  normalized_grader text generated always as (public.normalize_slab_grader_v1(grader)) stored,
  normalized_cert_number text generated always as (public.normalize_slab_cert_number_v1(cert_number)) stored,
  card_print_id uuid not null references public.card_prints(id),
  grade numeric not null,
  qualifiers text[] null,
  subgrades jsonb null,
  label_variant text null,
  label_metadata jsonb null,
  first_seen_at timestamptz null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slab_certs_grader_not_blank check (btrim(grader) <> ''),
  constraint slab_certs_cert_number_not_blank check (btrim(cert_number) <> ''),
  constraint slab_certs_normalized_grader_present check (normalized_grader is not null and normalized_grader <> ''),
  constraint slab_certs_normalized_cert_number_present check (normalized_cert_number is not null and normalized_cert_number <> ''),
  constraint slab_certs_gv_slab_id_present check (gv_slab_id is not null and gv_slab_id <> ''),
  constraint slab_certs_gv_slab_id_key unique (gv_slab_id),
  constraint slab_certs_identity_key unique (normalized_grader, normalized_cert_number)
);

create index slab_certs_card_print_id_idx
  on public.slab_certs (card_print_id);

create index slab_certs_normalized_grader_grade_idx
  on public.slab_certs (normalized_grader, grade);

create index slab_certs_last_seen_at_idx
  on public.slab_certs (last_seen_at);

create trigger trg_slab_certs_updated_at
before update on public.slab_certs
for each row
execute function public.set_timestamp_updated_at();
