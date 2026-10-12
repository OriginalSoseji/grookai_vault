begin;

alter table public.card_print_identity_aliases
  add column if not exists authority_status text not null default 'pending',
  add column if not exists authority_sources text[] not null default '{}'::text[],
  add column if not exists authority_decision jsonb not null default '{}'::jsonb,
  add column if not exists adjudicated_at timestamptz null;

do $$
declare
  v_updated integer;
begin
  with decisions(legacy_set_code,canonical_set_code,expected_count) as (
    values
      ('2021swsh','mcd21',25),
      ('swsh10.5','pgo',88),
      ('sv04.5','sv4pt5',245),
      ('sv06.5','sv6pt5',99),
      ('sv08.5','sv8pt5',180),
      ('tk-ex-latio','tk1b',10)
  )
  update public.card_print_identity_aliases alias
  set
    authority_status='approved',
    authority_sources=array[
      'pokemon_tcg_api_set_coordinate',
      'tcgdex_set_coordinate',
      'grookai_release_metadata'
    ]::text[],
    authority_decision=jsonb_build_object(
      'legacy_set_code',decisions.legacy_set_code,
      'canonical_set_code',decisions.canonical_set_code,
      'expected_overlap_count',decisions.expected_count,
      'canonical_basis','PokemonTCG set coordinate already used by Grookai release metadata',
      'legacy_disposition','Retain the alternate TCGdex coordinate and every downstream reference as provider lineage',
      'finish_policy','Use only verified canonical printing inventory; a legacy-only finish never qualifies an import',
      'identity_evidence','Exact normalized name, printed number, variant and printed modifier inside this source-adjudicated set family',
      'classification_sha256','87c1916e78103667c75a5b68e1bd235dd41257852597107b2298b1d6a69fa0b7',
      'collision_matrix_sha256','3d558f036afb0d0080819c6976b1343018c9750585ba4ada9f6383a16823cfc4'
    ),
    evidence_reason='Source-backed set authority selects the PokemonTCG coordinate already used by Grookai release metadata. Exact card identity fields bind the retained TCGdex parent as reversible provider lineage; canonical finish evidence remains authoritative.',
    adjudicated_at=now()
  from decisions
  where alias.created_from_audit='collectr_catalog_review_20261009'
    and alias.active=true
    and alias.legacy_set_code=decisions.legacy_set_code
    and alias.canonical_set_code=decisions.canonical_set_code;

  get diagnostics v_updated=row_count;
  if v_updated<>647 then
    raise exception 'Expected to approve 647 source-backed aliases, updated %',v_updated
      using errcode='23514';
  end if;

  if exists (
    with decisions(legacy_set_code,canonical_set_code,expected_count) as (
      values
        ('2021swsh','mcd21',25),
        ('swsh10.5','pgo',88),
        ('sv04.5','sv4pt5',245),
        ('sv06.5','sv6pt5',99),
        ('sv08.5','sv8pt5',180),
        ('tk-ex-latio','tk1b',10)
    )
    select 1
    from decisions
    left join public.card_print_identity_aliases alias
      on alias.legacy_set_code=decisions.legacy_set_code
     and alias.canonical_set_code=decisions.canonical_set_code
     and alias.active=true
     and alias.authority_status='approved'
    group by decisions.legacy_set_code,decisions.canonical_set_code,decisions.expected_count
    having count(alias.id)<>decisions.expected_count
  ) then
    raise exception 'Source-backed alias family count drifted'
      using errcode='23514';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.card_print_identity_aliases'::regclass
      and conname='card_print_identity_aliases_authority_status'
  ) then
    alter table public.card_print_identity_aliases
      add constraint card_print_identity_aliases_authority_status
      check (authority_status in ('pending','approved','rejected','retired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.card_print_identity_aliases'::regclass
      and conname='card_print_identity_aliases_active_authority'
  ) then
    alter table public.card_print_identity_aliases
      add constraint card_print_identity_aliases_active_authority
      check (
        not active or (
          authority_status='approved'
          and cardinality(authority_sources)>=2
          and adjudicated_at is not null
          and authority_decision ? 'canonical_basis'
          and authority_decision ? 'finish_policy'
          and authority_decision ? 'classification_sha256'
          and authority_decision ? 'collision_matrix_sha256'
        )
      );
  end if;
end;
$$;

alter table public.card_print_identity_aliases
  alter column authority_status drop default;

create or replace function public.get_public_card_print_identity_aliases_v1(
  p_card_print_ids uuid[]
)
returns table (
  legacy_card_print_id uuid,
  canonical_card_print_id uuid,
  legacy_set_code text,
  canonical_set_code text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_card_print_ids uuid[];
begin
  v_card_print_ids := array(
    select distinct requested_id
    from unnest(coalesce(p_card_print_ids, array[]::uuid[])) requested(requested_id)
    where requested_id is not null
    order by requested_id
  );

  if cardinality(v_card_print_ids)>250 then
    raise exception 'At most 250 card print ids may be requested.'
      using errcode='22023';
  end if;

  return query
  select
    alias.legacy_card_print_id,
    alias.canonical_card_print_id,
    alias.legacy_set_code,
    alias.canonical_set_code
  from public.card_print_identity_aliases alias
  where alias.active=true
    and alias.authority_status='approved'
    and alias.legacy_card_print_id=any(v_card_print_ids)
    and public.catalog_card_print_visible_to_request_v1(alias.legacy_card_print_id)
    and public.catalog_card_print_visible_to_request_v1(alias.canonical_card_print_id)
  order by alias.legacy_card_print_id;
end;
$$;

comment on table public.card_print_identity_aliases is
  'Reversible provider lineage. Active aliases require explicit source-backed authority evidence and never move ownership, pricing, printings or legacy parents.';

comment on function public.get_public_card_print_identity_aliases_v1(uuid[]) is
  'Bounded visible alias lookup. Returns only active aliases with approved source-backed authority decisions.';

commit;
