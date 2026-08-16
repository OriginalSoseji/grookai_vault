-- CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1 migration candidate.
-- Review artifact only. This file is not an applied Supabase migration.

begin;

create function public.sealed_product_reject_row_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception '% rows are append-only; attempted %', tg_table_name, tg_op
    using errcode = '55000';
end;
$$;

create table public.sealed_product_families (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  family_key text not null,
  canonical_name text not null,
  manufacturer_name text not null,
  product_line_key text,
  identity_contract_version text not null,
  identity_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_families_game_key_check check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_families_family_key_check check (family_key = lower(family_key) and btrim(family_key) <> ''),
  constraint sealed_product_families_fingerprint_check check (identity_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_families_game_family_unique unique (game_key, family_key),
  constraint sealed_product_families_fingerprint_unique unique (identity_fingerprint)
);

create table public.sealed_product_variants (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sealed_product_families(id) on delete restrict,
  variant_key text not null,
  canonical_name text not null,
  package_form text not null,
  language_code text,
  region_code text,
  edition text,
  wave text,
  explicit_contents jsonb not null default '[]'::jsonb,
  manufacturer_sku text,
  upc text,
  release_date date,
  identity_contract_version text not null,
  identity_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_variants_variant_key_check check (variant_key = lower(variant_key) and btrim(variant_key) <> ''),
  constraint sealed_product_variants_package_form_check check (package_form in (
    'pack', 'sleeved_pack', 'booster_box', 'display', 'case', 'deck',
    'deck_display', 'kit', 'tin', 'collection', 'bundle', 'promo_pack'
  )),
  constraint sealed_product_variants_language_check check (language_code is null or language_code ~ '^[a-z]{2,3}$'),
  constraint sealed_product_variants_region_check check (region_code is null or region_code ~ '^[A-Z]{2}$'),
  constraint sealed_product_variants_contents_check check (jsonb_typeof(explicit_contents) = 'array'),
  constraint sealed_product_variants_fingerprint_check check (identity_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_variants_family_key_unique unique (family_id, variant_key),
  constraint sealed_product_variants_fingerprint_unique unique (identity_fingerprint)
);

create table public.sealed_product_candidates (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  source_category_id bigint not null,
  source_group_id bigint not null,
  source_product_id bigint not null,
  source_product_name text not null,
  source_payload_hash text not null,
  classifier_version text not null,
  classification text not null,
  confidence numeric(5,4) not null,
  evidence jsonb not null default '[]'::jsonb,
  candidate_identity jsonb not null default '{}'::jsonb,
  ambiguity_reasons text[] not null default '{}'::text[],
  requires_review boolean not null default true,
  promotion_eligible boolean not null default false,
  canonical_authority boolean not null default false,
  publication_authority boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sealed_product_candidates_provider_check check (source_provider = 'tcgplayer'),
  constraint sealed_product_candidates_classification_check check (classification in (
    'sealed_candidate', 'nonsealed_card', 'ambiguous_review', 'excluded_non_tcg_product'
  )),
  constraint sealed_product_candidates_confidence_check check (confidence between 0 and 1),
  constraint sealed_product_candidates_evidence_check check (jsonb_typeof(evidence) = 'array'),
  constraint sealed_product_candidates_identity_check check (jsonb_typeof(candidate_identity) = 'object'),
  constraint sealed_product_candidates_review_check check (requires_review),
  constraint sealed_product_candidates_no_promotion_check check (not promotion_eligible),
  constraint sealed_product_candidates_no_canonical_authority_check check (not canonical_authority),
  constraint sealed_product_candidates_no_publication_authority_check check (not publication_authority),
  constraint sealed_product_candidates_payload_hash_check check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_candidates_source_payload_unique unique (
    source_provider, source_category_id, source_group_id, source_product_id,
    source_payload_hash, classifier_version
  ),
  constraint sealed_product_candidates_mapping_binding_unique unique (
    id, source_provider, source_category_id, source_group_id, source_product_id,
    source_payload_hash, classifier_version, classification
  )
);

create table public.sealed_product_candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.sealed_product_candidates(id) on delete restrict,
  decision text not null,
  promotion_authorized boolean not null default false,
  reviewed_by uuid not null,
  decision_evidence jsonb not null default '{}'::jsonb,
  review_contract_version text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_candidate_reviews_decision_check check (decision in (
    'confirmed_sealed', 'confirmed_card', 'excluded_non_tcg_product',
    'needs_more_evidence', 'identity_conflict'
  )),
  constraint sealed_product_candidate_reviews_authority_check check (
    not promotion_authorized or decision = 'confirmed_sealed'
  ),
  constraint sealed_product_candidate_reviews_evidence_check check (jsonb_typeof(decision_evidence) = 'object'),
  constraint sealed_product_candidate_reviews_mapping_binding_unique unique (
    id, candidate_id, decision, promotion_authorized
  )
);

create table public.sealed_product_source_mappings (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  candidate_id uuid not null,
  review_id uuid not null,
  candidate_classification text not null default 'sealed_candidate',
  review_decision text not null default 'confirmed_sealed',
  promotion_authorized boolean not null default true,
  source_provider text not null,
  source_category_id bigint not null,
  source_group_id bigint not null,
  source_product_id bigint not null,
  source_product_name text not null,
  source_url text,
  source_payload_hash text not null,
  classifier_version text not null,
  mapping_contract_version text not null,
  mapping_status text not null default 'exact_reviewed',
  mapping_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_source_mappings_provider_check check (source_provider = 'tcgplayer'),
  constraint sealed_product_source_mappings_status_check check (mapping_status = 'exact_reviewed'),
  constraint sealed_product_source_mappings_classification_check check (candidate_classification = 'sealed_candidate'),
  constraint sealed_product_source_mappings_review_decision_check check (review_decision = 'confirmed_sealed'),
  constraint sealed_product_source_mappings_promotion_check check (promotion_authorized),
  constraint sealed_product_source_mappings_payload_hash_check check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_source_mappings_fingerprint_check check (mapping_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_source_mappings_candidate_binding_fk foreign key (
    candidate_id, source_provider, source_category_id, source_group_id,
    source_product_id, source_payload_hash, classifier_version,
    candidate_classification
  ) references public.sealed_product_candidates (
    id, source_provider, source_category_id, source_group_id,
    source_product_id, source_payload_hash, classifier_version, classification
  ) on delete restrict,
  constraint sealed_product_source_mappings_review_binding_fk foreign key (
    review_id, candidate_id, review_decision, promotion_authorized
  ) references public.sealed_product_candidate_reviews (
    id, candidate_id, decision, promotion_authorized
  ) on delete restrict,
  constraint sealed_product_source_mappings_exact_source_unique unique (
    source_provider, source_category_id, source_group_id, source_product_id
  ),
  constraint sealed_product_source_mappings_variant_binding_unique unique (id, variant_id),
  constraint sealed_product_source_mappings_fingerprint_unique unique (mapping_fingerprint)
);

create table public.sealed_product_variant_evidence (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  source_mapping_id uuid,
  evidence_dimension text not null,
  source_provider text not null,
  source_object_identity text not null,
  source_field text not null,
  source_value text not null,
  normalized_value jsonb not null,
  evidence_strength text not null,
  confidence numeric(5,4) not null,
  source_payload_hash text not null,
  evidence_fingerprint text not null,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sealed_product_variant_evidence_dimension_check check (evidence_dimension in (
    'product_line', 'manufacturer', 'package_form', 'language', 'region',
    'edition', 'wave', 'quantity', 'contents', 'release_date', 'presale_state'
  )),
  constraint sealed_product_variant_evidence_provider_check check (source_provider = 'tcgplayer'),
  constraint sealed_product_variant_evidence_strength_check check (evidence_strength in ('strong', 'moderate', 'weak')),
  constraint sealed_product_variant_evidence_confidence_check check (confidence between 0 and 1),
  constraint sealed_product_variant_evidence_payload_hash_check check (source_payload_hash ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_variant_evidence_fingerprint_check check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_variant_evidence_mapping_binding_fk foreign key (
    source_mapping_id, variant_id
  ) references public.sealed_product_source_mappings (id, variant_id) on delete restrict,
  constraint sealed_product_variant_evidence_fingerprint_unique unique (evidence_fingerprint)
);

create table public.sealed_product_pricing_lane_qualifications (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  source_mapping_id uuid not null,
  source_price_row_identity text not null,
  source_subtype_name_normalized text not null,
  observed_on date not null,
  currency text not null,
  qualification_status text not null default 'pending',
  qualification_evidence jsonb not null default '{}'::jsonb,
  source_observation_fingerprint text not null,
  qualification_contract_version text not null,
  publication_authority boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sealed_product_pricing_qualification_status_check check (qualification_status in (
    'pending', 'qualified_exact', 'blocked_ambiguous', 'blocked_missing_price',
    'blocked_stale', 'blocked_currency', 'blocked_source_inactive'
  )),
  constraint sealed_product_pricing_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint sealed_product_pricing_evidence_check check (jsonb_typeof(qualification_evidence) = 'object'),
  constraint sealed_product_pricing_fingerprint_check check (source_observation_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_pricing_no_publication_check check (not publication_authority),
  constraint sealed_product_pricing_mapping_binding_fk foreign key (
    source_mapping_id, variant_id
  ) references public.sealed_product_source_mappings (id, variant_id) on delete restrict,
  constraint sealed_product_pricing_exact_lane_unique unique (
    source_mapping_id, source_price_row_identity, observed_on,
    qualification_contract_version
  )
);

create table public.sealed_product_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null,
  release_state text not null default 'draft',
  source_audit_producer_sha text not null,
  source_sample_logical_hash text not null,
  release_contract_version text not null,
  manifest_fingerprint text not null,
  expected_member_count integer not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  frozen_by uuid,
  frozen_at timestamptz,
  constraint sealed_product_releases_key_check check (release_key = lower(release_key) and btrim(release_key) <> ''),
  constraint sealed_product_releases_state_check check (release_state in ('draft', 'frozen')),
  constraint sealed_product_releases_freeze_state_check check (
    (release_state = 'draft' and frozen_by is null and frozen_at is null)
    or (release_state = 'frozen' and frozen_by is not null and frozen_at is not null)
  ),
  constraint sealed_product_releases_producer_check check (source_audit_producer_sha ~ '^[0-9a-f]{40}$'),
  constraint sealed_product_releases_sample_hash_check check (source_sample_logical_hash ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_releases_manifest_check check (manifest_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_releases_member_count_check check (expected_member_count >= 0),
  constraint sealed_product_releases_key_unique unique (release_key),
  constraint sealed_product_releases_manifest_unique unique (manifest_fingerprint)
);

create table public.sealed_product_release_members (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.sealed_product_releases(id) on delete restrict,
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  source_mapping_id uuid not null,
  member_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_release_members_fingerprint_check check (member_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_release_members_mapping_binding_fk foreign key (
    source_mapping_id, variant_id
  ) references public.sealed_product_source_mappings (id, variant_id) on delete restrict,
  constraint sealed_product_release_members_release_variant_unique unique (release_id, variant_id),
  constraint sealed_product_release_members_fingerprint_unique unique (member_fingerprint)
);

create table public.sealed_product_release_pointer (
  singleton boolean primary key default true,
  release_id uuid references public.sealed_product_releases(id) on delete restrict,
  previous_release_id uuid references public.sealed_product_releases(id) on delete restrict,
  pointer_contract_version text not null,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  constraint sealed_product_release_pointer_singleton_check check (singleton)
);

create function public.sealed_product_guard_release_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'sealed product releases cannot be deleted' using errcode = '55000';
  end if;

  if old.release_state = 'draft'
     and new.release_state = 'frozen'
     and new.frozen_by is not null
     and new.frozen_at is not null
     and (to_jsonb(new) - 'release_state' - 'frozen_by' - 'frozen_at')
       = (to_jsonb(old) - 'release_state' - 'frozen_by' - 'frozen_at') then
    return new;
  end if;

  raise exception 'sealed product release mutation is not an authorized freeze transition'
    using errcode = '55000';
end;
$$;

create function public.sealed_product_guard_release_member_insert_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.sealed_product_releases
    where id = new.release_id and release_state = 'draft'
  ) then
    raise exception 'release members may only be inserted into a draft release'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create function public.sealed_product_freeze_release_v1(
  p_release_id uuid,
  p_expected_manifest_fingerprint text,
  p_frozen_by uuid
)
returns public.sealed_product_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sealed_product_releases%rowtype;
  v_member_count integer;
begin
  if p_frozen_by is null then
    raise exception 'frozen_by is required' using errcode = '22004';
  end if;

  select * into v_release
  from public.sealed_product_releases
  where id = p_release_id
  for update;

  if not found or v_release.release_state <> 'draft' then
    raise exception 'release must exist and be draft' using errcode = '23514';
  end if;
  if v_release.manifest_fingerprint <> p_expected_manifest_fingerprint then
    raise exception 'release manifest fingerprint mismatch' using errcode = '23514';
  end if;

  select count(*)::integer into v_member_count
  from public.sealed_product_release_members
  where release_id = p_release_id;
  if v_member_count <> v_release.expected_member_count then
    raise exception 'release member count mismatch: expected %, found %',
      v_release.expected_member_count, v_member_count using errcode = '23514';
  end if;

  update public.sealed_product_releases
  set release_state = 'frozen', frozen_by = p_frozen_by, frozen_at = now()
  where id = p_release_id
  returning * into v_release;

  return v_release;
end;
$$;

create function public.sealed_product_set_active_release_v1(
  p_target_release_id uuid,
  p_expected_current_release_id uuid,
  p_changed_by uuid
)
returns table (
  active_release_id uuid,
  previous_release_id uuid,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sealed_product_releases%rowtype;
  v_current_release_id uuid;
  v_member_count integer;
begin
  if p_changed_by is null then
    raise exception 'changed_by is required' using errcode = '22004';
  end if;

  select * into v_release
  from public.sealed_product_releases
  where id = p_target_release_id;

  if not found or v_release.release_state <> 'frozen' then
    raise exception 'target release must exist and be frozen' using errcode = '23514';
  end if;

  select count(*)::integer into v_member_count
  from public.sealed_product_release_members
  where release_id = p_target_release_id;

  if v_member_count <> v_release.expected_member_count then
    raise exception 'release member count mismatch: expected %, found %',
      v_release.expected_member_count, v_member_count using errcode = '23514';
  end if;

  lock table public.sealed_product_release_pointer in exclusive mode;

  select release_id into v_current_release_id
  from public.sealed_product_release_pointer
  where singleton
  for update;

  if v_current_release_id is distinct from p_expected_current_release_id then
    raise exception 'active release changed concurrently' using errcode = '40001';
  end if;

  insert into public.sealed_product_release_pointer (
    singleton, release_id, previous_release_id, pointer_contract_version,
    changed_by, changed_at
  ) values (
    true, p_target_release_id, v_current_release_id,
    'CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V1', p_changed_by, now()
  )
  on conflict (singleton) do update set
    release_id = excluded.release_id,
    previous_release_id = excluded.previous_release_id,
    pointer_contract_version = excluded.pointer_contract_version,
    changed_by = excluded.changed_by,
    changed_at = excluded.changed_at;

  return query
  select pointer.release_id, pointer.previous_release_id, pointer.changed_at
  from public.sealed_product_release_pointer as pointer
  where pointer.singleton;
end;
$$;

create trigger sealed_product_families_append_only
before update or delete on public.sealed_product_families
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_variants_append_only
before update or delete on public.sealed_product_variants
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_candidates_append_only
before update or delete on public.sealed_product_candidates
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_candidate_reviews_append_only
before update or delete on public.sealed_product_candidate_reviews
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_source_mappings_append_only
before update or delete on public.sealed_product_source_mappings
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_variant_evidence_append_only
before update or delete on public.sealed_product_variant_evidence
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_pricing_qualifications_append_only
before update or delete on public.sealed_product_pricing_lane_qualifications
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_releases_guard_mutation
before update or delete on public.sealed_product_releases
for each row execute function public.sealed_product_guard_release_mutation_v1();
create trigger sealed_product_release_members_append_only
before update or delete on public.sealed_product_release_members
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_release_members_guard_insert
before insert on public.sealed_product_release_members
for each row execute function public.sealed_product_guard_release_member_insert_v1();

create index sealed_product_variants_family_idx on public.sealed_product_variants (family_id);
create index sealed_product_candidates_source_idx on public.sealed_product_candidates (source_provider, source_product_id);
create index sealed_product_candidates_classification_idx on public.sealed_product_candidates (classification, created_at desc);
create index sealed_product_candidate_reviews_candidate_idx on public.sealed_product_candidate_reviews (candidate_id, created_at desc);
create index sealed_product_source_mappings_variant_idx on public.sealed_product_source_mappings (variant_id);
create index sealed_product_variant_evidence_variant_dimension_idx on public.sealed_product_variant_evidence (variant_id, evidence_dimension);
create index sealed_product_pricing_variant_status_idx on public.sealed_product_pricing_lane_qualifications (variant_id, qualification_status, observed_on desc);
create index sealed_product_release_members_release_idx on public.sealed_product_release_members (release_id);

alter table public.sealed_product_families enable row level security;
alter table public.sealed_product_families force row level security;
alter table public.sealed_product_variants enable row level security;
alter table public.sealed_product_variants force row level security;
alter table public.sealed_product_candidates enable row level security;
alter table public.sealed_product_candidates force row level security;
alter table public.sealed_product_candidate_reviews enable row level security;
alter table public.sealed_product_candidate_reviews force row level security;
alter table public.sealed_product_source_mappings enable row level security;
alter table public.sealed_product_source_mappings force row level security;
alter table public.sealed_product_variant_evidence enable row level security;
alter table public.sealed_product_variant_evidence force row level security;
alter table public.sealed_product_pricing_lane_qualifications enable row level security;
alter table public.sealed_product_pricing_lane_qualifications force row level security;
alter table public.sealed_product_releases enable row level security;
alter table public.sealed_product_releases force row level security;
alter table public.sealed_product_release_members enable row level security;
alter table public.sealed_product_release_members force row level security;
alter table public.sealed_product_release_pointer enable row level security;
alter table public.sealed_product_release_pointer force row level security;

revoke all on public.sealed_product_families from public, anon, authenticated, service_role;
revoke all on public.sealed_product_variants from public, anon, authenticated, service_role;
revoke all on public.sealed_product_candidates from public, anon, authenticated, service_role;
revoke all on public.sealed_product_candidate_reviews from public, anon, authenticated, service_role;
revoke all on public.sealed_product_source_mappings from public, anon, authenticated, service_role;
revoke all on public.sealed_product_variant_evidence from public, anon, authenticated, service_role;
revoke all on public.sealed_product_pricing_lane_qualifications from public, anon, authenticated, service_role;
revoke all on public.sealed_product_releases from public, anon, authenticated, service_role;
revoke all on public.sealed_product_release_members from public, anon, authenticated, service_role;
revoke all on public.sealed_product_release_pointer from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_reject_row_mutation_v1() from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_release_mutation_v1() from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_release_member_insert_v1() from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_freeze_release_v1(uuid, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_set_active_release_v1(uuid, uuid, uuid) from public, anon, authenticated, service_role;

grant select, insert on public.sealed_product_families to service_role;
grant select, insert on public.sealed_product_variants to service_role;
grant select, insert on public.sealed_product_candidates to service_role;
grant select, insert on public.sealed_product_candidate_reviews to service_role;
grant select, insert on public.sealed_product_source_mappings to service_role;
grant select, insert on public.sealed_product_variant_evidence to service_role;
grant select, insert on public.sealed_product_pricing_lane_qualifications to service_role;
grant select, insert on public.sealed_product_releases to service_role;
grant select, insert on public.sealed_product_release_members to service_role;
grant select on public.sealed_product_release_pointer to service_role;
grant execute on function public.sealed_product_freeze_release_v1(uuid, text, uuid) to service_role;
grant execute on function public.sealed_product_set_active_release_v1(uuid, uuid, uuid) to service_role;

create policy sealed_product_families_service_role_all on public.sealed_product_families
for all to service_role using (true) with check (true);
create policy sealed_product_variants_service_role_all on public.sealed_product_variants
for all to service_role using (true) with check (true);
create policy sealed_product_candidates_service_role_all on public.sealed_product_candidates
for all to service_role using (true) with check (true);
create policy sealed_product_candidate_reviews_service_role_all on public.sealed_product_candidate_reviews
for all to service_role using (true) with check (true);
create policy sealed_product_source_mappings_service_role_all on public.sealed_product_source_mappings
for all to service_role using (true) with check (true);
create policy sealed_product_variant_evidence_service_role_all on public.sealed_product_variant_evidence
for all to service_role using (true) with check (true);
create policy sealed_product_pricing_qualifications_service_role_all on public.sealed_product_pricing_lane_qualifications
for all to service_role using (true) with check (true);
create policy sealed_product_releases_service_role_all on public.sealed_product_releases
for all to service_role using (true) with check (true);
create policy sealed_product_release_members_service_role_all on public.sealed_product_release_members
for all to service_role using (true) with check (true);
create policy sealed_product_release_pointer_service_role_all on public.sealed_product_release_pointer
for all to service_role using (true) with check (true);

select
  'CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1_MIGRATION_CANDIDATE'::text as package_id,
  10::int as proposed_table_count,
  8::int as proposed_index_count,
  8::int as append_only_trigger_count,
  2::int as release_guard_trigger_count,
  10::int as service_role_policy_count,
  false::boolean as applied,
  false::boolean as client_visible,
  false::boolean as pricing_published;

commit;
