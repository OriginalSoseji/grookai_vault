-- COL1_NAMESPACE_MIGRATION_V1
-- Read-only dry-run proof for canonical col1 namespace migration.

-- 1. Candidate surface and derived target namespace.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.number,
    cp.set_code,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-CL-', 'GV-PK-COL-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'col1'
    and cp.gv_id like 'GV-PK-CL-%'
)
select
  count(*)::int as candidate_count,
  count(distinct new_gv_id)::int as distinct_new_count,
  count(*) filter (where new_gv_id is null)::int as null_new_gv_id_count
from candidates;

-- 2. Canonical lane size and namespace occupancy checks.
select
  count(*)::int as canonical_col1_total_rows,
  count(*) filter (where gv_id like 'GV-PK-CL-%')::int as canonical_legacy_namespace_count,
  count(*) filter (where gv_id like 'GV-PK-COL-%')::int as canonical_new_namespace_count
from public.card_prints
where set_code = 'col1'
  and gv_id is not null;

-- 3. Internal and live collision audit for the proposed namespace rewrite.
with candidates as (
  select
    cp.id as card_print_id,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-CL-', 'GV-PK-COL-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'col1'
    and cp.gv_id like 'GV-PK-CL-%'
)
select
  (select count(*)::int
   from (
     select new_gv_id
     from candidates
     group by new_gv_id
     having count(*) > 1
   ) dup) as internal_collision_count,
  (select count(*)::int
   from public.card_prints cp
   join candidates c
     on cp.gv_id = c.new_gv_id
    and cp.id <> c.card_print_id) as live_collision_count,
  (select count(*)::int
   from public.card_prints
   where set_code = 'col1'
     and gv_id like 'GV-PK-COL-%') as already_new_namespace_count;

-- 4. Verify no foreign key constraint references public.card_prints.gv_id.
select
  count(*)::int as gv_id_fk_reference_count
from (
  select con.oid
  from pg_constraint con
  join pg_class referenced_table
    on referenced_table.oid = con.confrelid
  join pg_namespace referenced_namespace
    on referenced_namespace.oid = referenced_table.relnamespace
  join unnest(con.confkey) with ordinality as referenced_cols(attnum, ordinality)
    on true
  join pg_attribute referenced_attr
    on referenced_attr.attrelid = con.confrelid
   and referenced_attr.attnum = referenced_cols.attnum
  where con.contype = 'f'
    and referenced_namespace.nspname = 'public'
    and referenced_table.relname = 'card_prints'
  group by con.oid
  having bool_or(referenced_attr.attname = 'gv_id')
) fk_refs;

-- 5. Sample old -> new mapping rows.
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.gv_id as old_gv_id,
  replace(cp.gv_id, 'GV-PK-CL-', 'GV-PK-COL-') as new_gv_id
from public.card_prints cp
where cp.set_code = 'col1'
  and cp.gv_id like 'GV-PK-CL-%'
order by
  case when cp.number ~ '^SL[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int,
  cp.number,
  cp.id
limit 25;

-- 6. Live denormalized gv_id surfaces that must stay aligned.
with candidates as (
  select
    cp.id as card_print_id,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-CL-', 'GV-PK-COL-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'col1'
    and cp.gv_id like 'GV-PK-CL-%'
)
select
  (select count(*)::int
   from public.vault_items vi
   join candidates c on c.card_print_id = vi.card_id
   where vi.gv_id = c.old_gv_id) as vault_items_old_match_count,
  (select count(*)::int
   from public.vault_items vi
   join candidates c on c.card_print_id = vi.card_id
   where vi.gv_id = c.new_gv_id) as vault_items_new_match_count,
  (select count(*)::int
   from public.vault_items vi
   join candidates c on c.card_print_id = vi.card_id
   where vi.gv_id is not null
     and vi.gv_id <> c.old_gv_id
     and vi.gv_id <> c.new_gv_id) as vault_items_mismatch_count,
  (select count(*)::int
   from public.shared_cards sc
   join candidates c on c.card_print_id = sc.card_id
   where sc.gv_id = c.old_gv_id) as shared_cards_old_match_count,
  (select count(*)::int
   from public.shared_cards sc
   join candidates c on c.card_print_id = sc.card_id
   where sc.gv_id = c.new_gv_id) as shared_cards_new_match_count,
  (select count(*)::int
   from public.shared_cards sc
   join candidates c on c.card_print_id = sc.card_id
   where sc.gv_id is not null
     and sc.gv_id <> c.old_gv_id
     and sc.gv_id <> c.new_gv_id) as shared_cards_mismatch_count,
  (select count(*)::int
   from public.web_events
   where gv_id like 'GV-PK-CL-%') as web_events_legacy_count;

-- 7. Verification anchors.
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.gv_id as old_gv_id,
  replace(cp.gv_id, 'GV-PK-CL-', 'GV-PK-COL-') as new_gv_id
from public.card_prints cp
where cp.set_code = 'col1'
  and cp.number in ('11', '35', 'SL10')
order by
  case when cp.number ~ '^SL[0-9]+$' then 1 else 0 end,
  nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int,
  cp.number;
