-- SEALED_PRODUCT_PER_GAME_RELEASE_V2
-- Retimestamped from 20260816170000 while still unapplied so production can
-- consume it in forward-only ledger order. Original SQL SHA-256:
-- 5f47fe42a3c4b6459d6bcaef1c91249a445aa6a64061cad8d3fa94afee4a0c7e
-- Evolves the sealed release pointer from one global row to one row per game.
-- Existing release/member/qualification data is preserved and backfilled.

begin;

lock table public.sealed_product_releases in access exclusive mode;
lock table public.sealed_product_release_pointer in access exclusive mode;

alter table public.sealed_product_releases
  add column game_key text;

alter table public.sealed_product_releases
  disable trigger sealed_product_releases_guard_mutation;

with release_games as (
  select
    member.release_id,
    min(family.game_key) as game_key,
    count(distinct family.game_key) as game_count
  from public.sealed_product_release_members member
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family on family.id = variant.family_id
  group by member.release_id
)
update public.sealed_product_releases release
set game_key = release_games.game_key
from release_games
where release.id = release_games.release_id
  and release_games.game_count = 1;

alter table public.sealed_product_releases
  enable trigger sealed_product_releases_guard_mutation;

do $$
begin
  if exists (
    select 1 from public.sealed_product_releases where game_key is null
  ) then
    raise exception 'Every existing sealed release must resolve to exactly one game'
      using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.sealed_product_release_members member
    join public.sealed_product_releases release on release.id = member.release_id
    join public.sealed_product_variants variant on variant.id = member.variant_id
    join public.sealed_product_families family on family.id = variant.family_id
    where family.game_key <> release.game_key
  ) then
    raise exception 'Existing sealed release contains a cross-game member'
      using errcode = '23514';
  end if;
end;
$$;

alter table public.sealed_product_releases
  alter column game_key set not null,
  add constraint sealed_product_releases_game_key_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  add constraint sealed_product_releases_id_game_unique unique (id, game_key);

create index sealed_product_releases_game_state_idx
  on public.sealed_product_releases (game_key, release_state, created_at desc);

alter table public.sealed_product_release_pointer
  add column game_key text;

update public.sealed_product_release_pointer pointer
set game_key = release.game_key
from public.sealed_product_releases release
where release.id = pointer.release_id;

do $$
begin
  if exists (
    select 1 from public.sealed_product_release_pointer where game_key is null
  ) then
    raise exception 'Every existing sealed release pointer must resolve to one game'
      using errcode = '23514';
  end if;
end;
$$;

alter table public.sealed_product_release_pointer
  drop constraint sealed_product_release_pointer_pkey,
  alter column game_key set not null,
  add constraint sealed_product_release_pointer_game_key_check
    check (game_key = lower(game_key) and btrim(game_key) <> ''),
  add constraint sealed_product_release_pointer_pkey primary key (game_key),
  add constraint sealed_product_release_pointer_release_game_fk
    foreign key (release_id, game_key)
    references public.sealed_product_releases (id, game_key) on delete restrict,
  add constraint sealed_product_release_pointer_previous_release_game_fk
    foreign key (previous_release_id, game_key)
    references public.sealed_product_releases (id, game_key) on delete restrict;

create or replace function public.sealed_product_set_active_release_v1(
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
  from public.sealed_product_release_members member
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family on family.id = variant.family_id
  where member.release_id = p_target_release_id
    and family.game_key = v_release.game_key;

  if v_member_count <> v_release.expected_member_count then
    raise exception 'release member count or game binding mismatch: expected %, found %',
      v_release.expected_member_count, v_member_count using errcode = '23514';
  end if;

  lock table public.sealed_product_release_pointer in exclusive mode;

  select pointer.release_id into v_current_release_id
  from public.sealed_product_release_pointer pointer
  where pointer.game_key = v_release.game_key
  for update;

  if v_current_release_id is distinct from p_expected_current_release_id then
    raise exception 'active release changed concurrently' using errcode = '40001';
  end if;

  insert into public.sealed_product_release_pointer (
    singleton, game_key, release_id, previous_release_id,
    pointer_contract_version, changed_by, changed_at
  ) values (
    true, v_release.game_key, p_target_release_id, v_current_release_id,
    'CROSS_TCG_SEALED_PRODUCT_RELEASE_POINTER_V2', p_changed_by, now()
  )
  on conflict (game_key) do update set
    release_id = excluded.release_id,
    previous_release_id = excluded.previous_release_id,
    pointer_contract_version = excluded.pointer_contract_version,
    changed_by = excluded.changed_by,
    changed_at = excluded.changed_at;

  return query
  select pointer.release_id, pointer.previous_release_id, pointer.changed_at
  from public.sealed_product_release_pointer pointer
  where pointer.game_key = v_release.game_key;
end;
$$;

create or replace function public.get_active_sealed_product_pricing_v1(
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  release_id uuid,
  family_id uuid,
  variant_id uuid,
  game_key text,
  family_key text,
  variant_key text,
  canonical_name text,
  package_form text,
  language_code text,
  region_code text,
  edition text,
  wave text,
  release_date date,
  source_provider text,
  source_product_id bigint,
  source_product_name text,
  observed_on date,
  currency text,
  market_price numeric,
  qualification_id uuid,
  evidence_fingerprint text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    pointer.release_id,
    family.id,
    variant.id,
    family.game_key,
    family.family_key,
    variant.variant_key,
    variant.canonical_name,
    variant.package_form,
    variant.language_code,
    variant.region_code,
    variant.edition,
    variant.wave,
    variant.release_date,
    mapping.source_provider,
    mapping.source_product_id,
    mapping.source_product_name,
    qualification.observed_on,
    qualification.currency,
    (qualification.qualification_evidence #>> '{observation,market_price}')::numeric,
    qualification.id,
    member.member_fingerprint
  from public.sealed_product_release_pointer pointer
  join public.sealed_product_releases release
    on release.id = pointer.release_id
   and release.game_key = pointer.game_key
   and release.release_state = 'frozen'
  join public.sealed_product_release_members member
    on member.release_id = release.id
   and member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = member.qualification_id
   and qualification.variant_id = member.variant_id
   and qualification.source_mapping_id = member.source_mapping_id
   and qualification.qualification_status = member.qualification_status
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
   and family.game_key = release.game_key
  join public.sealed_product_source_mappings mapping
    on mapping.id = member.source_mapping_id
   and mapping.variant_id = member.variant_id
  where public.catalog_game_visible_to_request_v1(family.game_key)
    and (qualification.qualification_evidence #>> '{observation,market_price}') is not null
    and (
      nullif(btrim(p_query), '') is null
      or variant.canonical_name ilike '%' || btrim(p_query) || '%'
      or family.canonical_name ilike '%' || btrim(p_query) || '%'
      or mapping.source_product_name ilike '%' || btrim(p_query) || '%'
    )
  order by family.game_key, variant.canonical_name, variant.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function public.get_active_sealed_product_pricing_v2(
  p_game_key text,
  p_query text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  release_id uuid,
  family_id uuid,
  variant_id uuid,
  game_key text,
  family_key text,
  variant_key text,
  canonical_name text,
  package_form text,
  language_code text,
  region_code text,
  edition text,
  wave text,
  release_date date,
  source_provider text,
  source_product_id bigint,
  source_product_name text,
  observed_on date,
  currency text,
  market_price numeric,
  qualification_id uuid,
  evidence_fingerprint text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    pointer.release_id,
    family.id,
    variant.id,
    family.game_key,
    family.family_key,
    variant.variant_key,
    variant.canonical_name,
    variant.package_form,
    variant.language_code,
    variant.region_code,
    variant.edition,
    variant.wave,
    variant.release_date,
    mapping.source_provider,
    mapping.source_product_id,
    mapping.source_product_name,
    qualification.observed_on,
    qualification.currency,
    (qualification.qualification_evidence #>> '{observation,market_price}')::numeric,
    qualification.id,
    member.member_fingerprint
  from public.sealed_product_release_pointer pointer
  join public.sealed_product_releases release
    on release.id = pointer.release_id
   and release.game_key = pointer.game_key
   and release.release_state = 'frozen'
  join public.sealed_product_release_members member
    on member.release_id = release.id
   and member.qualification_status = 'qualified_exact'
  join public.sealed_product_pricing_lane_qualifications qualification
    on qualification.id = member.qualification_id
   and qualification.variant_id = member.variant_id
   and qualification.source_mapping_id = member.source_mapping_id
   and qualification.qualification_status = member.qualification_status
  join public.sealed_product_variants variant on variant.id = member.variant_id
  join public.sealed_product_families family
    on family.id = variant.family_id
   and family.game_key = release.game_key
  join public.sealed_product_source_mappings mapping
    on mapping.id = member.source_mapping_id
   and mapping.variant_id = member.variant_id
  where family.game_key = lower(btrim(p_game_key))
    and public.catalog_game_visible_to_request_v1(family.game_key)
    and (qualification.qualification_evidence #>> '{observation,market_price}') is not null
    and (
      nullif(btrim(p_query), '') is null
      or variant.canonical_name ilike '%' || btrim(p_query) || '%'
      or family.canonical_name ilike '%' || btrim(p_query) || '%'
      or mapping.source_product_name ilike '%' || btrim(p_query) || '%'
    )
  order by variant.canonical_name, variant.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_active_sealed_product_pricing_v2(
  text, text, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.get_active_sealed_product_pricing_v2(
  text, text, integer, integer
) to authenticated, service_role;

commit;
