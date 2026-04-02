set search_path = public;

create extension if not exists pgcrypto;

create table if not exists public.external_discovery_candidates (
  id uuid primary key default gen_random_uuid(),

  source text not null,
  raw_import_id bigint not null,

  upstream_id text not null,
  tcgplayer_id text null,

  set_id text not null,
  name_raw text not null,
  number_raw text null,

  normalized_name text not null,
  normalized_number_left text null,
  normalized_number_plain text null,
  normalized_printed_total text null,

  has_slash_number boolean not null,
  has_alpha_suffix_number boolean not null,
  has_parenthetical_modifier boolean not null,

  match_status text not null,
  candidate_bucket text not null,

  classifier_version text not null default 'JUSTTCG_CANON_GATE_V1',

  payload jsonb not null,

  created_at timestamptz not null default now()
);

comment on table public.external_discovery_candidates is
'Non-canonical staging layer for external discovery candidates that already passed source-specific canon-gate classification.';

comment on column public.external_discovery_candidates.raw_import_id is
'Provenance pointer back to public.raw_imports. External staging never drops the originating raw receipt.';

comment on column public.external_discovery_candidates.candidate_bucket is
'Locked to CLEAN_CANON_CANDIDATE in V1 so staging only accepts numerically clean unmatched candidates after canon gate.';

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'external_discovery_candidates'
      and constraint_name = 'external_discovery_candidates_raw_import_id_fkey'
  ) then
    alter table public.external_discovery_candidates
      add constraint external_discovery_candidates_raw_import_id_fkey
      foreign key (raw_import_id)
      references public.raw_imports(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'external_discovery_candidates'
      and constraint_name = 'external_discovery_candidates_match_status_check'
  ) then
    alter table public.external_discovery_candidates
      add constraint external_discovery_candidates_match_status_check
      check (match_status in ('UNMATCHED'));
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'external_discovery_candidates'
      and constraint_name = 'external_discovery_candidates_candidate_bucket_check'
  ) then
    alter table public.external_discovery_candidates
      add constraint external_discovery_candidates_candidate_bucket_check
      check (candidate_bucket in ('CLEAN_CANON_CANDIDATE'));
  end if;
end $$;

create index if not exists idx_ext_disc_source
  on public.external_discovery_candidates (source);

create index if not exists idx_ext_disc_set
  on public.external_discovery_candidates (set_id);

create index if not exists idx_ext_disc_bucket
  on public.external_discovery_candidates (candidate_bucket);

create index if not exists idx_ext_disc_number_plain
  on public.external_discovery_candidates (normalized_number_plain);

create index if not exists idx_ext_disc_raw_import
  on public.external_discovery_candidates (raw_import_id);

create unique index if not exists ux_ext_disc_unique
  on public.external_discovery_candidates (source, upstream_id, raw_import_id);

alter table public.external_discovery_candidates enable row level security;

revoke all on table public.external_discovery_candidates from public, anon, authenticated;

drop policy if exists service_role_only on public.external_discovery_candidates;
create policy service_role_only
on public.external_discovery_candidates
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
