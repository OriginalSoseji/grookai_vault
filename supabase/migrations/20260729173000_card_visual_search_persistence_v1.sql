begin;

create table if not exists public.card_visual_search_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null,
  release_version text not null,
  projection_version text not null,
  eligibility_version text not null,
  grouping_version text not null,
  producing_commit_sha text not null,
  source_release_manifest_sha256 text not null,
  source_projection_sha256 text not null,
  status text not null default 'staged',
  row_counts jsonb not null default '{}'::jsonb,
  artifact_hashes jsonb not null default '{}'::jsonb,
  validation_summary jsonb not null default '{}'::jsonb,
  loaded_at timestamptz null,
  validated_at timestamptz null,
  retired_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_visual_search_releases_key_unique unique (release_key),
  constraint card_visual_search_releases_key_nonempty_check
    check (btrim(release_key) <> ''),
  constraint card_visual_search_releases_status_check
    check (status = any (array['staged'::text, 'loaded'::text, 'validated'::text, 'active'::text, 'retired'::text, 'failed'::text])),
  constraint card_visual_search_releases_sha_check
    check (
      producing_commit_sha ~ '^[0-9a-f]{40}$'
      and source_release_manifest_sha256 ~ '^[0-9a-f]{64}$'
      and source_projection_sha256 ~ '^[0-9a-f]{64}$'
    ),
  constraint card_visual_search_releases_json_check
    check (
      jsonb_typeof(row_counts) = 'object'
      and jsonb_typeof(artifact_hashes) = 'object'
      and jsonb_typeof(validation_summary) = 'object'
    )
);

comment on table public.card_visual_search_releases is
'Private immutable release ledger for derived Card Visual Search projections. A row is not searchable until separately validated and selected by the active-release pointer.';

drop trigger if exists trg_card_visual_search_releases_updated_at
on public.card_visual_search_releases;
create trigger trg_card_visual_search_releases_updated_at
before update on public.card_visual_search_releases
for each row execute function public.set_timestamp_updated_at();

create table if not exists public.card_visual_search_artworks (
  release_id uuid not null references public.card_visual_search_releases(id) on delete restrict,
  artwork_group_id text not null,
  artwork_group_hash text not null,
  representative_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  source_description_id uuid null references public.card_print_visual_descriptions(id) on delete set null,
  source_fact_graph_sha256 text not null,
  source_generated_row_sha256 text not null,
  source_image_sha256 text not null,
  image_confidence numeric not null,
  eligibility_tier text not null,
  review_status text not null,
  included_projection_types text[] not null default '{}'::text[],
  projection_guard_keys text[] not null default '{}'::text[],
  prompt_branch text not null,
  exclusion_count integer not null default 0,
  artwork_projection_hash text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, artwork_group_id),
  constraint card_visual_search_artworks_release_hash_unique
    unique (release_id, artwork_group_hash),
  constraint card_visual_search_artworks_sha_check
    check (
      artwork_group_hash ~ '^[0-9a-f]{64}$'
      and source_fact_graph_sha256 ~ '^[0-9a-f]{64}$'
      and source_generated_row_sha256 ~ '^[0-9a-f]{64}$'
      and source_image_sha256 ~ '^[0-9a-f]{64}$'
      and artwork_projection_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint card_visual_search_artworks_confidence_check
    check (image_confidence between 0 and 1),
  constraint card_visual_search_artworks_tier_check
    check (eligibility_tier = any (array['A'::text, 'B'::text])),
  constraint card_visual_search_artworks_review_check
    check (review_status = any (array['pending'::text, 'needs_review'::text, 'approved'::text])),
  constraint card_visual_search_artworks_exclusion_count_check
    check (exclusion_count >= 0)
);

comment on table public.card_visual_search_artworks is
'Release-scoped derived artwork identities. These group shared artwork facts and never redefine canonical card_print identity.';

create index if not exists card_visual_search_artworks_representative_idx
  on public.card_visual_search_artworks (release_id, representative_card_print_id);

create index if not exists card_visual_search_artworks_branch_idx
  on public.card_visual_search_artworks (release_id, prompt_branch, eligibility_tier);

create table if not exists public.card_visual_search_printings (
  release_id uuid not null,
  artwork_group_id text not null,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  gv_id_snapshot text not null,
  name_snapshot text not null,
  set_code_snapshot text null,
  number_snapshot text null,
  artwork_fact_source text not null,
  variant_image_status text not null,
  print_marker_evidence_status text not null,
  image_confidence numeric not null,
  grouping_authority text not null,
  grouping_evidence jsonb not null default '{}'::jsonb,
  source_image_sha256 text not null,
  source_fact_graph_sha256 text not null,
  source_eligibility_decision_sha256 text not null,
  canonical_snapshot_hash text not null,
  printing_projection_hash text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, card_print_id),
  foreign key (release_id, artwork_group_id)
    references public.card_visual_search_artworks(release_id, artwork_group_id)
    on delete restrict,
  constraint card_visual_search_printings_sha_check
    check (
      source_image_sha256 ~ '^[0-9a-f]{64}$'
      and source_fact_graph_sha256 ~ '^[0-9a-f]{64}$'
      and source_eligibility_decision_sha256 ~ '^[0-9a-f]{64}$'
      and canonical_snapshot_hash ~ '^[0-9a-f]{64}$'
      and printing_projection_hash ~ '^[0-9a-f]{64}$'
    ),
  constraint card_visual_search_printings_confidence_check
    check (image_confidence between 0 and 1),
  constraint card_visual_search_printings_grouping_evidence_check
    check (jsonb_typeof(grouping_evidence) = 'object')
);

comment on table public.card_visual_search_printings is
'Release-scoped expansion from one artwork group to canonical card_prints. Snapshot labels are provenance only; card_prints remains identity authority.';

create index if not exists card_visual_search_printings_group_idx
  on public.card_visual_search_printings (release_id, artwork_group_id, card_print_id);

create table if not exists public.card_visual_search_documents (
  release_id uuid not null,
  search_document_id text not null,
  artwork_group_id text not null,
  artwork_group_hash text not null,
  representative_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  document_type text not null,
  projection_status text not null,
  canonical_context jsonb not null default '{}'::jsonb,
  eligibility_tier text not null,
  rank_adjustment_key text not null,
  projection_guard_keys text[] not null default '{}'::text[],
  document_text text not null,
  normalized_lexical_terms text[] not null default '{}'::text[],
  structured_concepts jsonb not null default '[]'::jsonb,
  subject_role_keys text[] not null default '{}'::text[],
  observation_ids text[] not null default '{}'::text[],
  typed_fact_ids text[] not null default '{}'::text[],
  semantic_fact_ids text[] not null default '{}'::text[],
  source_entry_hashes text[] not null default '{}'::text[],
  exclusion_hashes text[] not null default '{}'::text[],
  evidence_confidence_summary jsonb not null default '{}'::jsonb,
  source_fact_graph_sha256 text not null,
  source_generated_row_sha256 text not null,
  document_hash text not null,
  search_vector tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  primary key (release_id, search_document_id),
  foreign key (release_id, artwork_group_id)
    references public.card_visual_search_artworks(release_id, artwork_group_id)
    on delete restrict,
  constraint card_visual_search_documents_group_type_unique
    unique (release_id, artwork_group_id, document_type),
  constraint card_visual_search_documents_type_check
    check (document_type = any (array['subject'::text, 'scene'::text, 'style_composition'::text, 'representation_cameo'::text])),
  constraint card_visual_search_documents_status_check
    check (projection_status = 'complete'),
  constraint card_visual_search_documents_tier_check
    check (eligibility_tier = any (array['A'::text, 'B'::text])),
  constraint card_visual_search_documents_json_check
    check (
      jsonb_typeof(canonical_context) = 'object'
      and jsonb_typeof(structured_concepts) = 'array'
      and jsonb_typeof(evidence_confidence_summary) = 'object'
    ),
  constraint card_visual_search_documents_sha_check
    check (
      artwork_group_hash ~ '^[0-9a-f]{64}$'
      and source_fact_graph_sha256 ~ '^[0-9a-f]{64}$'
      and source_generated_row_sha256 ~ '^[0-9a-f]{64}$'
      and document_hash ~ '^[0-9a-f]{64}$'
    )
);

comment on table public.card_visual_search_documents is
'Evidence-backed, release-scoped subject, scene, style/composition, and isolated representation/cameo documents used by the governed structured/lexical ranker.';

create or replace function public.set_card_visual_search_document_vector_v1()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  new.search_vector := to_tsvector(
    'simple'::regconfig,
    extensions.unaccent(
      coalesce(new.document_text, '')
      || ' '
      || coalesce(array_to_string(new.normalized_lexical_terms, ' '), '')
    )
  );
  return new;
end;
$$;

revoke all on function public.set_card_visual_search_document_vector_v1() from public, anon, authenticated;

create trigger trg_card_visual_search_documents_vector
before insert or update of document_text, normalized_lexical_terms
on public.card_visual_search_documents
for each row execute function public.set_card_visual_search_document_vector_v1();

create index if not exists card_visual_search_documents_vector_idx
  on public.card_visual_search_documents using gin (search_vector);

create index if not exists card_visual_search_documents_group_idx
  on public.card_visual_search_documents (release_id, artwork_group_id, document_type);

create index if not exists card_visual_search_documents_roles_idx
  on public.card_visual_search_documents using gin (subject_role_keys);

create table if not exists public.card_visual_search_evidence (
  release_id uuid not null,
  search_document_id text not null,
  artwork_group_id text not null,
  entry_hash text not null,
  source_type text not null,
  source_id text not null,
  term text not null,
  normalized_term text not null,
  module text null,
  field_path text null,
  category text null,
  subject_role text null,
  appearance_role text null,
  evidence_authority text not null default 'observation_backed',
  governance_status text not null default 'search_eligible',
  supporting_observation_ids text[] not null default '{}'::text[],
  supporting_external_evidence_ids text[] not null default '{}'::text[],
  observation_kinds text[] not null default '{}'::text[],
  confidence numeric null,
  evidence_strength text null,
  details jsonb not null default '{}'::jsonb,
  document_type text not null,
  created_at timestamptz not null default now(),
  primary key (release_id, search_document_id, entry_hash),
  foreign key (release_id, search_document_id)
    references public.card_visual_search_documents(release_id, search_document_id)
    on delete restrict,
  foreign key (release_id, artwork_group_id)
    references public.card_visual_search_artworks(release_id, artwork_group_id)
    on delete restrict,
  constraint card_visual_search_evidence_entry_hash_check
    check (entry_hash ~ '^[0-9a-f]{64}$'),
  constraint card_visual_search_evidence_confidence_check
    check (confidence is null or confidence between 0 and 1),
  constraint card_visual_search_evidence_details_check
    check (jsonb_typeof(details) = 'object'),
  constraint card_visual_search_evidence_appearance_role_check
    check (
      appearance_role is null
      or appearance_role = any (array[
        'scene_subject'::text,
        'depicted_subject'::text,
        'character_representation'::text,
        'curated_association_unresolved'::text,
        'visual_resemblance_reference'::text
      ])
    ),
  constraint card_visual_search_evidence_authority_check
    check (evidence_authority = any (array[
      'observation_backed'::text,
      'human_image_confirmed'::text,
      'external_role_confirmed'::text,
      'approved_role_unresolved'::text,
      'external_exact_candidate'::text
    ])),
  constraint card_visual_search_evidence_governance_check
    check (governance_status = any (array['search_eligible'::text, 'review_only'::text, 'rejected'::text])),
  constraint card_visual_search_evidence_document_type_check
    check (document_type = any (array['subject'::text, 'scene'::text, 'style_composition'::text, 'representation_cameo'::text])),
  constraint card_visual_search_evidence_reference_check
    check (
      cardinality(supporting_observation_ids) > 0
      or cardinality(supporting_external_evidence_ids) > 0
    )
);

comment on table public.card_visual_search_evidence is
'Atomic evidence rows retained for explainable visual-search matches. Every search-facing term remains traceable to image observations or governed external evidence, with appearance role and authority preserved.';

create index if not exists card_visual_search_evidence_term_trgm_idx
  on public.card_visual_search_evidence
  using gin (normalized_term extensions.gin_trgm_ops);

create index if not exists card_visual_search_evidence_taxonomy_idx
  on public.card_visual_search_evidence
  (release_id, module, category, subject_role);

create index if not exists card_visual_search_evidence_observations_idx
  on public.card_visual_search_evidence
  using gin (supporting_observation_ids);

create table if not exists public.card_visual_search_evidence_suppressions (
  release_id uuid not null,
  suppression_id text not null,
  artwork_group_id text not null,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  source_image_sha256 text not null,
  target_observation_ids text[] not null default '{}'::text[],
  target_source_ids text[] not null default '{}'::text[],
  authority text not null,
  decision text not null,
  reviewed_at date not null,
  reviewed_by text not null,
  rationale text not null,
  replacement_authorized boolean not null default false,
  suppression_hash text not null,
  matched_document_entries integer not null,
  matched_evidence_entries integer not null,
  created_at timestamptz not null default now(),
  primary key (release_id, suppression_id),
  foreign key (release_id, artwork_group_id)
    references public.card_visual_search_artworks(release_id, artwork_group_id)
    on delete restrict,
  constraint card_visual_search_evidence_suppressions_authority_check
    check (authority = 'founder_image_review'),
  constraint card_visual_search_evidence_suppressions_decision_check
    check (decision = 'unsupported_visual_evidence'),
  constraint card_visual_search_evidence_suppressions_target_check
    check (
      cardinality(target_observation_ids) > 0
      or cardinality(target_source_ids) > 0
    ),
  constraint card_visual_search_evidence_suppressions_image_hash_check
    check (source_image_sha256 ~ '^[0-9a-f]{64}$'),
  constraint card_visual_search_evidence_suppressions_hash_check
    check (suppression_hash ~ '^[0-9a-f]{64}$'),
  constraint card_visual_search_evidence_suppressions_replacement_check
    check (not replacement_authorized),
  constraint card_visual_search_evidence_suppressions_match_check
    check (matched_document_entries > 0 and matched_evidence_entries > 0)
);

comment on table public.card_visual_search_evidence_suppressions is
'Immutable release-scoped founder-confirmed negative evidence. It suppresses exact source observations and their derived claims without mutating the paid Fact Graph.';

create index if not exists card_visual_search_evidence_suppressions_group_idx
  on public.card_visual_search_evidence_suppressions
  (release_id, artwork_group_id);

create table if not exists public.card_visual_search_index_entries (
  release_id uuid not null,
  index_kind text not null,
  index_key text not null,
  artwork_group_id text not null,
  search_document_id text null,
  created_at timestamptz not null default now(),
  primary key (release_id, index_kind, index_key, artwork_group_id),
  foreign key (release_id, artwork_group_id)
    references public.card_visual_search_artworks(release_id, artwork_group_id)
    on delete restrict,
  foreign key (release_id, search_document_id)
    references public.card_visual_search_documents(release_id, search_document_id)
    on delete restrict,
  constraint card_visual_search_index_entries_kind_check
    check (index_kind = any (array['subject'::text, 'set'::text, 'branch'::text, 'role'::text, 'exact_term'::text, 'token'::text])),
  constraint card_visual_search_index_entries_key_nonempty_check
    check (btrim(index_key) <> '')
);

comment on table public.card_visual_search_index_entries is
'Compact deterministic candidate-index entries derived from the same parser/ranker vocabulary as the bootstrap index.';

create index if not exists card_visual_search_index_entries_group_idx
  on public.card_visual_search_index_entries
  (release_id, artwork_group_id, index_kind);

create index if not exists card_visual_search_index_entries_key_trgm_idx
  on public.card_visual_search_index_entries
  using gin (index_key extensions.gin_trgm_ops);

create or replace function public.guard_card_visual_search_release_rows_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_release_id uuid;
  target_status text;
begin
  if tg_op = 'UPDATE' and old.release_id <> new.release_id then
    raise exception 'visual search release_id is immutable';
  end if;
  target_release_id := case when tg_op = 'DELETE' then old.release_id else new.release_id end;
  select status
  into target_status
  from public.card_visual_search_releases
  where id = target_release_id;

  if target_status is null then
    raise exception 'visual search release not found';
  end if;
  if target_status not in ('staged', 'loaded') then
    raise exception 'visual search release rows are immutable after validation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.guard_card_visual_search_release_rows_v1()
  from public, anon, authenticated;

drop trigger if exists trg_card_visual_search_artworks_release_guard
on public.card_visual_search_artworks;
create trigger trg_card_visual_search_artworks_release_guard
before insert or update or delete on public.card_visual_search_artworks
for each row execute function public.guard_card_visual_search_release_rows_v1();

drop trigger if exists trg_card_visual_search_printings_release_guard
on public.card_visual_search_printings;
create trigger trg_card_visual_search_printings_release_guard
before insert or update or delete on public.card_visual_search_printings
for each row execute function public.guard_card_visual_search_release_rows_v1();

drop trigger if exists trg_card_visual_search_documents_release_guard
on public.card_visual_search_documents;
create trigger trg_card_visual_search_documents_release_guard
before insert or update or delete on public.card_visual_search_documents
for each row execute function public.guard_card_visual_search_release_rows_v1();

drop trigger if exists trg_card_visual_search_evidence_release_guard
on public.card_visual_search_evidence;
create trigger trg_card_visual_search_evidence_release_guard
before insert or update or delete on public.card_visual_search_evidence
for each row execute function public.guard_card_visual_search_release_rows_v1();

drop trigger if exists trg_card_visual_search_evidence_suppressions_release_guard
on public.card_visual_search_evidence_suppressions;
create trigger trg_card_visual_search_evidence_suppressions_release_guard
before insert or update or delete on public.card_visual_search_evidence_suppressions
for each row execute function public.guard_card_visual_search_release_rows_v1();

drop trigger if exists trg_card_visual_search_index_entries_release_guard
on public.card_visual_search_index_entries;
create trigger trg_card_visual_search_index_entries_release_guard
before insert or update or delete on public.card_visual_search_index_entries
for each row execute function public.guard_card_visual_search_release_rows_v1();

create table if not exists public.card_visual_search_active_release (
  singleton boolean primary key default true,
  release_id uuid not null unique references public.card_visual_search_releases(id) on delete restrict,
  activated_at timestamptz not null default now(),
  activated_by uuid null references auth.users(id) on delete set null,
  activation_evidence jsonb not null default '{}'::jsonb,
  constraint card_visual_search_active_release_singleton_check
    check (singleton),
  constraint card_visual_search_active_release_evidence_check
    check (jsonb_typeof(activation_evidence) = 'object')
);

comment on table public.card_visual_search_active_release is
'Private singleton pointer. The migration creates no row; release activation requires a later explicit governed write gate.';

create table if not exists public.card_visual_external_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  homepage_url text not null,
  acquisition_mode text not null,
  permission_status text not null,
  current_allowed_uses text[] not null default '{}'::text[],
  authority_ceiling text not null,
  network_acquisition_enabled boolean not null default false,
  snapshot_import_enabled boolean not null default false,
  rights_evidence jsonb not null default '{}'::jsonb,
  terms_snapshot_sha256 text null,
  permission_reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_visual_external_sources_key_check
    check (source_key ~ '^[a-z0-9_]+$'),
  constraint card_visual_external_sources_acquisition_check
    check (acquisition_mode = any (array[
      'operator_supplied_snapshot'::text,
      'manual_research_only'::text,
      'partnership_export_required'::text,
      'approved_export'::text,
      'approved_api'::text
    ])),
  constraint card_visual_external_sources_permission_check
    check (permission_status = any (array[
      'unknown_requires_written_permission'::text,
      'existing_snapshot_only'::text,
      'no_data_import_authority'::text,
      'written_permission'::text,
      'licensed'::text,
      'public_api_terms_reviewed'::text,
      'prohibited'::text
    ])),
  constraint card_visual_external_sources_uses_check
    check (
      current_allowed_uses <@ array[
        'candidate_snapshot_import'::text,
        'query_demand_research'::text,
        'controlled_vocabulary_research'::text,
        'product_behavior_research'::text,
        'card_level_candidate_import'::text,
        'panorama_relationship_candidate_import'::text
      ]
    ),
  constraint card_visual_external_sources_authority_check
    check (authority_ceiling = any (array[
      'vocabulary_only'::text,
      'candidate_only'::text,
      'external_role_confirmed_candidate'::text
    ])),
  constraint card_visual_external_sources_hash_check
    check (
      terms_snapshot_sha256 is null
      or terms_snapshot_sha256 ~ '^[0-9a-f]{64}$'
    ),
  constraint card_visual_external_sources_rights_check
    check (jsonb_typeof(rights_evidence) = 'object'),
  constraint card_visual_external_sources_network_guard
    check (
      not network_acquisition_enabled
      or (
        permission_status = any (array[
          'written_permission'::text,
          'licensed'::text,
          'public_api_terms_reviewed'::text
        ])
        and terms_snapshot_sha256 is not null
        and permission_reviewed_at is not null
      )
    ),
  constraint card_visual_external_sources_snapshot_guard
    check (
      not snapshot_import_enabled
      or permission_status = any (array[
        'existing_snapshot_only'::text,
        'written_permission'::text,
        'licensed'::text,
        'public_api_terms_reviewed'::text
      ])
    )
);

comment on table public.card_visual_external_sources is
'Private source registry. No external adapter or candidate import is authorized without an explicit acquisition lane, rights evidence, and authority ceiling.';

drop trigger if exists trg_card_visual_external_sources_updated_at
on public.card_visual_external_sources;
create trigger trg_card_visual_external_sources_updated_at
before update on public.card_visual_external_sources
for each row execute function public.set_timestamp_updated_at();

create table if not exists public.card_visual_evidence_candidates (
  id uuid primary key default gen_random_uuid(),
  source_registry_id uuid not null references public.card_visual_external_sources(id) on delete restrict,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  artwork_group_id text null,
  source_name text not null,
  source_url text null,
  source_record_id text not null,
  source_record_hash text not null,
  source_license_provenance jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  represented_identity_kind text not null,
  represented_identity text not null,
  proposed_appearance_role text not null default 'curated_association_unresolved',
  proposed_host_surface text null,
  proposed_host_object text null,
  proposed_representation_form text null,
  source_image_sha256 text null,
  reconciliation_status text not null default 'candidate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_visual_evidence_candidates_source_unique
    unique (source_name, source_record_id, represented_identity),
  constraint card_visual_evidence_candidates_source_hash_check
    check (source_record_hash ~ '^[0-9a-f]{64}$'),
  constraint card_visual_evidence_candidates_image_hash_check
    check (source_image_sha256 is null or source_image_sha256 ~ '^[0-9a-f]{64}$'),
  constraint card_visual_evidence_candidates_role_check
    check (proposed_appearance_role = any (array[
      'scene_subject'::text,
      'depicted_subject'::text,
      'character_representation'::text,
      'curated_association_unresolved'::text,
      'visual_resemblance_reference'::text
    ])),
  constraint card_visual_evidence_candidates_status_check
    check (reconciliation_status = any (array['candidate'::text, 'matched'::text, 'needs_review'::text, 'rejected'::text, 'promoted'::text])),
  constraint card_visual_evidence_candidates_json_check
    check (
      jsonb_typeof(source_license_provenance) = 'object'
      and jsonb_typeof(raw_payload) = 'object'
    )
);

comment on table public.card_visual_evidence_candidates is
'Private candidate staging. External exact candidates and role-unresolved associations never become collector-search evidence from this table.';

drop trigger if exists trg_card_visual_evidence_candidates_updated_at
on public.card_visual_evidence_candidates;
create trigger trg_card_visual_evidence_candidates_updated_at
before update on public.card_visual_evidence_candidates
for each row execute function public.set_timestamp_updated_at();

create table if not exists public.card_visual_evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.card_visual_evidence_candidates(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  review_stage text not null default 'draft',
  decision text not null,
  confirmed_appearance_role text null,
  confirmed_host_surface text null,
  confirmed_host_object text null,
  confirmed_representation_form text null,
  reviewed_image_sha256 text not null,
  evidence_notes text null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz null,
  constraint card_visual_evidence_reviews_stage_check
    check (review_stage = any (array['draft'::text, 'founder_confirmed'::text])),
  constraint card_visual_evidence_reviews_decision_check
    check (decision = any (array['present'::text, 'not_present'::text, 'wrong_role'::text, 'wrong_object'::text, 'cannot_determine'::text])),
  constraint card_visual_evidence_reviews_role_check
    check (
      confirmed_appearance_role is null
      or confirmed_appearance_role = any (array[
        'scene_subject'::text,
        'depicted_subject'::text,
        'character_representation'::text,
        'visual_resemblance_reference'::text
      ])
    ),
  constraint card_visual_evidence_reviews_image_hash_check
    check (reviewed_image_sha256 ~ '^[0-9a-f]{64}$')
);

comment on table public.card_visual_evidence_reviews is
'Private reviewer decisions. First-pass judgments remain drafts; only founder-confirmed reviews may support a later immutable assertion release.';

create index if not exists card_visual_evidence_reviews_candidate_idx
  on public.card_visual_evidence_reviews (candidate_id, review_stage, created_at);

create table if not exists public.card_visual_evidence_assertions (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.card_visual_search_releases(id) on delete restrict,
  candidate_id uuid null references public.card_visual_evidence_candidates(id) on delete restrict,
  founder_review_id uuid null references public.card_visual_evidence_reviews(id) on delete restrict,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  artwork_group_id text not null,
  represented_identity_kind text not null,
  represented_identity text not null,
  appearance_role text not null,
  host_surface text null,
  host_object text null,
  representation_form text null,
  evidence_authority text not null,
  supporting_observation_ids text[] not null default '{}'::text[],
  supporting_external_evidence_ids text[] not null default '{}'::text[],
  evidence_payload jsonb not null default '{}'::jsonb,
  assertion_hash text not null,
  created_at timestamptz not null default now(),
  constraint card_visual_evidence_assertions_unique
    unique (release_id, assertion_hash),
  constraint card_visual_evidence_assertions_role_check
    check (appearance_role = any (array[
      'scene_subject'::text,
      'depicted_subject'::text,
      'character_representation'::text,
      'visual_resemblance_reference'::text
    ])),
  constraint card_visual_evidence_assertions_authority_check
    check (evidence_authority = any (array['observation_backed'::text, 'human_image_confirmed'::text, 'external_role_confirmed'::text])),
  constraint card_visual_evidence_assertions_hash_check
    check (assertion_hash ~ '^[0-9a-f]{64}$'),
  constraint card_visual_evidence_assertions_reference_check
    check (
      cardinality(supporting_observation_ids) > 0
      or cardinality(supporting_external_evidence_ids) > 0
    ),
  constraint card_visual_evidence_assertions_payload_check
    check (jsonb_typeof(evidence_payload) = 'object')
);

comment on table public.card_visual_evidence_assertions is
'Immutable release-scoped final visual assertions. Resemblance assertions remain role-isolated and never prove an independently present identity.';

drop trigger if exists trg_card_visual_evidence_assertions_release_guard
on public.card_visual_evidence_assertions;
create trigger trg_card_visual_evidence_assertions_release_guard
before insert or update or delete on public.card_visual_evidence_assertions
for each row execute function public.guard_card_visual_search_release_rows_v1();

create index if not exists card_visual_evidence_assertions_lookup_idx
  on public.card_visual_evidence_assertions
  (release_id, represented_identity, appearance_role, artwork_group_id);

create table if not exists public.card_visual_search_corrections (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete restrict,
  card_print_id uuid null references public.card_prints(id) on delete restrict,
  artwork_group_id text not null,
  original_query text not null,
  correction_type text not null,
  detail text null,
  evidence_snapshot_hash text not null,
  review_status text not null default 'received',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  constraint card_visual_search_corrections_type_check
    check (correction_type = any (array['character_not_present'::text, 'wrong_role'::text, 'wrong_object'::text, 'missing_detail'::text])),
  constraint card_visual_search_corrections_query_check
    check (char_length(btrim(original_query)) between 2 and 180),
  constraint card_visual_search_corrections_detail_check
    check (detail is null or char_length(detail) <= 1000),
  constraint card_visual_search_corrections_hash_check
    check (evidence_snapshot_hash ~ '^[0-9a-f]{64}$'),
  constraint card_visual_search_corrections_status_check
    check (review_status = any (array['received'::text, 'triaged'::text, 'accepted'::text, 'rejected'::text]))
);

comment on table public.card_visual_search_corrections is
'Signed-in collector correction staging. Reports never mutate active search evidence or releases.';

create or replace function public.submit_card_visual_search_correction_v2(
  card_print_id_in uuid,
  artwork_group_id_in text,
  original_query_in text,
  correction_type_in text,
  detail_in text,
  evidence_snapshot_hash_in text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reporter_id uuid := auth.uid();
  correction_id uuid;
begin
  if reporter_id is null then
    raise exception 'authentication required';
  end if;
  if correction_type_in not in ('character_not_present', 'wrong_role', 'wrong_object', 'missing_detail') then
    raise exception 'unsupported correction type';
  end if;
  if char_length(btrim(coalesce(original_query_in, ''))) not between 2 and 180 then
    raise exception 'original query length is invalid';
  end if;
  if char_length(coalesce(detail_in, '')) > 1000 then
    raise exception 'correction detail is too long';
  end if;
  if evidence_snapshot_hash_in !~ '^[0-9a-f]{64}$' then
    raise exception 'evidence snapshot hash is invalid';
  end if;

  insert into public.card_visual_search_corrections (
    reporter_user_id,
    card_print_id,
    artwork_group_id,
    original_query,
    correction_type,
    detail,
    evidence_snapshot_hash
  )
  values (
    reporter_id,
    card_print_id_in,
    btrim(artwork_group_id_in),
    btrim(original_query_in),
    correction_type_in,
    nullif(btrim(coalesce(detail_in, '')), ''),
    evidence_snapshot_hash_in
  )
  returning id into correction_id;

  return correction_id;
end;
$$;

comment on function public.submit_card_visual_search_correction_v2(uuid, text, text, text, text, text) is
'Bounded authenticated correction intake. It only stages a report and cannot alter active visual-search evidence.';

create or replace function public.get_card_visual_search_candidates_service_v1(
  index_kinds_in text[],
  index_keys_in text[],
  limit_in integer default 500
)
returns table (
  artwork_group_id text,
  matched_index_kinds text[],
  matched_index_keys text[],
  match_count bigint
)
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  with active as (
    select release_id
    from public.card_visual_search_active_release
    where singleton
  ),
  requested as (
    select lower(btrim(kind)) as index_kind, lower(btrim(key)) as index_key
    from unnest(coalesce(index_kinds_in, '{}'::text[]), coalesce(index_keys_in, '{}'::text[]))
      as request(kind, key)
    where btrim(kind) <> '' and btrim(key) <> ''
  ),
  matches as (
    select entry.artwork_group_id, entry.index_kind, entry.index_key
    from active
    join public.card_visual_search_index_entries entry
      on entry.release_id = active.release_id
    join requested
      on requested.index_kind = entry.index_kind
     and requested.index_key = entry.index_key
  )
  select
    matches.artwork_group_id,
    array_agg(distinct matches.index_kind order by matches.index_kind),
    array_agg(distinct matches.index_key order by matches.index_key),
    count(*)::bigint
  from matches
  group by matches.artwork_group_id
  order by count(*) desc, matches.artwork_group_id
  limit greatest(1, least(coalesce(limit_in, 500), 2000));
$$;

comment on function public.get_card_visual_search_candidates_service_v1(text[], text[], integer) is
'Service-only exact candidate prefilter. The application ranker remains responsible for intersections, contradictions, evidence scoring, and final order.';

create or replace function public.get_card_visual_search_groups_service_v1(
  artwork_group_ids_in text[]
)
returns table (
  artwork_group_id text,
  representative_card_print_id uuid,
  eligibility_tier text,
  prompt_branch text,
  documents jsonb,
  evidence_assertions jsonb,
  evidence_suppressions jsonb,
  printings jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active as (
    select release_id
    from public.card_visual_search_active_release
    where singleton
  ),
  requested as (
    select distinct requested_value.value as artwork_group_id
    from unnest(coalesce(artwork_group_ids_in, '{}'::text[]))
      as requested_value(value)
    where btrim(value) <> ''
    limit 2000
  )
  select
    artwork.artwork_group_id,
    artwork.representative_card_print_id,
    artwork.eligibility_tier,
    artwork.prompt_branch,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'search_document_id', document.search_document_id,
          'document_type', document.document_type,
          'canonical_context', document.canonical_context,
          'normalized_lexical_terms', document.normalized_lexical_terms,
          'structured_concepts', document.structured_concepts,
          'subject_role_keys', document.subject_role_keys,
          'projection_guard_keys', document.projection_guard_keys,
          'evidence_confidence_summary', document.evidence_confidence_summary,
          'document_hash', document.document_hash
        )
        order by document.document_type
      )
      from public.card_visual_search_documents document
      where document.release_id = artwork.release_id
        and document.artwork_group_id = artwork.artwork_group_id
    ), '[]'::jsonb) as documents,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'assertion_hash', assertion.assertion_hash,
          'represented_identity_kind', assertion.represented_identity_kind,
          'represented_identity', assertion.represented_identity,
          'appearance_role', assertion.appearance_role,
          'host_surface', assertion.host_surface,
          'host_object', assertion.host_object,
          'representation_form', assertion.representation_form,
          'evidence_authority', assertion.evidence_authority,
          'supporting_observation_ids', assertion.supporting_observation_ids,
          'supporting_external_evidence_ids', assertion.supporting_external_evidence_ids,
          'evidence_payload', assertion.evidence_payload
        )
        order by assertion.represented_identity, assertion.appearance_role, assertion.assertion_hash
      )
      from public.card_visual_evidence_assertions assertion
      where assertion.release_id = artwork.release_id
        and assertion.artwork_group_id = artwork.artwork_group_id
    ), '[]'::jsonb) as evidence_assertions,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'suppression_id', suppression.suppression_id,
          'target_observation_ids', suppression.target_observation_ids,
          'target_source_ids', suppression.target_source_ids,
          'authority', suppression.authority,
          'decision', suppression.decision,
          'rationale', suppression.rationale,
          'suppression_hash', suppression.suppression_hash
        )
        order by suppression.suppression_id
      )
      from public.card_visual_search_evidence_suppressions suppression
      where suppression.release_id = artwork.release_id
        and suppression.artwork_group_id = artwork.artwork_group_id
    ), '[]'::jsonb) as evidence_suppressions,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'card_print_id', printing.card_print_id,
          'gv_id', printing.gv_id_snapshot,
          'name', printing.name_snapshot,
          'set_code', printing.set_code_snapshot,
          'number', printing.number_snapshot,
          'artwork_fact_source', printing.artwork_fact_source,
          'variant_image_status', printing.variant_image_status,
          'print_marker_evidence_status', printing.print_marker_evidence_status
        )
        order by printing.card_print_id
      )
      from public.card_visual_search_printings printing
      where printing.release_id = artwork.release_id
        and printing.artwork_group_id = artwork.artwork_group_id
    ), '[]'::jsonb) as printings
  from active
  join public.card_visual_search_artworks artwork
    on artwork.release_id = active.release_id
  join requested
    on requested.artwork_group_id = artwork.artwork_group_id
  order by artwork.artwork_group_id;
$$;

comment on function public.get_card_visual_search_groups_service_v1(text[]) is
'Service-only bounded hydration of selected artwork groups for the governed application ranker.';

alter table public.card_visual_search_releases enable row level security;
alter table public.card_visual_search_artworks enable row level security;
alter table public.card_visual_search_printings enable row level security;
alter table public.card_visual_search_documents enable row level security;
alter table public.card_visual_search_evidence enable row level security;
alter table public.card_visual_search_evidence_suppressions enable row level security;
alter table public.card_visual_search_index_entries enable row level security;
alter table public.card_visual_search_active_release enable row level security;
alter table public.card_visual_external_sources enable row level security;
alter table public.card_visual_evidence_candidates enable row level security;
alter table public.card_visual_evidence_reviews enable row level security;
alter table public.card_visual_evidence_assertions enable row level security;
alter table public.card_visual_search_corrections enable row level security;

revoke all on table public.card_visual_search_releases from public, anon, authenticated;
revoke all on table public.card_visual_search_artworks from public, anon, authenticated;
revoke all on table public.card_visual_search_printings from public, anon, authenticated;
revoke all on table public.card_visual_search_documents from public, anon, authenticated;
revoke all on table public.card_visual_search_evidence from public, anon, authenticated;
revoke all on table public.card_visual_search_evidence_suppressions from public, anon, authenticated;
revoke all on table public.card_visual_search_index_entries from public, anon, authenticated;
revoke all on table public.card_visual_search_active_release from public, anon, authenticated;
revoke all on table public.card_visual_external_sources from public, anon, authenticated;
revoke all on table public.card_visual_evidence_candidates from public, anon, authenticated;
revoke all on table public.card_visual_evidence_reviews from public, anon, authenticated;
revoke all on table public.card_visual_evidence_assertions from public, anon, authenticated;
revoke all on table public.card_visual_search_corrections from public, anon, authenticated;

grant all on table public.card_visual_search_releases to service_role;
grant all on table public.card_visual_search_artworks to service_role;
grant all on table public.card_visual_search_printings to service_role;
grant all on table public.card_visual_search_documents to service_role;
grant all on table public.card_visual_search_evidence to service_role;
grant all on table public.card_visual_search_evidence_suppressions to service_role;
grant all on table public.card_visual_search_index_entries to service_role;
grant all on table public.card_visual_search_active_release to service_role;
grant all on table public.card_visual_external_sources to service_role;
grant all on table public.card_visual_evidence_candidates to service_role;
grant all on table public.card_visual_evidence_reviews to service_role;
grant all on table public.card_visual_evidence_assertions to service_role;
grant all on table public.card_visual_search_corrections to service_role;

revoke all on function public.get_card_visual_search_candidates_service_v1(text[], text[], integer)
  from public, anon, authenticated;
revoke all on function public.get_card_visual_search_groups_service_v1(text[])
  from public, anon, authenticated;
revoke all on function public.submit_card_visual_search_correction_v2(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.get_card_visual_search_candidates_service_v1(text[], text[], integer)
  to service_role;
grant execute on function public.get_card_visual_search_groups_service_v1(text[])
  to service_role;
grant execute on function public.submit_card_visual_search_correction_v2(uuid, text, text, text, text, text)
  to authenticated, service_role;

commit;
