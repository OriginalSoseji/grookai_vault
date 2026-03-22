-- TCGplayer Mapping Dry Run V1
-- Read-only analysis against ingest.tcgplayer_products_stage -> public.card_prints.
-- Persistent writes are forbidden. TEMP TABLE creation only.

drop table if exists tmp_tcgplayer_stage_norm;
drop table if exists tmp_canonical_phase1;
drop table if exists tmp_exact_match_candidates;
drop table if exists tmp_stage_match_counts;
drop table if exists tmp_stage_status;
drop table if exists tmp_duplicate_stage_tcgplayer_ids;
drop table if exists tmp_exact_unique_matches;
drop table if exists tmp_duplicate_canonical_targets;
drop table if exists tmp_existing_tcgplayer_external_ids;
drop table if exists tmp_existing_tcgplayer_card_print_ids;

create temp table tmp_tcgplayer_stage_norm as
select
  s.id as stage_row_id,
  s.imported_at,
  s.batch_id,
  s.tcgplayer_id,
  s.set_code_hint,
  s.number as stage_number,
  s.name as stage_name,
  upper(btrim(coalesce(s.set_code_hint, ''))) as normalized_set_code_hint,
  upper(btrim(coalesce(s.number, ''))) as normalized_stage_number,
  nullif(btrim(s.set_code_hint), '') is null as missing_set_code_hint,
  nullif(btrim(s.number), '') is null as missing_number,
  nullif(btrim(s.name), '') is null as missing_name
from ingest.tcgplayer_products_stage s;

create temp table tmp_canonical_phase1 as
select
  cp.id as card_print_id,
  cp.set_code as canonical_set_code,
  cp.number as canonical_number,
  cp.name as canonical_name,
  upper(btrim(coalesce(cp.set_code, ''))) as normalized_canonical_set_code,
  upper(btrim(coalesce(cp.number, ''))) as normalized_canonical_number
from public.card_prints cp
where cp.set_code is not null
  and coalesce(cp.number, '') ~ '^[0-9A-Za-z]+$';

create temp table tmp_exact_match_candidates as
select
  s.stage_row_id,
  s.batch_id,
  s.tcgplayer_id,
  s.set_code_hint,
  s.stage_number,
  s.stage_name,
  c.card_print_id,
  c.canonical_set_code,
  c.canonical_number,
  c.canonical_name
from tmp_tcgplayer_stage_norm s
join tmp_canonical_phase1 c
  on s.normalized_set_code_hint = c.normalized_canonical_set_code
 and s.normalized_stage_number = c.normalized_canonical_number
where not s.missing_set_code_hint
  and not s.missing_number;

create temp table tmp_stage_match_counts as
select
  s.stage_row_id,
  count(c.card_print_id) as match_count_for_stage_row
from tmp_tcgplayer_stage_norm s
left join tmp_exact_match_candidates c
  on c.stage_row_id = s.stage_row_id
group by s.stage_row_id;

create temp table tmp_stage_status as
select
  s.stage_row_id,
  s.batch_id,
  s.tcgplayer_id,
  s.set_code_hint,
  s.stage_number,
  s.stage_name,
  s.missing_set_code_hint,
  s.missing_number,
  s.missing_name,
  coalesce(mc.match_count_for_stage_row, 0) as match_count_for_stage_row,
  case
    when s.missing_set_code_hint then 'missing_set_code_hint'
    when s.missing_number then 'missing_number'
    when coalesce(mc.match_count_for_stage_row, 0) > 1 then 'ambiguous_canonical_match'
    when coalesce(mc.match_count_for_stage_row, 0) = 0 then 'no_canonical_match'
    else 'matched'
  end as reason
from tmp_tcgplayer_stage_norm s
left join tmp_stage_match_counts mc
  on mc.stage_row_id = s.stage_row_id;

create temp table tmp_duplicate_stage_tcgplayer_ids as
select
  btrim(tcgplayer_id) as tcgplayer_id,
  count(*) as stage_row_count
from tmp_tcgplayer_stage_norm
where nullif(btrim(tcgplayer_id), '') is not null
group by btrim(tcgplayer_id)
having count(*) > 1;

create temp table tmp_exact_unique_matches as
select
  c.batch_id,
  c.tcgplayer_id,
  c.set_code_hint,
  c.stage_number,
  c.canonical_set_code,
  c.canonical_number,
  c.canonical_name,
  c.card_print_id,
  c.stage_name,
  case
    when nullif(btrim(c.stage_name), '') is null then null
    else upper(btrim(c.stage_name)) = upper(btrim(c.canonical_name))
  end as name_match_flag,
  s.match_count_for_stage_row
from tmp_exact_match_candidates c
join tmp_stage_status s
  on s.stage_row_id = c.stage_row_id
where s.match_count_for_stage_row = 1;

create temp table tmp_duplicate_canonical_targets as
select
  card_print_id,
  count(distinct tcgplayer_id) as distinct_tcgplayer_ids
from tmp_exact_unique_matches
group by card_print_id
having count(distinct tcgplayer_id) > 1;

create temp table tmp_existing_tcgplayer_external_ids as
select distinct em.external_id
from public.external_mappings em
where em.source = 'tcgplayer';

create temp table tmp_existing_tcgplayer_card_print_ids as
select distinct em.card_print_id
from public.external_mappings em
where em.source = 'tcgplayer'
  and em.active = true;

-- A. Stage inventory summary
select
  count(*) as staged_rows,
  count(distinct batch_id) as distinct_batch_id,
  count(distinct tcgplayer_id) as distinct_tcgplayer_id,
  count(*) filter (where nullif(btrim(set_code_hint), '') is null) as null_or_blank_set_code_hint,
  count(*) filter (where nullif(btrim(stage_number), '') is null) as null_or_blank_number,
  count(*) filter (where nullif(btrim(stage_name), '') is null) as null_or_blank_name
from tmp_tcgplayer_stage_norm;

-- B. Safe canonical scope summary
select
  count(*) filter (where cp.set_code is not null) as total_canonical_with_set_code,
  count(*) filter (
    where cp.set_code is not null
      and coalesce(cp.number, '') ~ '^[0-9A-Za-z]+$'
  ) as phase1_scope_rows,
  count(*) filter (
    where cp.set_code is not null
      and not (coalesce(cp.number, '') ~ '^[0-9A-Za-z]+$')
  ) as excluded_symbolic_or_special_rows
from public.card_prints cp;

-- C. Normalization preview
select
  stage_row_id,
  batch_id,
  tcgplayer_id,
  stage_number as raw_number,
  normalized_stage_number as normalized_number
from tmp_tcgplayer_stage_norm
order by imported_at, stage_row_id
limit 25;

-- D. Exact deterministic join dry-run
select
  count(*) filter (where reason = 'matched') as matched_rows,
  count(*) filter (where reason in ('missing_set_code_hint', 'missing_number', 'no_canonical_match')) as unmatched_rows,
  count(*) filter (where reason = 'ambiguous_canonical_match') as ambiguous_rows,
  (select count(*) from tmp_duplicate_stage_tcgplayer_ids) as duplicate_tcgplayer_ids,
  (select count(*) from tmp_duplicate_canonical_targets) as duplicate_canonical_targets_hit_by_multiple_tcgplayer_ids
from tmp_stage_status;

-- E. High-confidence candidate result set
select
  batch_id,
  tcgplayer_id,
  set_code_hint,
  stage_number,
  canonical_set_code,
  canonical_number,
  canonical_name,
  card_print_id,
  stage_name,
  name_match_flag,
  match_count_for_stage_row
from tmp_exact_unique_matches
order by batch_id, tcgplayer_id, canonical_set_code, canonical_number, card_print_id;

-- F. Unmatched result set
select
  batch_id,
  tcgplayer_id,
  set_code_hint,
  stage_number as number,
  stage_name as name,
  reason
from tmp_stage_status
where reason <> 'matched'
order by batch_id, tcgplayer_id, stage_row_id;

-- G. Ambiguous result set
select
  c.batch_id,
  c.tcgplayer_id,
  c.set_code_hint,
  c.stage_number as number,
  c.stage_name,
  c.card_print_id,
  c.canonical_name,
  c.canonical_set_code,
  c.canonical_number
from tmp_exact_match_candidates c
join tmp_stage_status s
  on s.stage_row_id = c.stage_row_id
where s.reason = 'ambiguous_canonical_match'
order by c.batch_id, c.tcgplayer_id, c.set_code_hint, c.stage_number, c.card_print_id;

-- H. Insert-ready preview only
select
  eum.card_print_id,
  'tcgplayer'::text as source,
  eum.tcgplayer_id as external_id,
  true as active,
  now() as synced_at,
  jsonb_build_object(
    'backfill', 'tcgplayer_stage_v1',
    'batch_id', eum.batch_id,
    'match_method', 'set_code_hint+number_exact'
  ) as meta
from tmp_exact_unique_matches eum
left join tmp_duplicate_stage_tcgplayer_ids dsi
  on dsi.tcgplayer_id = btrim(eum.tcgplayer_id)
left join tmp_duplicate_canonical_targets dct
  on dct.card_print_id = eum.card_print_id
left join tmp_existing_tcgplayer_external_ids eei
  on eei.external_id = eum.tcgplayer_id
left join tmp_existing_tcgplayer_card_print_ids ecp
  on ecp.card_print_id = eum.card_print_id
where dsi.tcgplayer_id is null
  and dct.card_print_id is null
  and eei.external_id is null
  and ecp.card_print_id is null
order by eum.batch_id, eum.tcgplayer_id, eum.card_print_id;
