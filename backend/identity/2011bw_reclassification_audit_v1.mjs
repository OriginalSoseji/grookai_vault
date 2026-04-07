import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'RECLASSIFICATION_AUDIT_FOR_2011BW_TO_MCD11_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const SOURCE_SET_CODE_IDENTITY = '2011bw';
const TARGET_SET_CODE = 'mcd11';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  '2011bw_reclassification_audit_v1.json',
);

const EXPECTED = {
  total_unresolved: 12,
  numeric_unresolved: 12,
  non_numeric_unresolved: 0,
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

function normalizeDigits(value) {
  const raw = String(value ?? '').trim();
  if (!/^[0-9]+$/.test(raw)) {
    return raw;
  }
  return String(Number(raw));
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

function assertZero(actual, code) {
  if (normalizeCount(actual) !== 0) {
    throw new Error(`${code}:${actual}`);
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
      count(*) filter (where printed_number !~ '^[0-9]+$')::int as non_numeric_unresolved
    from unresolved
  `,
  canonicalSummary: `
    select
      count(*)::int as canonical_mcd11_total_rows,
      count(*) filter (where gv_id is not null)::int as canonical_mcd11_non_null_gvid_count
    from public.card_prints
    where set_code = $1
  `,
  canonicalSamples: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by cp.number::int, cp.id
    limit 25
  `,
  strictMappingSummary: `
    with unresolved as (
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
    ),
    canonical as (
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
      from unresolved u
      join canonical c
        on coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
         = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
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
        u.old_id,
        c.new_id
      from unresolved u
      join candidate_matches candidate
        on candidate.old_id = u.old_id
      join canonical c
        on c.new_id = candidate.new_id
      join old_counts old_match
        on old_match.old_id = candidate.old_id
      join new_counts new_match
        on new_match.new_id = candidate.new_id
      where old_match.match_count = 1
        and new_match.match_count = 1
    )
    select
      (select count(*)::int from collapse_map) as mapping_candidate_count,
      (select count(distinct old_id)::int from collapse_map) as distinct_old_count,
      (select count(distinct new_id)::int from collapse_map) as distinct_new_count,
      (select count(*)::int from old_counts where match_count > 1) as multiple_match_old_count,
      (select count(*)::int from new_counts where match_count > 1) as reused_new_count,
      (
        select count(*)::int
        from unresolved u
        where not exists (
          select 1
          from collapse_map m
          where m.old_id = u.old_id
        )
      ) as unmatched_count,
      (
        select count(*)::int
        from unresolved u
        where exists (
          select 1
          from canonical c
          where coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
             = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
            and c.normalized_name = u.normalized_name
        )
      ) as same_number_same_name_count,
      (
        select count(*)::int
        from unresolved u
        where exists (
          select 1
          from canonical c
          where coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
             = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
            and c.normalized_name <> u.normalized_name
        )
      ) as same_number_different_name_count
  `,
  mappingSamples: `
    with unresolved as (
      select
        cp.id as old_id,
        cp.name as old_name,
        cpi.printed_number,
        cp.variant_key,
        s.printed_set_abbrev,
        coalesce(
          cpi.normalized_printed_name,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g'))
        ) as normalized_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      left join public.sets s
        on s.id = cp.set_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    ),
    canonical as (
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
      u.variant_key,
      u.printed_set_abbrev,
      c.new_id,
      c.new_name,
      c.number,
      c.gv_id,
      c.set_code
    from unresolved u
    join canonical c
      on coalesce(nullif(ltrim(u.printed_number, '0'), ''), '0')
       = coalesce(nullif(ltrim(c.number, '0'), ''), '0')
     and c.normalized_name = u.normalized_name
    order by u.printed_number::int, u.old_id
    limit 25
  `,
  namespaceCanonicalRows: `
    select
      cp.id,
      cp.name,
      cp.number,
      cp.gv_id,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by cp.number::int, cp.id
  `,
  fkReadiness: `
    with unresolved_ids as (
      select cp.id as old_id
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
    )
    select *
    from (
      select 'card_print_identity'::text as table_name, 'card_print_id'::text as column_name,
        count(*)::int as row_count
      from public.card_print_identity
      where card_print_id in (select old_id from unresolved_ids)
      union all
      select 'card_print_traits', 'card_print_id', count(*)::int
      from public.card_print_traits
      where card_print_id in (select old_id from unresolved_ids)
      union all
      select 'card_printings', 'card_print_id', count(*)::int
      from public.card_printings
      where card_print_id in (select old_id from unresolved_ids)
      union all
      select 'external_mappings', 'card_print_id', count(*)::int
      from public.external_mappings
      where card_print_id in (select old_id from unresolved_ids)
      union all
      select 'vault_items', 'card_id', count(*)::int
      from public.vault_items
      where card_id in (select old_id from unresolved_ids)
    ) readiness
    order by table_name, column_name
  `,
};

function classify(report) {
  if (
    normalizeCount(report.strict_mapping_results.mapping_candidate_count) === report.total_unresolved &&
    normalizeCount(report.strict_mapping_results.multiple_match_old_count) === 0 &&
    normalizeCount(report.strict_mapping_results.reused_new_count) === 0 &&
    normalizeCount(report.strict_mapping_results.unmatched_count) === 0 &&
    normalizeCount(report.strict_mapping_results.same_number_different_name_count) === 0 &&
    normalizeCount(report.namespace_audit.namespace_conflict_count) === 0
  ) {
    return {
      final_classification: 'OUTCOME A — DUPLICATE_COLLAPSE_TO_MCD11',
      next_phase_recommendation: '2011BW_ALIAS_COLLAPSE_TO_MCD11',
    };
  }

  if (normalizeCount(report.strict_mapping_results.mapping_candidate_count) > 0) {
    return {
      final_classification: 'OUTCOME B — MIXED_EXECUTION',
      next_phase_recommendation: 'PARTIAL_ALIAS_COLLAPSE_REVIEW_FOR_2011BW_AND_MCD11',
    };
  }

  if (normalizeCount(report.canonical_mcd11_target_summary.canonical_mcd11_total_rows) === 0) {
    return {
      final_classification: 'OUTCOME C — STILL_NUMERIC_PROMOTION',
      next_phase_recommendation: 'RECHECK_NUMERIC_PROMOTION_FOR_2011BW',
    };
  }

  return {
    final_classification: 'OUTCOME D — BLOCKED_CONFLICT',
    next_phase_recommendation: 'BLOCKED_REVIEW_FOR_2011BW_AND_MCD11',
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: '2011bw_reclassification_audit_v1',
  });

  const report = {
    phase: PHASE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    source_set_code_identity: SOURCE_SET_CODE_IDENTITY,
    canonical_target_set_code: TARGET_SET_CODE,
    total_unresolved: 0,
    numeric_unresolved: 0,
    non_numeric_unresolved: 0,
    canonical_mcd11_target_summary: null,
    canonical_mcd11_sample_rows: [],
    strict_mapping_results: null,
    mapping_sample_rows: [],
    namespace_audit: null,
    fk_readiness_snapshot: [],
    final_classification: null,
    next_phase_recommendation: null,
    status: 'running',
  };

  await client.connect();

  try {
    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
    ]);
    report.total_unresolved = normalizeCount(unresolvedCounts?.total_unresolved);
    report.numeric_unresolved = normalizeCount(unresolvedCounts?.numeric_unresolved);
    report.non_numeric_unresolved = normalizeCount(unresolvedCounts?.non_numeric_unresolved);

    assertEqual(report.total_unresolved, EXPECTED.total_unresolved, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(report.numeric_unresolved, EXPECTED.numeric_unresolved, 'UNRESOLVED_NUMERIC_DRIFT');
    assertEqual(report.non_numeric_unresolved, EXPECTED.non_numeric_unresolved, 'UNRESOLVED_NON_NUMERIC_DRIFT');

    report.canonical_mcd11_target_summary = await queryOne(client, SQL.canonicalSummary, [TARGET_SET_CODE]);
    report.canonical_mcd11_sample_rows = await queryRows(client, SQL.canonicalSamples, [TARGET_SET_CODE]);

    if (normalizeCount(report.canonical_mcd11_target_summary?.canonical_mcd11_total_rows) <= 0) {
      throw new Error('CANONICAL_MCD11_LANE_MISSING');
    }
    if (
      normalizeCount(report.canonical_mcd11_target_summary?.canonical_mcd11_non_null_gvid_count) !==
      normalizeCount(report.canonical_mcd11_target_summary?.canonical_mcd11_total_rows)
    ) {
      throw new Error(
        `CANONICAL_MCD11_GVID_DRIFT:${report.canonical_mcd11_target_summary?.canonical_mcd11_non_null_gvid_count}:${report.canonical_mcd11_target_summary?.canonical_mcd11_total_rows}`,
      );
    }

    report.strict_mapping_results = await queryOne(client, SQL.strictMappingSummary, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      TARGET_SET_CODE,
    ]);
    report.mapping_sample_rows = await queryRows(client, SQL.mappingSamples, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
      TARGET_SET_CODE,
    ]);

    assertZero(report.strict_mapping_results?.multiple_match_old_count, 'MULTIPLE_MATCH_OLD_COUNT');
    assertZero(report.strict_mapping_results?.reused_new_count, 'REUSED_NEW_COUNT');
    assertZero(report.strict_mapping_results?.unmatched_count, 'UNMATCHED_COUNT');
    assertZero(report.strict_mapping_results?.same_number_different_name_count, 'SAME_NUMBER_DIFFERENT_NAME_COUNT');

    const canonicalNamespaceRows = await queryRows(client, SQL.namespaceCanonicalRows, [TARGET_SET_CODE]);
    const canonicalNamespaceMatchCount = canonicalNamespaceRows.filter(
      (row) =>
        row.gv_id ===
        buildCardPrintGvIdV1({
          setCode: TARGET_SET_CODE,
          printedSetAbbrev: 'MCD',
          number: row.number,
          variantKey: '',
        }),
    ).length;

    const namespaceConflictCount = report.mapping_sample_rows.filter(
      (row) =>
        buildCardPrintGvIdV1({
          setCode: SOURCE_SET_CODE_IDENTITY,
          printedSetAbbrev: row.printed_set_abbrev,
          number: row.printed_number,
          variantKey: row.variant_key,
        }) !== row.gv_id,
    ).length;

    report.namespace_audit = {
      canonical_namespace_match_count: canonicalNamespaceMatchCount,
      namespace_conflict_count: namespaceConflictCount,
    };

    if (canonicalNamespaceMatchCount !== canonicalNamespaceRows.length) {
      throw new Error(
        `CANONICAL_NAMESPACE_INCONSISTENT:${canonicalNamespaceMatchCount}:${canonicalNamespaceRows.length}`,
      );
    }
    assertZero(namespaceConflictCount, 'NAMESPACE_CONFLICT_COUNT');

    report.fk_readiness_snapshot = await queryRows(client, SQL.fkReadiness, [
      TARGET_IDENTITY_DOMAIN,
      SOURCE_SET_CODE_IDENTITY,
    ]);

    const classification = classify(report);
    report.final_classification = classification.final_classification;
    report.next_phase_recommendation = classification.next_phase_recommendation;
    report.status = 'completed';

    writeJsonReport({
      phase: report.phase,
      generated_at: report.generated_at,
      total_unresolved: report.total_unresolved,
      numeric_unresolved: report.numeric_unresolved,
      non_numeric_unresolved: report.non_numeric_unresolved,
      canonical_mcd11_total_rows: normalizeCount(
        report.canonical_mcd11_target_summary?.canonical_mcd11_total_rows,
      ),
      mapping_candidate_count: normalizeCount(report.strict_mapping_results?.mapping_candidate_count),
      multiple_match_old_count: normalizeCount(report.strict_mapping_results?.multiple_match_old_count),
      reused_new_count: normalizeCount(report.strict_mapping_results?.reused_new_count),
      unmatched_count: normalizeCount(report.strict_mapping_results?.unmatched_count),
      same_number_same_name_count: normalizeCount(report.strict_mapping_results?.same_number_same_name_count),
      same_number_different_name_count: normalizeCount(
        report.strict_mapping_results?.same_number_different_name_count,
      ),
      canonical_namespace_match_count: normalizeCount(
        report.namespace_audit?.canonical_namespace_match_count,
      ),
      namespace_conflict_count: normalizeCount(report.namespace_audit?.namespace_conflict_count),
      final_classification: report.final_classification,
      next_phase_recommendation: report.next_phase_recommendation,
      canonical_mcd11_sample_rows: report.canonical_mcd11_sample_rows,
      mapping_sample_rows: report.mapping_sample_rows,
      fk_readiness_snapshot: report.fk_readiness_snapshot,
      status: report.status,
    });

    console.log(
      JSON.stringify(
        {
          ...report,
          canonical_mcd11_target_summary: {
            canonical_mcd11_total_rows: normalizeCount(
              report.canonical_mcd11_target_summary?.canonical_mcd11_total_rows,
            ),
            canonical_mcd11_non_null_gvid_count: normalizeCount(
              report.canonical_mcd11_target_summary?.canonical_mcd11_non_null_gvid_count,
            ),
          },
        },
        null,
        2,
      ),
    );
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
