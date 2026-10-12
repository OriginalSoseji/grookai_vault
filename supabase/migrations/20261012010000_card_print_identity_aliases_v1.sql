begin;

create table if not exists public.card_print_identity_aliases (
  id uuid primary key default gen_random_uuid(),
  legacy_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  canonical_card_print_id uuid not null references public.card_prints(id) on delete restrict,
  legacy_set_code text not null,
  canonical_set_code text not null,
  evidence_reason text not null,
  created_from_audit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz null,
  constraint card_print_identity_aliases_distinct_cards
    check (legacy_card_print_id <> canonical_card_print_id),
  constraint card_print_identity_aliases_retirement_state
    check ((active and retired_at is null) or (not active))
);

create unique index if not exists card_print_identity_aliases_active_legacy_uidx
  on public.card_print_identity_aliases (legacy_card_print_id)
  where active = true;

create index if not exists card_print_identity_aliases_canonical_idx
  on public.card_print_identity_aliases (canonical_card_print_id)
  where active = true;

alter table public.card_print_identity_aliases enable row level security;
revoke all on table public.card_print_identity_aliases from public, anon, authenticated;

do $$
declare
  v_pair_count integer;
  v_ambiguous_count integer;
begin
  with families(legacy_set_code, canonical_set_code, expected_count) as (
    values
      ('2021swsh','mcd21',25),
      ('swsh10.5','pgo',88),
      ('sv04.5','sv4pt5',245),
      ('sv06.5','sv6pt5',99),
      ('sv08.5','sv8pt5',180),
      ('tk-ex-latio','tk1b',10)
  ),
  candidates as (
    select
      f.legacy_set_code,
      f.canonical_set_code,
      f.expected_count,
      legacy.id as legacy_card_print_id,
      count(canonical.id)::integer as canonical_match_count
    from families f
    join public.card_prints legacy
      on legacy.set_code = f.legacy_set_code
    left join public.card_prints canonical
      on canonical.set_code = f.canonical_set_code
     and lower(regexp_replace(btrim(canonical.name), '\s+', ' ', 'g'))
       = lower(regexp_replace(btrim(legacy.name), '\s+', ' ', 'g'))
     and coalesce(nullif(ltrim(upper(btrim(split_part(replace(canonical.number, '#', ''), '/', 1))), '0'), ''), '0')
       = coalesce(nullif(ltrim(upper(btrim(split_part(replace(legacy.number, '#', ''), '/', 1))), '0'), ''), '0')
     and coalesce(lower(btrim(canonical.variant_key)), '') = coalesce(lower(btrim(legacy.variant_key)), '')
     and coalesce(lower(btrim(canonical.printed_identity_modifier)), '') = coalesce(lower(btrim(legacy.printed_identity_modifier)), '')
    group by f.legacy_set_code, f.canonical_set_code, f.expected_count, legacy.id
  )
  select
    count(*) filter (where canonical_match_count = 1)::integer,
    count(*) filter (where canonical_match_count > 1)::integer
  into v_pair_count, v_ambiguous_count
  from candidates;

  if v_pair_count <> 647 or v_ambiguous_count <> 0 then
    raise exception 'Card identity alias evidence drifted: pairs %, ambiguous %',
      v_pair_count, v_ambiguous_count using errcode = '23514';
  end if;

  if exists (
    with families(legacy_set_code, canonical_set_code, expected_count) as (
      values
        ('2021swsh','mcd21',25),
        ('swsh10.5','pgo',88),
        ('sv04.5','sv4pt5',245),
        ('sv06.5','sv6pt5',99),
        ('sv08.5','sv8pt5',180),
        ('tk-ex-latio','tk1b',10)
    ),
    candidates as (
      select f.legacy_set_code, f.canonical_set_code, f.expected_count, legacy.id
      from families f
      join public.card_prints legacy on legacy.set_code = f.legacy_set_code
      join public.card_prints canonical
        on canonical.set_code = f.canonical_set_code
       and lower(regexp_replace(btrim(canonical.name), '\s+', ' ', 'g'))
         = lower(regexp_replace(btrim(legacy.name), '\s+', ' ', 'g'))
       and coalesce(nullif(ltrim(upper(btrim(split_part(replace(canonical.number, '#', ''), '/', 1))), '0'), ''), '0')
         = coalesce(nullif(ltrim(upper(btrim(split_part(replace(legacy.number, '#', ''), '/', 1))), '0'), ''), '0')
       and coalesce(lower(btrim(canonical.variant_key)), '') = coalesce(lower(btrim(legacy.variant_key)), '')
       and coalesce(lower(btrim(canonical.printed_identity_modifier)), '') = coalesce(lower(btrim(legacy.printed_identity_modifier)), '')
    )
    select 1 from candidates
    group by legacy_set_code, canonical_set_code, expected_count
    having count(*) <> expected_count
  ) then
    raise exception 'Card identity alias family count drifted'
      using errcode = '23514';
  end if;
end;
$$;

with families(legacy_set_code, canonical_set_code) as (
  values
    ('2021swsh','mcd21'),
    ('swsh10.5','pgo'),
    ('sv04.5','sv4pt5'),
    ('sv06.5','sv6pt5'),
    ('sv08.5','sv8pt5'),
    ('tk-ex-latio','tk1b')
),
pairs as (
  select
    legacy.id as legacy_card_print_id,
    canonical.id as canonical_card_print_id,
    f.legacy_set_code,
    f.canonical_set_code
  from families f
  join public.card_prints legacy
    on legacy.set_code = f.legacy_set_code
  join public.card_prints canonical
    on canonical.set_code = f.canonical_set_code
   and lower(regexp_replace(btrim(canonical.name), '\s+', ' ', 'g'))
     = lower(regexp_replace(btrim(legacy.name), '\s+', ' ', 'g'))
   and coalesce(nullif(ltrim(upper(btrim(split_part(replace(canonical.number, '#', ''), '/', 1))), '0'), ''), '0')
     = coalesce(nullif(ltrim(upper(btrim(split_part(replace(legacy.number, '#', ''), '/', 1))), '0'), ''), '0')
   and coalesce(lower(btrim(canonical.variant_key)), '') = coalesce(lower(btrim(legacy.variant_key)), '')
   and coalesce(lower(btrim(canonical.printed_identity_modifier)), '') = coalesce(lower(btrim(legacy.printed_identity_modifier)), '')
)
insert into public.card_print_identity_aliases (
  legacy_card_print_id,
  canonical_card_print_id,
  legacy_set_code,
  canonical_set_code,
  evidence_reason,
  created_from_audit
)
select
  legacy_card_print_id,
  canonical_card_print_id,
  legacy_set_code,
  canonical_set_code,
  'Same normalized name, number, variant and printed modifier within an adjudicated duplicate provider set family.',
  'collectr_catalog_review_20261009'
from pairs
where not exists (
  select 1
  from public.card_print_identity_aliases existing
  where existing.legacy_card_print_id = pairs.legacy_card_print_id
    and existing.active = true
);

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

  if cardinality(v_card_print_ids) > 250 then
    raise exception 'At most 250 card print ids may be requested.'
      using errcode = '22023';
  end if;

  return query
  select
    alias.legacy_card_print_id,
    alias.canonical_card_print_id,
    alias.legacy_set_code,
    alias.canonical_set_code
  from public.card_print_identity_aliases alias
  where alias.active = true
    and alias.legacy_card_print_id = any(v_card_print_ids)
    and public.catalog_card_print_visible_to_request_v1(alias.legacy_card_print_id)
    and public.catalog_card_print_visible_to_request_v1(alias.canonical_card_print_id)
  order by alias.legacy_card_print_id;
end;
$$;

comment on table public.card_print_identity_aliases is
  'Reversible lineage from retained provider-specific card parents to the adjudicated canonical parent. This table never moves ownership or deletes legacy rows.';

comment on function public.get_public_card_print_identity_aliases_v1(uuid[]) is
  'Bounded public alias lookup for visible card candidates. Returns only active, adjudicated legacy-to-canonical parent links.';

revoke all on function public.get_public_card_print_identity_aliases_v1(uuid[]) from public;
grant execute on function public.get_public_card_print_identity_aliases_v1(uuid[])
  to anon, authenticated, service_role;

commit;
