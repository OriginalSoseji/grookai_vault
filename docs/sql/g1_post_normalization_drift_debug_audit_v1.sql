-- G1_POST_NORMALIZATION_DRIFT_REPAIR_DEBUG_AUDIT_V1
-- Read-only debug audit for the residual canonical normalization drift in g1.
-- Goal:
--   - extract the exact 6 flagged rows
--   - compute full NAME_NORMALIZE_V3 display output
--   - classify the exact failure rule per row
--   - prove whether the remaining drift is a logic mismatch or an execution gap

begin;

with drift_rows as (
  select
    cp.id,
    cp.name as current_name,
    cp.number,
    cp.number_plain,
    coalesce(cp.variant_key, '') as variant_key,
    cp.gv_id
  from public.card_prints cp
  where cp.set_code = 'g1'
    and cp.gv_id is not null
    and (
      cp.name like '%' || chr(8217) || '%'
      or cp.name like '% GX%'
      or cp.name like '% EX%'
      or cp.name like '%' || chr(8212) || '%'
      or cp.name like '%' || chr(8211) || '%'
    )
),
apostrophe_normalized as (
  select
    d.*,
    replace(
      replace(
        replace(
          replace(d.current_name, chr(8216), ''''),
          chr(8217),
          ''''
        ),
        chr(96),
        ''''
      ),
      chr(180),
      ''''
    ) as name_after_apostrophes
  from drift_rows d
),
dash_normalized as (
  select
    a.*,
    replace(
      replace(a.name_after_apostrophes, chr(8212), ' '),
      chr(8211),
      ' '
    ) as name_after_dashes
  from apostrophe_normalized a
),
whitespace_normalized as (
  select
    d.*,
    btrim(regexp_replace(d.name_after_dashes, '\s+', ' ', 'g')) as name_after_whitespace
  from dash_normalized d
),
suffix_normalized as (
  select
    w.*,
    btrim(
      regexp_replace(
        regexp_replace(
          w.name_after_whitespace,
          '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$',
          E'\\1-GX',
          'i'
        ),
        '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+EX$',
        E'\\1-EX',
        'i'
      )
    ) as normalized_name_expected
  from whitespace_normalized w
),
comparison_keys as (
  select
    s.*,
    lower(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(s.current_name, '[' || chr(8216) || chr(8217) || '`´]', '''', 'g'),
            '[' || chr(8212) || chr(8211) || ']',
            ' ',
            'g'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as current_v3_key,
    lower(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(s.normalized_name_expected, '-GX$', ' GX', 'i'),
            '-EX$',
            ' EX',
            'i'
          ),
          '\s+',
          ' ',
          'g'
        )
      )
    ) as normalized_v3_key
  from suffix_normalized s
),
failure_audit as (
  select
    c.*,
    (c.current_name is distinct from c.name_after_apostrophes) as apostrophe_rule_changed,
    (c.name_after_apostrophes is distinct from c.name_after_dashes) as dash_rule_changed,
    (c.name_after_dashes is distinct from c.name_after_whitespace) as whitespace_rule_changed,
    (c.name_after_whitespace is distinct from regexp_replace(c.name_after_whitespace, '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$', E'\\1-GX', 'i')) as gx_rule_changed,
    (regexp_replace(c.name_after_whitespace, '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$', E'\\1-GX', 'i') is distinct from c.normalized_name_expected)
      as ex_rule_changed,
    (
      ((c.current_name is distinct from c.name_after_apostrophes)::int) +
      ((c.name_after_apostrophes is distinct from c.name_after_dashes)::int) +
      ((c.name_after_dashes is distinct from c.name_after_whitespace)::int) +
      ((c.name_after_whitespace is distinct from regexp_replace(c.name_after_whitespace, '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$', E'\\1-GX', 'i'))::int) +
      ((regexp_replace(c.name_after_whitespace, '([[:alnum:]])(?:[[:space:]]*-[[:space:]]*|[[:space:]]+)+GX$', E'\\1-GX', 'i') is distinct from c.normalized_name_expected)::int)
    ) as rules_required_count
  from comparison_keys c
),
classified as (
  select
    f.*,
    case
      when rules_required_count > 1 then 'MULTIPLE_RULES_REQUIRED_BUT_NOT_APPLIED'
      when ex_rule_changed then 'EX_NOT_CONVERTED'
      when gx_rule_changed then 'GX_NOT_CONVERTED'
      when apostrophe_rule_changed then 'UNICODE_APOSTROPHE_MISMATCH'
      when dash_rule_changed then 'DASH_NORMALIZATION_INCOMPLETE'
      when whitespace_rule_changed then 'WHITESPACE_COLLAPSE_INCOMPLETE'
      else 'UNEXPLAINED'
    end as failure_type,
    case
      when current_name is distinct from normalized_name_expected
        then current_name || ' -> ' || normalized_name_expected
      else current_name
    end as delta
  from failure_audit f
)

-- PHASE 1 — exact drift rows
select
  id,
  current_name as name,
  number,
  number_plain,
  variant_key,
  gv_id
from classified
order by number_plain, variant_key, id;

-- PHASE 2 — full normalization computation
select
  id,
  current_name,
  normalized_name_expected,
  delta,
  current_v3_key,
  normalized_v3_key
from classified
order by number_plain, variant_key, id;

-- PHASE 3 — failure mode identification
select
  id,
  current_name,
  normalized_name_expected,
  failure_type,
  rules_required_count,
  apostrophe_rule_changed,
  dash_rule_changed,
  whitespace_rule_changed,
  gx_rule_changed,
  ex_rule_changed
from classified
order by number_plain, variant_key, id;

-- PHASE 4 / 5 — update gap summary and deterministic fix proof
select
  count(*)::int as drift_row_count,
  count(*) filter (where failure_type = 'EX_NOT_CONVERTED')::int as ex_not_converted_count,
  count(*) filter (where failure_type = 'GX_NOT_CONVERTED')::int as gx_not_converted_count,
  count(*) filter (where failure_type = 'UNICODE_APOSTROPHE_MISMATCH')::int as apostrophe_mismatch_count,
  count(*) filter (where failure_type = 'DASH_NORMALIZATION_INCOMPLETE')::int as dash_incomplete_count,
  count(*) filter (where failure_type = 'WHITESPACE_COLLAPSE_INCOMPLETE')::int as whitespace_incomplete_count,
  count(*) filter (where failure_type = 'MULTIPLE_RULES_REQUIRED_BUT_NOT_APPLIED')::int as multi_rule_count,
  count(*) filter (where failure_type = 'UNEXPLAINED')::int as unexplained_count,
  count(*) filter (where current_v3_key is distinct from normalized_v3_key)::int as semantic_key_drift_count
from classified;

rollback;
