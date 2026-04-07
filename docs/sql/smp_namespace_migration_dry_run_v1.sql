-- SMP_NAMESPACE_MIGRATION_V1
-- Read-only dry-run proof for canonical smp namespace migration.

-- 1. Candidate surface and derived target namespace.
with candidates as (
  select
    cp.id as card_print_id,
    cp.name,
    cp.number,
    cp.set_code,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-PR-SM-', 'GV-PK-SM-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'smp'
    and cp.gv_id like 'GV-PK-PR-SM-%'
)
select
  count(*)::int as candidate_count,
  count(distinct new_gv_id)::int as distinct_new_gv_id_count,
  count(*) filter (where new_gv_id is null)::int as null_new_gv_id_count
from candidates;

-- 2. Canonical lane size and namespace occupancy checks.
select
  count(*)::int as canonical_smp_total_rows,
  count(*) filter (where gv_id like 'GV-PK-PR-SM-%')::int as canonical_legacy_namespace_count,
  count(*) filter (where gv_id like 'GV-PK-SM-%')::int as canonical_new_namespace_count
from public.card_prints
where set_code = 'smp'
  and gv_id is not null;

-- 3. Internal and live collision audit.
with candidates as (
  select
    cp.id as card_print_id,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-PR-SM-', 'GV-PK-SM-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'smp'
    and cp.gv_id like 'GV-PK-PR-SM-%'
)
select
  (select count(*)::int from (
    select new_gv_id
    from candidates
    group by new_gv_id
    having count(*) > 1
  ) dup) as internal_collision_count,
  (select count(*)::int
   from public.card_prints cp
   join candidates c
     on cp.gv_id = c.new_gv_id
    and cp.id <> c.card_print_id) as live_collision_count;

-- 4. Sample old -> new mapping rows.
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.gv_id as old_gv_id,
  replace(cp.gv_id, 'GV-PK-PR-SM-', 'GV-PK-SM-') as new_gv_id
from public.card_prints cp
where cp.set_code = 'smp'
  and cp.gv_id like 'GV-PK-PR-SM-%'
order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id
limit 25;

-- 5. Live denormalized gv_id surfaces that must stay aligned.
with candidates as (
  select
    cp.id as card_print_id,
    cp.gv_id as old_gv_id,
    replace(cp.gv_id, 'GV-PK-PR-SM-', 'GV-PK-SM-') as new_gv_id
  from public.card_prints cp
  where cp.set_code = 'smp'
    and cp.gv_id like 'GV-PK-PR-SM-%'
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
   where gv_id like 'GV-PK-PR-SM-%') as web_events_legacy_count;

-- 6. Verification anchors.
select
  cp.id as card_print_id,
  cp.name,
  cp.number,
  cp.gv_id as old_gv_id,
  replace(cp.gv_id, 'GV-PK-PR-SM-', 'GV-PK-SM-') as new_gv_id
from public.card_prints cp
where cp.set_code = 'smp'
  and cp.number in ('SM01', 'SM100', 'SM248')
order by cp.number;
