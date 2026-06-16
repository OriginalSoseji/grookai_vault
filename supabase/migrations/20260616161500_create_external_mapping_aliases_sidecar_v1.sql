-- DRAFT ONLY. Do not run from this report.
create table public.external_mapping_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_card_print_id uuid not null references public.card_prints(id) on delete cascade,
  canonical_external_mapping_id bigint null references public.external_mappings(id) on delete set null,
  source text not null,
  alias_external_id text not null,
  alias_kind text not null,
  alias_status text not null default 'active',
  source_domain text null,
  evidence_reason text not null,
  preserved_from_mapping_id bigint null references public.external_mappings(id) on delete set null,
  created_from_audit text not null,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index external_mapping_aliases_active_source_alias_uidx
  on public.external_mapping_aliases (source, alias_external_id)
  where active = true;

create index external_mapping_aliases_card_print_idx
  on public.external_mapping_aliases (canonical_card_print_id);

create index external_mapping_aliases_mapping_idx
  on public.external_mapping_aliases (canonical_external_mapping_id);

create index external_mapping_aliases_kind_idx
  on public.external_mapping_aliases (alias_kind)
  where active = true;
