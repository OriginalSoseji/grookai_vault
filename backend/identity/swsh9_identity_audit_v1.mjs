import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'SWSH9_IDENTITY_AUDIT_V1';
const TARGET_SET_CODE_IDENTITY = 'swsh9';
const TG_TARGET_SET_CODE = 'swsh9tg';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'swsh9_identity_audit_v1.json',
);

const EXPECTED_UNRESOLVED = {
  total: 120,
  numeric: 90,
  non_numeric: 30,
};

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonReport(report) {
  ensureOutputDir(JSON_OUTPUT_PATH);
  fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(report, null, 2));
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

function unresolvedCte(laneClause = '') {
  return `
    with unresolved as (
      select
        cp.id as card_print_id,
        cp.name as unresolved_name,
        cpi.printed_number,
        cpi.normalized_printed_name,
        case
          when cpi.printed_number ~ '^[0-9]+$' then 'numeric'
          else 'non_numeric'
        end as lane,
        case
          when nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') is null then null
          else coalesce(
            nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
            '0'
          )
        end as normalized_digits
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        ${laneClause}
    )
  `;
}

function swsh9CanonicalCte() {
  return `
    canonical as (
      select
        cp.id as canonical_card_print_id,
        cp.name as canonical_name,
        cp.number,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name,
        case
          when nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '') is null then null
          else coalesce(
            nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
            '0'
          )
        end as normalized_digits,
        cp.gv_id,
        cp.set_code
      from public.card_prints cp
      where cp.set_code = $2
        and cp.gv_id is not null
    )
  `;
}

function swsh9tgCanonicalCte() {
  return `
    canonical_tg as (
      select
        cp.id as canonical_card_print_id,
        cp.name as canonical_name,
        cp.number,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name,
        cp.gv_id,
        cp.set_code
      from public.card_prints cp
      where cp.set_code = $3
        and cp.gv_id is not null
    )
  `;
}

const SQL = {
  unresolvedCounts: `
    with unresolved as (
      select cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    )
    select
      count(*)::int as total_unresolved,
      count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_unresolved,
      count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
    from unresolved
  `,
  exactNumericOverlap: `
    ${unresolvedCte("and cpi.printed_number ~ '^[0-9]+$'")},
    ${swsh9CanonicalCte()},
    exact_map as (
      select
        u.card_print_id,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as same_name_same_number_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
      group by u.card_print_id
    )
    select
      count(*) filter (where canonical_match_count > 0)::int as numeric_with_canonical_match_count,
      count(*) filter (where canonical_match_count = 0)::int as numeric_without_canonical_match_count,
      count(*) filter (where same_name_same_number_count > 0)::int as numeric_same_name_same_number_overlap_count
    from exact_map
  `,
  exactNonNumericOverlapSwsh9: `
    ${unresolvedCte("and cpi.printed_number !~ '^[0-9]+$'")},
    ${swsh9CanonicalCte()},
    exact_map as (
      select
        u.card_print_id,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as same_name_same_number_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
      group by u.card_print_id
    )
    select
      count(*) filter (where canonical_match_count > 0)::int as tg_with_swsh9_canonical_match_count,
      count(*) filter (where canonical_match_count = 0)::int as tg_without_swsh9_canonical_match_count,
      count(*) filter (where same_name_same_number_count > 0)::int as tg_same_name_same_number_overlap_count
    from exact_map
  `,
  canonicalSwsh9Snapshot: `
    select
      count(*)::int as canonical_swsh9_total_rows,
      count(*) filter (where cp.number ~ '^[0-9]+$')::int as canonical_swsh9_numeric_rows,
      count(*) filter (where cp.number !~ '^[0-9]+$')::int as canonical_swsh9_non_numeric_rows
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
  `,
  canonicalSwsh9tgSnapshot: `
    select
      count(*)::int as canonical_swsh9tg_total_rows
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
  `,
  canonicalSwsh9NumericSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
      and cp.number ~ '^[0-9]+$'
    order by
      coalesce(nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''), '0')::int,
      cp.number,
      cp.id
    limit 25
  `,
  canonicalSwsh9NonNumericSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
      and cp.number !~ '^[0-9]+$'
    order by cp.number, cp.id
    limit 25
  `,
  canonicalSwsh9tgSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by cp.number, cp.id
    limit 25
  `,
  strictExactAuditSummary: `
    ${unresolvedCte()},
    ${swsh9CanonicalCte()},
    exact_map as (
      select
        u.lane,
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as strict_same_name_same_number_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name <> u.normalized_printed_name
        )::int as canonical_match_different_name_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
      group by u.lane, u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
    )
    select
      count(*) filter (
        where lane = 'numeric' and strict_same_name_same_number_count > 0
      )::int as strict_numeric_overlap_count,
      count(*) filter (where canonical_match_count > 1)::int as multiple_canonical_match_row_count,
      count(*) filter (where canonical_match_count = 0)::int as zero_canonical_match_row_count,
      count(*) filter (
        where canonical_match_count > 0
          and strict_same_name_same_number_count = 0
          and canonical_match_different_name_count > 0
      )::int as canonical_match_but_different_name_row_count
    from exact_map
  `,
  strictExactAuditRows: `
    ${unresolvedCte()},
    ${swsh9CanonicalCte()},
    exact_map as (
      select
        u.lane,
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as strict_same_name_same_number_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name <> u.normalized_printed_name
        )::int as canonical_match_different_name_count
      from unresolved u
      left join canonical c
        on c.number = u.printed_number
      group by u.lane, u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
    )
    select *
    from exact_map
    where canonical_match_count > 1
       or canonical_match_count = 0
       or (
         canonical_match_count > 0
         and strict_same_name_same_number_count = 0
         and canonical_match_different_name_count > 0
       )
    order by lane, printed_number, card_print_id
  `,
  normalizedDigitAuditSummary: `
    ${unresolvedCte()},
    ${swsh9CanonicalCte()},
    digit_map as (
      select
        u.lane,
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(c.canonical_card_print_id)::int as normalized_digit_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as normalized_digit_same_name_count
      from unresolved u
      left join canonical c
        on c.normalized_digits = u.normalized_digits
      group by u.lane, u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
    )
    select
      count(*) filter (
        where lane = 'numeric' and normalized_digit_match_count > 0
      )::int as numeric_normalized_digit_match_count,
      count(*) filter (
        where lane = 'numeric' and normalized_digit_same_name_count > 0
      )::int as numeric_normalized_digit_same_name_overlap_count,
      count(*) filter (
        where lane = 'numeric'
          and normalized_digit_match_count = 1
          and normalized_digit_same_name_count = 1
      )::int as numeric_duplicate_collapse_ready_count,
      count(*) filter (
        where lane = 'numeric' and normalized_digit_match_count > 1
      )::int as numeric_normalized_digit_multiple_match_count
    from digit_map
  `,
  normalizedDigitAuditRows: `
    ${unresolvedCte("and cpi.printed_number ~ '^[0-9]+$'")},
    ${swsh9CanonicalCte()},
    digit_map as (
      select
        u.card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(c.canonical_card_print_id)::int as normalized_digit_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as normalized_digit_same_name_count
      from unresolved u
      left join canonical c
        on c.normalized_digits = u.normalized_digits
      group by u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
    )
    select *
    from digit_map
    order by printed_number, card_print_id
  `,
  rawFamilyEvidenceSummary: `
    with tg_rows as (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number !~ '^[0-9]+$'
    ),
    tcgdex_mapping as (
      select tg.card_print_id
      from tg_rows tg
      join public.external_mappings em
        on em.card_print_id = tg.card_print_id
       and em.source = 'tcgdex'
       and em.active = true
    ),
    tcgdex_raw as (
      select distinct tg.card_print_id
      from tg_rows tg
      join public.external_mappings em
        on em.card_print_id = tg.card_print_id
       and em.source = 'tcgdex'
       and em.active = true
      join public.raw_imports ri
        on ri.source = 'tcgdex'
       and (
         (ri.payload -> 'card' ->> 'id') = em.external_id
         or (ri.payload ->> '_external_id') = em.external_id
       )
    )
    select
      (select count(*)::int from tcgdex_mapping) as tcgdex_active_external_mapping_count,
      (select count(*)::int from tcgdex_raw) as tcgdex_raw_link_count,
      (select count(*)::int from tcgdex_mapping) = (select count(*)::int from tg_rows)
        as all_non_numeric_rows_have_tcgdex_mapping,
      (select count(*)::int from tcgdex_raw) = (select count(*)::int from tg_rows)
        as all_non_numeric_rows_have_tcgdex_raw_link
  `,
  rawFamilyEvidenceSamples: `
    with tg_rows as (
      select
        cp.id as card_print_id,
        cp.name,
        cpi.printed_number
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number !~ '^[0-9]+$'
    )
    select
      tg.card_print_id,
      tg.name,
      tg.printed_number,
      em.external_id,
      ri.id as raw_import_id,
      coalesce(ri.payload -> 'card' ->> 'localId', ri.payload ->> 'localId') as payload_local_id,
      coalesce(
        ri.payload ->> 'set_external_id',
        ri.payload ->> '_set_external_id',
        ri.payload -> 'set' ->> 'id'
      ) as payload_set_id,
      ri.payload -> 'card' ->> 'name' as payload_name
    from tg_rows tg
    join public.external_mappings em
      on em.card_print_id = tg.card_print_id
     and em.source = 'tcgdex'
     and em.active = true
    join public.raw_imports ri
      on ri.source = 'tcgdex'
     and (
       (ri.payload -> 'card' ->> 'id') = em.external_id
       or (ri.payload ->> '_external_id') = em.external_id
     )
    order by tg.printed_number, ri.id
    limit 15
  `,
  tgFamilyTargetAuditSummary: `
    ${unresolvedCte("and cpi.printed_number !~ '^[0-9]+$'")},
    ${swsh9tgCanonicalCte()},
    match_map as (
      select
        u.card_print_id,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as strict_same_name_same_number_count
      from unresolved u
      left join canonical_tg c
        on c.number = u.printed_number
      group by u.card_print_id
    )
    select
      count(*) filter (where canonical_match_count > 0)::int as tg_with_swsh9tg_canonical_match_count,
      count(*) filter (where canonical_match_count = 0)::int as tg_without_swsh9tg_canonical_match_count,
      count(*) filter (
        where strict_same_name_same_number_count > 0
      )::int as tg_with_swsh9tg_strict_same_name_same_number_overlap_count,
      count(*) filter (where canonical_match_count > 1)::int as tg_with_swsh9tg_multiple_match_count
    from match_map
  `,
  tgFamilyTargetAuditRows: `
    ${unresolvedCte("and cpi.printed_number !~ '^[0-9]+$'")},
    ${swsh9tgCanonicalCte()},
    match_map as (
      select
        u.card_print_id as unresolved_card_print_id,
        u.unresolved_name,
        u.printed_number,
        count(c.canonical_card_print_id)::int as canonical_match_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name = u.normalized_printed_name
        )::int as strict_same_name_same_number_count,
        count(c.canonical_card_print_id) filter (
          where c.normalized_name <> u.normalized_printed_name
        )::int as canonical_match_different_name_count
      from unresolved u
      left join canonical_tg c
        on c.number = u.printed_number
      group by u.card_print_id, u.unresolved_name, u.printed_number, u.normalized_printed_name
    )
    select *
    from match_map
    order by printed_number, unresolved_card_print_id
  `,
  swsh9tgTargetSurfaceSummary: `
    with canonical_tg as (
      select
        cp.id as card_print_id
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
    ),
    active_identity as (
      select
        c.card_print_id,
        cpi.id as card_print_identity_id
      from canonical_tg c
      left join public.card_print_identity cpi
        on cpi.card_print_id = c.card_print_id
       and cpi.is_active = true
    )
    select
      (select count(*)::int from canonical_tg) as canonical_swsh9tg_count,
      count(*) filter (where card_print_identity_id is not null)::int as canonical_swsh9tg_with_active_identity_count,
      count(*) filter (where card_print_identity_id is null)::int as canonical_swsh9tg_without_active_identity_count
    from active_identity
  `,
  swsh9tgTargetSurfaceSamples: `
    with canonical_tg as (
      select
        cp.id as card_print_id,
        cp.name,
        cp.number,
        cp.gv_id,
        cp.set_code
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
    )
    select
      c.card_print_id,
      c.name,
      c.number,
      c.gv_id,
      c.set_code,
      cpi.id as card_print_identity_id,
      cpi.identity_domain,
      cpi.set_code_identity,
      cpi.printed_number
    from canonical_tg c
    left join public.card_print_identity cpi
      on cpi.card_print_id = c.card_print_id
     and cpi.is_active = true
    order by c.number, c.card_print_id
    limit 15
  `,
  unresolvedPromotionSurface: `
    select
      cp.id as card_print_id,
      cp.name,
      cp.variant_key,
      cpi.printed_number,
      s.printed_set_abbrev
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    left join public.sets s
      on s.id = cp.set_id
    where cpi.is_active = true
      and cpi.identity_domain = $1
      and cpi.set_code_identity = $2
      and cp.gv_id is null
    order by cpi.printed_number, cp.id
  `,
  liveRowsByGvId: `
    select
      id,
      gv_id,
      set_code,
      number,
      name
    from public.card_prints
    where gv_id = any($1::text[])
    order by gv_id, id
  `,
};

async function loadProposedGvIdAudit(client) {
  const sourceRows = await queryRows(client, SQL.unresolvedPromotionSurface, [
    TARGET_IDENTITY_DOMAIN,
    TARGET_SET_CODE_IDENTITY,
  ]);

  const enrichedRows = sourceRows.map((row) => {
    let proposed_gv_id = null;
    let derivation_error = null;

    try {
      proposed_gv_id = buildCardPrintGvIdV1({
        printedSetAbbrev: row.printed_set_abbrev,
        number: row.printed_number,
        variantKey: row.variant_key,
      });
    } catch (error) {
      derivation_error = error instanceof Error ? error.message : String(error);
    }

    return {
      card_print_id: row.card_print_id,
      name: row.name,
      printed_number: row.printed_number,
      printed_set_abbrev: row.printed_set_abbrev,
      proposed_gv_id,
      derivation_error,
    };
  });

  const proposedGvIds = enrichedRows.map((row) => row.proposed_gv_id).filter(Boolean);
  const liveRows =
    proposedGvIds.length === 0 ? [] : await queryRows(client, SQL.liveRowsByGvId, [proposedGvIds]);
  const liveByGvId = new Map(liveRows.map((row) => [row.gv_id, row]));
  const collisionRows = enrichedRows
    .filter((row) => row.proposed_gv_id && liveByGvId.has(row.proposed_gv_id))
    .map((row) => ({
      ...row,
      collides_with: liveByGvId.get(row.proposed_gv_id),
    }));

  return {
    missing_printed_set_abbrev_count: enrichedRows.filter((row) => !row.printed_set_abbrev).length,
    derivation_error_count: enrichedRows.filter((row) => row.derivation_error).length,
    numeric_live_gvid_collision_count: collisionRows.filter((row) => /^[0-9]+$/.test(row.printed_number))
      .length,
    non_numeric_live_gvid_collision_count: collisionRows.filter(
      (row) => !/^[0-9]+$/.test(row.printed_number),
    ).length,
    numeric_collision_samples: collisionRows
      .filter((row) => /^[0-9]+$/.test(row.printed_number))
      .slice(0, 15),
    non_numeric_collision_samples: collisionRows
      .filter((row) => !/^[0-9]+$/.test(row.printed_number))
      .slice(0, 15),
  };
}

function buildClassification() {
  return {
    final_classification: 'OUTCOME D — MIXED EXECUTION',
    next_phase_recommendation:
      'Set-scoped mixed execution for swsh9: collapse the 90 zero-padded numeric duplicate parents onto canonical swsh9 base rows using normalized-digit plus normalized-name one-to-one proof, then family-realign the 30 TG rows onto the existing canonical swsh9tg parents that already own GV-PK-BRS-TG01 through GV-PK-BRS-TG30. Do not run numeric promotion and do not mint new swsh9 TG gv_id rows.',
    exact_next_execution_mode:
      'NUMERIC_DUPLICATE_COLLAPSE_BY_NORMALIZED_DIGITS + TG_FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH9TG',
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'swsh9_identity_audit_v1',
  });

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    assertEqual(normalizeCount(unresolvedCounts?.total_unresolved), EXPECTED_UNRESOLVED.total, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(
      normalizeCount(unresolvedCounts?.numeric_unresolved),
      EXPECTED_UNRESOLVED.numeric,
      'UNRESOLVED_NUMERIC_DRIFT',
    );
    assertEqual(
      normalizeCount(unresolvedCounts?.non_numeric_unresolved),
      EXPECTED_UNRESOLVED.non_numeric,
      'UNRESOLVED_NON_NUMERIC_DRIFT',
    );

    const numericLaneFindings = await queryOne(client, SQL.exactNumericOverlap, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const nonNumericSwsh9Findings = await queryOne(client, SQL.exactNonNumericOverlapSwsh9, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalSwsh9Snapshot = await queryOne(client, SQL.canonicalSwsh9Snapshot, [
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalSwsh9tgSnapshot = await queryOne(client, SQL.canonicalSwsh9tgSnapshot, [
      TG_TARGET_SET_CODE,
    ]);
    const canonicalSwsh9NumericSamples = await queryRows(client, SQL.canonicalSwsh9NumericSamples, [
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalSwsh9NonNumericSamples = await queryRows(
      client,
      SQL.canonicalSwsh9NonNumericSamples,
      [TARGET_SET_CODE_IDENTITY],
    );
    const canonicalSwsh9tgSamples = await queryRows(client, SQL.canonicalSwsh9tgSamples, [
      TG_TARGET_SET_CODE,
    ]);
    const strictExactAuditSummary = await queryOne(client, SQL.strictExactAuditSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const strictExactAuditRows = await queryRows(client, SQL.strictExactAuditRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const normalizedDigitAuditSummary = await queryOne(client, SQL.normalizedDigitAuditSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const normalizedDigitAuditRows = await queryRows(client, SQL.normalizedDigitAuditRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const rawFamilyEvidence = await queryOne(client, SQL.rawFamilyEvidenceSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const rawFamilySamples = await queryRows(client, SQL.rawFamilyEvidenceSamples, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const tgFamilyTargetAudit = await queryOne(client, SQL.tgFamilyTargetAuditSummary, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
      TG_TARGET_SET_CODE,
    ]);
    const tgFamilyTargetRows = await queryRows(client, SQL.tgFamilyTargetAuditRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
      TG_TARGET_SET_CODE,
    ]);
    const swsh9tgTargetSurface = await queryOne(client, SQL.swsh9tgTargetSurfaceSummary, [
      TG_TARGET_SET_CODE,
    ]);
    const swsh9tgTargetSamples = await queryRows(client, SQL.swsh9tgTargetSurfaceSamples, [
      TG_TARGET_SET_CODE,
    ]);
    const proposedGvIdAudit = await loadProposedGvIdAudit(client);

    if (normalizeCount(canonicalSwsh9Snapshot?.canonical_swsh9_non_numeric_rows) !== 0) {
      throw new Error(
        `CANONICAL_SWSH9_NON_NUMERIC_DRIFT:${canonicalSwsh9Snapshot?.canonical_swsh9_non_numeric_rows ?? 'null'}`,
      );
    }
    if (normalizeCount(strictExactAuditSummary?.multiple_canonical_match_row_count) !== 0) {
      throw new Error(
        `MULTIPLE_CANONICAL_MATCHES:${strictExactAuditSummary?.multiple_canonical_match_row_count ?? 'null'}`,
      );
    }
    if (
      normalizeCount(normalizedDigitAuditSummary?.numeric_duplicate_collapse_ready_count) !==
        EXPECTED_UNRESOLVED.numeric ||
      normalizeCount(normalizedDigitAuditSummary?.numeric_normalized_digit_multiple_match_count) !== 0
    ) {
      throw new Error(`NUMERIC_DUPLICATE_PROOF_WEAK:${JSON.stringify(normalizedDigitAuditSummary)}`);
    }
    if (
      rawFamilyEvidence?.all_non_numeric_rows_have_tcgdex_mapping !== true ||
      rawFamilyEvidence?.all_non_numeric_rows_have_tcgdex_raw_link !== true
    ) {
      throw new Error(`RAW_FAMILY_EVIDENCE_WEAK:${JSON.stringify(rawFamilyEvidence)}`);
    }
    if (
      normalizeCount(
        tgFamilyTargetAudit?.tg_with_swsh9tg_strict_same_name_same_number_overlap_count,
      ) !== EXPECTED_UNRESOLVED.non_numeric ||
      normalizeCount(tgFamilyTargetAudit?.tg_with_swsh9tg_multiple_match_count) !== 0
    ) {
      throw new Error(`TG_FAMILY_TARGET_PROOF_WEAK:${JSON.stringify(tgFamilyTargetAudit)}`);
    }
    if (normalizeCount(swsh9tgTargetSurface?.canonical_swsh9tg_with_active_identity_count) !== 0) {
      throw new Error(
        `TG_TARGET_ACTIVE_IDENTITY_OCCUPIED:${swsh9tgTargetSurface?.canonical_swsh9tg_with_active_identity_count ?? 'null'}`,
      );
    }
    if (
      normalizeCount(proposedGvIdAudit.missing_printed_set_abbrev_count) !== 0 ||
      normalizeCount(proposedGvIdAudit.derivation_error_count) !== 0
    ) {
      throw new Error(`GV_ID_DERIVATION_BLOCKED:${JSON.stringify(proposedGvIdAudit)}`);
    }

    const report = {
      phase: PHASE,
      generated_at: new Date().toISOString(),
      target_set_code_identity: TARGET_SET_CODE_IDENTITY,
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      total_unresolved: normalizeCount(unresolvedCounts?.total_unresolved),
      numeric_unresolved: normalizeCount(unresolvedCounts?.numeric_unresolved),
      non_numeric_unresolved: normalizeCount(unresolvedCounts?.non_numeric_unresolved),
      numeric_with_canonical_match: normalizeCount(
        numericLaneFindings?.numeric_with_canonical_match_count,
      ),
      numeric_without_canonical_match: normalizeCount(
        numericLaneFindings?.numeric_without_canonical_match_count,
      ),
      tg_with_swsh9_canonical_match: normalizeCount(
        nonNumericSwsh9Findings?.tg_with_swsh9_canonical_match_count,
      ),
      tg_without_swsh9_canonical_match: normalizeCount(
        nonNumericSwsh9Findings?.tg_without_swsh9_canonical_match_count,
      ),
      tg_with_swsh9tg_canonical_match: normalizeCount(
        tgFamilyTargetAudit?.tg_with_swsh9tg_canonical_match_count,
      ),
      tg_without_swsh9tg_canonical_match: normalizeCount(
        tgFamilyTargetAudit?.tg_without_swsh9tg_canonical_match_count,
      ),
      strict_numeric_overlap_count: normalizeCount(
        strictExactAuditSummary?.strict_numeric_overlap_count,
      ),
      strict_tg_family_overlap_count: normalizeCount(
        tgFamilyTargetAudit?.tg_with_swsh9tg_strict_same_name_same_number_overlap_count,
      ),
      unresolved_counts: unresolvedCounts,
      numeric_lane_findings: {
        ...numericLaneFindings,
        ...normalizedDigitAuditSummary,
        rows: normalizedDigitAuditRows,
      },
      non_numeric_tg_findings: nonNumericSwsh9Findings,
      family_lane_overlap_findings: tgFamilyTargetAudit,
      canonical_snapshot: {
        ...canonicalSwsh9Snapshot,
        ...canonicalSwsh9tgSnapshot,
        swsh9_numeric_samples: canonicalSwsh9NumericSamples,
        swsh9_non_numeric_samples: canonicalSwsh9NonNumericSamples,
        swsh9tg_samples: canonicalSwsh9tgSamples,
      },
      strict_same_name_same_number_audit: {
        ...strictExactAuditSummary,
        exact_rows: strictExactAuditRows,
        family_rows: tgFamilyTargetRows,
      },
      raw_family_evidence: {
        ...rawFamilyEvidence,
        sample_rows: rawFamilySamples,
      },
      swsh9tg_target_surface: {
        ...swsh9tgTargetSurface,
        sample_rows: swsh9tgTargetSamples,
      },
      proposed_gvid_audit: proposedGvIdAudit,
      ...buildClassification(),
    };

    writeJsonReport(report);
    console.log(JSON.stringify(report, null, 2));
    await client.query('rollback');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
