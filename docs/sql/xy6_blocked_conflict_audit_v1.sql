-- XY6_BLOCKED_CONFLICT_AUDIT_V1
-- Read-only audit for the final blocked xy6 row.

begin;

drop table if exists tmp_xy6_blocked_row_v1;
drop table if exists tmp_xy6_blocked_candidates_v1;
drop table if exists tmp_xy6_blocked_source_evidence_v1;
drop table if exists tmp_xy6_blocked_metrics_v1;
drop table if exists tmp_xy6_blocked_classification_v1;

create temp table tmp_xy6_blocked_row_v1 on commit drop as
select
  cp.id as old_parent_id,
  cp.name,
  coalesce(cp.number_plain, nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')) as number_plain,
  cp.variant_key,
  cpi.printed_number as old_printed_token,
  nullif(substring(cpi.printed_number from '^[0-9]+([A-Za-z]+)$'), '') as source_suffix,
  lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\s+', ' ', 'g')) as exact_name_key,
  btrim(
    regexp_replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                  chr(96),
                  ''''
                ),
                chr(180),
                ''''
              ),
              chr(8212),
              ' '
            ),
            chr(8211),
            ' '
          ),
          '-gx',
          ' gx'
        ),
        '-ex',
        ' ex'
      ),
      '\s+',
      ' ',
      'g'
    )
  ) as normalized_name,
  nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
from public.card_print_identity cpi
join public.card_prints cp
  on cp.id = cpi.card_print_id
where cp.id = 'dc8c3dce-bede-47d2-ac8a-095bb633a3ba'
  and cpi.identity_domain = 'pokemon_eng_standard'
  and cpi.set_code_identity = 'xy6'
  and cpi.is_active = true;

create temp table tmp_xy6_blocked_source_evidence_v1 on commit drop as
select
  b.old_parent_id,
  em.external_id as source_external_id,
  p.provenance_ref as source_provenance_ref
from tmp_xy6_blocked_row_v1 b
left join public.external_mappings em
  on em.card_print_id = b.old_parent_id
 and em.source = 'tcgdex'
left join public.card_printings p
  on p.card_print_id = b.old_parent_id
 and p.finish_key = 'normal';

create temp table tmp_xy6_blocked_candidates_v1 on commit drop as
select
  b.old_parent_id,
  cp.id as candidate_id,
  cp.gv_id,
  cp.name,
  cp.number as candidate_number,
  cp.number_plain,
  cp.variant_key,
  em.external_id as candidate_external_id,
  p.provenance_ref as candidate_provenance_ref,
  case
    when cp.number = b.old_printed_token
      and lower(regexp_replace(btrim(cp.name), '\s+', ' ', 'g')) = b.exact_name_key
      then 'exact'
    when cp.number = b.old_printed_token
      and btrim(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(cp.name), chr(8217), ''''),
                      chr(96),
                      ''''
                    ),
                    chr(180),
                    ''''
                  ),
                  chr(8212),
                  ' '
                ),
                chr(8211),
                ' '
              ),
              '-gx',
              ' gx'
            ),
            '-ex',
            ' ex'
          ),
          '\s+',
          ' ',
          'g'
        )
      ) = b.normalized_name
      then 'normalized'
    when cp.number_plain = b.normalized_token
      and btrim(
        regexp_replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(lower(cp.name), chr(8217), ''''),
                      chr(96),
                      ''''
                    ),
                    chr(180),
                    ''''
                  ),
                  chr(8212),
                  ' '
                ),
                chr(8211),
                ' '
              ),
              '-gx',
              ' gx'
            ),
            '-ex',
            ' ex'
          ),
          '\s+',
          ' ',
          'g'
        )
      ) = b.normalized_name
      and cp.number ~ ('^' || b.normalized_token || '[A-Za-z]+$')
      then 'suffix'
    when cp.number_plain = b.normalized_token
      then 'partial'
    else 'other'
  end as match_type
from tmp_xy6_blocked_row_v1 b
join public.card_prints cp
  on cp.set_code = 'xy6'
 and cp.gv_id is not null
 and cp.number_plain = b.normalized_token
 and btrim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(lower(cp.name), chr(8217), ''''),
                    chr(96),
                    ''''
                  ),
                  chr(180),
                  ''''
                ),
                chr(8212),
                ' '
              ),
              chr(8211),
              ' '
            ),
            '-gx',
            ' gx'
          ),
          '-ex',
          ' ex'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) = b.normalized_name
left join public.external_mappings em
  on em.card_print_id = cp.id
 and em.source = 'tcgdex'
left join public.card_printings p
  on p.card_print_id = cp.id
 and p.finish_key = 'normal';

create temp table tmp_xy6_blocked_metrics_v1 on commit drop as
select
  b.old_parent_id,
  count(c.candidate_id)::int as candidate_count,
  count(*) filter (where c.match_type = 'exact')::int as exact_candidate_count,
  count(*) filter (where c.match_type = 'normalized')::int as normalized_candidate_count,
  count(*) filter (where c.match_type = 'suffix')::int as suffix_candidate_count,
  count(distinct c.number_plain)::int as distinct_number_plain_count,
  count(distinct c.candidate_number)::int as distinct_candidate_number_count,
  count(distinct c.name)::int as distinct_candidate_name_count,
  count(*) filter (where c.candidate_number = b.old_printed_token)::int as exact_token_candidate_count,
  count(*) filter (where c.candidate_number <> b.old_printed_token)::int as non_exact_token_candidate_count,
  bool_or(c.candidate_number = b.old_printed_token and coalesce(c.candidate_external_id, '') = 'xy6-77') as exact_token_candidate_has_source_id,
  bool_or(c.candidate_number ~ ('^' || b.normalized_token || '[A-Za-z]+$')) as has_suffix_candidate,
  min(se.source_external_id) as source_external_id,
  min(se.source_provenance_ref) as source_provenance_ref
from tmp_xy6_blocked_row_v1 b
left join tmp_xy6_blocked_candidates_v1 c
  on c.old_parent_id = b.old_parent_id
left join tmp_xy6_blocked_source_evidence_v1 se
  on se.old_parent_id = b.old_parent_id
group by b.old_parent_id;

create temp table tmp_xy6_blocked_classification_v1 on commit drop as
select
  b.old_parent_id as row_id,
  case
    when m.candidate_count > 1
      and m.exact_token_candidate_count = 1
      and m.non_exact_token_candidate_count = 1
      and m.suffix_candidate_count = 1
      and b.source_suffix is null
      then 'MULTI_CANONICAL_TARGET_CONFLICT'
    when m.candidate_count > 1
      then 'MULTI_CANONICAL_TARGET_CONFLICT'
    when m.candidate_count = 0
      then 'PROMOTION_REQUIRED'
    else 'OTHER'
  end as classification,
  case
    when m.candidate_count > 1
      and m.exact_token_candidate_count = 1
      and m.non_exact_token_candidate_count = 1
      and m.suffix_candidate_count = 1
      and b.source_suffix is null
      then
        'The blocked row normalizes to two same-set canonical targets: one preserves the exact printed token (`77`) and one is a suffixed variant (`77a`). The generic base-variant pipeline groups by normalized name + base token, so both targets remain reachable even though the source evidence is unsuffixed.'
    when m.candidate_count > 1 then
        'Multiple canonical targets remain reachable from the blocked row and the current normalization path cannot reduce them safely.'
    when m.candidate_count = 0 then
        'No lawful canonical target exists inside xy6.'
    else
        'Residual blocked surface requires narrower governance.'
  end as reasoning,
  case
    when m.candidate_count > 1
      and m.exact_token_candidate_count = 1
      and m.non_exact_token_candidate_count = 1
      and m.suffix_candidate_count = 1
      and b.source_suffix is null
      then
        'Collapse is blocked in the current runner because the row reaches both `77` and `77a`. The runner has no built-in exact-token precedence rule, so it treats the normalized group as ambiguous and fails closed.'
    when m.candidate_count > 1 then
        'Collapse is blocked because more than one canonical target remains valid.'
    when m.candidate_count = 0 then
        'Collapse is blocked because there is no target.'
    else
        'Collapse is blocked pending narrower governance.'
  end as why_collapse_is_blocked
from tmp_xy6_blocked_row_v1 b
join tmp_xy6_blocked_metrics_v1 m
  on m.old_parent_id = b.old_parent_id;

-- PHASE 1 — target row extraction
select
  old_parent_id,
  name,
  number_plain,
  variant_key,
  normalized_name,
  normalized_token
from tmp_xy6_blocked_row_v1;

-- PHASE 2 — candidate target analysis
select
  old_parent_id,
  candidate_id,
  gv_id,
  name,
  number_plain,
  variant_key,
  match_type
from tmp_xy6_blocked_candidates_v1
order by candidate_number, candidate_id;

-- PHASE 3 / 4 — proof output
select
  c.row_id,
  c.classification,
  c.reasoning,
  coalesce(
    (
      select json_agg(
        json_build_object(
          'candidate_id', t.candidate_id,
          'gv_id', t.gv_id,
          'name', t.name,
          'number_plain', t.number_plain,
          'variant_key', t.variant_key,
          'printed_number', t.candidate_number,
          'match_type', t.match_type,
          'external_id', t.candidate_external_id,
          'provenance_ref', t.candidate_provenance_ref
        )
        order by t.candidate_number, t.candidate_id
      )
      from tmp_xy6_blocked_candidates_v1 t
      where t.old_parent_id = c.row_id
    ),
    '[]'::json
  ) as candidate_targets,
  c.why_collapse_is_blocked
from tmp_xy6_blocked_classification_v1 c;

-- PHASE 5 — final classification
select
  count(*)::int as blocked_row_count,
  json_build_object(
    'MULTI_CANONICAL_TARGET_CONFLICT', count(*) filter (where classification = 'MULTI_CANONICAL_TARGET_CONFLICT'),
    'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES', count(*) filter (where classification = 'TOKEN_COLLISION_WITH_DISTINCT_IDENTITIES'),
    'SUFFIX_OWNERSHIP_CONFLICT', count(*) filter (where classification = 'SUFFIX_OWNERSHIP_CONFLICT'),
    'PROMOTION_REQUIRED', count(*) filter (where classification = 'PROMOTION_REQUIRED'),
    'IDENTITY_MODEL_GAP', count(*) filter (where classification = 'IDENTITY_MODEL_GAP'),
    'OTHER', count(*) filter (where classification = 'OTHER'),
    'UNCLASSIFIED', 0
  ) as classification_counts
from tmp_xy6_blocked_classification_v1;

rollback;
