-- SMP_RECLASSIFICATION_AUDIT_V1
-- Exact read-only queries used by backend/identity/smp_reclassification_audit_v1.mjs.
-- Repo/canon-aware name normalization and gv_id namespace evaluation are computed
-- in the runner with normalizeCardNameV1 and buildCardPrintGvIdV1 after loading
-- these row sets.

-- Phase 1: unresolved smp surface counts and promo-code validation.
with unresolved as (
  select
    cp.id,
    cp.name,
    cpi.printed_number
  from public.card_print_identity cpi
  join public.card_prints cp
    on cp.id = cpi.card_print_id
  where cpi.is_active = true
    and cpi.identity_domain = 'pokemon_eng_standard'
    and cpi.set_code_identity = 'smp'
    and cp.gv_id is null
)
select
  count(*)::int as total_unresolved,
  count(*) filter (where printed_number ~ '^SM[0-9]+$')::int as valid_promo_code_count,
  count(*) filter (where printed_number !~ '^SM[0-9]+$')::int as invalid_promo_code_count
from unresolved;

-- Phase 2: canonical smp lane summary.
select
  count(*)::int as canonical_smp_total_rows,
  count(*) filter (where gv_id is not null)::int as canonical_smp_non_null_gvid_count
from public.card_prints
where set_code = 'smp';

-- Phase 2: canonical smp sample rows.
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.set_code = 'smp'
  and cp.gv_id is not null
order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id
limit 25;

-- Phase 3-6: unresolved smp rows loaded for repo/canon-aware mapping,
-- promotion readiness, qualifier review, and namespace audit.
select
  cp.id as old_id,
  cp.name as old_name,
  cp.variant_key,
  cpi.printed_number,
  cpi.normalized_printed_name,
  s.printed_set_abbrev
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
left join public.sets s
  on s.id = cp.set_id
where cpi.is_active = true
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'smp'
  and cp.gv_id is null
order by nullif(regexp_replace(cpi.printed_number, '^[^0-9]+', ''), '')::int, cp.id;

-- Phase 3-6: canonical smp rows loaded for repo/canon-aware mapping and namespace audit.
select
  cp.id as new_id,
  cp.name as new_name,
  cp.number,
  cp.number_plain,
  cp.variant_key,
  cp.gv_id,
  cp.set_code,
  s.printed_set_abbrev
from public.card_prints cp
left join public.sets s
  on s.id = cp.set_id
where cp.set_code = 'smp'
  and cp.gv_id is not null
order by nullif(regexp_replace(cp.number, '^[^0-9]+', ''), '')::int, cp.id;

-- Phase 4: live gv_id collision check for promotion candidates.
-- Runner passes the proposed gv_id list as $1::text[].
select
  cp.id,
  cp.gv_id,
  cp.name,
  cp.number,
  cp.set_code
from public.card_prints cp
where cp.gv_id = any($1::text[])
order by cp.gv_id, cp.id;

-- Phase 7: FK readiness snapshot for an arbitrary audited subset.
-- Runner passes the audited old parent ids as $1::uuid[].
with selected_ids as (
  select unnest($1::uuid[]) as card_print_id
)
select *
from (
  select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
    count(*)::int as row_count
  from public.card_print_identity
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'card_print_traits', 'card_print_id', count(*)::int
  from public.card_print_traits
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'card_printings', 'card_print_id', count(*)::int
  from public.card_printings
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'external_mappings', 'card_print_id', count(*)::int
  from public.external_mappings
  where card_print_id in (select card_print_id from selected_ids)
  union all
  select 'vault_items', 'card_id', count(*)::int
  from public.vault_items
  where card_id in (select card_print_id from selected_ids)
) readiness
order by table_name, column_name;
