-- SET ALIAS ROUTE CLASSIFICATION WRITE PLAN 2026-05-17
-- STATUS: PLAN ONLY. DO NOT EXECUTE AS-IS AGAINST PRODUCTION.
--
-- Scope:
--   sv3pt5 -> sv03.5
--   sm35   -> sm3.5
--
-- This file is a reviewable SQL plan only. The only executable section by
-- default is the read-only preflight audit below. The future write section is
-- fully commented and must not be executed without separate approval.
--
-- No migrations.
-- No set-row merge.
-- No alias row deletion.
-- No card_print updates.
-- No external_mappings updates.
-- No external_printing_mappings updates.
-- No metadata merge.

begin transaction read only;

-- Scope must be exactly the two route fixes.
with write_scope(alias_code, canonical_code) as (
  values
    ('sv3pt5', 'sv03.5'),
    ('sm35', 'sm3.5')
),
excluded_codes(code) as (
  values
    ('sv04.5'), ('sv4pt5'),
    ('pgo'), ('swsh10.5'),
    ('sv08.5'), ('sv8pt5'),
    ('sv06.5'), ('sv6pt5'),
    ('bog'), ('bp'),
    ('tk-ex-m'), ('tk2b'),
    ('tk-ex-p'), ('tk2a'),
    ('tk-ex-latia'), ('tk1a'),
    ('tk-ex-latio'), ('tk1b')
)
select 'scope_excluded_code_gate' as gate, ws.*
from write_scope ws
join excluded_codes ec
  on ec.code in (ws.alias_code, ws.canonical_code);
-- Expected: zero rows.

-- Required table columns must still exist.
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

-- Conflict key assumption must still hold before any future insert/upsert.
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

-- Alias and canonical set rows must exist.
with required_codes(code, role) as (
  values
    ('sv3pt5', 'alias'),
    ('sm35', 'alias'),
    ('sv03.5', 'canonical'),
    ('sm3.5', 'canonical')
)
select 'set_row_presence_gate' as gate, rc.code, rc.role
from required_codes rc
left join public.sets s
  on s.game = 'pokemon'
 and s.code = rc.code
where s.id is null;
-- Expected: zero rows.

-- Alias rows must still own zero card_prints.
select 'alias_card_print_gate' as gate, s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp
  on cp.set_id = s.id
where s.game = 'pokemon'
  and s.code in ('sv3pt5', 'sm35')
group by s.code
having count(cp.id) <> 0;
-- Expected: zero rows.

-- Alias rows must still own zero legacy cards rows.
select 'alias_legacy_cards_gate' as gate, s.code, count(c.id) as legacy_card_rows
from public.sets s
left join public.cards c
  on c.set_id = s.id
where s.game = 'pokemon'
  and s.code in ('sv3pt5', 'sm35')
group by s.code
having count(c.id) <> 0;
-- Expected: zero rows.

-- Canonical target rows must still own card_prints.
select 'canonical_card_print_gate' as gate, s.code, count(cp.id) as card_print_rows
from public.sets s
left join public.card_prints cp
  on cp.set_id = s.id
where s.game = 'pokemon'
  and s.code in ('sv03.5', 'sm3.5')
group by s.code
having count(cp.id) = 0;
-- Expected: zero rows.

-- Alias rows must still own zero card-level external mappings.
select 'alias_external_mapping_gate' as gate, s.code, count(em.id) as mapping_rows
from public.sets s
join public.card_prints cp
  on cp.set_id = s.id
join public.external_mappings em
  on em.card_print_id = cp.id
where s.game = 'pokemon'
  and s.code in ('sv3pt5', 'sm35')
group by s.code
having count(em.id) <> 0;
-- Expected: zero rows.

-- Alias rows must still own zero printing-level external mappings.
select 'alias_external_printing_mapping_gate' as gate, s.code, count(epm.id) as printing_mapping_rows
from public.sets s
join public.card_prints cp
  on cp.set_id = s.id
join public.card_printings cpn
  on cpn.card_print_id = cp.id
join public.external_printing_mappings epm
  on epm.card_printing_id = cpn.id
where s.game = 'pokemon'
  and s.code in ('sv3pt5', 'sm35')
group by s.code
having count(epm.id) <> 0;
-- Expected: zero rows.

-- Alias set rows must not own set-level JustTCG mappings.
select 'alias_justtcg_mapping_gate' as gate, s.code, count(jsm.id) as justtcg_mapping_rows
from public.sets s
left join public.justtcg_set_mappings jsm
  on jsm.grookai_set_id = s.id
where s.game = 'pokemon'
  and s.code in ('sv3pt5', 'sm35')
group by s.code
having count(jsm.id) <> 0;
-- Expected: zero rows.

-- Current classification state must still match the approved evidence.
select 'current_sv3pt5_state_gate' as gate, set_code, is_canon, canonical_set_code, canon_source, notes
from public.set_code_classification
where set_code = 'sv3pt5';
-- Expected: one row with is_canon=true and canonical_set_code='sv3pt5'.

select 'current_sm35_absence_gate' as gate, set_code, is_canon, canonical_set_code, canon_source, notes
from public.set_code_classification
where set_code = 'sm35';
-- Expected: zero rows.

-- Hidden FK discovery gate. This lists direct FKs to public.sets(id). A future
-- executor must confirm sv3pt5/sm35 have zero rows for every non-card table.
select 'direct_set_fk_inventory' as gate, tc.table_name, kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and ccu.table_schema = 'public'
  and ccu.table_name = 'sets'
  and ccu.column_name = 'id'
order by tc.table_name, kcu.column_name;
-- Expected: inventory only. Pair-specific zero counts are enforced by
-- scripts/audits/set_alias_prewrite_evidence_v1.mjs before future writes.

rollback;

-- FUTURE WRITE SECTION
-- Keep this section commented. Do not execute as-is.
--
-- Required manual gates before uncommenting:
--   1. supabase migration list --linked shows no local-only or remote-only rows.
--   2. scripts/audits/set_alias_prewrite_evidence_v1.mjs reports zero blockers.
--   3. Read-only SQL gates above match expected results.
--   4. Reviewer explicitly approves route-classification writes only.
--
-- begin;
--
-- -- Snapshot rows for rollback evidence.
-- select 'prewrite_classification_snapshot' as snapshot, *
-- from public.set_code_classification
-- where set_code in ('sv3pt5', 'sm35', 'sv03.5', 'sm3.5')
-- order by set_code;
--
-- select 'prewrite_card_count_snapshot' as snapshot, s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35', 'sv03.5', 'sm3.5')
-- group by s.code
-- order by s.code;
--
-- -- Route sv3pt5 to canonical sv03.5.
-- update public.set_code_classification
-- set
--   is_canon = false,
--   canon_source = 'alias',
--   canonical_set_code = 'sv03.5',
--   notes = concat_ws(
--     E'\n',
--     nullif(notes, ''),
--     '2026-05-17 route-classification plan: sv3pt5 is a permanent alias of sv03.5; no set/card/metadata/mapping movement.'
--   )
-- where set_code = 'sv3pt5'
--   and is_canon = true
--   and canonical_set_code = 'sv3pt5';
-- -- Expected affected rows: 1.
--
-- -- Insert sm35 as a permanent alias route to canonical sm3.5.
-- -- This plan intentionally uses insert after an absence gate. If a future
-- -- executor chooses upsert, it must first reconfirm set_code is still the
-- -- primary key and that any conflicting sm35 row is safe to replace.
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
--   'sm35',
--   false,
--   'alias',
--   '2026-05-17 route-classification plan: sm35 is a permanent alias of sm3.5; no set/card/metadata/mapping movement.',
--   null,
--   null,
--   'sm3.5',
--   null
-- where not exists (
--   select 1
--   from public.set_code_classification
--   where set_code = 'sm35'
-- );
-- -- Expected affected rows: 1.
--
-- -- Post-write verification inside the still-open transaction.
-- select 'route_result' as check_name, set_code, is_canon, canonical_set_code, canon_source
-- from public.set_code_classification
-- where set_code in ('sv3pt5', 'sm35')
-- order by set_code;
-- -- Expected:
-- --   sm35   false sm3.5   alias
-- --   sv3pt5 false sv03.5  alias
--
-- select 'alias_card_print_zero_check' as check_name, s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35')
-- group by s.code
-- order by s.code;
-- -- Expected: both rows have card_print_rows=0.
--
-- select 'canonical_card_count_check' as check_name, s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sv03.5', 'sm3.5')
-- group by s.code
-- order by s.code;
-- -- Expected from current evidence: sv03.5=210, sm3.5=78.
--
-- select 'alias_external_mapping_zero_check' as check_name, s.code, count(em.id) as mapping_rows
-- from public.sets s
-- join public.card_prints cp on cp.set_id = s.id
-- join public.external_mappings em on em.card_print_id = cp.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35')
-- group by s.code
-- order by s.code;
-- -- Expected: zero rows.
--
-- select 'excluded_scope_untouched_check' as check_name, set_code, is_canon, canonical_set_code
-- from public.set_code_classification
-- where set_code in (
--   'sv04.5', 'sv4pt5',
--   'pgo', 'swsh10.5',
--   'sv08.5', 'sv8pt5',
--   'sv06.5', 'sv6pt5',
--   'bog', 'bp',
--   'tk-ex-m', 'tk2b',
--   'tk-ex-p', 'tk2a',
--   'tk-ex-latia', 'tk1a',
--   'tk-ex-latio', 'tk1b'
-- )
-- order by set_code;
-- -- Expected: review output only; no rows should have been modified by this transaction.
--
-- -- Use rollback for dry-run execution. Replace with commit only after explicit approval.
-- rollback;

-- ROLLBACK SQL SHAPE
-- Preferred rollback is the transaction rollback above, before commit.
--
-- If a committed sv3pt5 route update must be reverted under separate approval:
--
-- begin;
-- update public.set_code_classification
-- set
--   is_canon = true,
--   canon_source = 'pokemonapi',
--   canonical_set_code = 'sv3pt5',
--   pokemonapi_set_id = null,
--   tcgdex_set_id = null,
--   tcgdex_asset_code = null,
--   notes = 'Canonical SV pt5 expansion; promoted after identity audit'
-- where set_code = 'sv3pt5';
-- rollback; -- replace with commit only after separate rollback approval.
--
-- Current sm35 state is row absence. This plan intentionally contains no
-- DELETE statement. Exact post-commit removal of sm35 requires a separate
-- approved rollback plan. Before commit, transaction rollback removes the
-- uncommitted sm35 insert.

-- POST-WRITE VERIFICATION QUERIES
-- Run after a separately approved future write.
--
-- select set_code, is_canon, canonical_set_code, canon_source, notes
-- from public.set_code_classification
-- where set_code in ('sv3pt5', 'sm35')
-- order by set_code;
--
-- select s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35')
-- group by s.code
-- order by s.code;
--
-- select s.code, count(cp.id) as card_print_rows
-- from public.sets s
-- left join public.card_prints cp on cp.set_id = s.id
-- where s.game = 'pokemon'
--   and s.code in ('sv03.5', 'sm3.5')
-- group by s.code
-- order by s.code;
--
-- select s.code, count(em.id) as mapping_rows
-- from public.sets s
-- join public.card_prints cp on cp.set_id = s.id
-- join public.external_mappings em on em.card_print_id = cp.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35')
-- group by s.code
-- order by s.code;
--
-- select s.code, count(epm.id) as printing_mapping_rows
-- from public.sets s
-- join public.card_prints cp on cp.set_id = s.id
-- join public.card_printings cpn on cpn.card_print_id = cp.id
-- join public.external_printing_mappings epm on epm.card_printing_id = cpn.id
-- where s.game = 'pokemon'
--   and s.code in ('sv3pt5', 'sm35')
-- group by s.code
-- order by s.code;
