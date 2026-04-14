-- CONTROLLED_GROWTH_INGESTION_PIPELINE_V1
-- Read-only audit surface for JustTCG raw intake under controlled growth mode.
-- Canonical writes are forbidden. This query only inspects raw_imports, set mappings,
-- and current canonical rows to show the safe comparison surface.

begin;

create temp view controlled_growth_ingestion_classified_v1 as
with raw_cards as (
  select
    ri.id as raw_id,
    ri.ingested_at as ingestion_timestamp,
    ri.payload,
    nullif(trim(ri.payload->>'id'), '') as upstream_id,
    nullif(trim(ri.payload->>'tcgplayerId'), '') as tcgplayer_id,
    nullif(trim(ri.payload->>'name'), '') as raw_name,
    nullif(trim(ri.payload->>'number'), '') as raw_number,
    nullif(trim(ri.payload->>'set'), '') as raw_set,
    nullif(trim(ri.payload->>'set_name'), '') as raw_set_name,
    nullif(trim(ri.payload->>'rarity'), '') as raw_rarity
  from public.raw_imports ri
  where ri.source = 'justtcg'
    and coalesce(ri.payload->>'_kind', '') = 'card'
),
set_mapping_surface as (
  select
    jsm.justtcg_set_id,
    array_agg(distinct s.code order by s.code) as candidate_set_codes,
    count(*)::int as candidate_set_count
  from public.justtcg_set_mappings jsm
  join public.sets s
    on s.id = jsm.grookai_set_id
  where jsm.active is true
  group by jsm.justtcg_set_id
),
normalized as (
  select
    rc.raw_id,
    rc.ingestion_timestamp,
    rc.upstream_id,
    rc.tcgplayer_id,
    rc.raw_name,
    rc.raw_number,
    rc.raw_set,
    rc.raw_set_name,
    case
      when rc.raw_number is null then null
      when upper(replace(regexp_replace(rc.raw_number, '\s+', '', 'g'), '∕', '/')) = 'N/A' then null
      when rc.raw_number ~ '/' then upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1))
      else upper(regexp_replace(rc.raw_number, '\s+', '', 'g'))
    end as normalized_number,
    case
      when rc.raw_name is null then null
      else trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              replace(replace(replace(replace(rc.raw_name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
              '([A-Za-z0-9])(?:\s*-\s*|\s+)+GX$',
              '\1-GX',
              'i'
            ),
            '([A-Za-z0-9])(?:\s*-\s*|\s+)+EX$',
            '\1-EX',
            'i'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    end as normalized_name,
    case
      when rc.raw_number is null then null
      when upper(replace(regexp_replace(rc.raw_number, '\s+', '', 'g'), '∕', '/')) = 'N/A' then null
      when upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)) ~ '^RC0*[0-9]+$'
        then regexp_replace(upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)), '^RC0*', '')
      when upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)) ~ '^0*[0-9]+$'
        then regexp_replace(upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)), '^0*', '')
      when upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)) ~ '^0*[0-9]+[A-Z]+$'
        then regexp_replace(upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)), '^0*([0-9]+)[A-Z]+$', '\1')
      else null
    end as extracted_number_plain,
    case
      when upper(split_part(regexp_replace(coalesce(rc.raw_number, ''), '\s+', '', 'g'), '/', 1)) ~ '^RC0*[0-9]+$' then 'rc'
      else ''
    end as inferred_variant_key,
    case
      when rc.raw_number is null then true
      when upper(replace(regexp_replace(rc.raw_number, '\s+', '', 'g'), '∕', '/')) = 'N/A' then true
      when upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)) ~ '^0*[0-9]+$' then false
      when upper(split_part(regexp_replace(rc.raw_number, '\s+', '', 'g'), '/', 1)) ~ '^RC0*[0-9]+$' then false
      else true
    end as review_token
  from raw_cards rc
),
comparison_surface as (
  select
    n.raw_id,
    n.ingestion_timestamp,
    n.raw_name,
    n.raw_number,
    n.raw_set,
    n.normalized_name,
    n.normalized_number,
    n.review_token,
    nullif(n.extracted_number_plain, '') as extracted_number_plain,
    sms.candidate_set_codes,
    sms.candidate_set_count,
    count(cp.id)::int as strict_candidate_count,
    min(cp.id::text) as candidate_card_print_id
  from normalized n
  left join set_mapping_surface sms
    on sms.justtcg_set_id = n.raw_set
  left join public.justtcg_set_mappings jsm
    on jsm.justtcg_set_id = n.raw_set
   and jsm.active is true
  left join public.card_prints cp
    on cp.set_id = jsm.grookai_set_id
   and cp.gv_id is not null
   and cp.number_plain = nullif(n.extracted_number_plain, '')
   and coalesce(cp.variant_key, '') = coalesce(n.inferred_variant_key, '')
   and lower(
     trim(
       regexp_replace(
         regexp_replace(
           regexp_replace(
             replace(replace(replace(replace(cp.name, '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
             '([A-Za-z0-9])(?:\s*-\s*|\s+)+GX$',
             '\1 GX',
             'i'
           ),
           '([A-Za-z0-9])(?:\s*-\s*|\s+)+EX$',
           '\1 EX',
           'i'
         ),
         '\s+',
         ' ',
         'g'
       )
     )
   ) = lower(
     trim(
       regexp_replace(
         regexp_replace(
           regexp_replace(
             replace(replace(replace(replace(coalesce(n.normalized_name, ''), '’', ''''), '‘', ''''), '—', ' '), '–', ' '),
             '([A-Za-z0-9])(?:\s*-\s*|\s+)+GX$',
             '\1 GX',
             'i'
           ),
           '([A-Za-z0-9])(?:\s*-\s*|\s+)+EX$',
           '\1 EX',
           'i'
         ),
         '\s+',
         ' ',
         'g'
       )
     )
   )
  group by
    n.raw_id,
    n.ingestion_timestamp,
    n.raw_name,
    n.raw_number,
    n.raw_set,
    n.normalized_name,
    n.normalized_number,
    n.review_token,
    n.extracted_number_plain,
    sms.candidate_set_codes,
    sms.candidate_set_count
),
classified as (
  select
    cs.*,
    case
      when cs.raw_name is null
        or cs.raw_set is null
        or cs.raw_number is null
        or upper(cs.raw_number) = 'N/A'
        or coalesce(cs.raw_name, '') ~* '\mcode\s*card\M'
        then 'NON_CANONICAL'
      when coalesce(cs.candidate_set_count, 0) = 0
        then 'NEEDS_REVIEW'
      when coalesce(cs.candidate_set_count, 0) > 1
        then 'NEEDS_REVIEW'
      when cs.review_token
        then 'NEEDS_REVIEW'
      when cs.strict_candidate_count = 1
        then 'MATCHED'
      when cs.strict_candidate_count > 1
        then 'NEEDS_REVIEW'
      else 'PROMOTION_CANDIDATE'
    end as classification
  from comparison_surface cs
)
select *
from classified;

select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  ingestion_timestamp
from controlled_growth_ingestion_classified_v1
order by raw_id;

select
  classification,
  count(*)::int as row_count
from controlled_growth_ingestion_classified_v1
group by classification
order by classification;

select
  raw_id,
  raw_name,
  raw_number,
  raw_set,
  ingestion_timestamp,
  normalized_name,
  normalized_number,
  extracted_number_plain,
  case
    when candidate_set_codes is null then null
    else array_to_string(candidate_set_codes, ',')
  end as candidate_set_mapping,
  candidate_card_print_id,
  classification
from controlled_growth_ingestion_classified_v1
order by raw_id
limit 200;

rollback;
