import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'COL1_RECLASSIFICATION_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODE_IDENTITY = 'col1';
const CANONICAL_SET_CODE = 'col1';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'col1_reclassification_audit_v1.json',
);

const EXPECTED = {
  total_unresolved: 11,
  numeric_token_count: 5,
  sl_token_count: 6,
  invalid_token_count: 0,
};

const QUALIFIER_NAME_PATTERNS = [
  /\bstaff\b/i,
  /\bprerelease\b/i,
  /\bstamp(?:ed)?\b/i,
  /\btest print\b/i,
];

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

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function isNumericToken(value) {
  return /^[0-9]+$/.test(String(value ?? '').trim());
}

function isSlToken(value) {
  return /^SL[0-9]+$/i.test(String(value ?? '').trim());
}

function isValidToken(value) {
  return isNumericToken(value) || isSlToken(value);
}

function sortToken(value) {
  const normalized = normalizeTextOrNull(value)?.toUpperCase() ?? '';
  const sl = isSlToken(normalized);
  const digits = normalized.replace(/^[A-Z]+/, '');
  return {
    lane_rank: sl ? 1 : 0,
    numeric_rank: digits ? Number.parseInt(digits, 10) : Number.MAX_SAFE_INTEGER,
    raw: normalized,
  };
}

function compareTokenValues(left, right) {
  const leftKey = sortToken(left);
  const rightKey = sortToken(right);

  if (leftKey.lane_rank !== rightKey.lane_rank) {
    return leftKey.lane_rank - rightKey.lane_rank;
  }

  if (leftKey.numeric_rank !== rightKey.numeric_rank) {
    return leftKey.numeric_rank - rightKey.numeric_rank;
  }

  return leftKey.raw.localeCompare(rightKey.raw);
}

function normalizeRepoName(value, canonName = null) {
  const normalized = canonName
    ? normalizeCardNameV1(value, { canonName }).corrected_name
    : normalizeCardNameV1(value).corrected_name;

  if (!normalized) {
    throw new Error(`NAME_NORMALIZATION_FAILED:${String(value ?? 'null')}`);
  }

  return normalized.toLowerCase();
}

function deriveCol1GvId(input) {
  return buildCardPrintGvIdV1({
    setCode: CANONICAL_SET_CODE,
    number: input.number,
    variantKey: input.variant_key,
  });
}

function detectQualifierReview(row) {
  if (normalizeTextOrNull(row.variant_key)) {
    return 'variant_key_present';
  }

  const name = normalizeTextOrNull(row.old_name) ?? '';
  for (const pattern of QUALIFIER_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return 'name_contains_variant_marker';
    }
  }

  return null;
}

const SQL = {
  unresolvedCounts: `
    with unresolved as (
      select
        cp.id,
        cp.name,
        cpi.printed_number
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
      count(*) filter (where printed_number ~ '^[0-9]+$')::int as numeric_token_count,
      count(*) filter (where printed_number ~ '^SL[0-9]+$')::int as sl_token_count,
      count(*) filter (
        where printed_number !~ '^[0-9]+$'
          and printed_number !~ '^SL[0-9]+$'
      )::int as invalid_token_count
    from unresolved
  `,
  canonicalSummary: `
    select
      count(*)::int as canonical_total,
      count(*) filter (where number ~ '^[0-9]+$')::int as canonical_numeric_count,
      count(*) filter (where number ~ '^SL[0-9]+$')::int as canonical_sl_count
    from public.card_prints
    where set_code = $1
      and gv_id is not null
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
    order by
      case when cp.number ~ '^SL[0-9]+$' then 1 else 0 end,
      nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
      cp.number,
      cp.id
    limit 25
  `,
  unresolvedRows: `
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.variant_key,
      cpi.printed_number,
      cpi.normalized_printed_name
    from public.card_print_identity cpi
    join public.card_prints cp
      on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.identity_domain = $1
      and cpi.set_code_identity = $2
      and cp.gv_id is null
    order by
      case when cpi.printed_number ~ '^SL[0-9]+$' then 1 else 0 end,
      nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')::int,
      cpi.printed_number,
      cp.id
  `,
  canonicalRows: `
    select
      cp.id as new_id,
      cp.name as new_name,
      cp.number,
      cp.variant_key,
      cp.gv_id,
      cp.set_code
    from public.card_prints cp
    where cp.set_code = $1
      and cp.gv_id is not null
    order by
      case when cp.number ~ '^SL[0-9]+$' then 1 else 0 end,
      nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
      cp.number,
      cp.id
  `,
  liveGvIdCollisions: `
    select
      cp.id,
      cp.gv_id,
      cp.name,
      cp.number,
      cp.set_code
    from public.card_prints cp
    where cp.gv_id = any($1::text[])
    order by cp.gv_id, cp.id
  `,
  fkReadinessForIds: `
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
    order by table_name, column_name
  `,
};

function buildCollapseAudit(validRows, canonicalRows) {
  const canonicalByToken = new Map();

  for (const row of canonicalRows) {
    const token = normalizeTextOrNull(row.number);
    if (!token) {
      continue;
    }

    const bucket = canonicalByToken.get(token) ?? [];
    bucket.push({
      ...row,
      token,
      repo_normalized_name: normalizeRepoName(row.new_name),
    });
    canonicalByToken.set(token, bucket);
  }

  const rowAudits = [];
  const candidateMatches = [];
  let sameTokenSameNameCount = 0;
  let sameTokenDifferentNameCount = 0;

  for (const row of validRows) {
    const token = normalizeTextOrNull(row.printed_number);
    const sameTokenCandidates = canonicalByToken.get(token) ?? [];
    const repoMatches = sameTokenCandidates.filter((candidate) => {
      const normalizedOldName = normalizeRepoName(row.old_name, candidate.new_name);
      return normalizedOldName === candidate.repo_normalized_name;
    });

    if (repoMatches.length > 0) {
      sameTokenSameNameCount += 1;
    } else if (sameTokenCandidates.length > 0) {
      sameTokenDifferentNameCount += 1;
    }

    rowAudits.push({
      ...row,
      same_token_candidate_count: sameTokenCandidates.length,
      repo_match_count: repoMatches.length,
      matching_candidates: repoMatches.map((candidate) => ({
        new_id: candidate.new_id,
        new_name: candidate.new_name,
        number: candidate.number,
        gv_id: candidate.gv_id,
        set_code: candidate.set_code,
      })),
      same_token_candidates: sameTokenCandidates.map((candidate) => ({
        new_id: candidate.new_id,
        new_name: candidate.new_name,
        number: candidate.number,
        gv_id: candidate.gv_id,
        set_code: candidate.set_code,
      })),
    });

    for (const candidate of repoMatches) {
      candidateMatches.push({
        old_id: row.old_id,
        new_id: candidate.new_id,
      });
    }
  }

  const oldMatchCounts = new Map();
  const newMatchCounts = new Map();

  for (const match of candidateMatches) {
    oldMatchCounts.set(match.old_id, normalizeCount(oldMatchCounts.get(match.old_id)) + 1);
    newMatchCounts.set(match.new_id, normalizeCount(newMatchCounts.get(match.new_id)) + 1);
  }

  const collapseMap = rowAudits
    .filter((row) => {
      if (normalizeCount(oldMatchCounts.get(row.old_id)) !== 1) {
        return false;
      }

      const matchedCandidate = row.matching_candidates[0];
      return normalizeCount(newMatchCounts.get(matchedCandidate.new_id)) === 1;
    })
    .map((row) => {
      const matchedCandidate = row.matching_candidates[0];
      return {
        old_id: row.old_id,
        old_name: row.old_name,
        printed_number: row.printed_number,
        new_id: matchedCandidate.new_id,
        new_name: matchedCandidate.new_name,
        new_number: matchedCandidate.number,
        new_gv_id: matchedCandidate.gv_id,
      };
    });

  const collapseMapByOldId = new Map(collapseMap.map((row) => [row.old_id, row]));
  const unmatchedRows = rowAudits.filter((row) => !collapseMapByOldId.has(row.old_id));

  return {
    row_audits: rowAudits,
    collapse_map: collapseMap,
    summary: {
      collapse_candidate_count: collapseMap.length,
      multiple_match_old_count: rowAudits.filter(
        (row) => normalizeCount(oldMatchCounts.get(row.old_id)) > 1,
      ).length,
      reused_new_count: Array.from(newMatchCounts.values()).filter((count) => count > 1).length,
      unmatched_count: unmatchedRows.length,
      same_token_same_name_count: sameTokenSameNameCount,
      same_token_different_name_count: sameTokenDifferentNameCount,
    },
  };
}

async function computePromotionAudit(client, rowAudits, collapseMapByOldId) {
  const promotionCandidates = [];
  const blockedConflictRows = [];
  const qualifierReviewRows = [];
  const invalidTokenRows = [];

  for (const row of rowAudits) {
    if (collapseMapByOldId.has(row.old_id)) {
      continue;
    }

    if (!isValidToken(row.printed_number)) {
      invalidTokenRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: 'invalid_token',
      });
      continue;
    }

    const qualifierReason = detectQualifierReview(row);
    if (qualifierReason) {
      qualifierReviewRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: qualifierReason,
      });
      continue;
    }

    if (row.same_token_candidate_count > 0 || row.repo_match_count > 1) {
      blockedConflictRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason:
          row.repo_match_count > 1
            ? 'multiple_canonical_matches'
            : 'same_token_different_name',
        canonical_rows:
          row.repo_match_count > 1 ? row.matching_candidates : row.same_token_candidates,
      });
      continue;
    }

    let proposedGvId;
    try {
      proposedGvId = deriveCol1GvId({
        number: row.printed_number,
        variant_key: row.variant_key,
      });
    } catch (error) {
      qualifierReviewRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    promotionCandidates.push({
      card_print_id: row.old_id,
      name: row.old_name,
      printed_number: row.printed_number,
      variant_key: row.variant_key,
      proposed_gv_id: proposedGvId,
    });
  }

  const internalGvIdCounts = new Map();
  for (const row of promotionCandidates) {
    internalGvIdCounts.set(
      row.proposed_gv_id,
      normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) + 1,
    );
  }

  const internalCollisionRows = promotionCandidates.filter(
    (row) => normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) > 1,
  );
  const proposedGvIds = [...new Set(promotionCandidates.map((row) => row.proposed_gv_id))];
  const liveCollisionRows =
    proposedGvIds.length > 0
      ? await queryRows(client, SQL.liveGvIdCollisions, [proposedGvIds])
      : [];
  const liveCollisionGvIds = new Set(liveCollisionRows.map((row) => row.gv_id));
  const promotionSafeRows = [];

  for (const row of promotionCandidates) {
    if (normalizeCount(internalGvIdCounts.get(row.proposed_gv_id)) > 1) {
      blockedConflictRows.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        blocking_reason: 'promotion_internal_collision',
      });
      continue;
    }

    if (liveCollisionGvIds.has(row.proposed_gv_id)) {
      blockedConflictRows.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        blocking_reason: 'promotion_live_namespace_collision',
      });
      continue;
    }

    promotionSafeRows.push(row);
  }

  return {
    promotion_safe_rows: promotionSafeRows,
    blocked_conflict_rows: blockedConflictRows,
    qualifier_review_rows: qualifierReviewRows,
    invalid_token_rows: invalidTokenRows,
    summary: {
      promotion_candidate_count: promotionSafeRows.length,
      promotion_live_collision_count: liveCollisionGvIds.size,
      promotion_conflict_count: blockedConflictRows.length + invalidTokenRows.length,
    },
  };
}

async function loadFkReadinessSnapshot(client, ids) {
  if (ids.length === 0) {
    return [
      { table_name: 'card_print_identity', column_name: 'card_print_id', row_count: 0 },
      { table_name: 'card_print_traits', column_name: 'card_print_id', row_count: 0 },
      { table_name: 'card_printings', column_name: 'card_print_id', row_count: 0 },
      { table_name: 'external_mappings', column_name: 'card_print_id', row_count: 0 },
      { table_name: 'vault_items', column_name: 'card_id', row_count: 0 },
    ];
  }

  return queryRows(client, SQL.fkReadinessForIds, [ids]);
}

function buildFinalClassificationCounts({
  totalUnresolved,
  collapseSafeCount,
  promotionSafeCount,
  blockedConflictCount,
  qualifierReviewCount,
}) {
  const counts = {
    COLLAPSE_SAFE: collapseSafeCount,
    PROMOTION_SAFE: promotionSafeCount,
    BLOCKED_CONFLICT: blockedConflictCount,
    QUALIFIER_REVIEW: qualifierReviewCount,
  };

  const classifiedTotal = Object.values(counts).reduce(
    (sum, value) => sum + normalizeCount(value),
    0,
  );
  assertEqual(classifiedTotal, totalUnresolved, 'FINAL_CLASSIFICATION_TOTAL_DRIFT');
  return counts;
}

function classifyNextPhase(finalClassificationCounts, namespaceConflictCount) {
  if (
    normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) === 0 &&
    normalizeCount(finalClassificationCounts.PROMOTION_SAFE) > 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_CONFLICT) === 0 &&
    normalizeCount(finalClassificationCounts.QUALIFIER_REVIEW) === 0 &&
    normalizeCount(namespaceConflictCount) > 0
  ) {
    return 'COL1_NAMESPACE_MIGRATION_CONTRACT_V1';
  }

  if (
    normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) === 0 &&
    normalizeCount(finalClassificationCounts.PROMOTION_SAFE) > 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_CONFLICT) === 0 &&
    normalizeCount(finalClassificationCounts.QUALIFIER_REVIEW) === 0
  ) {
    return 'COL1_EXACT_TOKEN_PROMOTION_V1';
  }

  if (normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) > 0) {
    return 'COL1_SPLIT_EXECUTION_V1';
  }

  return 'COL1_BLOCKED_REVIEW_V1';
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'col1_reclassification_audit_v1',
  });

  const report = {
    phase: PHASE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    target_set_code_identity: TARGET_SET_CODE_IDENTITY,
    canonical_set_code: CANONICAL_SET_CODE,
    total_unresolved: 0,
    numeric_token_count: 0,
    sl_token_count: 0,
    invalid_token_count: 0,
    canonical_summary: null,
    canonical_sample_rows: [],
    collapse_safe_results: null,
    collapse_safe_sample_rows: [],
    promotion_safe_results: null,
    promotion_safe_sample_rows: [],
    blocked_conflict_rows: [],
    qualifier_review_rows: [],
    invalid_token_rows: [],
    namespace_audit_results: null,
    fk_readiness_snapshot: {
      promotion_safe_subset: [],
    },
    final_classification_counts: null,
    next_phase_recommendation: null,
    status: 'running',
  };

  await client.connect();

  try {
    await client.query('begin read only');

    const unresolvedCounts = await queryOne(client, SQL.unresolvedCounts, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    report.total_unresolved = normalizeCount(unresolvedCounts?.total_unresolved);
    report.numeric_token_count = normalizeCount(unresolvedCounts?.numeric_token_count);
    report.sl_token_count = normalizeCount(unresolvedCounts?.sl_token_count);
    report.invalid_token_count = normalizeCount(unresolvedCounts?.invalid_token_count);

    assertEqual(report.total_unresolved, EXPECTED.total_unresolved, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(report.numeric_token_count, EXPECTED.numeric_token_count, 'NUMERIC_TOKEN_COUNT_DRIFT');
    assertEqual(report.sl_token_count, EXPECTED.sl_token_count, 'SL_TOKEN_COUNT_DRIFT');
    assertEqual(report.invalid_token_count, EXPECTED.invalid_token_count, 'INVALID_TOKEN_COUNT_DRIFT');

    report.canonical_summary = await queryOne(client, SQL.canonicalSummary, [
      CANONICAL_SET_CODE,
    ]);
    report.canonical_sample_rows = await queryRows(client, SQL.canonicalSamples, [
      CANONICAL_SET_CODE,
    ]);

    if (normalizeCount(report.canonical_summary?.canonical_total) <= 0) {
      throw new Error('CANONICAL_COL1_LANE_MISSING');
    }

    const unresolvedRows = await queryRows(client, SQL.unresolvedRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalRows = await queryRows(client, SQL.canonicalRows, [CANONICAL_SET_CODE]);
    const validRows = unresolvedRows.filter((row) => isValidToken(row.printed_number));

    const collapseAudit = buildCollapseAudit(validRows, canonicalRows);
    const collapseMapByOldId = new Map(collapseAudit.collapse_map.map((row) => [row.old_id, row]));
    report.collapse_safe_results = collapseAudit.summary;
    report.collapse_safe_sample_rows = collapseAudit.collapse_map
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);

    const promotionAudit = await computePromotionAudit(client, collapseAudit.row_audits, collapseMapByOldId);
    report.promotion_safe_results = promotionAudit.summary;
    report.promotion_safe_sample_rows = promotionAudit.promotion_safe_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.blocked_conflict_rows = promotionAudit.blocked_conflict_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.qualifier_review_rows = promotionAudit.qualifier_review_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.invalid_token_rows = promotionAudit.invalid_token_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);

    const canonicalNamespaceMatchCount = canonicalRows.filter(
      (row) => row.gv_id === deriveCol1GvId(row),
    ).length;
    report.namespace_audit_results = {
      canonical_namespace_match_count: canonicalNamespaceMatchCount,
      namespace_conflict_count: canonicalRows.length - canonicalNamespaceMatchCount,
    };

    report.fk_readiness_snapshot.promotion_safe_subset = await loadFkReadinessSnapshot(
      client,
      promotionAudit.promotion_safe_rows.map((row) => row.card_print_id),
    );

    report.final_classification_counts = buildFinalClassificationCounts({
      totalUnresolved: report.total_unresolved,
      collapseSafeCount: collapseAudit.collapse_map.length,
      promotionSafeCount: promotionAudit.promotion_safe_rows.length,
      blockedConflictCount:
        promotionAudit.blocked_conflict_rows.length + promotionAudit.invalid_token_rows.length,
      qualifierReviewCount: promotionAudit.qualifier_review_rows.length,
    });

    report.next_phase_recommendation = classifyNextPhase(
      report.final_classification_counts,
      report.namespace_audit_results.namespace_conflict_count,
    );
    report.status = 'completed';

    writeJsonReport({
      phase: report.phase,
      generated_at: report.generated_at,
      total_unresolved: report.total_unresolved,
      numeric_token_count: report.numeric_token_count,
      sl_token_count: report.sl_token_count,
      invalid_token_count: report.invalid_token_count,
      canonical_total: normalizeCount(report.canonical_summary?.canonical_total),
      canonical_numeric_count: normalizeCount(report.canonical_summary?.canonical_numeric_count),
      canonical_sl_count: normalizeCount(report.canonical_summary?.canonical_sl_count),
      collapse_candidate_count: normalizeCount(report.collapse_safe_results?.collapse_candidate_count),
      multiple_match_old_count: normalizeCount(report.collapse_safe_results?.multiple_match_old_count),
      reused_new_count: normalizeCount(report.collapse_safe_results?.reused_new_count),
      unmatched_count: normalizeCount(report.collapse_safe_results?.unmatched_count),
      same_token_same_name_count: normalizeCount(report.collapse_safe_results?.same_token_same_name_count),
      same_token_different_name_count: normalizeCount(report.collapse_safe_results?.same_token_different_name_count),
      promotion_candidate_count: normalizeCount(report.promotion_safe_results?.promotion_candidate_count),
      promotion_live_collision_count: normalizeCount(report.promotion_safe_results?.promotion_live_collision_count),
      promotion_conflict_count: normalizeCount(report.promotion_safe_results?.promotion_conflict_count),
      qualifier_review_count: report.qualifier_review_rows.length,
      canonical_namespace_match_count: normalizeCount(report.namespace_audit_results?.canonical_namespace_match_count),
      namespace_conflict_count: normalizeCount(report.namespace_audit_results?.namespace_conflict_count),
      final_classification_counts: report.final_classification_counts,
      next_phase_recommendation: report.next_phase_recommendation,
      canonical_summary: report.canonical_summary,
      canonical_sample_rows: report.canonical_sample_rows,
      collapse_safe_results: report.collapse_safe_results,
      collapse_safe_sample_rows: report.collapse_safe_sample_rows,
      promotion_safe_results: report.promotion_safe_results,
      promotion_safe_sample_rows: report.promotion_safe_sample_rows,
      blocked_conflict_rows: report.blocked_conflict_rows,
      qualifier_review_rows: report.qualifier_review_rows,
      invalid_token_rows: report.invalid_token_rows,
      namespace_audit_results: report.namespace_audit_results,
      fk_readiness_snapshot: report.fk_readiness_snapshot,
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
