import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'ECARD3_RECLASSIFICATION_AUDIT_V1';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODE_IDENTITY = 'ecard3';
const CANONICAL_SET_CODE = 'ecard3';
const JSON_OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'ecard3_reclassification_audit_v1.json',
);

const EXPECTED = {
  total_unresolved: 15,
  numeric_token_count: 4,
  holo_token_count: 11,
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

function isHoloToken(value) {
  return /^H[0-9]+$/i.test(String(value ?? '').trim());
}

function isValidToken(value) {
  return isNumericToken(value) || isHoloToken(value);
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

function normalizeTokenForFormatDrift(value) {
  const normalized = normalizeTextOrNull(value)?.toUpperCase() ?? null;
  if (!normalized) {
    return null;
  }

  if (isNumericToken(normalized)) {
    return {
      lane: 'numeric',
      normalized_token: String(Number.parseInt(normalized, 10)),
    };
  }

  if (isHoloToken(normalized)) {
    return {
      lane: 'holo',
      normalized_token: `H${Number.parseInt(normalized.slice(1), 10)}`,
    };
  }

  return null;
}

function sortToken(value) {
  const normalized = normalizeTextOrNull(value)?.toUpperCase() ?? '';
  const holo = isHoloToken(normalized);
  const digits = normalized.replace(/^[A-Z]+/, '');
  return {
    lane_rank: holo ? 1 : 0,
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

function deriveEcard3GvId(input) {
  return buildCardPrintGvIdV1({
    setCode: CANONICAL_SET_CODE,
    printedSetAbbrev: input.printed_set_abbrev,
    number: input.number,
    numberPlain: input.number_plain,
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
      count(*) filter (where printed_number ~ '^H[0-9]+$')::int as holo_token_count,
      count(*) filter (
        where printed_number !~ '^[0-9]+$'
          and printed_number !~ '^H[0-9]+$'
      )::int as invalid_token_count
    from unresolved
  `,
  canonicalSummary: `
    select
      count(*)::int as canonical_ecard3_total_rows,
      count(*) filter (where number ~ '^[0-9]+$')::int as canonical_numeric_count,
      count(*) filter (where number ~ '^H[0-9]+$')::int as canonical_holo_count
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
      case when cp.number ~ '^H[0-9]+$' then 1 else 0 end,
      nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
      cp.number,
      cp.id
    limit 25
  `,
  unresolvedRows: `
    select
      cp.id as old_id,
      cp.name as old_name,
      cp.number as card_print_number,
      cp.number_plain,
      cp.set_code,
      cp.variant_key,
      cpi.printed_number,
      cpi.normalized_printed_name,
      cpi.identity_key_version,
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
    order by
      case when cpi.printed_number ~ '^H[0-9]+$' then 1 else 0 end,
      nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')::int,
      cpi.printed_number,
      cp.id
  `,
  canonicalRows: `
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
    where cp.set_code = $1
      and cp.gv_id is not null
    order by
      case when cp.number ~ '^H[0-9]+$' then 1 else 0 end,
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
        new_set_code: matchedCandidate.set_code,
      };
    });

  const collapseMapByOldId = new Map(collapseMap.map((row) => [row.old_id, row]));
  const unmatchedRows = rowAudits.filter((row) => !collapseMapByOldId.has(row.old_id));

  return {
    row_audits: rowAudits,
    collapse_map: collapseMap,
    unmatched_rows: unmatchedRows,
    summary: {
      collapse_candidate_count: collapseMap.length,
      distinct_old_count: new Set(collapseMap.map((row) => row.old_id)).size,
      distinct_new_count: new Set(collapseMap.map((row) => row.new_id)).size,
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

function buildFormatDriftAudit(validRows, canonicalRows, collapseMapByOldId) {
  const driftRows = [];

  for (const row of validRows) {
    if (collapseMapByOldId.has(row.old_id)) {
      continue;
    }

    const oldTokenInfo = normalizeTokenForFormatDrift(row.printed_number);
    if (!oldTokenInfo) {
      continue;
    }

    for (const candidate of canonicalRows) {
      const newTokenInfo = normalizeTokenForFormatDrift(candidate.number);
      if (!newTokenInfo) {
        continue;
      }

      if (oldTokenInfo.lane !== newTokenInfo.lane) {
        continue;
      }

      if (oldTokenInfo.normalized_token !== newTokenInfo.normalized_token) {
        continue;
      }

      if (normalizeTextOrNull(row.printed_number) === normalizeTextOrNull(candidate.number)) {
        continue;
      }

      const normalizedOldName = normalizeRepoName(row.old_name, candidate.new_name);
      const normalizedNewName = normalizeRepoName(candidate.new_name);
      if (normalizedOldName !== normalizedNewName) {
        continue;
      }

      driftRows.push({
        old_id: row.old_id,
        name: row.old_name,
        old_token: row.printed_number,
        candidate_canonical_token: candidate.number,
        candidate_canonical_gv_id: candidate.gv_id,
        candidate_canonical_id: candidate.new_id,
        drift_type:
          oldTokenInfo.lane === 'holo'
            ? 'holo_zero_pad_drift'
            : 'numeric_zero_pad_drift',
      });
    }
  }

  const distinctOldIds = new Set(driftRows.map((row) => row.old_id));

  return {
    format_drift_candidate_count: distinctOldIds.size,
    sample_rows: driftRows
      .sort((left, right) => compareTokenValues(left.old_token, right.old_token))
      .slice(0, 25),
    row_ids: [...distinctOldIds],
  };
}

async function computePromotionAudit(
  client,
  rowAudits,
  collapseMapByOldId,
  formatDriftOldIds,
) {
  const promotionCandidates = [];
  const blockedCanonicalConflictRows = [];
  const qualifierReviewRows = [];
  const invalidTokenRows = [];
  const formatDriftRows = [];

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

    if (formatDriftOldIds.has(row.old_id)) {
      formatDriftRows.push({
        card_print_id: row.old_id,
        name: row.old_name,
        printed_number: row.printed_number,
        blocking_reason: 'format_drift_only',
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
      blockedCanonicalConflictRows.push({
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
      proposedGvId = deriveEcard3GvId({
        printed_set_abbrev: row.printed_set_abbrev,
        number: row.printed_number,
        number_plain: null,
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
      printed_set_abbrev: row.printed_set_abbrev,
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
      blockedCanonicalConflictRows.push({
        card_print_id: row.card_print_id,
        name: row.name,
        printed_number: row.printed_number,
        blocking_reason: 'promotion_internal_collision',
      });
      continue;
    }

    if (liveCollisionGvIds.has(row.proposed_gv_id)) {
      blockedCanonicalConflictRows.push({
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
    blocked_canonical_conflict_rows: blockedCanonicalConflictRows,
    blocked_invalid_token_rows: invalidTokenRows,
    format_drift_rows: formatDriftRows,
    qualifier_review_rows: qualifierReviewRows,
    promotion_summary: {
      promotion_candidate_count: promotionSafeRows.length,
      promotion_internal_collision_count: new Set(
        internalCollisionRows.map((row) => row.proposed_gv_id),
      ).size,
      promotion_live_collision_count: liveCollisionGvIds.size,
      promotion_same_token_conflict_count: blockedCanonicalConflictRows.filter(
        (row) =>
          row.blocking_reason === 'same_token_different_name' ||
          row.blocking_reason === 'multiple_canonical_matches',
      ).length,
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
  blockedCanonicalConflictCount,
  blockedInvalidTokenCount,
  formatDriftCount,
  qualifierReviewCount,
}) {
  const counts = {
    COLLAPSE_SAFE: collapseSafeCount,
    PROMOTION_SAFE: promotionSafeCount,
    BLOCKED_CANONICAL_CONFLICT: blockedCanonicalConflictCount,
    BLOCKED_INVALID_TOKEN: blockedInvalidTokenCount,
    FORMAT_DRIFT_REVIEW: formatDriftCount,
    QUALIFIER_REVIEW: qualifierReviewCount,
  };

  const classifiedTotal = Object.values(counts).reduce(
    (sum, value) => sum + normalizeCount(value),
    0,
  );
  assertEqual(classifiedTotal, totalUnresolved, 'FINAL_CLASSIFICATION_TOTAL_DRIFT');
  return counts;
}

function classifyNextPhase(finalClassificationCounts) {
  if (
    normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) === 0 &&
    normalizeCount(finalClassificationCounts.PROMOTION_SAFE) > 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_CANONICAL_CONFLICT) === 0 &&
    normalizeCount(finalClassificationCounts.BLOCKED_INVALID_TOKEN) === 0 &&
    normalizeCount(finalClassificationCounts.FORMAT_DRIFT_REVIEW) === 0 &&
    normalizeCount(finalClassificationCounts.QUALIFIER_REVIEW) === 0
  ) {
    return 'ECARD3_EXACT_TOKEN_PROMOTION_V1';
  }

  if (normalizeCount(finalClassificationCounts.COLLAPSE_SAFE) > 0) {
    return 'ECARD3_SPLIT_EXECUTION_COLLAPSE_AND_PROMOTION_V1';
  }

  if (normalizeCount(finalClassificationCounts.PROMOTION_SAFE) > 0) {
    return 'ECARD3_PROMOTION_AND_REVIEW_V1';
  }

  return 'ECARD3_BLOCKED_REVIEW_V1';
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'ecard3_reclassification_audit_v1',
  });

  const report = {
    phase: PHASE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    target_set_code_identity: TARGET_SET_CODE_IDENTITY,
    canonical_set_code: CANONICAL_SET_CODE,
    total_unresolved: 0,
    numeric_token_count: 0,
    holo_token_count: 0,
    invalid_token_count: 0,
    canonical_ecard3_target_summary: null,
    canonical_ecard3_sample_rows: [],
    collapse_safe_subset_results: null,
    collapse_safe_sample_rows: [],
    promotion_safe_subset_results: null,
    promotion_safe_sample_rows: [],
    format_drift_results: null,
    format_drift_sample_rows: [],
    blocked_conflict_rows: [],
    qualifier_review_rows: [],
    invalid_token_rows: [],
    namespace_audit_results: null,
    fk_readiness_snapshot: {
      collapse_safe_subset: [],
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
    report.holo_token_count = normalizeCount(unresolvedCounts?.holo_token_count);
    report.invalid_token_count = normalizeCount(unresolvedCounts?.invalid_token_count);

    assertEqual(report.total_unresolved, EXPECTED.total_unresolved, 'UNRESOLVED_TOTAL_DRIFT');
    assertEqual(report.numeric_token_count, EXPECTED.numeric_token_count, 'NUMERIC_TOKEN_COUNT_DRIFT');
    assertEqual(report.holo_token_count, EXPECTED.holo_token_count, 'HOLO_TOKEN_COUNT_DRIFT');
    assertEqual(report.invalid_token_count, EXPECTED.invalid_token_count, 'INVALID_TOKEN_COUNT_DRIFT');

    report.canonical_ecard3_target_summary = await queryOne(client, SQL.canonicalSummary, [
      CANONICAL_SET_CODE,
    ]);
    report.canonical_ecard3_sample_rows = await queryRows(client, SQL.canonicalSamples, [
      CANONICAL_SET_CODE,
    ]);

    if (normalizeCount(report.canonical_ecard3_target_summary?.canonical_ecard3_total_rows) <= 0) {
      throw new Error('CANONICAL_ECARD3_LANE_MISSING');
    }
    if (
      normalizeCount(report.canonical_ecard3_target_summary?.canonical_numeric_count) <= 0 ||
      normalizeCount(report.canonical_ecard3_target_summary?.canonical_holo_count) <= 0
    ) {
      throw new Error('CANONICAL_ECARD3_LANE_SHAPE_UNEXPECTED');
    }

    const unresolvedRows = await queryRows(client, SQL.unresolvedRows, [
      TARGET_IDENTITY_DOMAIN,
      TARGET_SET_CODE_IDENTITY,
    ]);
    const canonicalRows = await queryRows(client, SQL.canonicalRows, [CANONICAL_SET_CODE]);
    const validRows = unresolvedRows.filter((row) => isValidToken(row.printed_number));

    const collapseAudit = buildCollapseAudit(validRows, canonicalRows);
    const collapseMapByOldId = new Map(collapseAudit.collapse_map.map((row) => [row.old_id, row]));
    report.collapse_safe_subset_results = collapseAudit.summary;
    report.collapse_safe_sample_rows = collapseAudit.collapse_map
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);

    const formatDriftAudit = buildFormatDriftAudit(validRows, canonicalRows, collapseMapByOldId);
    report.format_drift_results = {
      format_drift_candidate_count: formatDriftAudit.format_drift_candidate_count,
    };
    report.format_drift_sample_rows = formatDriftAudit.sample_rows;

    const promotionAudit = await computePromotionAudit(
      client,
      collapseAudit.row_audits,
      collapseMapByOldId,
      new Set(formatDriftAudit.row_ids),
    );
    report.promotion_safe_subset_results = promotionAudit.promotion_summary;
    report.promotion_safe_sample_rows = promotionAudit.promotion_safe_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.blocked_conflict_rows = promotionAudit.blocked_canonical_conflict_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.qualifier_review_rows = promotionAudit.qualifier_review_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);
    report.invalid_token_rows = promotionAudit.blocked_invalid_token_rows
      .slice()
      .sort((left, right) => compareTokenValues(left.printed_number, right.printed_number))
      .slice(0, 25);

    const canonicalNamespaceMatchCount = collapseAudit.collapse_map.filter((row) => {
      const canonicalRow = canonicalRows.find((candidate) => candidate.new_id === row.new_id);
      return canonicalRow && canonicalRow.gv_id === deriveEcard3GvId(canonicalRow);
    }).length;

    report.namespace_audit_results = {
      canonical_namespace_match_count: canonicalNamespaceMatchCount,
      namespace_conflict_count:
        collapseAudit.collapse_map.length - canonicalNamespaceMatchCount +
        normalizeCount(promotionAudit.promotion_summary?.promotion_live_collision_count),
    };

    report.fk_readiness_snapshot.collapse_safe_subset = await loadFkReadinessSnapshot(
      client,
      collapseAudit.collapse_map.map((row) => row.old_id),
    );
    report.fk_readiness_snapshot.promotion_safe_subset = await loadFkReadinessSnapshot(
      client,
      promotionAudit.promotion_safe_rows.map((row) => row.card_print_id),
    );

    report.final_classification_counts = buildFinalClassificationCounts({
      totalUnresolved: report.total_unresolved,
      collapseSafeCount: collapseAudit.collapse_map.length,
      promotionSafeCount: promotionAudit.promotion_safe_rows.length,
      blockedCanonicalConflictCount: promotionAudit.blocked_canonical_conflict_rows.length,
      blockedInvalidTokenCount: promotionAudit.blocked_invalid_token_rows.length,
      formatDriftCount: formatDriftAudit.format_drift_candidate_count,
      qualifierReviewCount: promotionAudit.qualifier_review_rows.length,
    });

    report.next_phase_recommendation = classifyNextPhase(report.final_classification_counts);
    report.status = 'completed';

    writeJsonReport({
      phase: report.phase,
      generated_at: report.generated_at,
      total_unresolved: report.total_unresolved,
      numeric_token_count: report.numeric_token_count,
      holo_token_count: report.holo_token_count,
      invalid_token_count: report.invalid_token_count,
      canonical_ecard3_total_rows: normalizeCount(
        report.canonical_ecard3_target_summary?.canonical_ecard3_total_rows,
      ),
      canonical_numeric_count: normalizeCount(
        report.canonical_ecard3_target_summary?.canonical_numeric_count,
      ),
      canonical_holo_count: normalizeCount(
        report.canonical_ecard3_target_summary?.canonical_holo_count,
      ),
      collapse_candidate_count: normalizeCount(
        report.collapse_safe_subset_results?.collapse_candidate_count,
      ),
      multiple_match_old_count: normalizeCount(
        report.collapse_safe_subset_results?.multiple_match_old_count,
      ),
      reused_new_count: normalizeCount(report.collapse_safe_subset_results?.reused_new_count),
      unmatched_count: normalizeCount(report.collapse_safe_subset_results?.unmatched_count),
      same_token_same_name_count: normalizeCount(
        report.collapse_safe_subset_results?.same_token_same_name_count,
      ),
      same_token_different_name_count: normalizeCount(
        report.collapse_safe_subset_results?.same_token_different_name_count,
      ),
      format_drift_candidate_count: normalizeCount(
        report.format_drift_results?.format_drift_candidate_count,
      ),
      promotion_candidate_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_candidate_count,
      ),
      promotion_internal_collision_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_internal_collision_count,
      ),
      promotion_live_collision_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_live_collision_count,
      ),
      promotion_same_token_conflict_count: normalizeCount(
        report.promotion_safe_subset_results?.promotion_same_token_conflict_count,
      ),
      qualifier_review_count: report.qualifier_review_rows.length,
      canonical_namespace_match_count: normalizeCount(
        report.namespace_audit_results?.canonical_namespace_match_count,
      ),
      namespace_conflict_count: normalizeCount(report.namespace_audit_results?.namespace_conflict_count),
      final_classification_counts: report.final_classification_counts,
      next_phase_recommendation: report.next_phase_recommendation,
      canonical_ecard3_target_summary: report.canonical_ecard3_target_summary,
      canonical_ecard3_sample_rows: report.canonical_ecard3_sample_rows,
      collapse_safe_subset_results: report.collapse_safe_subset_results,
      collapse_safe_sample_rows: report.collapse_safe_sample_rows,
      promotion_safe_subset_results: report.promotion_safe_subset_results,
      promotion_safe_sample_rows: report.promotion_safe_sample_rows,
      format_drift_results: report.format_drift_results,
      format_drift_sample_rows: report.format_drift_sample_rows,
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
