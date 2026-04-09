-- DELTA_SPECIES_PRINTED_IDENTITY_SCHEMA_AND_GVID_PLAN_V1
-- Design-only SQL plan. Read-only audit queries plus commented future migration sequence.

begin;

-- ============================================================================
-- PHASE 1 — CURRENT SCHEMA AUDIT PLAN
-- ============================================================================

-- 1A. Current card_prints constraints.
select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel
  on rel.oid = con.conrelid
join pg_namespace nsp
  on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname = 'card_prints'
order by con.conname;

-- 1B. Current card_prints indexes involving identity/GV fields.
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'card_prints'
  and (
    indexdef ilike '%set_id%'
    or indexdef ilike '%number_plain%'
    or indexdef ilike '%variant_key%'
    or indexdef ilike '%gv_id%'
  )
order by indexname;

-- 1C. Dependency inventory: views/functions/policies that reference card_prints
-- and the current identity fields.
with refs as (
  select
    'view'::text as dependency_type,
    schemaname as schema_name,
    viewname as object_name,
    definition as object_definition
  from pg_views
  where schemaname = 'public'

  union all

  select
    'matview'::text,
    schemaname,
    matviewname,
    definition
  from pg_matviews
  where schemaname = 'public'

  union all

  select
    'function'::text,
    n.nspname,
    p.proname,
    pg_get_functiondef(p.oid)
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'

  union all

  select
    'policy'::text,
    schemaname,
    policyname,
    coalesce(qual, '') || ' ' || coalesce(with_check, '')
  from pg_policies
  where schemaname = 'public'
)
select
  dependency_type,
  schema_name,
  object_name
from refs
where object_definition ilike '%card_prints%'
  and (
    object_definition ilike '%set_id%'
    or object_definition ilike '%number_plain%'
    or object_definition ilike '%variant_key%'
  )
order by dependency_type, schema_name, object_name;

-- 1D. Dependency summary counts.
with refs as (
  select
    'view'::text as dependency_type,
    definition as object_definition
  from pg_views
  where schemaname = 'public'

  union all

  select
    'matview'::text,
    definition
  from pg_matviews
  where schemaname = 'public'

  union all

  select
    'function'::text,
    pg_get_functiondef(p.oid)
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'

  union all

  select
    'policy'::text,
    coalesce(qual, '') || ' ' || coalesce(with_check, '')
  from pg_policies
  where schemaname = 'public'
)
select
  dependency_type,
  count(*)::int as dependency_count
from refs
where object_definition ilike '%card_prints%'
  and (
    object_definition ilike '%set_id%'
    or object_definition ilike '%number_plain%'
    or object_definition ilike '%variant_key%'
  )
group by dependency_type
order by dependency_type;

-- 1E. Candidate delta rows across the dataset.
select
  count(*)::int as total_candidate_delta_rows,
  count(*) filter (where gv_id is not null)::int as canonical_candidate_delta_rows,
  count(*) filter (where gv_id is null)::int as unresolved_candidate_delta_rows,
  count(distinct set_code)::int as delta_set_count
from public.card_prints
where name like '%δ%'
   or name ~* '\bdelta species\b';

select
  set_code,
  id,
  name,
  number,
  number_plain,
  variant_key,
  gv_id,
  case
    when name like '%δ%' then 'delta_symbol'
    when name ~* '\bdelta species\b' then 'delta_species_text'
    else 'other'
  end as delta_match_type
from public.card_prints
where name like '%δ%'
   or name ~* '\bdelta species\b'
order by set_code nulls last, number_plain nulls last, id
limit 100;

-- ============================================================================
-- PHASE 2 — TARGET SCHEMA PLAN
-- ============================================================================

select
  'public.card_prints.printed_identity_modifier text null'::text as target_column_definition,
  array['null', 'delta_species']::text[] as planned_allowed_values,
  'design only: future CHECK constraint should explicitly bound allowed values'::text as notes;

-- Future DDL shape (commented only; do not execute in this plan step):
--
-- alter table public.card_prints
-- add column printed_identity_modifier text;
--
-- alter table public.card_prints
-- add constraint card_prints_printed_identity_modifier_check
-- check (
--   printed_identity_modifier is null
--   or printed_identity_modifier in ('delta_species')
-- ) not valid;
--
-- alter table public.card_prints
-- validate constraint card_prints_printed_identity_modifier_check;

-- ============================================================================
-- PHASE 3 — UNIQUENESS MIGRATION PLAN
-- ============================================================================

-- 3A. Preflight duplicate audit under the current contract key.
select
  cp.set_code,
  cp.set_id::text as set_id,
  cp.number_plain,
  coalesce(cp.variant_key, '') as variant_key_current,
  count(*)::int as row_count,
  array_agg(cp.id::text order by cp.id) as card_print_ids,
  array_agg(cp.name order by cp.id) as names
from public.card_prints cp
where cp.set_id is not null
  and cp.number_plain is not null
group by cp.set_code, cp.set_id, cp.number_plain, coalesce(cp.variant_key, '')
having count(*) > 1
order by row_count desc, cp.set_code, cp.number_plain;

-- 3B. Preflight duplicate audit under the proposed computed key.
with modeled as (
  select
    cp.id,
    cp.set_code,
    cp.set_id,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key_current,
    case
      when cp.name like '%δ%' or cp.name ~* '\bdelta species\b' then 'delta_species'
      else ''
    end as printed_identity_modifier_current,
    cp.name
  from public.card_prints cp
  where cp.set_id is not null
    and cp.number_plain is not null
)
select
  set_code,
  set_id::text as set_id,
  number_plain,
  printed_identity_modifier_current,
  variant_key_current,
  count(*)::int as row_count,
  array_agg(id::text order by id) as card_print_ids,
  array_agg(name order by id) as names
from modeled
group by set_code, set_id, number_plain, printed_identity_modifier_current, variant_key_current
having count(*) > 1
order by row_count desc, set_code, number_plain;

-- 3C. Null-handling recommendation.
select
  'expression_unique_index_with_coalesce'::text as uniqueness_strategy,
  '(set_id, number_plain, coalesce(printed_identity_modifier, ''''), coalesce(variant_key, '''')) where set_id is not null and number_plain is not null'::text as recommended_index_shape,
  'raw nullable printed_identity_modifier is unsafe because PostgreSQL UNIQUE semantics allow multiple NULL rows'::text as why_raw_nullable_field_is_rejected;

-- 3D. Planned future migration order (commented only; do not execute here):
--
-- Step 1. Add nullable printed_identity_modifier column.
-- Step 2. Backfill only explicitly proven delta-species rows.
-- Step 3. Re-run 3A + 3B preflight duplicate audits; both must return zero rows.
-- Step 4. Create the new identity unique index concurrently:
--
-- create unique index concurrently uq_card_prints_identity_v2
--   on public.card_prints (
--     set_id,
--     number_plain,
--     coalesce(printed_identity_modifier, ''),
--     coalesce(variant_key, '')
--   )
--   where set_id is not null
--     and number_plain is not null;
--
-- Step 5. Update all writers/readers that currently assume the old three-part key.
-- Step 6. If any legacy identity unique index exists in a target environment, drop it
--         only after uq_card_prints_identity_v2 is live and preflight remains clean.
--
-- Rollback principle:
-- - If Step 4 fails, keep the new column nullable and untrusted by writers.
-- - Do not rewrite data or gv_id values until the uniqueness gate passes.

-- ============================================================================
-- PHASE 4 — BACKFILL PLAN
-- ============================================================================

-- 4A. Candidate discovery query.
select
  cp.id,
  cp.set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id,
  case
    when cp.name like '%δ%' then 'delta_symbol'
    when cp.name ~* '\bdelta species\b' then 'delta_species_text'
    else null
  end as proof_signal
from public.card_prints cp
where cp.name like '%δ%'
   or cp.name ~* '\bdelta species\b'
order by cp.set_code nulls last, cp.number_plain nulls last, cp.id;

-- 4B. Manual review surface (names that mention delta-like wording without explicit proof).
select
  cp.id,
  cp.set_code,
  cp.name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id
from public.card_prints cp
where lower(cp.name) like '%delta%'
  and cp.name not like '%δ%'
  and cp.name !~* '\bdelta species\b'
order by cp.set_code nulls last, cp.number_plain nulls last, cp.id;

-- 4C. cel25 final-row dependency probe.
with source_row as (
  select
    cp.id as old_parent_id,
    cp.name as old_name,
    cpi.printed_number,
    nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as base_number_plain
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cp.id = 'f7c22698-daa3-4412-84ef-436fb1fe130f'
)
select
  s.old_parent_id,
  s.old_name,
  s.printed_number,
  cp.id as target_id,
  cp.name as target_name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id,
  case when cp.name like '%δ%' then 'delta_species' else null end as modeled_printed_identity_modifier
from source_row s
join public.card_prints cp
  on cp.set_code = 'cel25'
 and cp.gv_id is not null
 and cp.number_plain = s.base_number_plain
order by cp.id;

-- ============================================================================
-- PHASE 5 — GV-ID PLAN
-- ============================================================================

select *
from (
  values
    (
      'A',
      'embed explicit modifier token in gv_id',
      'GV-PK-SET-93-DELTA and GV-PK-SET-93-DELTA-CC',
      true,
      'recommended: preserves readability and deterministic uniqueness while keeping printed_identity_modifier orthogonal to variant_key'
    ),
    (
      'B',
      'opaque sequence / rely on db uniqueness only',
      'opaque internal numbering',
      false,
      'rejected: breaks human readability and undermines the current gv_id contract'
    ),
    (
      'C',
      'reuse printed-number style or letter suffix',
      'GV-PK-SET-93D or GV-PK-SET-93A-style',
      false,
      'rejected: invents pseudo-number semantics and collides with existing printed-number / suffix lanes'
    )
) as t(option_key, option_name, example_shape, recommended, decision_reason)
order by option_key;

select
  'explicit_modifier_token_grandfather_existing_non_null_gvids'::text as recommended_gvid_strategy,
  'future builder shape: GV-PK-{SET}-{NUMBER}-DELTA for base delta rows; GV-PK-{SET}-{NUMBER}-DELTA-{VARIANT_SUFFIX} when variant_key is also present'::text as builder_shape,
  'existing non-null gv_id rows remain unchanged in the initial schema rollout; delta-aware generation applies to newly created rows or rows assigned after the field exists'::text as rollout_boundary;

-- ============================================================================
-- PHASE 6 — RESOLVER / SEARCH IMPACT PLAN
-- ============================================================================

select
  'resolver/search design guardrail'::text as topic,
  'base and delta rows must remain distinct canonical entries; normalization must not strip δ or delta_species during match planning'::text as requirement;

-- ============================================================================
-- PHASE 7 / 8 — IMPLEMENTATION AND VERIFICATION GATES
-- ============================================================================

select
  'verification_gates'::text as gate_group,
  json_build_array(
    'column exists on public.card_prints',
    'allowed values constrained to null|delta_species',
    'proposed unique key preflight returns zero duplicate groups',
    'new identity unique index exists and validates cleanly',
    'delta rows remain distinct from base rows',
    'delta-aware gv_id generation is deterministic for new/null-gvid rows',
    'cel25 final row becomes lawfully resolvable only after schema + backfill support exist'
  ) as gates;

rollback;
