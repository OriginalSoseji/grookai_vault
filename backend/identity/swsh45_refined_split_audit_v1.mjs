import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const PHASE = 'SWSH45_REFINED_SPLIT_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = 'swsh4.5';
const FAMILY_TARGET_SET_CODE = 'swsh45sv';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'swsh45_refined_split_audit_v1.json',
);

const EXPECTED = {
  total_unresolved: 124,
  numeric_unresolved: 2,
  sv_family_unresolved: 122,
  other_non_numeric_unresolved: 0,
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
      count(*) filter (where printed_number ~ '^SV[0-9]+$')::int as sv_family_unresolved,
      count(*) filter (
        where printed_number !~ '^[0-9]+$'
          and printed_number !~ '^SV[0-9]+$'
      )::int as other_non_numeric_unresolved
    from unresolved
  `,
  familyTargetSummary: `
    select
      count(*)::int as canonical_swsh45sv_total_rows,
      count(*) filter (where cp.gv_id is not null)::int as canonical_swsh45sv_non_null_gvid_count
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
  `,
  familyTargetSamples: `
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
  familyMappingSummary: `
    with family_unresolved as (
      select
        cp.id as old_id,
        cp.name as old_name,
        cpi.printed_number,
        coalesce(
          cpi.normalized_printed_name,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
        ) as normalized_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number ~ '^SV[0-9]+$'
    ),
    canonical_family as (
      select
        cp.id as new_id,
        cp.name as new_name,
        cp.number,
        cp.gv_id,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
      from public.card_prints cp
      where cp.set_code = $3
        and cp.gv_id is not null
    ),
    candidate_matches as (
      select
        u.old_id,
        c.new_id
      from family_unresolved u
      join canonical_family c
        on c.number = u.printed_number
       and c.normalized_name = u.normalized_name
    ),
    old_counts as (
      select old_id, count(*)::int as match_count
      from candidate_matches
      group by old_id
    ),
    new_counts as (
      select new_id, count(*)::int as match_count
      from candidate_matches
      group by new_id
    ),
    collapse_map as (
      select
        candidate.old_id,
        candidate.new_id
      from candidate_matches candidate
      join old_counts old_match
        on old_match.old_id = candidate.old_id
      join new_counts new_match
        on new_match.new_id = candidate.new_id
      where old_match.match_count = 1
        and new_match.match_count = 1
    )
    select
      (select count(*)::int from collapse_map) as family_mapping_candidate_count,
      (select count(distinct old_id)::int from collapse_map) as family_distinct_old_count,
      (select count(distinct new_id)::int from collapse_map) as family_distinct_new_count,
      (select count(*)::int from old_counts where match_count > 1) as family_multiple_match_old_count,
      (select count(*)::int from new_counts where match_count > 1) as family_reused_new_count,
      (
        select count(*)::int
        from family_unresolved u
        where not exists (
          select 1
          from collapse_map m
          where m.old_id = u.old_id
        )
      ) as family_unmatched_count,
      (
        select count(*)::int
        from family_unresolved u
        where exists (
          select 1
          from canonical_family c
          where c.number = u.printed_number
            and c.normalized_name = u.normalized_name
        )
      ) as family_same_number_same_name_count,
      (
        select count(*)::int
        from family_unresolved u
        where exists (
          select 1
          from canonical_family c
          where c.number = u.printed_number
            and c.normalized_name <> u.normalized_name
        )
      ) as family_same_number_different_name_count
  `,
  familyMappingSamples: `
    with family_unresolved as (
      select
        cp.id as old_id,
        cp.name as old_name,
        cpi.printed_number,
        coalesce(
          cpi.normalized_printed_name,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
        ) as normalized_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number ~ '^SV[0-9]+$'
    ),
    canonical_family as (
      select
        cp.id as new_id,
        cp.name as new_name,
        cp.number,
        cp.gv_id,
        cp.set_code,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
      from public.card_prints cp
      where cp.set_code = $3
        and cp.gv_id is not null
    )
    select
      u.old_id,
      u.old_name,
      u.printed_number,
      c.new_id,
      c.new_name,
      c.number,
      c.gv_id,
      c.set_code
    from family_unresolved u
    join canonical_family c
      on c.number = u.printed_number
     and c.normalized_name = u.normalized_name
    order by u.printed_number, u.old_id
    limit 25
  `,
  numericBlockerDetails: `
    with numeric_unresolved as (
      select
        cp.id as card_print_id,
        cp.name as unresolved_name,
        cpi.printed_number,
        coalesce(
          cpi.normalized_printed_name,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
        ) as normalized_name,
        coalesce(
          nullif(ltrim(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '0'), ''),
          '0'
        ) as normalized_digits
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number ~ '^[0-9]+$'
    ),
    canonical_base as (
      select
        cp.id as candidate_card_print_id,
        cp.name as candidate_name,
        cp.number as candidate_number,
        cp.gv_id as candidate_gv_id,
        cp.set_code as candidate_set_code,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name,
        coalesce(
          nullif(ltrim(regexp_replace(cp.number, '[^0-9]', '', 'g'), '0'), ''),
          '0'
        ) as normalized_digits
      from public.card_prints cp
      where cp.set_code = $2
        and cp.gv_id is not null
    ),
    canonical_family as (
      select
        cp.id as family_card_print_id,
        cp.name as family_name,
        cp.number as family_number,
        cp.gv_id as family_gv_id,
        lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as normalized_name
      from public.card_prints cp
      where cp.set_code = $3
        and cp.gv_id is not null
    )
    select
      u.card_print_id,
      u.unresolved_name,
      u.printed_number,
      b.candidate_card_print_id,
      b.candidate_name,
      b.candidate_number,
      b.candidate_gv_id,
      b.candidate_set_code,
      case
        when b.candidate_card_print_id is null then 'no_target'
        when b.normalized_name = u.normalized_name then 'same_number_same_name'
        else 'same_number_different_name'
      end as collision_type,
      (
        select count(*)::int
        from canonical_base b2
        where b2.normalized_digits = u.normalized_digits
          and b2.normalized_name = u.normalized_name
      ) as lawful_base_target_count,
      (
        select count(*)::int
        from canonical_family f
        where f.family_number = u.printed_number
          and f.normalized_name = u.normalized_name
      ) as lawful_family_target_count
    from numeric_unresolved u
    left join canonical_base b
      on b.normalized_digits = u.normalized_digits
    order by
      coalesce(
        nullif(ltrim(regexp_replace(u.printed_number, '[^0-9]', '', 'g'), '0'), ''),
        '0'
      )::int,
      b.candidate_number,
      b.candidate_card_print_id
  `,
  familyFkReadiness: `
    with family_old_ids as (
      select cp.id as old_id
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
        and cpi.printed_number ~ '^SV[0-9]+$'
    )
    select *
    from (
      select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
        count(*)::int as row_count
      from public.card_print_identity
      where card_print_id in (select old_id from family_old_ids)
      union all
      select 'card_print_traits', 'card_print_id', count(*)::int
      from public.card_print_traits
      where card_print_id in (select old_id from family_old_ids)
      union all
      select 'card_printings', 'card_print_id', count(*)::int
      from public.card_printings
      where card_print_id in (select old_id from family_old_ids)
      union all
      select 'external_mappings', 'card_print_id', count(*)::int
      from public.external_mappings
      where card_print_id in (select old_id from family_old_ids)
      union all
      select 'vault_items', 'card_id', count(*)::int
      from public.vault_items
      where card_id in (select old_id from family_old_ids)
    ) readiness
    order by table_name, column_name
  `,
};

function buildNumericBlockers(detailRows) {
  const blockers = new Map();

  for (const row of detailRows) {
    if (!blockers.has(row.card_print_id)) {
      blockers.set(row.card_print_id, {
        card_print_id: row.card_print_id,
        name: row.unresolved_name,
        printed_number: row.printed_number,
        lawful_base_target_count: normalizeCount(row.lawful_base_target_count),
        lawful_family_target_count: normalizeCount(row.lawful_family_target_count),
        collision_types: new Set(),
        candidate_canonical_rows: [],
      });
    }

    const blocker = blockers.get(row.card_print_id);
    blocker.collision_types.add(row.collision_type);

    if (row.candidate_card_print_id) {
      blocker.candidate_canonical_rows.push({
        candidate_card_print_id: row.candidate_card_print_id,
        candidate_name: row.candidate_name,
        candidate_number: row.candidate_number,
        candidate_gv_id: row.candidate_gv_id,
        candidate_set_code: row.candidate_set_code,
        collision_type: row.collision_type,
      });
    }
  }

  return [...blockers.values()]
    .map((blocker) => ({
      ...blocker,
      collision_types: [...blocker.collision_types].sort(),
      maps_anywhere_lawful:
        blocker.lawful_base_target_count > 0 || blocker.lawful_family_target_count > 0,
    }))
    .sort(
      (a, b) =>
        Number(a.printed_number) - Number(b.printed_number) ||
        a.card_print_id.localeCompare(b.card_print_id),
    );
}

function classifyReport(report) {
  const familySafe =
    normalizeCount(report.family_subset_mapping_results?.family_mapping_candidate_count) ===
      report.sv_family_unresolved &&
    normalizeCount(report.family_subset_mapping_results?.family_distinct_old_count) ===
      report.sv_family_unresolved &&
    normalizeCount(report.family_subset_mapping_results?.family_distinct_new_count) ===
      report.sv_family_unresolved &&
    normalizeCount(report.family_subset_mapping_results?.family_multiple_match_old_count) === 0 &&
    normalizeCount(report.family_subset_mapping_results?.family_reused_new_count) === 0 &&
    normalizeCount(report.family_subset_mapping_results?.family_unmatched_count) === 0 &&
    normalizeCount(report.family_subset_mapping_results?.family_same_number_same_name_count) ===
      report.sv_family_unresolved &&
    normalizeCount(report.family_subset_mapping_results?.family_same_number_different_name_count) === 0;

  const numericBlockersAreConcrete =
    report.numeric_blockers.length === report.numeric_unresolved &&
    report.numeric_blockers.every(
      (row) =>
        row.maps_anywhere_lawful === false &&
        row.collision_types.length === 1 &&
        row.collision_types[0] === 'same_number_different_name',
    );

  if (familySafe && numericBlockersAreConcrete) {
    return {
      final_classification: 'OUTCOME A — SPLIT_EXECUTION',
      next_phase_recommendation:
        'Collapse the 122 SV-family rows from swsh4.5 onto canonical swsh45sv, and defer the 2 numeric blockers for dedicated name-level identity resolution on canonical swsh4.5.',
      exact_next_execution_mode:
        'SWSH45SV_FAMILY_COLLAPSE_TO_SWSH45SV_WITH_2_NUMERIC_BLOCKERS_DEFERRED',
    };
  }

  if (!familySafe) {
    return {
      final_classification: 'OUTCOME B — FULL_BLOCKED',
      next_phase_recommendation:
        'Do not generate an apply runner. Re-audit the swsh4.5 SV-family surface because the family subset is not fully collapse-safe.',
      exact_next_execution_mode: 'FULL_BLOCK_REVIEW_FOR_SWSH45',
    };
  }

  return {
    final_classification: 'OUTCOME C — OTHER',
    next_phase_recommendation:
      'Manual review is required because the swsh4.5 family subset is safe but the residual numeric blockers do not fit the expected blocked-conflict shape.',
    exact_next_execution_mode: 'MANUAL_REVIEW_FOR_SWSH45_RESIDUALS',
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'swsh45_refined_split_audit_v1',
  });

  const report = {
    phase: PHASE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    source_set_code_identity: SOURCE_SET_CODE_IDENTITY,
    family_target_set_code: FAMILY_TARGET_SET_CODE,
    total_unresolved: 0,
    numeric_unresolved: 0,
    sv_family_unresolved: 0,
    other_non_numeric_unresolved: 0,
    family_target_summary: null,
    family_target_sample_rows: [],
    family_subset_mapping_results: null,
    family_subset_sample_rows: [],
    numeric_blocker_count: 0,
    numeric_blockers: [],
    fk_readiness_summary: [],
    final_classification: null,
    next_phase_recommendation: null,
    exact_next_execution_mode: null,
    status: 'running',
  };

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
    ]);
    report.total_unresolved = normalizeCount(unresolvedCounts?.total_unresolved);
    report.numeric_unresolved = normalizeCount(unresolvedCounts?.numeric_unresolved);
    report.sv_family_unresolved = normalizeCount(unresolvedCounts?.sv_family_unresolved);
    report.other_non_numeric_unresolved = normalizeCount(unresolvedCounts?.other_non_numeric_unresolved);

    assertEqual(report.total_unresolved, EXPECTED.total_unresolved, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(report.numeric_unresolved, EXPECTED.numeric_unresolved, 'UNRESOLVED_NUMERIC_DRIFT');
    assertEqual(report.sv_family_unresolved, EXPECTED.sv_family_unresolved, 'UNRESOLVED_SV_FAMILY_DRIFT');
    assertEqual(
      report.other_non_numeric_unresolved,
      EXPECTED.other_non_numeric_unresolved,
      'UNRESOLVED_OTHER_NON_NUMERIC_DRIFT',
    );

    report.family_target_summary = await queryOne(client, SQL.familyTargetSummary, [
      FAMILY_TARGET_SET_CODE,
    ]);
    report.family_target_sample_rows = await queryRows(client, SQL.familyTargetSamples, [
      FAMILY_TARGET_SET_CODE,
    ]);

    if (normalizeCount(report.family_target_summary?.canonical_swsh45sv_total_rows) <= 0) {
      throw new Error('CANONICAL_SWSH45SV_LANE_MISSING');
    }

    report.family_subset_mapping_results = await queryOne(client, SQL.familyMappingSummary, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      FAMILY_TARGET_SET_CODE,
    ]);
    report.family_subset_sample_rows = await queryRows(client, SQL.familyMappingSamples, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      FAMILY_TARGET_SET_CODE,
    ]);

    if (
      normalizeCount(report.family_subset_mapping_results?.family_multiple_match_old_count) > 0 ||
      normalizeCount(report.family_subset_mapping_results?.family_reused_new_count) > 0
    ) {
      throw new Error(
        `FAMILY_MAPPING_AMBIGUITY:${JSON.stringify(report.family_subset_mapping_results)}`,
      );
    }

    const numericBlockerRows = await queryRows(client, SQL.numericBlockerDetails, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      FAMILY_TARGET_SET_CODE,
    ]);
    report.numeric_blockers = buildNumericBlockers(numericBlockerRows);
    report.numeric_blocker_count = report.numeric_blockers.length;

    report.fk_readiness_summary = await queryRows(client, SQL.familyFkReadiness, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
    ]);

    const classification = classifyReport(report);
    report.final_classification = classification.final_classification;
    report.next_phase_recommendation = classification.next_phase_recommendation;
    report.exact_next_execution_mode = classification.exact_next_execution_mode;
    report.status = 'completed';

    writeJsonReport({
      phase: report.phase,
      generated_at: report.generated_at,
      total_unresolved: report.total_unresolved,
      numeric_unresolved: report.numeric_unresolved,
      sv_family_unresolved: report.sv_family_unresolved,
      other_non_numeric_unresolved: report.other_non_numeric_unresolved,
      family_mapping_candidate_count: normalizeCount(
        report.family_subset_mapping_results?.family_mapping_candidate_count,
      ),
      family_multiple_match_old_count: normalizeCount(
        report.family_subset_mapping_results?.family_multiple_match_old_count,
      ),
      family_reused_new_count: normalizeCount(
        report.family_subset_mapping_results?.family_reused_new_count,
      ),
      family_unmatched_count: normalizeCount(
        report.family_subset_mapping_results?.family_unmatched_count,
      ),
      numeric_blocker_count: report.numeric_blocker_count,
      final_classification: report.final_classification,
      next_phase_recommendation: report.next_phase_recommendation,
      exact_next_execution_mode: report.exact_next_execution_mode,
      family_target_summary: report.family_target_summary,
      family_target_sample_rows: report.family_target_sample_rows,
      family_subset_mapping_results: report.family_subset_mapping_results,
      family_subset_sample_rows: report.family_subset_sample_rows,
      numeric_blockers: report.numeric_blockers,
      fk_readiness_summary: report.fk_readiness_summary,
      status: report.status,
    });

    console.log(JSON.stringify(report, null, 2));
    await client.query('rollback');
  } catch (error) {
    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    writeJsonReport(report);
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
