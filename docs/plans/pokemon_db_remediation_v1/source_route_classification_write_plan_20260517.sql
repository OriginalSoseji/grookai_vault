-- SOURCE ROUTE CLASSIFICATION WRITE PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE AS-IS AGAINST PRODUCTION.
--
-- Scope:
--   shiny-vault -> sma
--   rm          -> ru1
--
-- This file is safe by default. The executable section is read-only.
-- The future write section is fully commented and requires separate approval.
--
-- No migrations.
-- No set creation.
-- No set deletion.
-- No card_print inserts.
-- No card_print updates.
-- No external_mappings updates.
-- No metadata merge.
-- No variant writes.

begin transaction read only;

-- Scope must be exactly the two source-route candidates.
with write_scope(alias_code, canonical_code) as (
  values
    ('shiny-vault', 'sma'),
    ('rm', 'ru1')
)
select 'scope_review' as gate, *
from write_scope
order by alias_code;
-- Expected: exactly two rows.

-- Required columns must still exist.
select 'required_column_gate' as gate, required.column_name
from (
  values
    ('set_code'),
    ('is_canon'),
    ('canon_source'),
    ('notes'),
    ('pokemonapi_set_id'),
    ('tcgdex_set_id'),
    ('canonical_set_code'),
    ('tcgdex_asset_code')
) as required(column_name)
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'set_code_classification'
 and c.column_name = required.column_name
where c.column_name is null;
-- Expected: zero rows.

-- Conflict key assumption must still hold.
select 'set_code_primary_key_gate' as gate, tc.constraint_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'set_code_classification'
  and tc.constraint_type = 'PRIMARY KEY'
  and kcu.column_name = 'set_code';
-- Expected: one row.

-- Current alias/source route rows must still be absent.
select 'current_alias_absence_gate' as gate, set_code, is_canon, canonical_set_code, canon_source
from public.set_code_classification
where lower(set_code) in ('shiny-vault', 'rm');
-- Expected: zero rows.

-- Canonical target classification rows must exist.
select 'canonical_classification_gate' as gate, set_code, is_canon, canonical_set_code, canon_source
from public.set_code_classification
where set_code in ('sma', 'ru1')
order by set_code;
-- Expected:
--   ru1 is canon=true
--   sma is canon=true

-- No set rows should exist for source-route aliases.
select 'alias_set_absence_gate' as gate, code, name
from public.sets
where game = 'pokemon'
  and lower(code) in ('shiny-vault', 'rm');
-- Expected: zero rows.

-- Canonical target set rows must exist.
select 'canonical_set_presence_gate' as gate, code, name, printed_total, printed_set_abbrev
from public.sets
where game = 'pokemon'
  and code in ('sma', 'ru1')
order by code;
-- Expected: sma and ru1 rows.

-- Canonical target card counts must match source-route equivalence evidence.
select 'canonical_card_count_gate' as gate, s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp on cp.set_id = s.id
where s.game = 'pokemon'
  and s.code in ('sma', 'ru1')
group by s.code
order by s.code;
-- Expected: ru1=16, sma=94.

-- Source aliases must not currently own direct card_print rows.
select 'alias_card_print_absence_gate' as gate, cp.set_code, count(*) as card_print_rows
from public.card_prints cp
where lower(cp.set_code) in ('shiny-vault', 'rm')
group by cp.set_code;
-- Expected: zero rows.

-- Active external mappings must remain on canonical target cards only.
select 'canonical_external_mapping_snapshot' as gate, s.code, em.source, count(*) as mapping_rows
from public.sets s
join public.card_prints cp on cp.set_id = s.id
left join public.external_mappings em
  on em.card_print_id = cp.id
 and em.active = true
where s.game = 'pokemon'
  and s.code in ('sma', 'ru1')
group by s.code, em.source
order by s.code, em.source;
-- Current evidence: tcgdex mappings cover both sets.

-- Public function/view caveat inventory.
select 'public_route_function_inventory' as gate, p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('list_set_codes', 'search_cards_in_set')
order by p.proname;
-- Expected: inventory only. These direct functions do not prove alias resolution.

rollback;

-- FUTURE WRITE SECTION
-- Keep commented. Do not execute without explicit approval.
--
-- Required manual gates before uncommenting:
--   1. supabase migration list --linked shows no local-only or remote-only rows.
--   2. npm run preflight reports zero critical failures.
--   3. node scripts/audits/source_route_equivalence_evidence_v1.mjs reports:
--      candidates_audited=2, exact_equivalence_passes=2,
--      matched_identity_count=110, missing_in_db_count=0, extra_in_db_count=0.
--   4. Read-only SQL gates above match expected results.
--   5. Reviewer explicitly approves source-route classification inserts only.
--
-- begin;
--
-- -- Snapshot current classification/card evidence.
-- select 'prewrite_classification_snapshot' as snapshot, *
-- from public.set_code_classification
-- where set_code in ('shiny-vault', 'rm', 'sma', 'ru1')
-- order by set_code;
--
-- select 'prewrite_card_count_snapshot' as snapshot, s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sma', 'ru1')
-- group by s.code
-- order by s.code;
--
-- -- Insert source route for PkmnCards Shiny Vault collection.
-- insert into public.set_code_classification (
--   set_code,
--   is_canon,
--   canon_source,
--   notes,
--   pokemonapi_set_id,
--   tcgdex_set_id,
--   canonical_set_code,
--   tcgdex_asset_code
-- )
-- select
--   'shiny-vault',
--   false,
--   'source_route',
--   '2026-05-17 source-route plan: PkmnCards Shiny Vault is a 94/94 exact checklist match to canonical sma; no set/card/metadata/mapping movement.',
--   null,
--   null,
--   'sma',
--   null
-- where not exists (
--   select 1 from public.set_code_classification where set_code = 'shiny-vault'
-- );
-- -- Expected affected rows: 1.
--
-- -- Insert source route for PkmnCards Rumble abbreviation RM.
-- insert into public.set_code_classification (
--   set_code,
--   is_canon,
--   canon_source,
--   notes,
--   pokemonapi_set_id,
--   tcgdex_set_id,
--   canonical_set_code,
--   tcgdex_asset_code
-- )
-- select
--   'rm',
--   false,
--   'source_route',
--   '2026-05-17 source-route plan: PkmnCards Rumble/RM is a 16/16 exact checklist match to canonical ru1; no set/card/metadata/mapping movement.',
--   null,
--   null,
--   'ru1',
--   null
-- where not exists (
--   select 1 from public.set_code_classification where set_code = 'rm'
-- );
-- -- Expected affected rows: 1.
--
-- -- Post-write verification inside the transaction.
-- select 'route_result' as check_name, set_code, is_canon, canonical_set_code, canon_source
-- from public.set_code_classification
-- where set_code in ('shiny-vault', 'rm')
-- order by set_code;
-- -- Expected:
-- --   rm          false ru1 source_route
-- --   shiny-vault false sma source_route
--
-- select 'canonical_card_count_check' as check_name, s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sma', 'ru1')
-- group by s.code
-- order by s.code;
-- -- Expected: ru1=16, sma=94.
--
-- select 'alias_card_print_absence_check' as check_name, cp.set_code, count(*) as card_print_rows
-- from public.card_prints cp
-- where lower(cp.set_code) in ('shiny-vault', 'rm')
-- group by cp.set_code;
-- -- Expected: zero rows.
--
-- select 'alias_set_absence_check' as check_name, code, name
-- from public.sets
-- where game = 'pokemon'
--   and lower(code) in ('shiny-vault', 'rm');
-- -- Expected: zero rows.
--
-- -- Use rollback for dry-run execution. Replace with commit only after approval.
-- rollback;

-- ROLLBACK SQL SHAPE
-- Preferred rollback is transaction rollback before commit.
--
-- Current source-route state is row absence for shiny-vault and rm. This plan
-- intentionally contains no DELETE statement. Exact post-commit removal of
-- either inserted row requires a separate approved rollback plan.

-- POST-WRITE VERIFICATION QUERIES
-- Run after a separately approved future write.
--
-- select set_code, is_canon, canonical_set_code, canon_source, notes
-- from public.set_code_classification
-- where set_code in ('shiny-vault', 'rm')
-- order by set_code;
--
-- select s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sma', 'ru1')
-- group by s.code
-- order by s.code;
--
-- select cp.set_code, count(*) as card_print_rows
-- from public.card_prints cp
-- where lower(cp.set_code) in ('shiny-vault', 'rm')
-- group by cp.set_code;
