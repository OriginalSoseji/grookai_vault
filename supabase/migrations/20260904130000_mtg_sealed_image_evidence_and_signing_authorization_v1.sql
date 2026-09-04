-- MTG_SEALED_IMAGE_EVIDENCE_AND_SIGNING_AUTHORIZATION_V1
-- Promotes the reviewed MTG sealed image evidence/release model and the
-- authenticated one-object signing authorization predicate as one atomic
-- migration. This migration writes schema and migration-ledger state only.
-- It does not write image evidence, Storage objects, releases, pointers,
-- pricing, visibility, Vault state, or client activation.

begin;

alter table public.sealed_product_release_members
  add constraint sealed_product_release_members_image_binding_unique
  unique (id, variant_id, source_mapping_id);

create table public.sealed_product_image_evidence (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  source_mapping_id uuid not null,
  source_release_member_id uuid not null,
  source_provider text not null,
  source_category_id bigint not null,
  source_group_id bigint not null,
  source_product_id bigint not null,
  source_image_url text not null,
  selected_source_role text,
  retrieved_at timestamptz not null,
  http_status integer,
  image_mime text,
  image_width integer,
  image_height integer,
  image_bytes bigint,
  content_sha256 text,
  classification text not null,
  source_plan_fingerprint text not null,
  coverage_fingerprint text not null,
  evidence_contract_version text not null,
  evidence_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_image_evidence_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_image_evidence_provider_check
    check (source_provider = 'tcgplayer'),
  constraint sealed_product_image_evidence_url_check
    check (source_image_url ~ '^https://'),
  constraint sealed_product_image_evidence_http_check
    check (http_status is null or http_status between 100 and 599),
  constraint sealed_product_image_evidence_mime_check
    check (image_mime is null or image_mime in (
      'image/jpeg', 'image/png', 'image/gif', 'image/webp'
    )),
  constraint sealed_product_image_evidence_dimension_check
    check (
      (image_width is null and image_height is null and image_bytes is null)
      or (image_width > 0 and image_height > 0 and image_bytes > 0)
    ),
  constraint sealed_product_image_evidence_hash_check
    check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_evidence_classification_check
    check (classification in (
      'exact_image_ready', 'shared_bytes_exact_variant',
      'missing_source_image', 'invalid_image', 'placeholder',
      'identity_conflict'
    )),
  constraint sealed_product_image_evidence_eligible_fields_check
    check (
      classification not in ('exact_image_ready', 'shared_bytes_exact_variant')
      or coalesce((
        selected_source_role is not null
        and http_status between 200 and 299
        and image_mime is not null
        and image_width > 0
        and image_height > 0
        and image_bytes > 0
        and content_sha256 is not null
      ), false)
    ),
  constraint sealed_product_image_evidence_source_plan_check
    check (source_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_evidence_coverage_check
    check (coverage_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_evidence_fingerprint_check
    check (evidence_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_evidence_mapping_fk foreign key (
    source_mapping_id, variant_id
  ) references public.sealed_product_source_mappings (id, variant_id)
    on delete restrict,
  constraint sealed_product_image_evidence_release_member_fk foreign key (
    source_release_member_id, variant_id, source_mapping_id
  ) references public.sealed_product_release_members (
    id, variant_id, source_mapping_id
  ) on delete restrict,
  constraint sealed_product_image_evidence_exact_source_unique unique (
    source_release_member_id, evidence_contract_version
  ),
  constraint sealed_product_image_evidence_binding_unique unique (
    id, game_key, variant_id, source_mapping_id
  ),
  constraint sealed_product_image_evidence_fingerprint_unique
    unique (evidence_fingerprint)
);

create table public.sealed_product_image_objects (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  storage_bucket text not null,
  object_path text not null,
  content_sha256 text not null,
  image_mime text not null,
  image_width integer not null,
  image_height integer not null,
  image_bytes bigint not null,
  storage_readback_sha256 text not null,
  storage_verified_at timestamptz not null,
  object_contract_version text not null,
  object_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_image_objects_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_image_objects_bucket_check
    check (storage_bucket = 'user-card-images'),
  constraint sealed_product_image_objects_path_check
    check (
      object_path ~ '^sealed/[a-z0-9_]+/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(jpg|png|gif|webp)$'
      and object_path = 'sealed/' || game_key || '/sha256/'
        || left(content_sha256, 2) || '/' || content_sha256
        || case image_mime
          when 'image/jpeg' then '.jpg'
          when 'image/png' then '.png'
          when 'image/gif' then '.gif'
          when 'image/webp' then '.webp'
        end
    ),
  constraint sealed_product_image_objects_hash_check
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_objects_readback_hash_check
    check (storage_readback_sha256 = content_sha256),
  constraint sealed_product_image_objects_mime_check
    check (image_mime in ('image/jpeg', 'image/png', 'image/gif', 'image/webp')),
  constraint sealed_product_image_objects_dimension_check
    check (image_width > 0 and image_height > 0 and image_bytes > 0),
  constraint sealed_product_image_objects_fingerprint_check
    check (object_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_objects_game_hash_unique
    unique (game_key, content_sha256),
  constraint sealed_product_image_objects_bucket_path_unique
    unique (storage_bucket, object_path),
  constraint sealed_product_image_objects_binding_unique
    unique (id, game_key),
  constraint sealed_product_image_objects_fingerprint_unique
    unique (object_fingerprint)
);

create table public.sealed_product_variant_image_assertions (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  source_mapping_id uuid not null,
  image_evidence_id uuid not null,
  image_object_id uuid not null,
  assertion_state text not null default 'exact_verified',
  assertion_contract_version text not null,
  assertion_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_variant_image_assertions_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_variant_image_assertions_state_check
    check (assertion_state = 'exact_verified'),
  constraint sealed_product_variant_image_assertions_fingerprint_check
    check (assertion_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_variant_image_assertions_mapping_fk foreign key (
    source_mapping_id, variant_id
  ) references public.sealed_product_source_mappings (id, variant_id)
    on delete restrict,
  constraint sealed_product_variant_image_assertions_evidence_fk foreign key (
    image_evidence_id, game_key, variant_id, source_mapping_id
  ) references public.sealed_product_image_evidence (
    id, game_key, variant_id, source_mapping_id
  ) on delete restrict,
  constraint sealed_product_variant_image_assertions_object_fk foreign key (
    image_object_id, game_key
  ) references public.sealed_product_image_objects (id, game_key)
    on delete restrict,
  constraint sealed_product_variant_image_assertions_binding_unique
    unique (id, game_key, variant_id),
  constraint sealed_product_variant_image_assertions_evidence_unique
    unique (image_evidence_id),
  constraint sealed_product_variant_image_assertions_fingerprint_unique
    unique (assertion_fingerprint)
);

create table public.sealed_product_image_releases (
  id uuid primary key default gen_random_uuid(),
  game_key text not null,
  release_key text not null,
  release_state text not null default 'draft',
  source_price_release_id uuid not null,
  source_audit_producer_sha text not null,
  source_plan_fingerprint text not null,
  coverage_fingerprint text not null,
  release_contract_version text not null,
  manifest_fingerprint text not null,
  expected_member_count integer not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  frozen_by uuid,
  frozen_at timestamptz,
  constraint sealed_product_image_releases_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_image_releases_key_check
    check (release_key = lower(release_key) and btrim(release_key) <> ''),
  constraint sealed_product_image_releases_state_check
    check (release_state in ('draft', 'frozen')),
  constraint sealed_product_image_releases_freeze_state_check check (
    (release_state = 'draft' and frozen_by is null and frozen_at is null)
    or (release_state = 'frozen' and frozen_by is not null and frozen_at is not null)
  ),
  constraint sealed_product_image_releases_producer_check
    check (source_audit_producer_sha ~ '^[0-9a-f]{40}$'),
  constraint sealed_product_image_releases_source_plan_check
    check (source_plan_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_releases_coverage_check
    check (coverage_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_releases_manifest_check
    check (manifest_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_releases_count_check
    check (expected_member_count >= 0),
  constraint sealed_product_image_releases_price_release_fk foreign key (
    source_price_release_id, game_key
  ) references public.sealed_product_releases (id, game_key) on delete restrict,
  constraint sealed_product_image_releases_binding_unique unique (id, game_key),
  constraint sealed_product_image_releases_game_key_unique
    unique (game_key, release_key),
  constraint sealed_product_image_releases_manifest_unique
    unique (manifest_fingerprint)
);

create table public.sealed_product_image_release_members (
  id uuid primary key default gen_random_uuid(),
  image_release_id uuid not null,
  game_key text not null,
  variant_id uuid not null references public.sealed_product_variants(id) on delete restrict,
  image_assertion_id uuid not null,
  member_fingerprint text not null,
  created_at timestamptz not null default now(),
  constraint sealed_product_image_release_members_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_image_release_members_fingerprint_check
    check (member_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint sealed_product_image_release_members_release_fk foreign key (
    image_release_id, game_key
  ) references public.sealed_product_image_releases (id, game_key)
    on delete restrict,
  constraint sealed_product_image_release_members_assertion_fk foreign key (
    image_assertion_id, game_key, variant_id
  ) references public.sealed_product_variant_image_assertions (
    id, game_key, variant_id
  ) on delete restrict,
  constraint sealed_product_image_release_members_release_variant_unique
    unique (image_release_id, variant_id),
  constraint sealed_product_image_release_members_assertion_unique
    unique (image_release_id, image_assertion_id),
  constraint sealed_product_image_release_members_fingerprint_unique
    unique (member_fingerprint)
);

create table public.sealed_product_image_release_pointer (
  game_key text primary key,
  image_release_id uuid not null,
  previous_image_release_id uuid,
  pointer_contract_version text not null,
  changed_by uuid not null,
  changed_at timestamptz not null default now(),
  constraint sealed_product_image_release_pointer_game_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  constraint sealed_product_image_release_pointer_release_fk foreign key (
    image_release_id, game_key
  ) references public.sealed_product_image_releases (id, game_key)
    on delete restrict,
  constraint sealed_product_image_release_pointer_previous_fk foreign key (
    previous_image_release_id, game_key
  ) references public.sealed_product_image_releases (id, game_key)
    on delete restrict
);

create function public.sealed_product_guard_variant_image_assertion_insert_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.sealed_product_image_evidence evidence
    join public.sealed_product_image_objects object
      on object.id = new.image_object_id
     and object.game_key = new.game_key
     and object.content_sha256 = evidence.content_sha256
     and object.image_mime = evidence.image_mime
     and object.image_width = evidence.image_width
     and object.image_height = evidence.image_height
     and object.image_bytes = evidence.image_bytes
     and object.storage_readback_sha256 = evidence.content_sha256
    where evidence.id = new.image_evidence_id
      and evidence.game_key = new.game_key
      and evidence.variant_id = new.variant_id
      and evidence.source_mapping_id = new.source_mapping_id
      and evidence.classification in (
        'exact_image_ready', 'shared_bytes_exact_variant'
      )
  ) then
    raise exception 'image assertion evidence and object bytes do not match exactly'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.sealed_product_guard_image_release_insert_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.sealed_product_releases price_release
    where price_release.id = new.source_price_release_id
      and price_release.game_key = new.game_key
      and price_release.release_state = 'frozen'
  ) then
    raise exception 'image release source price release must be frozen'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create function public.sealed_product_guard_image_release_mutation_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'sealed product image releases cannot be deleted'
      using errcode = '55000';
  end if;

  if old.release_state = 'draft'
     and new.release_state = 'frozen'
     and new.frozen_by is not null
     and new.frozen_at is not null
     and (to_jsonb(new) - 'release_state' - 'frozen_by' - 'frozen_at')
       = (to_jsonb(old) - 'release_state' - 'frozen_by' - 'frozen_at') then
    if not exists (
      select 1
      from public.sealed_product_releases price_release
      where price_release.id = new.source_price_release_id
        and price_release.game_key = new.game_key
        and price_release.release_state = 'frozen'
    ) then
      raise exception 'image release source price release must remain frozen'
        using errcode = '23514';
    end if;
    return new;
  end if;

  raise exception 'sealed product image release mutation is not an authorized freeze transition'
    using errcode = '55000';
end;
$$;

create function public.sealed_product_guard_image_release_member_insert_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1
    from public.sealed_product_image_releases image_release
    join public.sealed_product_releases price_release
      on price_release.id = image_release.source_price_release_id
     and price_release.game_key = image_release.game_key
     and price_release.release_state = 'frozen'
    join public.sealed_product_variant_image_assertions assertion
      on assertion.id = new.image_assertion_id
     and assertion.game_key = new.game_key
     and assertion.variant_id = new.variant_id
     and assertion.assertion_state = 'exact_verified'
    join public.sealed_product_image_evidence evidence
      on evidence.id = assertion.image_evidence_id
     and evidence.classification in (
       'exact_image_ready', 'shared_bytes_exact_variant'
     )
    join public.sealed_product_release_members price_member
      on price_member.id = evidence.source_release_member_id
     and price_member.release_id = image_release.source_price_release_id
     and price_member.variant_id = new.variant_id
     and price_member.source_mapping_id = assertion.source_mapping_id
    where image_release.id = new.image_release_id
      and image_release.game_key = new.game_key
      and image_release.release_state = 'draft'
  ) then
    raise exception 'image release member lacks exact assertion or source price membership'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create function public.sealed_product_freeze_image_release_v1(
  p_image_release_id uuid,
  p_expected_manifest_fingerprint text,
  p_frozen_by uuid
)
returns public.sealed_product_image_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sealed_product_image_releases%rowtype;
  v_member_count integer;
begin
  if p_frozen_by is null then
    raise exception 'frozen_by is required' using errcode = '22004';
  end if;

  select * into v_release
  from public.sealed_product_image_releases
  where id = p_image_release_id
  for update;

  if not found or v_release.release_state <> 'draft' then
    raise exception 'image release must exist and be draft' using errcode = '23514';
  end if;
  if v_release.manifest_fingerprint <> p_expected_manifest_fingerprint then
    raise exception 'image release manifest fingerprint mismatch'
      using errcode = '23514';
  end if;

  select count(*)::integer into v_member_count
  from public.sealed_product_image_release_members
  where image_release_id = p_image_release_id;
  if v_member_count <> v_release.expected_member_count then
    raise exception 'image release member count mismatch: expected %, found %',
      v_release.expected_member_count, v_member_count using errcode = '23514';
  end if;

  update public.sealed_product_image_releases
  set release_state = 'frozen', frozen_by = p_frozen_by, frozen_at = now()
  where id = p_image_release_id
  returning * into v_release;

  return v_release;
end;
$$;

create function public.sealed_product_set_active_image_release_v1(
  p_target_image_release_id uuid,
  p_expected_current_image_release_id uuid,
  p_changed_by uuid
)
returns table (
  game_key text,
  active_image_release_id uuid,
  previous_image_release_id uuid,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_release public.sealed_product_image_releases%rowtype;
  v_current_release_id uuid;
  v_member_count integer;
begin
  if p_changed_by is null then
    raise exception 'changed_by is required' using errcode = '22004';
  end if;

  select * into v_release
  from public.sealed_product_image_releases
  where id = p_target_image_release_id;

  if not found or v_release.release_state <> 'frozen' then
    raise exception 'target image release must exist and be frozen'
      using errcode = '23514';
  end if;

  select count(*)::integer into v_member_count
  from public.sealed_product_image_release_members
  where image_release_id = p_target_image_release_id;
  if v_member_count <> v_release.expected_member_count then
    raise exception 'image release member count mismatch: expected %, found %',
      v_release.expected_member_count, v_member_count using errcode = '23514';
  end if;

  lock table public.sealed_product_image_release_pointer in exclusive mode;

  select pointer.image_release_id into v_current_release_id
  from public.sealed_product_image_release_pointer pointer
  where pointer.game_key = v_release.game_key
  for update;

  if v_current_release_id is distinct from p_expected_current_image_release_id then
    raise exception 'active image release changed concurrently'
      using errcode = '40001';
  end if;

  insert into public.sealed_product_image_release_pointer (
    game_key, image_release_id, previous_image_release_id,
    pointer_contract_version, changed_by, changed_at
  ) values (
    v_release.game_key, p_target_image_release_id, v_current_release_id,
    'SEALED_PRODUCT_IMAGE_RELEASE_POINTER_V1', p_changed_by, now()
  )
  on conflict (game_key) do update set
    image_release_id = excluded.image_release_id,
    previous_image_release_id = excluded.previous_image_release_id,
    pointer_contract_version = excluded.pointer_contract_version,
    changed_by = excluded.changed_by,
    changed_at = excluded.changed_at;

  return query
  select pointer.game_key, pointer.image_release_id,
    pointer.previous_image_release_id, pointer.changed_at
  from public.sealed_product_image_release_pointer pointer
  where pointer.game_key = v_release.game_key;
end;
$$;

create trigger sealed_product_image_evidence_append_only
before update or delete on public.sealed_product_image_evidence
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_image_objects_append_only
before update or delete on public.sealed_product_image_objects
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_variant_image_assertions_append_only
before update or delete on public.sealed_product_variant_image_assertions
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_variant_image_assertions_guard_insert
before insert on public.sealed_product_variant_image_assertions
for each row execute function public.sealed_product_guard_variant_image_assertion_insert_v1();
create trigger sealed_product_image_releases_guard_insert
before insert on public.sealed_product_image_releases
for each row execute function public.sealed_product_guard_image_release_insert_v1();
create trigger sealed_product_image_releases_guard_mutation
before update or delete on public.sealed_product_image_releases
for each row execute function public.sealed_product_guard_image_release_mutation_v1();
create trigger sealed_product_image_release_members_append_only
before update or delete on public.sealed_product_image_release_members
for each row execute function public.sealed_product_reject_row_mutation_v1();
create trigger sealed_product_image_release_members_guard_insert
before insert on public.sealed_product_image_release_members
for each row execute function public.sealed_product_guard_image_release_member_insert_v1();

create index sealed_product_image_evidence_variant_idx
  on public.sealed_product_image_evidence (variant_id, created_at desc);
create index sealed_product_image_evidence_source_idx
  on public.sealed_product_image_evidence (
    source_provider, source_category_id, source_group_id, source_product_id
  );
create index sealed_product_variant_image_assertions_variant_idx
  on public.sealed_product_variant_image_assertions (variant_id, created_at desc);
create index sealed_product_image_release_members_release_idx
  on public.sealed_product_image_release_members (image_release_id);
create index sealed_product_image_releases_game_state_idx
  on public.sealed_product_image_releases (game_key, release_state, created_at desc);

alter table public.sealed_product_image_evidence enable row level security;
alter table public.sealed_product_image_evidence force row level security;
alter table public.sealed_product_image_objects enable row level security;
alter table public.sealed_product_image_objects force row level security;
alter table public.sealed_product_variant_image_assertions enable row level security;
alter table public.sealed_product_variant_image_assertions force row level security;
alter table public.sealed_product_image_releases enable row level security;
alter table public.sealed_product_image_releases force row level security;
alter table public.sealed_product_image_release_members enable row level security;
alter table public.sealed_product_image_release_members force row level security;
alter table public.sealed_product_image_release_pointer enable row level security;
alter table public.sealed_product_image_release_pointer force row level security;

revoke all on public.sealed_product_image_evidence
from public, anon, authenticated, service_role;
revoke all on public.sealed_product_image_objects
from public, anon, authenticated, service_role;
revoke all on public.sealed_product_variant_image_assertions
from public, anon, authenticated, service_role;
revoke all on public.sealed_product_image_releases
from public, anon, authenticated, service_role;
revoke all on public.sealed_product_image_release_members
from public, anon, authenticated, service_role;
revoke all on public.sealed_product_image_release_pointer
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_image_release_mutation_v1()
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_variant_image_assertion_insert_v1()
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_image_release_insert_v1()
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_guard_image_release_member_insert_v1()
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_freeze_image_release_v1(uuid, text, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.sealed_product_set_active_image_release_v1(uuid, uuid, uuid)
from public, anon, authenticated, service_role;

grant select, insert on public.sealed_product_image_evidence to service_role;
grant select, insert on public.sealed_product_image_objects to service_role;
grant select, insert on public.sealed_product_variant_image_assertions to service_role;
grant select, insert on public.sealed_product_image_releases to service_role;
grant select, insert on public.sealed_product_image_release_members to service_role;
grant select on public.sealed_product_image_release_pointer to service_role;
grant execute on function public.sealed_product_freeze_image_release_v1(uuid, text, uuid)
to service_role;
grant execute on function public.sealed_product_set_active_image_release_v1(uuid, uuid, uuid)
to service_role;

create policy sealed_product_image_evidence_service_role_all
on public.sealed_product_image_evidence for all to service_role
using (true) with check (true);
create policy sealed_product_image_objects_service_role_all
on public.sealed_product_image_objects for all to service_role
using (true) with check (true);
create policy sealed_product_variant_image_assertions_service_role_all
on public.sealed_product_variant_image_assertions for all to service_role
using (true) with check (true);
create policy sealed_product_image_releases_service_role_all
on public.sealed_product_image_releases for all to service_role
using (true) with check (true);
create policy sealed_product_image_release_members_service_role_all
on public.sealed_product_image_release_members for all to service_role
using (true) with check (true);
create policy sealed_product_image_release_pointer_service_role_all
on public.sealed_product_image_release_pointer for all to service_role
using (true) with check (true);

comment on table public.sealed_product_image_evidence is
  'Append-only exact source retrieval evidence; source URLs are never client image URLs.';
comment on table public.sealed_product_image_objects is
  'Append-only registry of content-addressed, exact-readback self-hosted sealed images.';
comment on table public.sealed_product_variant_image_assertions is
  'Append-only exact variant-to-evidence-to-object assertions.';
comment on table public.sealed_product_image_releases is
  'Immutable game-scoped sealed image releases bound to one frozen price release.';
comment on table public.sealed_product_image_release_pointer is
  'Service-owned game-scoped compare-and-swap pointer; it does not grant visibility.';


create or replace function public.mtg_sealed_image_object_signing_authorized_v1(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    coalesce(auth.role(), '') in ('authenticated', 'service_role')
    and p_bucket_id = 'user-card-images'
    and p_object_name ~ '^sealed/mtg/sha256/[0-9a-f]{2}/[0-9a-f]{64}\.(jpg|png|gif|webp)$'
    and public.catalog_game_visible_to_request_v1('mtg')
    and public.sealed_product_game_visible_to_request_v1('mtg')
    and exists (
      select 1
      from public.sealed_product_image_objects image_object
      join public.sealed_product_variant_image_assertions image_assertion
        on image_assertion.image_object_id = image_object.id
       and image_assertion.game_key = image_object.game_key
       and image_assertion.assertion_state = 'exact_verified'
      join public.sealed_product_image_evidence image_evidence
        on image_evidence.id = image_assertion.image_evidence_id
       and image_evidence.game_key = image_assertion.game_key
       and image_evidence.variant_id = image_assertion.variant_id
       and image_evidence.source_mapping_id = image_assertion.source_mapping_id
       and image_evidence.classification in (
         'exact_image_ready', 'shared_bytes_exact_variant'
       )
      join public.sealed_product_image_release_members image_member
        on image_member.image_assertion_id = image_assertion.id
       and image_member.game_key = image_assertion.game_key
       and image_member.variant_id = image_assertion.variant_id
      join public.sealed_product_image_releases image_release
        on image_release.id = image_member.image_release_id
       and image_release.game_key = image_member.game_key
       and image_release.release_state = 'frozen'
      join public.sealed_product_image_release_pointer image_pointer
        on image_pointer.image_release_id = image_release.id
       and image_pointer.game_key = image_release.game_key
      join public.sealed_product_release_pointer price_pointer
        on price_pointer.release_id = image_release.source_price_release_id
       and price_pointer.game_key = image_release.game_key
      join public.sealed_product_releases price_release
        on price_release.id = price_pointer.release_id
       and price_release.game_key = price_pointer.game_key
       and price_release.release_state = 'frozen'
      join public.sealed_product_release_members price_member
        on price_member.release_id = price_release.id
       and price_member.id = image_evidence.source_release_member_id
       and price_member.variant_id = image_assertion.variant_id
       and price_member.source_mapping_id = image_assertion.source_mapping_id
       and price_member.qualification_status = 'qualified_exact'
      join public.sealed_product_pricing_lane_qualifications qualification
        on qualification.id = price_member.qualification_id
       and qualification.variant_id = price_member.variant_id
       and qualification.source_mapping_id = price_member.source_mapping_id
       and qualification.qualification_status = price_member.qualification_status
      join public.sealed_product_source_mappings mapping
        on mapping.id = price_member.source_mapping_id
       and mapping.variant_id = price_member.variant_id
       and mapping.source_provider = 'tcgplayer'
      join public.sealed_product_variants variant
        on variant.id = price_member.variant_id
       and variant.language_code = 'en'
      join public.sealed_product_families family
        on family.id = variant.family_id
       and family.game_key = image_release.game_key
      where image_object.game_key = 'mtg'
        and image_object.storage_bucket = p_bucket_id
        and image_object.object_path = p_object_name
        and image_object.storage_readback_sha256 = image_object.content_sha256
        and image_object.content_sha256 = image_evidence.content_sha256
        and image_object.image_mime = image_evidence.image_mime
        and image_object.image_width = image_evidence.image_width
        and image_object.image_height = image_evidence.image_height
        and image_object.image_bytes = image_evidence.image_bytes
        and image_object.object_path =
          'sealed/mtg/sha256/'
          || left(image_object.content_sha256, 2)
          || '/'
          || image_object.content_sha256
          || case image_object.image_mime
            when 'image/jpeg' then '.jpg'
            when 'image/png' then '.png'
            when 'image/gif' then '.gif'
            when 'image/webp' then '.webp'
          end
        and qualification.source_subtype_name_normalized = 'normal'
        and qualification.currency = 'USD'
        and qualification.observed_on >= current_date - 7
        and qualification.observed_on <= current_date
        and (qualification.qualification_evidence #>> '{observation,market_price}')
          is not null
        and (qualification.qualification_evidence #>> '{observation,market_price}')::numeric
          > 0
    );
$$;

revoke all on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) from public, anon, authenticated, service_role;

grant execute on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) to authenticated, service_role;

comment on function public.mtg_sealed_image_object_signing_authorized_v1(
  text, text
) is
  'Authorizes trusted one-object signing only for byte-verified MTG sealed images in the active frozen image release bound to the active frozen fresh exact TCGPlayer price release and both visibility controls; grants no storage.objects access.';


commit;
